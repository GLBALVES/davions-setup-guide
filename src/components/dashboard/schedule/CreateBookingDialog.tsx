import { useState, useEffect, useMemo, useRef } from "react";
import oneSessionPlaceholder from "@/assets/one-session-placeholder.jpg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatTime12 } from "@/lib/utils";
import { TimePickerInput } from "@/components/ui/time-picker-input";
import { AlertTriangle, ArrowLeft, CalendarIcon, Camera, Clock, DollarSign, Loader2, MapPin, Plus, Search, X, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  session_model?: string;
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

interface ClientSuggestion {
  client_name: string;
  client_email: string;
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

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

  // ── One Session mode ──
  const [mode, setMode] = useState<"select" | "one_session">("select");
  const [osName, setOsName] = useState("");
  const [osDuration, setOsDuration] = useState<number>(60);
  const [osLocation, setOsLocation] = useState("");
  const [osNumPhotos, setOsNumPhotos] = useState<number>(0);
  const [osPrice, setOsPrice] = useState<number | "">("");
  const [osBriefingId, setOsBriefingId] = useState("");
  const [osContractId, setOsContractId] = useState("");
  const [osIncludes, setOsIncludes] = useState<string[]>([]);
  const [osIncludeInput, setOsIncludeInput] = useState("");
  const [osCreating, setOsCreating] = useState(false);

  // Contracts & Briefings for one session
  const [contracts, setContracts] = useState<{ id: string; name: string; body: string }[]>([]);
  const [briefings, setBriefings] = useState<{ id: string; name: string }[]>([]);

  // Client search
  const [clientSuggestions, setClientSuggestions] = useState<ClientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Save-as-preset dialog
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetSessionId, setPresetSessionId] = useState<string | null>(null);
  const [presetConverting, setPresetConverting] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setMode("select");
      setSearchQuery("");
      setSelectedSessionId("");
      setClientName("");
      setClientEmail("");
      setOsName(""); setOsDuration(60); setOsLocation(""); setOsNumPhotos(0);
      setOsBriefingId(""); setOsContractId(""); setOsIncludes([]); setOsIncludeInput("");
      setClientSuggestions([]); setShowSuggestions(false);
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
      .select("id, title, description, duration_minutes, price, location, cover_image_url, num_photos, status, session_model")
      .eq("photographer_id", user.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: SessionFull[] | null }) => {
        setSessions(data ?? []);
        setSessionsLoading(false);
      });
  }, [user, open]);

  // Load contracts & briefings when entering one_session mode
  useEffect(() => {
    if (!user || mode !== "one_session") return;
    (supabase as any).from("contracts").select("id, name, body").eq("photographer_id", user.id).then(({ data }: any) => setContracts(data ?? []));
    (supabase as any).from("briefings").select("id, name").eq("photographer_id", user.id).then(({ data }: any) => setBriefings(data ?? []));
  }, [user, mode]);

  // Fetch blocked_times + existing bookings whenever selected date changes
  useEffect(() => {
    if (!user || !date) {
      setBlockedTimes([]);
      setExistingBookings([]);
      return;
    }
    const dateStr = format(date, "yyyy-MM-dd");

    (supabase as any)
      .from("blocked_times")
      .select("date, start_time, end_time, all_day, reason")
      .eq("photographer_id", user.id)
      .eq("date", dateStr)
      .then(({ data }: { data: BlockedTime[] | null }) => {
        setBlockedTimes(data ?? []);
      });

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
        const availIds = bookings.map((b: any) => b.availability_id);
        const { data: avails } = await (supabase as any)
          .from("session_availability")
          .select("id, start_time, end_time")
          .in("id", availIds);

        const availMap: Record<string, { start_time: string; end_time: string }> = {};
        (avails || []).forEach((a: any) => { availMap[a.id] = a; });

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

  // Client email search
  useEffect(() => {
    if (!user || clientEmail.length < 3) {
      setClientSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from("bookings")
        .select("client_email, client_name")
        .eq("photographer_id", user.id)
        .or(`client_email.ilike.%${clientEmail}%,client_name.ilike.%${clientEmail}%`)
        .limit(20);
      if (data) {
        const unique = new Map<string, ClientSuggestion>();
        data.forEach((d: any) => {
          if (!unique.has(d.client_email)) {
            unique.set(d.client_email, { client_email: d.client_email, client_name: d.client_name });
          }
        });
        setClientSuggestions(Array.from(unique.values()));
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [user, clientEmail]);

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

  // One Session: create session then go to step 2
  const handleCreateOneSession = async () => {
    if (!user || !osName.trim()) return;
    setOsCreating(true);
    try {
      // Find contract text if selected
      const contractText = osContractId ? contracts.find(c => c.id === osContractId)?.body || "" : "";

      const { data: sessionData, error: sessionError } = await (supabase as any)
        .from("sessions")
        .insert({
          photographer_id: user.id,
          title: osName.trim(),
          duration_minutes: osDuration || 60,
          location: osLocation || null,
          num_photos: osNumPhotos || 0,
          session_model: "one_session",
          hide_from_store: true,
          status: "active",
          price: osPrice === "" ? 0 : osPrice,
          briefing_id: osBriefingId || null,
          contract_text: contractText || null,
        })
        .select("id")
        .single();
      if (sessionError) throw sessionError;

      // Insert included items as session_bonuses
      if (osIncludes.length > 0) {
        const bonuses = osIncludes.map((text, i) => ({
          session_id: sessionData.id,
          photographer_id: user.id,
          text,
          position: i,
        }));
        await (supabase as any).from("session_bonuses").insert(bonuses);
      }

      // Add to local sessions list so step 2 can reference it
      const newSession: SessionFull = {
        id: sessionData.id,
        title: osName.trim(),
        description: null,
        duration_minutes: osDuration || 60,
        price: osPrice === "" ? 0 : Number(osPrice),
        location: osLocation || null,
        cover_image_url: null,
        num_photos: osNumPhotos || 0,
        status: "active",
        session_model: "one_session",
      };
      setSessions(prev => [...prev, newSession]);
      setSelectedSessionId(sessionData.id);
      setEndTime(addMinutesToTime(startTime, osDuration || 60));
      setStep(2);
    } catch (err: any) {
      toast({ title: err?.message ?? "Failed to create session", variant: "destructive" });
    } finally {
      setOsCreating(false);
    }
  };

  const handleAddInclude = () => {
    const val = osIncludeInput.trim();
    if (!val) return;
    setOsIncludes(prev => [...prev, val]);
    setOsIncludeInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !selectedSessionId || !clientEmail.trim()) return;
    if (hasConflict) return;

    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const finalClientName = clientName.trim() || clientEmail.split("@")[0];

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

      const { data: bookingData, error: bookingError } = await (supabase as any).from("bookings").insert({
        photographer_id: user.id,
        session_id: selectedSessionId,
        availability_id: availData.id,
        booked_date: dateStr,
        client_name: finalClientName,
        client_email: clientEmail.trim(),
        status: "confirmed",
        payment_status: "pending",
      }).select("id").single();
      if (bookingError) throw bookingError;

      const createdBookingId = bookingData?.id;

      const sessionTitle = sessions.find((s) => s.id === selectedSessionId)?.title ?? "Session";

      await (supabase as any).from("notifications").insert({
        photographer_id: user.id,
        type: "success",
        event: "new_booking",
        title: `New Booking — ${finalClientName}`,
        body: `${sessionTitle} confirmed for ${dateStr}.`,
        metadata: { session_id: selectedSessionId },
      });

      try {
        await supabase.functions.invoke("send-push", {
          body: {
            photographer_id: user.id,
            title: `New Booking — ${finalClientName}`,
            body: `${sessionTitle} confirmed for ${dateStr}.`,
            url: "/dashboard/bookings",
          },
        });
      } catch (_) {}

      // Send confirmation email to client with booking link (for one_session)
      const isOneSession = selectedSession?.session_model === "one_session";
      if (isOneSession && createdBookingId) {
        try {
          await supabase.functions.invoke("confirm-booking-email", {
            body: {
              bookingId: createdBookingId,
              clientEmail: clientEmail.trim(),
              clientName: finalClientName,
              sessionTitle: sessionTitle,
              bookedDate: dateStr,
              startTime,
            },
          });
        } catch (_) {}
      }

      toast({ title: t.createBooking.bookingCreated });
      onCreated();
      onOpenChange(false);

      // Show save-as-preset prompt for one_session
      if (isOneSession) {
        setTimeout(() => {
          setPresetSessionId(selectedSessionId);
          setPresetDialogOpen(true);
        }, 300);
      }
    } catch (err: any) {
      toast({ title: err?.message ?? "Failed to create booking", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isValid = Boolean(date && selectedSessionId && clientEmail.trim() && !hasConflict);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0", step === 1 ? "max-w-2xl" : "max-w-md")}>
        {/* ── STEP 1: Select Session ── */}
        {step === 1 && mode === "select" && (
          <div className="flex flex-col">
            <DialogHeader className="px-5 pt-5 pb-3 pr-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Step 1</p>
              <DialogTitle className="text-base font-light tracking-wide">{t.createBooking.selectSession}</DialogTitle>
            </DialogHeader>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t.createBooking.searchSessions}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <ScrollArea className="max-h-[460px] px-5 pb-5">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredSessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSession(s.id)}
                      className="w-full text-left border border-border bg-background hover:border-foreground/50 transition-colors rounded-sm overflow-hidden flex flex-col"
                    >
                      <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
<img src={s.cover_image_url || oneSessionPlaceholder} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
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

                  {/* One Session card */}
                  <button
                    type="button"
                    onClick={() => setMode("one_session")}
                    className="w-full text-left border-2 border-dashed border-primary/40 hover:border-primary transition-colors rounded-sm overflow-hidden flex flex-col items-center justify-center min-h-[140px] gap-2 bg-primary/5"
                  >
                    <Zap className="h-6 w-6 text-primary/60" />
                    <span className="text-xs font-medium text-primary/80">{t.createBooking.oneSession}</span>
                  </button>

                  {/* Add session card */}
                  <button
                    type="button"
                    onClick={() => { onOpenChange(false); navigate("/dashboard/sessions/new"); }}
                    className="w-full text-left border-2 border-dashed border-muted-foreground/30 hover:border-foreground/50 transition-colors rounded-sm overflow-hidden flex flex-col items-center justify-center min-h-[140px] gap-2"
                  >
                    <Plus className="h-6 w-6 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">{t.createBooking.addSession}</span>
                  </button>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* ── STEP 1B: One Session Form ── */}
        {step === 1 && mode === "one_session" && (
          <div className="flex flex-col">
            <DialogHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setMode("select")} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Step 1</p>
                  <DialogTitle className="text-base font-light tracking-wide">{t.createBooking.oneSession}</DialogTitle>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[500px]">
              <div className="flex flex-col gap-4 px-5 pb-5">
                {/* Session Name */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.sessionName} *</Label>
                  <Input value={osName} onChange={e => setOsName(e.target.value)} className="text-xs h-8" placeholder={t.createBooking.sessionName} />
                </div>

                {/* Duration + Num Photos + Price */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.duration} *</Label>
                    <div className="relative">
                      <Input type="number" min={15} value={osDuration} onChange={e => setOsDuration(Number(e.target.value))} className="text-xs h-8 pr-10" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">min</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.numPhotos}</Label>
                    <Input type="number" min={0} value={osNumPhotos} onChange={e => setOsNumPhotos(Number(e.target.value))} className="text-xs h-8" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.price}</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                      <Input type="number" min={0} step={0.01} value={osPrice} onChange={e => setOsPrice(e.target.value === "" ? "" : Number(e.target.value))} className="text-xs h-8 pl-8" placeholder="0" />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.location}</Label>
                  <Input value={osLocation} onChange={e => setOsLocation(e.target.value)} className="text-xs h-8" placeholder={t.createBooking.location} />
                </div>

                {/* Contract */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.contract}</Label>
                  <Select value={osContractId} onValueChange={setOsContractId}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder={t.createBooking.noContract} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.createBooking.noContract}</SelectItem>
                      {contracts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Briefing */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.briefing}</Label>
                  <Select value={osBriefingId} onValueChange={setOsBriefingId}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder={t.createBooking.noBriefing} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.createBooking.noBriefing}</SelectItem>
                      {briefings.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Items Included */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.itemsIncluded}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={osIncludeInput}
                      onChange={e => setOsIncludeInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddInclude(); } }}
                      className="text-xs h-8 flex-1"
                      placeholder={t.createBooking.addItem}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={handleAddInclude}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {osIncludes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {osIncludes.map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                          {item}
                          <button type="button" onClick={() => setOsIncludes(prev => prev.filter((_, j) => j !== i))}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Continue */}
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setMode("select")} className="text-xs">
                    {t.createBooking.back}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!osName.trim() || !osDuration || osCreating}
                    onClick={handleCreateOneSession}
                    className="text-xs gap-2"
                  >
                    {osCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t.createBooking.continue}
                  </Button>
                </DialogFooter>
              </div>
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
                  <DialogTitle className="text-base font-light tracking-wide">{t.createBooking.bookingDetails}</DialogTitle>
                </div>
              </div>
            </DialogHeader>

            {/* Selected session summary */}
            {selectedSession && (
              <div className="mx-5 mb-4 flex items-center gap-3 p-2 border border-border rounded-sm bg-muted/30">
                <div className="w-10 h-10 shrink-0 rounded-sm overflow-hidden bg-muted flex items-center justify-center">
<img src={selectedSession.cover_image_url || oneSessionPlaceholder} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{selectedSession.title}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedSession.duration_minutes} min · {formatCurrency(selectedSession.price)}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => setStep(1)}>
                  {t.createBooking.change}
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pb-5">
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.date}</Label>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn("justify-start gap-2 font-light text-xs", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {date ? format(date, "EEEE, MMMM d, yyyy") : t.createBooking.pickDate}
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
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.start}</Label>
                  <TimePickerInput
                    value={startTime}
                    onChange={setStartTime}
                    className={cn(hasConflict && "ring-1 ring-destructive")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.end}</Label>
                  {selectedSession?.session_model === "one_session" ? (
                    <div className={cn("flex items-center h-8 px-3 border border-border rounded-sm bg-muted/30 text-xs text-muted-foreground", hasConflict && "ring-1 ring-destructive")}>
                      {endTime ? formatTime12(endTime) : "--:--"}
                    </div>
                  ) : (
                    <TimePickerInput
                      value={endTime}
                      onChange={setEndTime}
                      className={cn(hasConflict && "ring-1 ring-destructive")}
                    />
                  )}
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
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.bookingsOnDay}</Label>
                  <div className="flex flex-col gap-0.5">
                    {existingBookings.map((eb, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground font-light">
                        {formatTime12(eb.start_time.slice(0, 5))}–{formatTime12(eb.end_time.slice(0, 5))} · {eb.session_title} · {eb.client_name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Client - Email with search */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5 relative">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.clientEmail}</Label>
                  <Input
                    ref={emailInputRef}
                    type="email"
                    placeholder={t.createBooking.searchClient}
                    value={clientEmail}
                    onChange={(e) => { setClientEmail(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => clientSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="text-xs h-8"
                  />
                  {showSuggestions && clientSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-border bg-popover rounded-sm shadow-md max-h-40 overflow-y-auto">
                      {clientSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-xs flex flex-col"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setClientEmail(s.client_email);
                            setClientName(s.client_name);
                            setShowSuggestions(false);
                          }}
                        >
                          <span className="font-medium">{s.client_name}</span>
                          <span className="text-[10px] text-muted-foreground">{s.client_email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {clientName && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.createBooking.clientName}</Label>
                    <Input
                      placeholder={t.createBooking.clientName}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs"
                >
                  {t.createBooking.back}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!isValid || saving}
                  className="text-xs gap-2"
                  title={hasConflict ? "This time slot has a conflict" : undefined}
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t.createBooking.createBooking}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Save as preset dialog */}
    <AlertDialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
      <AlertDialogContent className="max-w-sm z-[60]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-light tracking-wide">{t.createBooking.saveAsPreset ?? "Save as Session?"}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs font-light leading-relaxed">
            {t.createBooking.saveAsPresetDesc ?? "Would you like to save this one-off session as a reusable session template? You'll be redirected to complete the full setup."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setPresetDialogOpen(false)}>
              {t.createBooking.noThanks ?? "No, keep as one-off"}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              size="sm"
              className="text-xs gap-2"
              disabled={presetConverting}
              onClick={async () => {
                if (!presetSessionId) return;
                setPresetConverting(true);
                await supabase.from("sessions").update({ session_model: "standard", hide_from_store: false } as any).eq("id", presetSessionId);
                setPresetConverting(false);
                setPresetDialogOpen(false);
                navigate(`/dashboard/sessions/${presetSessionId}`);
              }}
            >
              {presetConverting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.createBooking.yesConvert ?? "Yes, convert to session"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
