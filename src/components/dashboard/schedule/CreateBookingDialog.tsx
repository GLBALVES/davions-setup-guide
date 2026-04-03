import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatTime12 } from "@/lib/utils";
import { TimePickerInput } from "@/components/ui/time-picker-input";
import { AlertTriangle, ArrowLeft, CalendarIcon, Camera, Clock, DollarSign, Loader2, MapPin, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ── types ─────────────────────────────────────────── */

interface SessionFull {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  location: string | null;
  cover_image_url: string | null;
  num_photos: number;
  status: string;
}

interface BlockedTime {
  date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  reason: string | null;
}

interface ExistingBooking {
  booked_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  session_title: string;
}

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
  defaultStartTime?: string | null;
  onCreated: () => void;
}

/* ── helpers ───────────────────────────────────────── */

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${padTwo(Math.floor(total / 60) % 24)}:${padTwo(total % 60)}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) &&
         timeToMinutes(aEnd) > timeToMinutes(bStart);
}

function formatCurrency(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

/* ── component ─────────────────────────────────────── */

export function CreateBookingDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultStartTime,
  onCreated,
}: CreateBookingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Step: 1 = select session, 2 = details
  const [step, setStep] = useState<1 | 2>(1);
  const [sessions, setSessions] = useState<SessionFull[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate ?? undefined);
  const [startTime, setStartTime] = useState(defaultStartTime ?? "09:00");
  const [endTime, setEndTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setSearchQuery("");
      setSelectedSessionId("");
      setClientName("");
      setClientEmail("");
      if (defaultDate) setDate(defaultDate);
      else setDate(undefined);
      if (defaultStartTime) setStartTime(defaultStartTime);
      else setStartTime("09:00");
    }
  }, [open]);

  // Load sessions
  useEffect(() => {
    if (!user || !open) return;
    setSessionsLoading(true);
    (supabase as any)
      .from("sessions")
      .select("id, title, description, duration_minutes, price, location, cover_image_url, num_photos, status")
      .eq("photographer_id", user.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: SessionFull[] | null }) => {
        setSessions(data ?? []);
        setSessionsLoading(false);
      });
  }, [user, open]);

  // Fetch blocked_times + existing bookings whenever selected date changes
  useEffect(() => {
    if (!user || !date) {
      setBlockedTimes([]);
      setExistingBookings([]);
      return;
    }
    const dateStr = format(date, "yyyy-MM-dd");

    // Blocked times
    (supabase as any)
      .from("blocked_times")
      .select("date, start_time, end_time, all_day, reason")
      .eq("photographer_id", user.id)
      .eq("date", dateStr)
      .then(({ data }: { data: BlockedTime[] | null }) => {
        setBlockedTimes(data ?? []);
      });

    // Existing confirmed bookings for conflict check
    (supabase as any)
      .from("bookings")
      .select("booked_date, client_name, session_id, availability_id")
      .eq("photographer_id", user.id)
      .eq("booked_date", dateStr)
      .eq("status", "confirmed")
      .then(async ({ data: bookings }: { data: any[] | null }) => {
        if (!bookings || bookings.length === 0) {
          setExistingBookings([]);
          return;
        }
        // Fetch availability times
        const availIds = bookings.map((b: any) => b.availability_id);
        const { data: avails } = await (supabase as any)
          .from("session_availability")
          .select("id, start_time, end_time")
          .in("id", availIds);

        const availMap: Record<string, { start_time: string; end_time: string }> = {};
        (avails || []).forEach((a: any) => { availMap[a.id] = a; });

        // Fetch session titles
        const sessionIds = [...new Set(bookings.map((b: any) => b.session_id))];
        const { data: sessData } = await (supabase as any)
          .from("sessions")
          .select("id, title")
          .in("id", sessionIds);
        const sessMap: Record<string, string> = {};
        (sessData || []).forEach((s: any) => { sessMap[s.id] = s.title; });

        const mapped: ExistingBooking[] = bookings
          .filter((b: any) => availMap[b.availability_id])
          .map((b: any) => ({
            booked_date: b.booked_date,
            start_time: availMap[b.availability_id].start_time,
            end_time: availMap[b.availability_id].end_time,
            client_name: b.client_name,
            session_title: sessMap[b.session_id] || "Session",
          }));
        setExistingBookings(mapped);
      });
  }, [user, date]);

  // Auto-compute end time
  useEffect(() => {
    const session = sessions.find((s) => s.id === selectedSessionId);
    if (session && startTime) {
      setEndTime(addMinutesToTime(startTime, session.duration_minutes || 60));
    }
  }, [selectedSessionId, startTime, sessions]);

  // Sync defaults
  useEffect(() => {
    if (open) {
      if (defaultDate) setDate(defaultDate);
      if (defaultStartTime) setStartTime(defaultStartTime);
    }
  }, [open, defaultDate, defaultStartTime]);

  // Conflict checks
  const conflictingBlock = useMemo((): BlockedTime | null => {
    if (!date || !startTime || !endTime) return null;
    for (const bt of blockedTimes) {
      if (bt.all_day) return bt;
      const bStart = bt.start_time.slice(0, 5);
      const bEnd = bt.end_time.slice(0, 5);
      if (timesOverlap(startTime, endTime, bStart, bEnd)) return bt;
    }
    return null;
  }, [date, startTime, endTime, blockedTimes]);

  const conflictingBooking = useMemo((): ExistingBooking | null => {
    if (!date || !startTime || !endTime) return null;
    for (const eb of existingBookings) {
      const bStart = eb.start_time.slice(0, 5);
      const bEnd = eb.end_time.slice(0, 5);
      if (timesOverlap(startTime, endTime, bStart, bEnd)) return eb;
    }
    return null;
  }, [date, startTime, endTime, existingBookings]);

  const hasConflict = Boolean(conflictingBlock || conflictingBooking);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.location && s.location.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // Select session and go to step 2
  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !selectedSessionId || !clientName || !clientEmail) return;
    if (hasConflict) return;

    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");

    try {
      const { data: availData, error: availError } = await (supabase as any)
        .from("session_availability")
        .insert({
          photographer_id: user.id,
          session_id: selectedSessionId,
          date: dateStr,
          start_time: startTime,
          end_time: endTime || addMinutesToTime(startTime, 60),
          is_booked: true,
        })
        .select("id")
        .single();
      if (availError) throw availError;

      const { error: bookingError } = await (supabase as any).from("bookings").insert({
        photographer_id: user.id,
        session_id: selectedSessionId,
        availability_id: availData.id,
        booked_date: dateStr,
        client_name: clientName,
        client_email: clientEmail,
        status: "confirmed",
        payment_status: "pending",
      });
      if (bookingError) throw bookingError;

      const sessionTitle = sessions.find((s) => s.id === selectedSessionId)?.title ?? "Session";

      await (supabase as any).from("notifications").insert({
        photographer_id: user.id,
        type: "success",
        event: "new_booking",
        title: `New Booking — ${clientName}`,
        body: `${sessionTitle} confirmed for ${dateStr}.`,
        metadata: { session_id: selectedSessionId },
      });

      try {
        await supabase.functions.invoke("send-push", {
          body: {
            photographer_id: user.id,
            title: `New Booking — ${clientName}`,
            body: `${sessionTitle} confirmed for ${dateStr}.`,
            url: "/dashboard/bookings",
          },
        });
      } catch (_) {}

      toast({ title: "Booking created successfully" });
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: err?.message ?? "Failed to create booking", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isValid = Boolean(date && selectedSessionId && clientName.trim() && clientEmail.trim() && !hasConflict);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0", step === 1 ? "max-w-lg" : "max-w-md")}>
        {/* ── STEP 1: Select Session ── */}
        {step === 1 && (
          <div className="flex flex-col">
            <DialogHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Step 1</p>
                  <DialogTitle className="text-base font-light tracking-wide">Select Session</DialogTitle>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[10px] gap-1.5 h-7"
                  onClick={() => { onOpenChange(false); navigate("/dashboard/sessions/new"); }}
                >
                  <Plus className="h-3 w-3" /> New Session
                </Button>
              </div>
            </DialogHeader>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <ScrollArea className="max-h-[400px] px-5 pb-5">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-10">
                  {sessions.length === 0 ? "No active sessions found." : "No sessions match your search."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredSessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSession(s.id)}
                      className="w-full text-left border border-border bg-background hover:border-foreground/50 transition-colors rounded-sm overflow-hidden flex flex-col"
                    >
                      {/* Cover */}
                      <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                        {s.cover_image_url ? (
                          <img src={s.cover_image_url} alt={s.title} className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2.5 flex flex-col gap-1">
                        <span className="text-xs font-medium truncate">{s.title}</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {s.duration_minutes} min
                          </span>
                          <span className="flex items-center gap-0.5">
                            <DollarSign className="h-3 w-3" /> {formatCurrency(s.price)}
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mt-0.5">{s.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* ── STEP 2: Details & Confirm ── */}
        {step === 2 && (
          <div className="flex flex-col">
            <DialogHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Step 2</p>
                  <DialogTitle className="text-base font-light tracking-wide">Booking Details</DialogTitle>
                </div>
              </div>
            </DialogHeader>

            {/* Selected session summary */}
            {selectedSession && (
              <div className="mx-5 mb-4 flex items-center gap-3 p-2 border border-border rounded-sm bg-muted/30">
                <div className="w-10 h-10 shrink-0 rounded-sm overflow-hidden bg-muted flex items-center justify-center">
                  {selectedSession.cover_image_url ? (
                    <img src={selectedSession.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{selectedSession.title}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedSession.duration_minutes} min · {formatCurrency(selectedSession.price)}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => setStep(1)}>
                  Change
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pb-5">
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Date</Label>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn("justify-start gap-2 font-light text-xs", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {date ? format(date, "EEEE, MMMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => { setDate(d); setCalOpen(false); }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Start</Label>
                  <TimePickerInput
                    value={startTime}
                    onChange={setStartTime}
                    className={cn(hasConflict && "ring-1 ring-destructive")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">End</Label>
                  <TimePickerInput
                    value={endTime}
                    onChange={setEndTime}
                    className={cn(hasConflict && "ring-1 ring-destructive")}
                  />
                </div>
              </div>

              {/* Conflict warnings */}
              {conflictingBlock && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-destructive/8 border border-destructive/30 rounded-sm">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-destructive/80 font-light leading-snug">
                    {conflictingBlock.all_day
                      ? `This day is blocked${conflictingBlock.reason ? ` — ${conflictingBlock.reason}` : ""}. Choose a different date.`
                      : `This time overlaps a blocked period (${formatTime12(conflictingBlock.start_time.slice(0, 5))}–${formatTime12(conflictingBlock.end_time.slice(0, 5))})${conflictingBlock.reason ? ` — ${conflictingBlock.reason}` : ""}. Adjust the time.`}
                  </p>
                </div>
              )}

              {!conflictingBlock && conflictingBooking && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-destructive/8 border border-destructive/30 rounded-sm">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-destructive/80 font-light leading-snug">
                    This time overlaps an existing booking ({conflictingBooking.session_title} — {conflictingBooking.client_name}, {formatTime12(conflictingBooking.start_time.slice(0, 5))}–{formatTime12(conflictingBooking.end_time.slice(0, 5))}). Adjust the time.
                  </p>
                </div>
              )}

              {/* Existing bookings on this day */}
              {existingBookings.length > 0 && (
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Bookings on this day</Label>
                  <div className="flex flex-col gap-0.5">
                    {existingBookings.map((eb, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground font-light">
                        {formatTime12(eb.start_time.slice(0, 5))}–{formatTime12(eb.end_time.slice(0, 5))} · {eb.session_title} · {eb.client_name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Client */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Client Name</Label>
                  <Input
                    placeholder="Full name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Client Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <DialogFooter className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!isValid || saving}
                  className="text-xs gap-2"
                  title={hasConflict ? "This time slot has a conflict" : undefined}
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Booking
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
