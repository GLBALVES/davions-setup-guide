import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomDomainSlug } from "@/contexts/CustomDomainSlugContext";
import { Label } from "@/components/ui/label";
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
  tax_rate: number;
  allow_tip: boolean;
  booking_notice_days: number;
  booking_window_days: number;
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

type BookingStep = "slots" | "form";

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

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

const SessionDetailPage = () => {
  const { slug, sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlot[]>([]);
  const [extras, setExtras] = useState<SessionExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("slots");

  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ────────────────────────────────────────────
  // Load
  // ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId!)
        .eq("status", "active")
        .single();

      if (!sessionData) {
        setLoading(false);
        return;
      }
      const s = sessionData as unknown as SessionDetail;
      setSession(s);

      // Fetch extras
      const { data: extrasData } = await supabase
        .from("session_extras")
        .select("id, description, price, quantity")
        .eq("session_id", sessionId!);
      setExtras((extrasData ?? []) as SessionExtra[]);

      // Fetch weekly slot definitions
      const { data: availData } = await supabase
        .from("session_availability")
        .select("id, day_of_week, start_time")
        .eq("session_id", sessionId!)
        .not("day_of_week", "is", null);

      const defs: WeeklySlotDef[] = (availData ?? []).map((a) => ({
        id: a.id,
        day_of_week: (a as unknown as { day_of_week: number }).day_of_week,
        start_time: a.start_time,
      }));

      // Fetch confirmed bookings
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
  }, [sessionId]);

  // ────────────────────────────────────────────
  // Extras helpers
  // ────────────────────────────────────────────

  const toggleExtra = (extra: SessionExtra) => {
    setSelectedExtras((prev) => {
      const existing = prev.find((e) => e.id === extra.id);
      if (existing) return prev.filter((e) => e.id !== extra.id);
      return [...prev, { id: extra.id, description: extra.description, price: extra.price, qty: 1, maxQty: extra.quantity }];
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

  const chargeAmount = session?.deposit_enabled
    ? session.deposit_amount + extrasTotal + taxAmount
    : total;

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

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
        <Button variant="ghost" onClick={() => navigate(`/store/${slug}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to the store
        </Button>
      </div>
    );
  }

  const slotsByDate = generatedSlots.reduce<Record<string, GeneratedSlot[]>>((acc, s) => {
    const key = format(s.date, "yyyy-MM-dd");
    acc[key] = [...(acc[key] ?? []), s];
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(`/store/${slug}`)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
          Book a Session
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* ── Session Info ── */}
          <div className="flex flex-col gap-6">
            {session.cover_image_url && (
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={session.cover_image_url}
                  alt={session.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex flex-col gap-3">
              <h1 className="text-xl font-light tracking-wide">{session.title}</h1>
              {session.description && (
                <p className="text-sm font-light text-muted-foreground">{session.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {session.duration_minutes} minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {session.num_photos} photos
                </span>
                {session.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {session.location}
                  </span>
                )}
              </div>
              <p className="text-2xl font-light pt-2">{formatCurrency(session.price)}</p>
            </div>

            {/* Extras */}
            {extras.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  Add-ons
                </p>
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
                            <p className="text-[10px] text-muted-foreground">
                              {formatCurrency(extra.price)} · max {extra.quantity}
                            </p>
                          </div>
                        </div>
                        {sel && (
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => changeExtraQty(extra.id, -1)}
                              className="h-6 w-6 border border-border flex items-center justify-center hover:border-foreground transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs w-4 text-center">{sel.qty}</span>
                            <button
                              onClick={() => changeExtraQty(extra.id, +1)}
                              disabled={sel.qty >= sel.maxQty}
                              className="h-6 w-6 border border-border flex items-center justify-center hover:border-foreground transition-colors disabled:opacity-40"
                            >
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
          </div>

          {/* ── Booking Panel ── */}
          <div className="flex flex-col gap-6">
            {step === "slots" && (
              <>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">
                    Choose a date &amp; time
                  </p>
                  {generatedSlots.length === 0 ? (
                    <p className="text-sm font-light text-muted-foreground text-center py-8 border border-dashed border-border">
                      No available slots at this time.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-5 max-h-[420px] overflow-y-auto pr-1">
                      {Object.entries(slotsByDate).map(([dateKey, daySlots]) => (
                        <div key={dateKey}>
                          <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 capitalize">
                            {daySlots[0].label}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {daySlots.map((slot, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedSlot(slot)}
                                className={cn(
                                  "px-3 py-2 text-xs border transition-colors tracking-wider",
                                  selectedSlot &&
                                    selectedSlot.availabilityId === slot.availabilityId &&
                                    isSameDay(selectedSlot.date, slot.date)
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-border hover:border-foreground/40"
                                )}
                              >
                                {slot.start_time}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => setStep("form")}
                  disabled={!selectedSlot}
                  className="w-full text-xs tracking-wider uppercase font-light"
                >
                  Continue →
                </Button>
              </>
            )}

            {step === "form" && selectedSlot && (
              <>
                {/* Selected slot summary */}
                <div className="border border-border p-4 flex flex-col gap-1">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
                    Selected slot
                  </p>
                  <p className="text-sm font-light capitalize">{selectedSlot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSlot.start_time} – {selectedSlot.end_time}
                  </p>
                </div>

                {/* Client details */}
                <div className="flex flex-col gap-4">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    Your details
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="clientName" className="text-xs tracking-wider uppercase font-light">
                      Full Name *
                    </Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="clientEmail" className="text-xs tracking-wider uppercase font-light">
                      Email *
                    </Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="you@email.com"
                    />
                  </div>
                </div>

                {/* Order summary */}
                <div className="border border-border p-4 flex flex-col gap-2">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">
                    Order summary
                  </p>
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
                  <Button
                    variant="outline"
                    onClick={() => setStep("slots")}
                    className="text-xs tracking-wider uppercase font-light"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    disabled={submitting || !clientName.trim() || !clientEmail.trim()}
                    className="flex-1 gap-2 text-xs tracking-wider uppercase font-light"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {session.deposit_enabled
                      ? `Pay deposit ${formatCurrency(chargeAmount)}`
                      : `Pay ${formatCurrency(chargeAmount)}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center mt-10">
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/50">
          Powered by Davions
        </p>
      </footer>
    </div>
  );
};

export default SessionDetailPage;
