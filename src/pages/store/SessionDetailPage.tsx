import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { useCustomDomainSlug } from "@/contexts/CustomDomainSlugContext";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  addDays,
  format,
  getDay,
  isBefore,
  startOfToday,
  parse,
  addMinutes,
  isSameDay,
} from "date-fns";
import { ArrowLeft, Camera, Check, Clock, Loader2, MapPin, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface SessionDetail {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  break_after_minutes: number;
  num_photos: number;
  location: string | null;
  cover_image_url: string | null;
  photographer_id: string;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  tax_rate: number;
  allow_tip: boolean;
  booking_notice_days: number;
  booking_window_days: number;
  contract_text: string | null;
}

interface PhotographerInfo {
  full_name: string | null;
  hero_image_url: string | null;
}

interface WeeklySlotDef {
  id: string;
  day_of_week: number;
  start_time: string;
}

interface GeneratedSlot {
  availabilityId: string;
  date: Date;
  start_time: string;
  end_time: string;
  label: string;
}

interface SessionExtra {
  id: string;
  description: string;
  price: number;
  quantity: number;
}

interface SelectedExtra {
  id: string;
  description: string;
  price: number;
  qty: number;
  maxQty: number;
}

type BookingStep = "slots" | "form" | "addons" | "review";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const generateOccurrences = (
  defs: WeeklySlotDef[],
  bookedKeys: Set<string>,
  durationMin: number,
  noticeDays: number,
  windowDays: number
): GeneratedSlot[] => {
  const today = startOfToday();
  const result: GeneratedSlot[] = [];

  for (let offset = noticeDays; offset < windowDays; offset++) {
    const date = addDays(today, offset);
    const dayOfWeek = getDay(date);

    for (const def of defs) {
      if (def.day_of_week !== dayOfWeek) continue;

      const startHHmm = def.start_time.slice(0, 5);
      const startDate = parse(startHHmm, "HH:mm", date);
      if (isBefore(startDate, new Date())) continue;

      const dateKey = format(date, "yyyy-MM-dd");
      const key = `${def.id}_${dateKey}`;
      if (bookedKeys.has(key)) continue;

      const endDate = addMinutes(startDate, durationMin);
      result.push({
        availabilityId: def.id,
        date,
        start_time: startHHmm,
        end_time: format(endDate, "HH:mm"),
        label: format(date, "EEEE, MMMM d"),
      });
    }
  }

  return result;
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "P";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
};

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

const SessionDetailPage = () => {
  const { slug, sessionSlug } = useParams();
  const customDomainSlug = useCustomDomainSlug();
  const backPath = customDomainSlug ? "/" : `/store/${slug ?? customDomainSlug}`;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [photographer, setPhotographer] = useState<PhotographerInfo | null>(null);
  const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlot[]>([]);
  const [extras, setExtras] = useState<SessionExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("slots");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contractAgreed, setContractAgreed] = useState(false);

  // ────────────────────────────────────────────
  // Load
  // ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionSlug ?? "");
      const query = supabase.from("sessions").select("*").eq("status", "active");
      const { data: sessionData } = await (isUuid
        ? query.eq("id", sessionSlug!)
        : query.eq("slug", sessionSlug!)
      ).single();

      if (!sessionData) {
        setLoading(false);
        return;
      }
      const s = sessionData as unknown as SessionDetail;
      setSession(s);

      const { data: photographerData } = await supabase
        .from("photographers")
        .select("full_name, hero_image_url")
        .eq("id", s.photographer_id)
        .single();
      if (photographerData) {
        setPhotographer(photographerData as PhotographerInfo);
      }

      const { data: extrasData } = await supabase
        .from("session_extras")
        .select("id, description, price, quantity")
        .eq("session_id", s.id);
      setExtras((extrasData ?? []) as SessionExtra[]);

      const { data: availData } = await supabase
        .from("session_availability")
        .select("id, day_of_week, start_time")
        .eq("session_id", s.id)
        .not("day_of_week", "is", null);

      const defs: WeeklySlotDef[] = (availData ?? []).map((a) => ({
        id: a.id,
        day_of_week: (a as unknown as { day_of_week: number }).day_of_week,
        start_time: a.start_time,
      }));

      const noticeDays = s.booking_notice_days ?? 1;
      const windowDays = s.booking_window_days ?? 60;
      const fromDate = format(addDays(startOfToday(), noticeDays), "yyyy-MM-dd");
      const toDate = format(addDays(startOfToday(), windowDays), "yyyy-MM-dd");

      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("availability_id, booked_date")
        .in("availability_id", defs.map((d) => d.id))
        .gte("booked_date", fromDate)
        .lte("booked_date", toDate)
        .in("status", ["pending", "confirmed"]);

      const bookedKeys = new Set<string>(
        (bookingsData ?? [])
          .filter((b) => b.booked_date)
          .map((b) => `${b.availability_id}_${b.booked_date}`)
      );

      const occurrences = generateOccurrences(defs, bookedKeys, s.duration_minutes, noticeDays, windowDays);
      setGeneratedSlots(occurrences);
      setLoading(false);
    };
    load();
  }, [sessionSlug]);

  // ────────────────────────────────────────────
  // Extras helpers
  // ────────────────────────────────────────────

  const toggleExtra = (extra: SessionExtra) => {
    setSelectedExtras((prev) => {
      const existing = prev.find((e) => e.id === extra.id);
      if (existing) return prev.filter((e) => e.id !== extra.id);
      return [...prev, { id: extra.id, description: extra.description, price: extra.price, qty: 1, maxQty: extra.quantity > 1 ? extra.quantity : 99 }];
    });
  };

  const changeExtraQty = (id: string, delta: number) => {
    setSelectedExtras((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, qty: Math.max(1, Math.min(e.maxQty, e.qty + delta)) }
          : e
      )
    );
  };

  // ────────────────────────────────────────────
  // Pricing
  // ────────────────────────────────────────────

  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price * e.qty, 0);
  const sessionPrice = session?.price ?? 0;
  const subtotal = sessionPrice + extrasTotal;
  const taxAmount = session ? Math.round(subtotal * (session.tax_rate / 100)) : 0;
  const total = subtotal + taxAmount;

  // percent deposit: X% of total (subtotal + tax); fixed: stored value in cents
  const depositAmountCents = session
    ? session.deposit_type === "percent"
      ? Math.round(total * (session.deposit_amount / 100))
      : session.deposit_amount
    : 0;

  const chargeAmount = session?.deposit_enabled ? depositAmountCents : total;

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  // ────────────────────────────────────────────
  // Calendar helpers
  // ────────────────────────────────────────────

  const availableDateKeys = new Set(
    generatedSlots.map((s) => format(s.date, "yyyy-MM-dd"))
  );

  const isDayDisabled = (date: Date) => {
    return !availableDateKeys.has(format(date, "yyyy-MM-dd"));
  };

  const slotsForSelectedDate = selectedDate
    ? generatedSlots.filter((s) => isSameDay(s.date, selectedDate))
    : [];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  // ────────────────────────────────────────────
  // Checkout
  // ────────────────────────────────────────────

  const handleCheckout = async () => {
    if (!session || !selectedSlot || !clientName.trim() || !clientEmail.trim()) return;
    setSubmitting(true);

    const bookedDate = format(selectedSlot.date, "yyyy-MM-dd");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: any = {
      session_id: session.id,
      availability_id: selectedSlot.availabilityId,
      photographer_id: session.photographer_id,
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      status: "pending",
      payment_status: "pending",
      booked_date: bookedDate,
    };
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .insert(insertPayload)
      .select("id")
      .single();

    if (bookingError || !bookingData) {
      toast({ title: "Failed to create booking", description: bookingError?.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    try {
      const { data: checkoutData, error: fnError } = await supabase.functions.invoke(
        "create-session-checkout",
        {
          body: {
            bookingId: bookingData.id,
            sessionId: session.id,
            slotId: selectedSlot.availabilityId,
            bookedDate,
            clientEmail: clientEmail.trim(),
            clientName: clientName.trim(),
            selectedExtras: selectedExtras.map((e) => ({
              id: e.id,
              description: e.description,
              price: e.price,
              qty: e.qty,
            })),
          },
        }
      );

      if (fnError || !checkoutData?.url) {
        throw new Error(fnError?.message || "No payment URL returned");
      }
      window.location.href = checkoutData.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Payment error", description: message, variant: "destructive" });
      await supabase.from("bookings").delete().eq("id", bookingData.id);
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────
  // Loading / not found
  // ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-light text-muted-foreground">Session not found.</p>
        <Button variant="ghost" onClick={() => navigate(backPath)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to the store
        </Button>
      </div>
    );
  }

  const heroImage = session.cover_image_url || photographer?.hero_image_url || null;
  const initials = getInitials(photographer?.full_name);

  // ────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[hsl(var(--muted))]" style={{ backgroundColor: "#f5f2ee" }}>

      {/* ══════════════ HERO ══════════════ */}
      <div className="relative w-full h-[42vh] min-h-[280px] overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={session.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-foreground" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/50" />

        <button
          onClick={() => navigate(backPath)}
          className="absolute top-5 left-5 text-white/70 hover:text-white transition-colors z-10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="h-16 w-16 rounded-full border-2 border-white/80 bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-lg font-light tracking-widest">{initials}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {photographer?.full_name && (
              <p className="text-white/60 text-[10px] tracking-[0.35em] uppercase">
                {photographer.full_name}
              </p>
            )}
            <h1 className="text-white text-xl font-light tracking-wide">
              {step === "slots" && "Please select a date and time"}
              {step === "form" && "Enter your details"}
              {step === "addons" && "Customize your session"}
              {step === "review" && "Review & confirm"}
            </h1>
          </div>
        </div>
      </div>

      {/* ══════════════ CONTENT ══════════════ */}
      {step !== "review" ? (
        <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">

          {/* ── Session Info Card ── */}
          <div className="bg-background rounded-sm shadow-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-light tracking-wide text-foreground">{session.title}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {session.duration_minutes} min
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-foreground font-light text-sm">{formatCurrency(session.price)}</span>
                {session.num_photos > 0 && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 shrink-0" />
                      {session.num_photos} photos
                    </span>
                  </>
                )}
                {session.location && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {session.location}
                    </span>
                  </>
                )}
              </div>
            </div>
            {session.description && (
              <p className="text-sm font-light text-muted-foreground leading-relaxed">
                {session.description}
              </p>
            )}
          </div>

          {/* ── Step 1: slots ── */}
          {step === "slots" && (
            <>
              <div className="bg-background rounded-sm shadow-sm overflow-hidden">
                {generatedSlots.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-light text-muted-foreground">No available slots at this time.</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
                    <div className="sm:flex-1 p-4">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={isDayDisabled}
                        fromDate={addDays(startOfToday(), session.booking_notice_days ?? 1)}
                        toDate={addDays(startOfToday(), session.booking_window_days ?? 60)}
                        className="pointer-events-auto w-full"
                        classNames={{
                          months: "w-full",
                          month: "w-full space-y-3",
                          caption: "flex justify-center pt-1 relative items-center mb-2",
                          caption_label: "text-xs font-light tracking-[0.25em] uppercase text-foreground",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-40 hover:opacity-100 border border-border flex items-center justify-center transition-opacity",
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          table: "w-full border-collapse",
                          head_row: "flex w-full",
                          head_cell: "text-muted-foreground/60 flex-1 font-normal text-[0.7rem] text-center pb-1",
                          row: "flex w-full mt-1",
                          cell: "flex-1 h-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                          day: cn(
                            "h-9 w-full p-0 font-normal aria-selected:opacity-100 transition-colors text-xs",
                            "hover:bg-accent hover:text-accent-foreground rounded-none"
                          ),
                          day_selected: "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background rounded-none font-normal",
                          day_today: "bg-accent/60 text-accent-foreground rounded-none",
                          day_disabled: "text-muted-foreground/25 pointer-events-none",
                          day_outside: "text-muted-foreground/25 opacity-40",
                        }}
                        components={{
                          DayContent: ({ date }) => {
                            const key = format(date, "yyyy-MM-dd");
                            const hasSlots = availableDateKeys.has(key);
                            return (
                              <div className="flex flex-col items-center justify-center h-full gap-[2px]">
                                <span>{date.getDate()}</span>
                                {hasSlots && (
                                  <span className="h-[3px] w-[3px] rounded-full bg-current opacity-60" />
                                )}
                              </div>
                            );
                          },
                        }}
                      />
                    </div>
                    <div className="sm:w-48 p-4 flex flex-col gap-3">
                      {!selectedDate ? (
                        <div className="flex-1 flex items-center justify-center py-8 sm:py-0">
                          <p className="text-xs text-muted-foreground/60 text-center">
                            Select a date<br />to see times
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-light">
                            {format(selectedDate, "EEE, MMM d")}
                          </p>
                          {slotsForSelectedDate.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No slots for this day.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {slotsForSelectedDate.map((slot, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={cn(
                                    "w-full px-3 py-2 text-xs border transition-colors tracking-wider text-left",
                                    selectedSlot &&
                                      selectedSlot.availabilityId === slot.availabilityId &&
                                      isSameDay(selectedSlot.date, slot.date)
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-border hover:border-foreground/40 text-foreground"
                                  )}
                                >
                                  {slot.start_time}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setStep("form")}
                disabled={!selectedSlot}
                className="w-full text-xs tracking-wider uppercase font-light rounded-none h-11"
              >
                Continue →
              </Button>
            </>
          )}

          {/* ── Step 2: Form ── */}
          {step === "form" && selectedSlot && (
            <div className="bg-background rounded-sm shadow-sm p-6 flex flex-col gap-5">
              <div className="border border-border p-4 flex flex-col gap-1">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Selected slot</p>
                <p className="text-sm font-light capitalize">{selectedSlot.label}</p>
                <p className="text-xs text-muted-foreground">{selectedSlot.start_time} – {selectedSlot.end_time}</p>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Your details</p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientName" className="text-xs tracking-wider uppercase font-light">Full Name *</Label>
                  <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Your name" className="rounded-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientEmail" className="text-xs tracking-wider uppercase font-light">Email *</Label>
                  <div className="relative">
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => {
                        // allow only valid email characters while typing
                        const val = e.target.value.replace(/\s/g, "");
                        setClientEmail(val);
                      }}
                      placeholder="you@email.com"
                      className={cn(
                        "rounded-none pr-8",
                        clientEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)
                          ? "border-destructive focus-visible:ring-destructive"
                          : clientEmail.length > 0
                          ? "border-foreground"
                          : ""
                      )}
                    />
                    {clientEmail.length > 0 && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none">
                        {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) ? (
                          <Check className="h-3.5 w-3.5 text-foreground" />
                        ) : (
                          <span className="text-destructive font-light">✕</span>
                        )}
                      </span>
                    )}
                  </div>
                  {clientEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) && (
                    <p className="text-[10px] text-destructive font-light">Enter a valid email address</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientPhone" className="text-xs tracking-wider uppercase font-light">Phone</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      let masked = digits;
                      if (digits.length >= 7) {
                        masked = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                      } else if (digits.length >= 4) {
                        masked = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                      } else if (digits.length > 0) {
                        masked = `(${digits}`;
                      }
                      setClientPhone(masked);
                    }}
                    placeholder="(555) 555-0100"
                    className="rounded-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientNotes" className="text-xs tracking-wider uppercase font-light">Notes</Label>
                  <Textarea id="clientNotes" value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="Any requests or observations..." rows={3} className="rounded-none resize-none text-sm font-light" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("slots")} className="text-xs tracking-wider uppercase font-light rounded-none">Back</Button>
                <Button onClick={() => setStep("addons")} disabled={!clientName.trim() || !clientEmail.trim()} className="flex-1 text-xs tracking-wider uppercase font-light rounded-none h-11">
                  Continue →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Add-ons ── */}
          {step === "addons" && selectedSlot && (
            <div className="flex flex-col gap-5">
              <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-3">
                <div className="border border-border p-4 flex flex-col gap-1">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Selected slot</p>
                  <p className="text-sm font-light capitalize">{selectedSlot.label}</p>
                  <p className="text-xs text-muted-foreground">{selectedSlot.start_time} – {selectedSlot.end_time}</p>
                </div>
                <div className="border border-border p-4 flex flex-col gap-1">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Your details</p>
                  <p className="text-sm font-light">{clientName}</p>
                  <p className="text-xs text-muted-foreground">{clientEmail}</p>
                  {clientPhone && <p className="text-xs text-muted-foreground">{clientPhone}</p>}
                  {clientNotes && <p className="text-xs text-muted-foreground italic mt-1">"{clientNotes}"</p>}
                </div>
              </div>

              {extras.length > 0 && (
                <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Add-ons</p>
                  <div className="flex flex-col gap-2">
                    {extras.map((extra) => {
                      const sel = selectedExtras.find((e) => e.id === extra.id);
                      return (
                        <div
                          key={extra.id}
                          className={cn(
                            "border p-3 flex items-center justify-between transition-colors cursor-pointer",
                            sel ? "border-foreground" : "border-border hover:border-foreground/30"
                          )}
                          onClick={() => toggleExtra(extra)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-4 w-4 border flex items-center justify-center shrink-0 transition-colors",
                              sel ? "border-foreground bg-foreground" : "border-border"
                            )}>
                              {sel && <Check className="h-2.5 w-2.5 text-background" />}
                            </div>
                            <div>
                              <p className="text-xs font-light">{extra.description}</p>
                              <p className="text-[10px] text-muted-foreground">{formatCurrency(extra.price)} por unidade</p>
                            </div>
                          </div>
                          {sel && (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => changeExtraQty(extra.id, -1)} className="h-6 w-6 border border-border flex items-center justify-center hover:border-foreground transition-colors">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs w-4 text-center">{sel.qty}</span>
                              <button onClick={() => changeExtraQty(extra.id, +1)} disabled={sel.qty >= sel.maxQty} className="h-6 w-6 border border-border flex items-center justify-center hover:border-foreground transition-colors disabled:opacity-40">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Order summary</p>
                <div className="flex justify-between text-xs font-light">
                  <span className="text-muted-foreground">{session.title}</span>
                  <span>{formatCurrency(session.price)}</span>
                </div>
                {selectedExtras.map((e) => (
                  <div key={e.id} className="flex justify-between text-xs font-light">
                    <span className="text-muted-foreground">{e.description} × {e.qty}</span>
                    <span>{formatCurrency(e.price * e.qty)}</span>
                  </div>
                ))}
                {session.tax_rate > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border pt-2 mt-1">
                    <span>Tax ({session.tax_rate}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-light border-t border-border pt-2 mt-1">
                  <span className="text-muted-foreground">Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {session.deposit_enabled && (
                  <div className="flex justify-between text-xs font-light text-primary mt-1 pt-1 border-t border-border">
                    <span>Due today (deposit)</span>
                    <span>{formatCurrency(chargeAmount)}</span>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1 capitalize">
                  {selectedSlot.label} · {selectedSlot.start_time}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("form")} className="text-xs tracking-wider uppercase font-light rounded-none">Back</Button>
                <Button
                  onClick={() => setStep("review")}
                  className="flex-1 text-xs tracking-wider uppercase font-light rounded-none h-11"
                >
                  Review & confirm →
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ══════════════ STEP 4: REVIEW ══════════════ */
        selectedSlot && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-6 items-start">

              {/* ── LEFT: confirmation + contract ── */}
              <div className="flex-1 min-w-0 flex flex-col gap-5">

                {/* Booking summary grid */}
                <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Booking summary</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-border p-3 flex flex-col gap-0.5">
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Date & time</p>
                      <p className="text-sm font-light capitalize mt-1">{selectedSlot.label}</p>
                      <p className="text-xs text-muted-foreground">{selectedSlot.start_time} – {selectedSlot.end_time}</p>
                    </div>
                    <div className="border border-border p-3 flex flex-col gap-0.5">
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Client</p>
                      <p className="text-sm font-light mt-1">{clientName}</p>
                      <p className="text-xs text-muted-foreground">{clientEmail}</p>
                      {clientPhone && <p className="text-xs text-muted-foreground">{clientPhone}</p>}
                    </div>
                  </div>
                  {clientNotes && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
                      "{clientNotes}"
                    </p>
                  )}
                </div>

                {/* Contract or "all set" */}
                {session.contract_text ? (
                  <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-4">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Service agreement</p>
                    <div
                      className="max-h-[55vh] overflow-y-auto text-xs font-light text-foreground leading-relaxed whitespace-pre-wrap border border-border p-4"
                      style={{
                        maskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
                      }}
                    >
                      {session.contract_text}
                    </div>
                    <div
                      className="flex items-start gap-3 cursor-pointer select-none"
                      onClick={() => setContractAgreed(!contractAgreed)}
                    >
                      <div className={cn(
                        "mt-0.5 h-4 w-4 border shrink-0 flex items-center justify-center transition-colors",
                        contractAgreed ? "border-foreground bg-foreground" : "border-border"
                      )}>
                        {contractAgreed && <Check className="h-2.5 w-2.5 text-background" />}
                      </div>
                      <p className="text-xs font-light text-foreground leading-relaxed">
                        I have read and agree to the service agreement above.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-background rounded-sm shadow-sm p-5 flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-light text-foreground">Everything looks good!</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Review your order summary and proceed to payment.</p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("addons")} className="text-xs tracking-wider uppercase font-light rounded-none">
                    Back
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    disabled={submitting || (!!session.contract_text && !contractAgreed)}
                    className="flex-1 gap-2 text-xs tracking-wider uppercase font-light rounded-none h-11"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {session.deposit_enabled
                      ? `Pay deposit ${formatCurrency(chargeAmount)}`
                      : `Pay ${formatCurrency(chargeAmount)}`}
                  </Button>
                </div>
              </div>

              {/* ── RIGHT: floating order card ── */}
              <div className="w-full lg:w-72 lg:sticky lg:top-6 shrink-0">
                <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-3">

                  {/* Photographer + session title */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <div className="h-9 w-9 rounded-full border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {photographer?.hero_image_url ? (
                        <img src={photographer.hero_image_url} alt={photographer.full_name ?? ""} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-light tracking-widest text-muted-foreground">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-light text-foreground truncate">{session.title}</p>
                      {photographer?.full_name && (
                        <p className="text-[10px] text-muted-foreground truncate">{photographer.full_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Date / time */}
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Date & time</p>
                    <p className="text-xs font-light capitalize">{selectedSlot.label}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedSlot.start_time} – {selectedSlot.end_time}</p>
                  </div>

                  {/* Pricing */}
                  <div className="flex flex-col gap-1.5 border-t border-border pt-3 mt-1">
                    <div className="flex justify-between text-xs font-light">
                      <span className="text-muted-foreground truncate mr-2">{session.title}</span>
                      <span className="shrink-0">{formatCurrency(session.price)}</span>
                    </div>
                    {selectedExtras.map((e) => (
                      <div key={e.id} className="flex justify-between text-xs font-light">
                        <span className="text-muted-foreground truncate mr-2">{e.description} × {e.qty}</span>
                        <span className="shrink-0">{formatCurrency(e.price * e.qty)}</span>
                      </div>
                    ))}
                    {session.tax_rate > 0 && (
                      <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border pt-1.5 mt-0.5">
                        <span>Tax ({session.tax_rate}%)</span>
                        <span>{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-light border-t border-border pt-1.5 mt-0.5">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    {session.deposit_enabled && (
                      <div className="flex justify-between text-xs font-light text-primary pt-1.5 mt-0.5 border-t border-border">
                        <span>Due today</span>
                        <span className="font-normal">{formatCurrency(chargeAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )
      )}

      <footer className="py-8 text-center">
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40">
          Powered by Davions
        </p>
      </footer>
    </div>
  );
};

export default SessionDetailPage;
