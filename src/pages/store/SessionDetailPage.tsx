import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
der2, MapPin } from "lucide-react";
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
}

interface WeeklySlotDef {
  id: string;
  day_of_week: number;
  start_time: string; // "HH:mm:ss"
}

interface GeneratedSlot {
  availabilityId: string;
  date: Date;
  start_time: string; // "HH:mm"
  end_time: string;   // "HH:mm"
  label: string;      // display label
}

type BookingStep = "slots" | "form";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const LOOK_AHEAD_DAYS = 60;

/** Generate next occurrences for each weekly slot def, within LOOK_AHEAD_DAYS. */
const generateOccurrences = (
  defs: WeeklySlotDef[],
  bookedKeys: Set<string>, // "availId_yyyy-MM-dd"
  durationMin: number
): GeneratedSlot[] => {
  const today = startOfToday();
  const result: GeneratedSlot[] = [];

  for (let offset = 0; offset < LOOK_AHEAD_DAYS; offset++) {
    const date = addDays(today, offset);
    const dayOfWeek = getDay(date); // 0=Sun

    for (const def of defs) {
      if (def.day_of_week !== dayOfWeek) continue;

      // Skip if in the past (same-day slots before now)
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
        label: format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }),
     MMMM d";
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
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("slots");

  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
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

      // Fetch confirmed bookings for these slots (next 60 days)
      const today = format(startOfToday(), "yyyy-MM-dd");
      const endDate = format(addDays(startOfToday(), LOOK_AHEAD_DAYS), "yyyy-MM-dd");
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("availability_id, booked_date")
        .in("availability_id", defs.map((d) => d.id))
        .gte("booked_date", today)
        .lte("booked_date", endDate)
        .in("status", ["pending", "confirmed"]);

      const bookedKeys = new Set<string>(
        (bookingsData ?? [])
          .filter((b) => b.booked_date)
          .map((b) => `${b.availability_id}_${b.booked_date}`)
      );

      const occurrences = generateOccurrences(defs, bookedKeys, s.duration_minutes);
      setGeneratedSlots(occurrences);
      setLoading(false);
    };
    load();
  }, [sessionId]);

  // ────────────────────────────────────────────
  // Checkout
  // ────────────────────────────────────────────

  const handleCheckout = async () => {
    if (!session || !selectedSlot || !clientName.trim() || !clientEmail.trim()) return;
    setSubmitting(true);

    const bookedDate = format(selectedSlot.date, "yyyy-MM-dd");

    // 1. Create pending booking
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
      toast({ title: "Erro ao criar reserva", description: bookingError?.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // 2. Create Stripe checkout session
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
          },
        }
      );

      if (fnError || !checkoutData?.url) {
        throw new Error(fnError?.message || "Sem URL de pagamento");
      }
      window.location.href = checkoutData.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro no pagamento", description: message, variant: "destructive" });
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

  const priceFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(session.price / 100);

  // Group generated slots by formatted date string for display
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
          {/* Session Info */}
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
              <p className="text-2xl font-light pt-2">{priceFormatted}</p>
            </div>
          </div>

          {/* Booking Panel */}
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
                    Horário selecionado
                  </p>
                  <p className="text-sm font-light capitalize">{selectedSlot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSlot.start_time} – {selectedSlot.end_time}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    Seus dados
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="clientName" className="text-xs tracking-wider uppercase font-light">
                      Nome Completo *
                    </Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="clientEmail" className="text-xs tracking-wider uppercase font-light">
                      E-mail *
                    </Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                {/* Order summary */}
                <div className="border border-border p-4 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-light">
                    <span className="text-muted-foreground">{session.title}</span>
                    <span>{priceFormatted}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground capitalize">
                    <span>{selectedSlot.label} · {selectedSlot.start_time}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("slots")}
                    className="text-xs tracking-wider uppercase font-light"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    disabled={submitting || !clientName.trim() || !clientEmail.trim()}
                    className="flex-1 gap-2 text-xs tracking-wider uppercase font-light"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Pagar {priceFormatted}
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
