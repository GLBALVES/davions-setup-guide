import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Clock, MapPin, Camera, ClipboardList } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BookingDetails {
  client_name: string;
  client_email: string;
  booked_date: string;
  status: string;
  payment_status: string;
  availability_id: string;
}

interface SessionDetails {
  title: string;
  duration_minutes: number;
  location: string | null;
  num_photos: number;
  cover_image_url: string | null;
  briefing_id: string | null;
}

interface AvailabilityDetails {
  start_time: string;
  end_time: string;
}

type QuestionType = "short_text" | "long_text" | "multiple_choice" | "checkboxes" | "yes_no";

interface BriefingQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[];
}

interface BriefingData {
  id: string;
  name: string;
  questions: BriefingQuestion[];
}

// ── Component ─────────────────────────────────────────────────────────────────

const BookingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("store");
  const bookingId = searchParams.get("booking");
  const sessionId = searchParams.get("session");

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [availability, setAvailability] = useState<AvailabilityDetails | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Briefing form answers: { [questionId]: string | string[] }
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submittingBriefing, setSubmittingBriefing] = useState(false);
  const [briefingSubmitted, setBriefingSubmitted] = useState(false);

  // ── Confirm payment fallback (runs once when status is still pending) ───────
  const confirmPaymentIfNeeded = async (
    currentBooking: BookingDetails,
    checkoutSessionId: string | null
  ) => {
    if (!checkoutSessionId || currentBooking.status === "confirmed") return currentBooking;

    setConfirmingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-booking", {
        body: { bookingId, checkoutSessionId },
      });
      if (!error && data?.confirmed) {
        // Re-fetch the booking to get the updated status
        const { data: refreshed } = await supabase
          .from("bookings")
          .select("client_name, client_email, booked_date, status, payment_status, availability_id")
          .eq("id", bookingId!)
          .single();
        if (refreshed) return refreshed as BookingDetails;
      }
    } catch (e) {
      console.error("confirm-booking failed:", e);
    } finally {
      setConfirmingPayment(false);
    }
    return currentBooking;
  };

  // ── Load booking + session + briefing ─────────────────────────────────────
  useEffect(() => {
    if (!bookingId || !sessionId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      // Get checkout session id from URL params
      const checkoutSessionId = searchParams.get("checkout_session_id");

      const [{ data: bookingData }, { data: sessionData }] = await Promise.all([
        supabase
          .from("bookings")
          .select("client_name, client_email, booked_date, status, payment_status, availability_id, stripe_checkout_session_id")
          .eq("id", bookingId)
          .single(),
        (supabase as any)
          .from("sessions")
          .select("title, duration_minutes, location, num_photos, cover_image_url, briefing_id")
          .eq("id", sessionId)
          .single(),
      ]);

      if (bookingData) {
        // If booking is still pending, try to confirm it via Stripe verification
        const rawBooking = bookingData as BookingDetails & { stripe_checkout_session_id?: string };
        const csId = checkoutSessionId || rawBooking.stripe_checkout_session_id || null;
        const confirmedBooking = rawBooking.status === "pending"
          ? await confirmPaymentIfNeeded(rawBooking, csId)
          : rawBooking;

        setBooking(confirmedBooking);

        const availId = confirmedBooking.availability_id;
        if (availId) {
          const { data: availData } = await supabase
            .from("session_availability")
            .select("start_time, end_time")
            .eq("id", availId)
            .single();
          if (availData) setAvailability(availData as AvailabilityDetails);
        }
      }

      if (sessionData) {
        const s = sessionData as SessionDetails;
        setSession(s);

        if (s.briefing_id) {
          // Fetch briefing questions
          const { data: briefingData } = await (supabase as any)
            .from("briefings")
            .select("id, name, questions")
            .eq("id", s.briefing_id)
            .single();

          if (briefingData) {
            setBriefing(briefingData as BriefingData);

            // Check if already submitted
            const { data: existing } = await (supabase as any)
              .from("booking_briefing_responses")
              .select("id")
              .eq("booking_id", bookingId)
              .eq("briefing_id", s.briefing_id)
              .maybeSingle();

            if (existing) setAlreadySubmitted(true);
          }
        }
      }

      setLoading(false);
    };

    load();
  }, [bookingId, sessionId]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ── Helpers for answers ────────────────────────────────────────────────────
  const setTextAnswer = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const setCheckboxAnswer = (qId: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = (prev[qId] as string[]) ?? [];
      return {
        ...prev,
        [qId]: checked ? [...current, option] : current.filter((o) => o !== option),
      };
    });
  };

  // ── Submit briefing ────────────────────────────────────────────────────────
  const handleSubmitBriefing = async () => {
    if (!briefing || !bookingId) return;

    // Validate required questions
    for (const q of briefing.questions) {
      if (!q.required) continue;
      const ans = answers[q.id];
      if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === "string" && !ans.trim())) {
        return; // silent — required indicator visible on the field
      }
    }

    setSubmittingBriefing(true);
    await (supabase as any).from("booking_briefing_responses").insert({
      booking_id: bookingId,
      briefing_id: briefing.id,
      answers,
    });
    setSubmittingBriefing(false);
    setBriefingSubmitted(true);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md flex flex-col gap-8">

        {/* Success icon + headline */}
        <div className="flex flex-col items-center text-center gap-4">
          <CheckCircle className="h-12 w-12 text-primary" strokeWidth={1.5} />
          <div>
            <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground mb-2">
              Booking confirmed
            </p>
            <h1 className="text-2xl font-light tracking-wide">
              {booking?.client_name ? `See you soon, ${booking.client_name.split(" ")[0]}!` : "You're all set!"}
            </h1>
            <p className="text-sm font-light text-muted-foreground mt-2">
              A confirmation has been sent to{" "}
              <span className="text-foreground">{booking?.client_email}</span>
            </p>
          </div>
        </div>

        {/* Session + booking details */}
        {(session || booking) && (
          <div className="border border-border divide-y divide-border">
            {session?.cover_image_url && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={session.cover_image_url}
                  alt={session?.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-5 flex flex-col gap-3">
              {session?.title && (
                <h2 className="text-base font-light tracking-wide">{session.title}</h2>
              )}

              <div className="flex flex-col gap-2 text-[11px] text-muted-foreground">
                {booking?.booked_date && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(booking.booked_date)}
                  </span>
                )}
                {availability?.start_time && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {availability.start_time.slice(0, 5)}
                    {availability.end_time ? ` – ${availability.end_time.slice(0, 5)}` : ""}
                  </span>
                )}
                {session?.duration_minutes && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 opacity-0" />
                    {session.duration_minutes} minutes
                  </span>
                )}
                {session?.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {session.location}
                  </span>
                )}
                {session?.num_photos && (
                  <span className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    {session.num_photos} photos delivered
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Briefing questionnaire ───────────────────────────────────────── */}
        {briefing && !alreadySubmitted && (
          <div className="border border-border flex flex-col divide-y divide-border">
            {/* Header */}
            <div className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs tracking-[0.2em] uppercase font-light">Before your session</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {briefing.name} — we'd love to know a little more about you.
              </p>
            </div>

            {briefingSubmitted ? (
              <div className="p-5 flex flex-col items-center gap-3 text-center">
                <CheckCircle className="h-8 w-8 text-primary" strokeWidth={1.5} />
                <p className="text-sm font-light">Thank you! Your answers have been received.</p>
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-5">
                {briefing.questions.map((q) => (
                  <div key={q.id} className="flex flex-col gap-1.5">
                    <p className="text-xs font-light">
                      {q.label}
                      {q.required && <span className="text-destructive ml-1">*</span>}
                    </p>

                    {/* Short text */}
                    {q.type === "short_text" && (
                      <input
                        type="text"
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setTextAnswer(q.id, e.target.value)}
                        className="h-9 w-full px-3 text-sm font-light bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Your answer…"
                      />
                    )}

                    {/* Long text */}
                    {q.type === "long_text" && (
                      <textarea
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setTextAnswer(q.id, e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm font-light bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        placeholder="Your answer…"
                      />
                    )}

                    {/* Multiple choice */}
                    {q.type === "multiple_choice" && (
                      <div className="flex flex-col gap-1.5">
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={(answers[q.id] as string) === opt}
                              onChange={() => setTextAnswer(q.id, opt)}
                              className="h-3.5 w-3.5 accent-foreground"
                            />
                            <span className="text-sm font-light">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Checkboxes */}
                    {q.type === "checkboxes" && (
                      <div className="flex flex-col gap-1.5">
                        {q.options.map((opt) => {
                          const current = (answers[q.id] as string[]) ?? [];
                          return (
                            <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={current.includes(opt)}
                                onChange={(e) => setCheckboxAnswer(q.id, opt, e.target.checked)}
                                className="h-3.5 w-3.5 accent-foreground"
                              />
                              <span className="text-sm font-light">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Yes / No */}
                    {q.type === "yes_no" && (
                      <div className="flex gap-4">
                        {["Yes", "No"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={(answers[q.id] as string) === opt}
                              onChange={() => setTextAnswer(q.id, opt)}
                              className="h-3.5 w-3.5 accent-foreground"
                            />
                            <span className="text-sm font-light">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  onClick={handleSubmitBriefing}
                  disabled={submittingBriefing}
                  className="w-full text-xs tracking-wider uppercase font-light mt-1"
                >
                  {submittingBriefing ? "Submitting…" : "Submit Briefing"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Already submitted notice */}
        {briefing && alreadySubmitted && (
          <div className="border border-border p-4 flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">You've already submitted your briefing. Thank you!</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {slug && (
            <Button
              variant="outline"
              onClick={() => navigate(`/store/${slug}`)}
              className="w-full text-xs tracking-wider uppercase font-light"
            >
              ← Back to Store
            </Button>
          )}
        </div>
      </div>

      <footer className="mt-16">
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40">
          Powered by Davions
        </p>
      </footer>
    </div>
  );
};

export default BookingSuccess;
