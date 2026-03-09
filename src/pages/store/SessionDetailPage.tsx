import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Camera, Clock, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionDetail {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  num_photos: number;
  location: string | null;
  cover_image_url: string | null;
  photographer_id: string;
}

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

type BookingStep = "slots" | "form" | "pay";

const SessionDetailPage = () => {
  const { slug, sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("slots");

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setSession(sessionData as SessionDetail);

      const { data: availData } = await supabase
        .from("session_availability")
        .select("id, date, start_time, end_time, is_booked")
        .eq("session_id", sessionId!)
        .eq("is_booked", false)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });

      setSlots((availData ?? []) as Slot[]);
      setLoading(false);
    };
    load();
  }, [sessionId]);

  const handleProceedToForm = () => {
    if (!selectedSlot) return;
    setStep("form");
  };

  const handleCheckout = async () => {
    if (!session || !selectedSlot || !clientName.trim() || !clientEmail.trim()) return;
    setSubmitting(true);

    // 1. Create pending booking
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        session_id: session.id,
        availability_id: selectedSlot.id,
        photographer_id: session.photographer_id,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        status: "pending",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (bookingError || !bookingData) {
      toast({ title: "Error creating booking", description: bookingError?.message, variant: "destructive" });
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
            slotId: selectedSlot.id,
            clientEmail: clientEmail.trim(),
            clientName: clientName.trim(),
          },
        }
      );

      if (fnError || !checkoutData?.url) {
        throw new Error(fnError?.message || "No checkout URL");
      }

      window.location.href = checkoutData.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Payment error", description: message, variant: "destructive" });
      // Clean up pending booking
      await supabase.from("bookings").delete().eq("id", bookingData.id);
      setSubmitting(false);
    }
  };

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
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to store
        </Button>
      </div>
    );
  }

  const priceFormatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(session.price / 100);

  // Group slots by date
  const slotsByDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    acc[slot.date] = [...(acc[slot.date] ?? []), slot];
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
                  {session.duration_minutes} minutos
                </span>
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {session.num_photos} fotos
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
                    Select a date & time
                  </p>
                  {slots.length === 0 ? (
                    <p className="text-sm font-light text-muted-foreground text-center py-8 border border-dashed border-border">
                      No available slots at the moment.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {Object.entries(slotsByDate).map(([date, daySlots]) => (
                        <div key={date}>
                          <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
                            {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {daySlots.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className={cn(
                                  "px-3 py-2 text-xs border transition-colors tracking-wider",
                                  selectedSlot?.id === slot.id
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-border hover:border-foreground/40"
                                )}
                              >
                                {slot.start_time.slice(0, 5)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleProceedToForm}
                  disabled={!selectedSlot}
                  className="w-full text-xs tracking-wider uppercase font-light"
                >
                  Continue →
                </Button>
              </>
            )}

            {step === "form" && (
              <>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">
                    Selected slot
                  </p>
                  <p className="text-sm font-light">
                    {selectedSlot && format(parseISO(selectedSlot.date), "PPP", { locale: ptBR })}
                    {" · "}
                    {selectedSlot?.start_time.slice(0, 5)}
                  </p>
                </div>

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
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="border border-border p-4 flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-light">
                    <span className="text-muted-foreground">{session.title}</span>
                    <span>{priceFormatted}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>
                      {selectedSlot &&
                        format(parseISO(selectedSlot.date), "dd/MM/yyyy", { locale: ptBR })}{" "}
                      {selectedSlot?.start_time.slice(0, 5)}
                    </span>
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
                    Pay {priceFormatted}
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
