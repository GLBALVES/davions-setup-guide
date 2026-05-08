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

type QuestionType = "short_text" | "long_text" | "multiple_choice" | "checkboxes" | "yes_no" | "multi_image" | "date";

interface BriefingQuestion {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  required: boolean;
  options: string[];
  max_select?: number | null;
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
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Briefing form answers: { [questionId]: string | string[] }
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submittingBriefing, setSubmittingBriefing] = useState(false);
  const [briefingSubmitted, setBriefingSubmitted] = useState(false);
  const [missingIds, setMissingIds] = useState<Set<string>>(new Set());
  const [briefingChoice, setBriefingChoice] = useState<"pending" | "now" | "later">("pending");

  const lang: "en" | "pt" | "es" = (() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("davions_lang")) as any;
    if (saved === "pt" || saved === "es" || saved === "en") return saved;
    const nav = (typeof navigator !== "undefined" && navigator.language?.toLowerCase()) || "";
    if (nav.startsWith("pt")) return "pt";
    if (nav.startsWith("es")) return "es";
    return "en";
  })();
  const tr = {
    prompt: { en: "Would you like to answer the briefing now?", pt: "Deseja responder o briefing agora?", es: "¿Desea responder el briefing ahora?" }[lang],
    answerNow: { en: "Answer now", pt: "Responder agora", es: "Responder ahora" }[lang],
    answerLater: { en: "Answer later", pt: "Responder depois", es: "Responder más tarde" }[lang],
    laterNotice: {
      en: "No problem — you can answer the briefing later from your confirmation email.",
      pt: "Sem problema — você pode responder o briefing depois pelo e-mail de confirmação.",
      es: "Sin problema — puede responder el briefing más tarde desde su correo de confirmación.",
    }[lang],
    changeMind: { en: "Answer now instead", pt: "Responder agora", es: "Responder ahora" }[lang],
  };

  // ── Confirm payment (always try when we have a checkoutSessionId) ─────────
  const tryConfirmBooking = async (
    checkoutSessionId: string
  ): Promise<BookingDetails | null> => {
    setConfirmingPayment(true);
    setConfirmError(null);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-booking", {
        body: { bookingId, checkoutSessionId },
      });

      if (error) {
        console.error("confirm-booking edge function error:", error);
        setConfirmError("We're having trouble confirming your booking. Please contact us if this persists.");
        return null;
      }

      if (!data?.confirmed) {
        // Payment not completed in Stripe yet (abandoned checkout)
        return null;
      }

      // Re-fetch the now-confirmed booking via edge function
      const { data: refreshResult } = await supabase.functions.invoke("get-booking-public", {
        body: { booking_id: bookingId },
      });
      const refreshed = refreshResult?.booking ?? null;

      return refreshed as BookingDetails | null;
    } catch (e) {
      console.error("confirm-booking failed:", e);
      setConfirmError("We're having trouble confirming your booking. Please contact us if this persists.");
      return null;
    } finally {
      setConfirmingPayment(false);
    }
  };

  // ── Load booking + session + briefing ─────────────────────────────────────
  useEffect(() => {
    if (!bookingId || !sessionId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const checkoutSessionId = searchParams.get("checkout_session_id");

      const [bookingResult, { data: sessionData }] = await Promise.all([
        supabase.functions.invoke("get-booking-public", {
          body: { booking_id: bookingId },
        }),
        (supabase as any)
          .from("sessions")
          .select("title, duration_minutes, location, num_photos, cover_image_url, briefing_id")
          .eq("id", sessionId)
          .single(),
      ]);

      const bookingData = bookingResult.data?.booking ?? null;

      // Determine the checkout session ID to use for confirmation
      const rawBooking = bookingData as (BookingDetails & { stripe_checkout_session_id?: string }) | null;
      const csId = checkoutSessionId || rawBooking?.stripe_checkout_session_id || null;

      let resolvedBooking: BookingDetails | null = rawBooking;

      // Always attempt confirmation if:
      // - We have a Stripe checkout session ID in the URL (user just came from Stripe)
      // - AND the booking is still pending (or we couldn't read it due to RLS timing)
      if (csId && (!rawBooking || rawBooking.status === "pending")) {
        const confirmed = await tryConfirmBooking(csId);
        if (confirmed) resolvedBooking = confirmed;
      }

      if (resolvedBooking) {
        setBooking(resolvedBooking);

        const availId = resolvedBooking.availability_id;
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
          const { data: briefingData } = await (supabase as any)
            .from("briefings")
            .select("id, name, questions")
            .eq("id", s.briefing_id)
            .single();

          if (briefingData) {
            setBriefing(briefingData as BriefingData);

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
  const clearMissing = (qId: string) => {
    setMissingIds((prev) => {
      if (!prev.has(qId)) return prev;
      const next = new Set(prev);
      next.delete(qId);
      return next;
    });
  };

  const setTextAnswer = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (value && (typeof value !== "string" || value.trim())) clearMissing(qId);
  };

  const setCheckboxAnswer = (qId: string, option: string, checked: boolean, max?: number | null) => {
    setAnswers((prev) => {
      const current = (prev[qId] as string[]) ?? [];
      let nextArr = checked ? [...current, option] : current.filter((o) => o !== option);
      if (checked && max && max > 0 && nextArr.length > max) {
        // ignore selection beyond max
        return prev;
      }
      if (nextArr.length > 0) clearMissing(qId);
      return { ...prev, [qId]: nextArr };
    });
  };

  // ── Submit briefing ────────────────────────────────────────────────────────
  const handleSubmitBriefing = async () => {
    if (!briefing || !bookingId) return;

    // Validate required questions and collect missing ones for highlighting
    const missing = new Set<string>();
    for (const q of briefing.questions) {
      if (!q.required) continue;
      const ans = answers[q.id];
      if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === "string" && !ans.trim())) {
        missing.add(q.id);
      }
    }
    setMissingIds(missing);
    if (missing.size > 0) {
      // Scroll first missing question into view
      const first = document.querySelector(`[data-briefing-question="${Array.from(missing)[0]}"]`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmittingBriefing(true);
    await (supabase as any).from("booking_briefing_responses").insert({
      booking_id: bookingId,
      briefing_id: briefing.id,
      answers,
    });
    try {
      await supabase.functions.invoke("notify-briefing-response", {
        body: { booking_id: bookingId },
      });
    } catch (e) {
      console.error("notify-briefing-response failed", e);
    }
    setSubmittingBriefing(false);
    setBriefingSubmitted(true);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || confirmingPayment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          {confirmingPayment ? "Confirming your booking…" : "Loading…"}
        </span>
      </div>
    );
  }

  // ── Confirmation error ─────────────────────────────────────────────────────
  if (confirmError && !booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16 gap-6">
        <div className="w-full max-w-md border border-border p-6 flex flex-col gap-4 text-center">
          <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground">Payment received</p>
          <h1 className="text-xl font-light tracking-wide">Almost there…</h1>
          <p className="text-sm font-light text-muted-foreground">{confirmError}</p>
          {slug && (
            <button
              onClick={() => navigate(`/store/${slug}`)}
              className="text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground underline mt-2"
            >
              ← Back to Store
            </button>
          )}
        </div>
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40">Powered by Davions</p>
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
            ) : briefingChoice === "pending" ? (
              <div className="p-5 flex flex-col gap-3">
                <p className="text-sm font-light text-center">{tr.prompt}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => setBriefingChoice("now")}
                    className="flex-1 text-xs tracking-wider uppercase font-light"
                  >
                    {tr.answerNow}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setBriefingChoice("later")}
                    className="flex-1 text-xs tracking-wider uppercase font-light"
                  >
                    {tr.answerLater}
                  </Button>
                </div>
              </div>
            ) : briefingChoice === "later" ? (
              <div className="p-5 flex flex-col items-center gap-3 text-center">
                <p className="text-[11px] text-muted-foreground">{tr.laterNotice}</p>
                <button
                  onClick={() => setBriefingChoice("now")}
                  className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground underline"
                >
                  {tr.changeMind}
                </button>
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-5">
                {briefing.questions.map((q) => {
                  const isMissing = missingIds.has(q.id);
                  return (
                  <div
                    key={q.id}
                    data-briefing-question={q.id}
                    className={`flex flex-col gap-1.5 transition-colors ${isMissing ? "border-l-2 border-destructive pl-3 -ml-3" : ""}`}
                  >
                    <p className={`text-xs font-light ${isMissing ? "text-destructive" : ""}`}>
                      {q.label}
                      {q.required && <span className="text-destructive ml-1">*</span>}
                      {isMissing && (
                        <span className="ml-2 text-[10px] tracking-wider uppercase text-destructive">Required</span>
                      )}
                    </p>
                    {q.description && (
                      <p className="text-[11px] font-light text-muted-foreground whitespace-pre-wrap">{q.description}</p>
                    )}

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

                    {/* Date */}
                    {q.type === "date" && (
                      <input
                        type="date"
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setTextAnswer(q.id, e.target.value)}
                        className="h-9 w-full px-3 text-sm font-light bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                        {q.max_select && q.max_select > 0 && (
                          <p className="text-[10px] tracking-wider uppercase text-muted-foreground">
                            Select up to {q.max_select}
                          </p>
                        )}
                        {q.options.map((opt) => {
                          const current = (answers[q.id] as string[]) ?? [];
                          const isChecked = current.includes(opt);
                          const atMax = !!q.max_select && q.max_select > 0 && current.length >= q.max_select && !isChecked;
                          return (
                            <label key={opt} className={`flex items-center gap-2.5 ${atMax ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={atMax}
                                onChange={(e) => setCheckboxAnswer(q.id, opt, e.target.checked, q.max_select)}
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

                    {q.type === "multi_image" && (
                      <div className="flex flex-col gap-2">
                        {q.max_select && q.max_select > 0 && (
                          <p className="text-[10px] tracking-wider uppercase text-muted-foreground">
                            Select up to {q.max_select}
                          </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {q.options.filter(Boolean).map((opt, i) => {
                            const [optUrl, ...captionParts] = opt.split("||");
                            const caption = captionParts.join("||");
                            const current = Array.isArray(answers[q.id])
                              ? (answers[q.id] as string[])
                              : (answers[q.id] ? [answers[q.id] as string] : []);
                            const selected = current.includes(optUrl);
                            const atMax = !!q.max_select && q.max_select > 0 && current.length >= q.max_select && !selected;
                            return (
                              <button
                                type="button"
                                key={`${opt}-${i}`}
                                disabled={atMax}
                                onClick={() => setCheckboxAnswer(q.id, optUrl, !selected, q.max_select)}
                                className={`relative flex flex-col overflow-hidden border transition-all ${selected ? "border-foreground ring-2 ring-foreground" : "border-input hover:border-foreground/40"} ${atMax ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                <div className="relative aspect-square overflow-hidden">
                                  <img src={optUrl} alt={caption || `Option ${i + 1}`} className="w-full h-full object-cover" />
                                  {selected && (
                                    <span className="absolute top-1 right-1 bg-foreground text-background text-[9px] uppercase tracking-wider px-1.5 py-0.5">Selected</span>
                                  )}
                                </div>
                                {caption && (
                                  <span className="px-2 py-1.5 text-[11px] font-light text-foreground text-center truncate">
                                    {caption}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}

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
