import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  MapPin,
  CreditCard,
  UserCircle,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

interface BookingData {
  id: string;
  client_name: string;
  client_email: string;
  booked_date: string | null;
  status: string;
  payment_status: string;
  availability_id: string;
  session_id: string;
  photographer_id: string;
}

interface SessionData {
  title: string;
  duration_minutes: number;
  location: string | null;
  num_photos: number;
  cover_image_url: string | null;
  briefing_id: string | null;
  contract_text: string | null;
  price: number;
  session_model: string | null;
}

interface AvailData {
  start_time: string;
  end_time: string;
}

interface BonusItem {
  text: string;
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

interface PhotographerData {
  full_name: string;
  store_slug: string | null;
  brand_name: string | null;
}

/* ── Helpers ────────────────────────────────────────── */

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type StepKey = "details" | "client_info" | "briefing" | "contract" | "payment";

interface ClientInfo {
  full_name: string;
  phone: string;
  birth_date: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  instagram: string;
}

interface StepDef {
  key: StepKey;
  label: string;
  icon: React.ReactNode;
}

/* ── Component ──────────────────────────────────────── */

const BookingConfirm = () => {
  const { bookingId } = useParams<{ bookingId: string }>();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [avail, setAvail] = useState<AvailData | null>(null);
  const [bonuses, setBonuses] = useState<BonusItem[]>([]);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [photographer, setPhotographer] = useState<PhotographerData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Briefing state
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [briefingSubmitted, setBriefingSubmitted] = useState(false);
  const [alreadySubmittedBriefing, setAlreadySubmittedBriefing] = useState(false);
  const [submittingBriefing, setSubmittingBriefing] = useState(false);

  // Client info state
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    full_name: "",
    phone: "",
    birth_date: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    address_country: "",
    instagram: "",
  });
  const [clientInfoSaved, setClientInfoSaved] = useState(false);
  const [savingClientInfo, setSavingClientInfo] = useState(false);

  // Contract state
  const [contractAccepted, setContractAccepted] = useState(false);

  // LGPD consent
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }

    const load = async () => {
      const { data: fnResult, error: fnError } = await supabase.functions.invoke("get-booking-public", {
        body: { booking_id: bookingId },
      });
      const bData = fnError ? null : fnResult?.booking;

      if (!bData) { setLoading(false); return; }
      const b = bData as BookingData;
      setBooking(b);
      setClientInfo((prev) => ({ ...prev, full_name: b.client_name || "" }));

      const [sessRes, availRes, photoRes] = await Promise.all([
        (supabase as any)
          .from("sessions")
          .select("title, duration_minutes, location, num_photos, cover_image_url, briefing_id, contract_text, price, session_model")
          .eq("id", b.session_id)
          .single(),
        supabase
          .from("session_availability")
          .select("start_time, end_time")
          .eq("id", b.availability_id)
          .single(),
        (supabase as any)
          .from("photographers")
          .select("full_name, store_slug, brand_name")
          .eq("id", b.photographer_id)
          .single(),
      ]);

      if (sessRes.data) {
        const s = sessRes.data as SessionData;
        setSession(s);

        const { data: bonusData } = await (supabase as any)
          .from("session_bonuses")
          .select("text")
          .eq("session_id", b.session_id)
          .order("position", { ascending: true });
        setBonuses(bonusData ?? []);

        if (s.briefing_id) {
          const { data: brData } = await (supabase as any)
            .from("briefings")
            .select("id, name, questions")
            .eq("id", s.briefing_id)
            .single();
          if (brData) {
            setBriefing(brData as BriefingData);
            const { data: existing } = await (supabase as any)
              .from("booking_briefing_responses")
              .select("id")
              .eq("booking_id", bookingId)
              .eq("briefing_id", s.briefing_id)
              .maybeSingle();
            if (existing) setAlreadySubmittedBriefing(true);
          }
        }
      }

      if (availRes.data) setAvail(availRes.data as AvailData);
      if (photoRes.data) setPhotographer(photoRes.data as PhotographerData);

      // Load existing client info if available
      if (b.client_email && b.photographer_id) {
        const { data: existingClient } = await (supabase as any)
          .from("clients")
          .select("full_name, phone, birth_date, address_street, address_city, address_state, address_zip, address_country, instagram")
          .eq("photographer_id", b.photographer_id)
          .eq("email", b.client_email)
          .maybeSingle();
        if (existingClient) {
          setClientInfo({
            full_name: existingClient.full_name || b.client_name || "",
            phone: existingClient.phone || "",
            birth_date: existingClient.birth_date || "",
            address_street: existingClient.address_street || "",
            address_city: existingClient.address_city || "",
            address_state: existingClient.address_state || "",
            address_zip: existingClient.address_zip || "",
            address_country: existingClient.address_country || "",
            instagram: existingClient.instagram || "",
          });
          setClientInfoSaved(true);
        }
      }

      setLoading(false);
    };

    load();
  }, [bookingId]);

  /* ── Briefing handlers ── */
  const setTextAnswer = (qId: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [qId]: value }));

  const setCheckboxAnswer = (qId: string, option: string, checked: boolean) =>
    setAnswers((prev) => {
      const current = (prev[qId] as string[]) ?? [];
      return { ...prev, [qId]: checked ? [...current, option] : current.filter((o) => o !== option) };
    });

  const handleSubmitBriefing = async () => {
    if (!briefing || !bookingId) return;
    for (const q of briefing.questions) {
      if (!q.required) continue;
      const ans = answers[q.id];
      if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === "string" && !ans.trim())) return;
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

  /* ── Client info handler ── */
  const handleSaveClientInfo = async () => {
    if (!booking) return;
    if (!clientInfo.full_name.trim() || !clientInfo.phone.trim()) return;
    setSavingClientInfo(true);
    try {
      await (supabase as any).from("clients").upsert(
        {
          photographer_id: booking.photographer_id,
          email: booking.client_email,
          full_name: clientInfo.full_name.trim(),
          phone: clientInfo.phone.trim() || null,
          birth_date: clientInfo.birth_date || null,
          address_street: clientInfo.address_street.trim() || null,
          address_city: clientInfo.address_city.trim() || null,
          address_state: clientInfo.address_state.trim() || null,
          address_zip: clientInfo.address_zip.trim() || null,
          address_country: clientInfo.address_country.trim() || null,
          instagram: clientInfo.instagram.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "photographer_id,email" }
      );
      setClientInfoSaved(true);
    } catch (err) {
      console.error("Save client info error:", err);
    } finally {
      setSavingClientInfo(false);
    }
  };

  /* ── Payment handler ── */
  const handlePayment = async () => {
    if (!booking || !session) return;
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-session-checkout", {
        body: {
          bookingId: booking.id,
          sessionId: booking.session_id,
          photographerId: booking.photographer_id,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("Payment error:", err);
    } finally {
      setPaymentLoading(false);
    }
  };

  /* ── Build steps dynamically ── */
  const buildSteps = (): StepDef[] => {
    if (!session) return [];
    const steps: StepDef[] = [
      { key: "details", label: "Details", icon: <Calendar className="h-4 w-4" /> },
      { key: "client_info", label: "Your Info", icon: <UserCircle className="h-4 w-4" /> },
    ];
    if (briefing) {
      steps.push({ key: "briefing", label: "Briefing", icon: <ClipboardList className="h-4 w-4" /> });
    }
    if (session.contract_text) {
      steps.push({ key: "contract", label: "Contract", icon: <FileText className="h-4 w-4" /> });
    }
    if (session.price != null && session.price > 0) {
      steps.push({ key: "payment", label: "Payment", icon: <CreditCard className="h-4 w-4" /> });
    }
    return steps;
  };

  const steps = buildSteps();
  const activeStep = steps[currentStep] ?? steps[0];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  /* ── Step validation ── */
  const canProceed = (): boolean => {
    if (!activeStep) return false;
    if (activeStep.key === "client_info") {
      return clientInfoSaved && privacyConsent;
    }
    if (activeStep.key === "briefing") {
      if (!briefing) return true;
      if (alreadySubmittedBriefing || briefingSubmitted) return true;
      return false;
    }
    if (activeStep.key === "contract") {
      return contractAccepted;
    }
    return true;
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!booking || !session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  const photographerName = photographer?.brand_name || photographer?.full_name || "Photographer";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg flex flex-col gap-6">

        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
            {photographerName}
          </p>
          <h1 className="text-xl font-light tracking-wide">{session.title}</h1>
          <p className="text-xs text-muted-foreground font-light">
            Complete the steps below to finalize your booking
          </p>
        </div>

        {/* ── Step Progress Indicator ── */}
        {steps.length > 1 && (
          <div className="flex items-center justify-center gap-0">
            {steps.map((step, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              return (
                <div key={step.key} className="flex items-center">
                  {/* Step circle + label */}
                  <button
                    onClick={() => {
                      // allow going back to completed steps
                      if (idx <= currentStep) setCurrentStep(idx);
                    }}
                    className={`flex flex-col items-center gap-1.5 px-2 transition-all ${
                      idx <= currentStep ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? "bg-foreground border-foreground text-background"
                          : isActive
                          ? "border-foreground text-foreground"
                          : "border-muted-foreground/30 text-muted-foreground/40"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-[11px] font-light">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] tracking-[0.15em] uppercase font-light transition-colors ${
                        isActive ? "text-foreground" : isCompleted ? "text-foreground/70" : "text-muted-foreground/40"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>

                  {/* Connector line */}
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-px w-8 sm:w-12 transition-colors mt-[-18px] ${
                        idx < currentStep ? "bg-foreground" : "bg-muted-foreground/20"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Step Content ── */}

        {/* Details */}
        {activeStep?.key === "details" && (
          <div className="border border-border divide-y divide-border">
            {session.cover_image_url && (
              <div className="aspect-video overflow-hidden">
                <img src={session.cover_image_url} alt={session.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2.5 text-[11px] text-muted-foreground">
                {booking.booked_date && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(booking.booked_date)}
                  </span>
                )}
                {avail && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatTime(avail.start_time)} – {formatTime(avail.end_time)}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-0" />
                  {session.duration_minutes} minutes
                </span>
                {session.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {session.location}
                  </span>
                )}
                {session.num_photos > 0 && (
                  <span className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    {session.num_photos} photos delivered
                  </span>
                )}
              </div>

              {bonuses.length > 0 && (
                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">What's included</p>
                  <div className="flex flex-col gap-1.5">
                    {bonuses.map((b, i) => (
                      <span key={i} className="flex items-center gap-2 text-xs font-light">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        {b.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Badge variant={booking.status === "confirmed" ? "default" : "secondary"} className="text-[9px] tracking-wider uppercase">
                  {booking.status}
                </Badge>
                <Badge variant={booking.payment_status === "paid" ? "default" : "secondary"} className="text-[9px] tracking-wider uppercase">
                  {booking.payment_status}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Client Info */}
        {activeStep?.key === "client_info" && (
          <div className="border border-border flex flex-col divide-y divide-border">
            <div className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs tracking-[0.2em] uppercase font-light">Your Information</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Please fill in your details so we can get in touch with you.
              </p>
            </div>

            {clientInfoSaved ? (
              <div className="p-5 flex flex-col items-center gap-3 text-center">
                <CheckCircle className="h-8 w-8 text-primary" strokeWidth={1.5} />
                <p className="text-sm font-light">Your information has been saved.</p>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setClientInfoSaved(false)}>
                  Edit
                </Button>
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-light">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={clientInfo.full_name}
                    onChange={(e) => setClientInfo((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Your full name"
                    className="text-sm font-light"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-light">Phone <span className="text-destructive">*</span></Label>
                  <Input
                    type="tel"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    className="text-sm font-light"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">Date of Birth</Label>
                    <Input
                      type="date"
                      value={clientInfo.birth_date}
                      onChange={(e) => setClientInfo((p) => ({ ...p, birth_date: e.target.value }))}
                      className="text-sm font-light"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">Instagram</Label>
                    <Input
                      value={clientInfo.instagram}
                      onChange={(e) => setClientInfo((p) => ({ ...p, instagram: e.target.value }))}
                      placeholder="@username"
                      className="text-sm font-light"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-light">Street Address</Label>
                  <Input
                    value={clientInfo.address_street}
                    onChange={(e) => setClientInfo((p) => ({ ...p, address_street: e.target.value }))}
                    placeholder="123 Main St"
                    className="text-sm font-light"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">City</Label>
                    <Input
                      value={clientInfo.address_city}
                      onChange={(e) => setClientInfo((p) => ({ ...p, address_city: e.target.value }))}
                      placeholder="City"
                      className="text-sm font-light"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">State</Label>
                    <Input
                      value={clientInfo.address_state}
                      onChange={(e) => setClientInfo((p) => ({ ...p, address_state: e.target.value }))}
                      placeholder="State"
                      className="text-sm font-light"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">ZIP Code</Label>
                    <Input
                      value={clientInfo.address_zip}
                      onChange={(e) => setClientInfo((p) => ({ ...p, address_zip: e.target.value }))}
                      placeholder="12345"
                      className="text-sm font-light"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">Country</Label>
                    <Input
                      value={clientInfo.address_country}
                      onChange={(e) => setClientInfo((p) => ({ ...p, address_country: e.target.value }))}
                      placeholder="Country"
                      className="text-sm font-light"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveClientInfo}
                  disabled={savingClientInfo || !clientInfo.full_name.trim() || !clientInfo.phone.trim()}
                  className="w-full text-xs tracking-wider uppercase font-light mt-1"
                >
                  {savingClientInfo ? "Saving…" : "Save & Continue"}
                </Button>

                {/* LGPD Consent Checkbox */}
                <label className="flex items-start gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-[11px] text-muted-foreground font-light leading-relaxed">
                    I agree to the collection and use of my data as described in the{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground hover:text-primary">
                      Privacy Policy
                    </a>.
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Briefing */}
        {activeStep?.key === "briefing" && briefing && (
          <div className="border border-border flex flex-col divide-y divide-border">
            <div className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs tracking-[0.2em] uppercase font-light">{briefing.name}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                We'd love to know a little more about you before your session.
              </p>
            </div>

            {alreadySubmittedBriefing || briefingSubmitted ? (
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

                    {q.type === "short_text" && (
                      <input
                        type="text"
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setTextAnswer(q.id, e.target.value)}
                        className="h-9 w-full px-3 text-sm font-light bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Your answer…"
                      />
                    )}

                    {q.type === "long_text" && (
                      <textarea
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setTextAnswer(q.id, e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm font-light bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        placeholder="Your answer…"
                      />
                    )}

                    {q.type === "multiple_choice" && (
                      <div className="flex flex-col gap-1.5">
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                            <input type="radio" name={q.id} value={opt} checked={(answers[q.id] as string) === opt} onChange={() => setTextAnswer(q.id, opt)} className="h-3.5 w-3.5 accent-foreground" />
                            <span className="text-sm font-light">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "checkboxes" && (
                      <div className="flex flex-col gap-1.5">
                        {q.options.map((opt) => {
                          const current = (answers[q.id] as string[]) ?? [];
                          return (
                            <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                              <input type="checkbox" checked={current.includes(opt)} onChange={(e) => setCheckboxAnswer(q.id, opt, e.target.checked)} className="h-3.5 w-3.5 accent-foreground" />
                              <span className="text-sm font-light">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "yes_no" && (
                      <div className="flex gap-4">
                        {["Yes", "No"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name={q.id} value={opt} checked={(answers[q.id] as string) === opt} onChange={() => setTextAnswer(q.id, opt)} className="h-3.5 w-3.5 accent-foreground" />
                            <span className="text-sm font-light">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <Button onClick={handleSubmitBriefing} disabled={submittingBriefing} className="w-full text-xs tracking-wider uppercase font-light mt-1">
                  {submittingBriefing ? "Submitting…" : "Submit Briefing"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Contract */}
        {activeStep?.key === "contract" && session.contract_text && (
          <div className="border border-border flex flex-col divide-y divide-border">
            <div className="p-5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs tracking-[0.2em] uppercase font-light">Service Agreement</p>
            </div>

            <div className="p-5">
              <div
                className="prose prose-sm max-w-none text-xs font-light leading-relaxed max-h-80 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: session.contract_text }}
              />
            </div>

            <div className="p-5 flex flex-col gap-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contractAccepted}
                  onChange={(e) => setContractAccepted(e.target.checked)}
                  className="h-4 w-4 accent-foreground mt-0.5"
                />
                <span className="text-xs font-light text-muted-foreground">
                  I have read and agree to the terms of this service agreement.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Payment */}
        {activeStep?.key === "payment" && (
          <div className="border border-border flex flex-col divide-y divide-border">
            <div className="p-5 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs tracking-[0.2em] uppercase font-light">Payment</p>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-light">{session.title}</span>
                  <span className="font-light">{formatCurrency(session.price)}</span>
                </div>
                <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(session.price)}</span>
                </div>
              </div>

              {booking.payment_status === "paid" ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-light">Payment received — thank you!</span>
                </div>
              ) : (
                <Button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="w-full text-xs tracking-wider uppercase font-light gap-2"
                >
                  {paymentLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Proceed to Payment
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        {steps.length > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goBack}
              disabled={isFirstStep}
              className="text-xs gap-1.5 tracking-wider uppercase font-light"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Button>

            {!isLastStep ? (
              <Button
                size="sm"
                onClick={goNext}
                disabled={!canProceed()}
                className="text-xs gap-1.5 tracking-wider uppercase font-light"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              // On the last step (payment), no "Next" button needed — payment button handles it
              <div />
            )}
          </div>
        )}

        {/* Step hint */}
        {steps.length > 1 && (
          <p className="text-center text-[10px] text-muted-foreground/50 font-light">
            Step {currentStep + 1} of {steps.length}
          </p>
        )}
      </div>

      <footer className="mt-16">
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40">Powered by Davions</p>
      </footer>
    </div>
  );
};

export default BookingConfirm;
