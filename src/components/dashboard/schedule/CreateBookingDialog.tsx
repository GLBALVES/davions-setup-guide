import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";

interface Session {
  id: string;
  title: string;
  duration_minutes: number;
}

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
  defaultStartTime?: string | null;
  onCreated: () => void;
}

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${padTwo(Math.floor(total / 60) % 24)}:${padTwo(total % 60)}`;
}

export function CreateBookingDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultStartTime,
  onCreated,
}: CreateBookingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate ?? undefined);
  const [startTime, setStartTime] = useState(defaultStartTime ?? "09:00");
  const [endTime, setEndTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load sessions
  useEffect(() => {
    if (!user || !open) return;
    (supabase as any)
      .from("sessions")
      .select("id, title, duration_minutes")
      .eq("photographer_id", user.id)
      .order("title")
      .then(({ data }: { data: Session[] | null }) => {
        setSessions(data ?? []);
        if (data && data.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data[0].id);
        }
      });
  }, [user, open]);

  // Auto-compute end time when session or start time changes
  useEffect(() => {
    const session = sessions.find((s) => s.id === selectedSessionId);
    if (session && startTime) {
      setEndTime(addMinutesToTime(startTime, session.duration_minutes || 60));
    }
  }, [selectedSessionId, startTime, sessions]);

  // Sync defaults when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      if (defaultDate) setDate(defaultDate);
      if (defaultStartTime) setStartTime(defaultStartTime);
    }
  }, [open, defaultDate, defaultStartTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !selectedSessionId || !clientName || !clientEmail) return;

    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");

    try {
      // 1. Create session_availability slot
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

      // 2. Create booking
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

      toast({ title: "Booking created successfully" });
      onCreated();
      onOpenChange(false);
      // Reset
      setClientName("");
      setClientEmail("");
    } catch (err: any) {
      toast({ title: err?.message ?? "Failed to create booking", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isValid = Boolean(date && selectedSessionId && clientName.trim() && clientEmail.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Calendar</p>
          <DialogTitle className="text-base font-light tracking-wide">New Booking</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {/* Session */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Session</Label>
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No sessions found.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSessionId(s.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs border transition-colors",
                      selectedSessionId === s.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:border-foreground/50"
                    )}
                  >
                    <span className="font-light">{s.title}</span>
                    <span className="ml-2 opacity-50">{s.duration_minutes} min</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Start</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">End</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

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
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!isValid || saving} className="text-xs gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
