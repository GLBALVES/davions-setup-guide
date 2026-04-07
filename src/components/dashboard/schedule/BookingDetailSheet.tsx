import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { TimePickerInput } from "@/components/ui/time-picker-input";
import { CreateGalleryDialog } from "@/components/dashboard/CreateGalleryDialog";
import {
  User,
  Mail,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  Images,
  ClipboardList,
  Camera,
  Pencil,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { checkBookingConflict, addMinutesToTime } from "@/lib/booking-conflict";
import { useAuth } from "@/contexts/AuthContext";

export interface ScheduleBooking {
  id: string;
  client_name: string;
  client_email: string;
  status: string;
  payment_status: string;
  booked_date: string | null;
  session_id: string;
  availability_id: string;
  photographer_id?: string;
  sessions?: { title: string; duration_minutes?: number; briefing_id?: string | null } | null;
  session_availability?: { start_time: string; end_time: string; date: string | null } | null;
}

interface BriefingQuestion {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
}

function BriefingDialog({
  open,
  onClose,
  bookingId,
  briefingId,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  briefingId: string;
}) {
  const [questions, setQuestions] = useState<BriefingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [briefingName, setBriefingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasResponse, setHasResponse] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: briefingData }, { data: responseData }] = await Promise.all([
      (supabase as any).from("briefings").select("name, questions").eq("id", briefingId).single(),
      (supabase as any)
        .from("booking_briefing_responses")
        .select("answers")
        .eq("booking_id", bookingId)
        .eq("briefing_id", briefingId)
        .maybeSingle(),
    ]);
    if (briefingData) {
      setBriefingName(briefingData.name ?? "Briefing");
      setQuestions(
        Array.isArray(briefingData.questions) ? (briefingData.questions as BriefingQuestion[]) : []
      );
    }
    if (responseData?.answers) {
      setAnswers(responseData.answers as Record<string, string | string[]>);
      setHasResponse(true);
    } else {
      setHasResponse(false);
    }
    setLoading(false);
  };

  if (open && loading && questions.length === 0) load();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-light tracking-wide">{briefingName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : !hasResponse ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No response submitted yet.</p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {questions.map((q) => {
              const ans = answers[q.id];
              return (
                <div key={q.id} className="space-y-1">
                  <p className="text-xs font-medium">{q.label}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {Array.isArray(ans) ? ans.join(", ") : ans || "—"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending:   { label: "Pending",   variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const PAYMENT_META: Record<string, { label: string; className: string }> = {
  pending:      { label: "Unpaid",   className: "text-muted-foreground" },
  paid:         { label: "Paid",     className: "text-emerald-600" },
  deposit_paid: { label: "Partial",  className: "text-amber-600" },
  failed:       { label: "Failed",   className: "text-destructive" },
  refunded:     { label: "Refunded", className: "text-muted-foreground" },
};

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m));
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(s: string) {
  const dateObj = s.length === 10 ? new Date(s + "T00:00:00") : new Date(s);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateObj);
}

interface BookingDetailSheetProps {
  booking: ScheduleBooking | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: "confirmed" | "cancelled") => void;
  onBookingUpdated?: () => void;
}

export function BookingDetailSheet({ booking, open, onClose, onStatusChange, onBookingUpdated }: BookingDetailSheetProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: "confirm" | "cancel" }>({
    open: false,
    action: "confirm",
  });
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Date/time editing state
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("09:00");
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!booking) return null;

  const avail = booking.session_availability;
  const dateStr = avail?.date ?? booking.booked_date;
  const dateLabel = dateStr ? formatDate(dateStr) : null;
  const timeLabel =
    avail?.start_time && avail?.end_time
      ? `${formatTime(avail.start_time)} – ${formatTime(avail.end_time)}`
      : null;
  const statusMeta = STATUS_META[booking.status] ?? STATUS_META["pending"];
  const paymentMeta = PAYMENT_META[booking.payment_status] ?? PAYMENT_META["pending"];
  const hasBriefing = Boolean(booking.sessions?.briefing_id);

  const photographerId = booking.photographer_id || user?.id || "";

  const startEditing = () => {
    setEditDate(dateStr ?? "");
    setEditTime(avail?.start_time?.slice(0, 5) ?? "09:00");
    setConflictWarning(null);
    setEditingSchedule(true);
  };

  const cancelEditing = () => {
    setEditingSchedule(false);
    setConflictWarning(null);
  };

  const saveSchedule = async () => {
    if (!editDate) return;
    setSaving(true);
    setConflictWarning(null);

    try {
      const duration = booking.sessions?.duration_minutes ?? 60;
      const endTime = addMinutesToTime(editTime, duration);

      // Check conflicts
      const conflict = await checkBookingConflict(
        photographerId,
        editDate,
        editTime,
        endTime,
        booking.id,
      );

      if (conflict.hasConflict) {
        const msg = conflict.conflictDetails || "Time conflict detected";
        setConflictWarning(msg);
        toast({ title: msg, variant: "destructive" });
        setSaving(false);
        return;
      }

      // Update bookings.booked_date
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({ booked_date: editDate } as any)
        .eq("id", booking.id);

      if (bookingErr) {
        toast({ title: "Failed to update booking", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Update session_availability
      const { error: availErr } = await (supabase as any)
        .from("session_availability")
        .update({
          date: editDate,
          start_time: editTime,
          end_time: endTime,
        })
        .eq("id", booking.availability_id);

      if (availErr) {
        toast({ title: "Failed to update availability", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Also sync client_projects if linked
      const { data: linkedProject } = await (supabase as any)
        .from("client_projects")
        .select("id")
        .eq("booking_id", booking.id)
        .maybeSingle();

      if (linkedProject) {
        await (supabase as any)
          .from("client_projects")
          .update({ shoot_date: editDate, shoot_time: editTime })
          .eq("id", linkedProject.id);
      }

      toast({ title: "Schedule updated" });
      setEditingSchedule(false);
      onBookingUpdated?.();
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleUpdate = async (status: "confirmed" | "cancelled") => {
    setUpdating(true);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", booking.id);
    if (error) {
      toast({ title: "Failed to update booking", variant: "destructive" });
    } else {
      toast({
        title: status === "confirmed" ? "Booking confirmed" : "Booking cancelled",
      });
      onStatusChange(booking.id, status);
    }
    setUpdating(false);
    setConfirmDialog({ open: false, action: "confirm" });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-y-auto">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Booking Details</p>
                <SheetTitle className="text-lg font-light tracking-wide">{booking.client_name}</SheetTitle>
              </div>
              <Badge variant={statusMeta.variant} className="text-[9px] tracking-wider uppercase font-light mt-1 shrink-0">
                {statusMeta.label}
              </Badge>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 flex flex-col gap-6 px-6 py-5">
            {/* Client */}
            <div className="flex flex-col gap-3">
              <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60">Client</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 text-sm font-light">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {booking.client_name}
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {booking.client_email}
                </div>
              </div>
            </div>

            {/* Session */}
            <div className="flex flex-col gap-3">
              <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60">Session</p>
              <div className="flex items-center gap-2.5 text-sm font-light">
                <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {booking.sessions?.title ?? "—"}
              </div>
            </div>

            {/* Date & Time — Editable */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60">Schedule</p>
                {!editingSchedule && booking.status !== "cancelled" && (
                  <button
                    onClick={startEditing}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>

              {editingSchedule ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm transition-colors text-left flex-1",
                            editDate ? "border-input text-foreground" : "border-input text-muted-foreground"
                          )}
                        >
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-xs">
                            {editDate
                              ? format(new Date(editDate + "T00:00:00"), "MMM d, yyyy")
                              : "Select date"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={editDate ? new Date(editDate + "T00:00:00") : undefined}
                          onSelect={(d) => {
                            if (d) {
                              const y = d.getFullYear();
                              const m = String(d.getMonth() + 1).padStart(2, "0");
                              const day = String(d.getDate()).padStart(2, "0");
                              setEditDate(`${y}-${m}-${day}`);
                              setConflictWarning(null);
                            }
                          }}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <TimePickerInput
                      value={editTime}
                      onChange={(v) => { setEditTime(v); setConflictWarning(null); }}
                      className="shrink-0"
                    />
                  </div>

                  {conflictWarning && (
                    <div className="flex items-center gap-1.5 text-destructive text-[11px] p-1.5 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>{conflictWarning}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={saveSchedule} disabled={saving || !editDate}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEditing} disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {dateLabel && (
                    <div className="flex items-center gap-2.5 text-sm font-light">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {dateLabel}
                    </div>
                  )}
                  {timeLabel && (
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {timeLabel}
                      {booking.sessions?.duration_minutes && (
                        <span className="ml-1 text-muted-foreground/50">
                          · {booking.sessions.duration_minutes} min
                        </span>
                      )}
                    </div>
                  )}
                  {!dateLabel && !timeLabel && (
                    <p className="text-xs text-muted-foreground/40">No schedule set</p>
                  )}
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="flex flex-col gap-3">
              <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60">Payment</p>
              <div className={`flex items-center gap-2.5 text-sm font-light ${paymentMeta.className}`}>
                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                {paymentMeta.label}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60 mb-1">Actions</p>

              {booking.status !== "confirmed" && booking.status !== "cancelled" && (
                <Button
                  variant="default"
                  size="sm"
                  className="justify-start gap-2.5"
                  disabled={updating}
                  onClick={() => setConfirmDialog({ open: true, action: "confirm" })}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Confirm Booking
                </Button>
              )}

              {booking.status !== "cancelled" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2.5"
                  disabled={updating}
                  onClick={() => setConfirmDialog({ open: true, action: "cancel" })}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel Booking
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2.5"
                onClick={() => setGalleryOpen(true)}
              >
                <Images className="h-3.5 w-3.5" />
                Create Gallery
              </Button>

              {hasBriefing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2.5"
                  onClick={() => setBriefingOpen(true)}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  View Briefing
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm/Cancel AlertDialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(v) => !v && setConfirmDialog((p) => ({ ...p, open: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-wide">
              {confirmDialog.action === "confirm" ? "Confirm Booking?" : "Cancel Booking?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {confirmDialog.action === "confirm"
                ? "This will mark the booking as confirmed."
                : "This will cancel the booking and free the slot."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Back</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={() => handleUpdate(confirmDialog.action === "confirm" ? "confirmed" : "cancelled")}
            >
              {confirmDialog.action === "confirm" ? "Confirm" : "Cancel Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gallery Dialog */}
      <CreateGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        prefilledBookingId={booking.id}
        onCreated={() => setGalleryOpen(false)}
      />

      {/* Briefing Dialog */}
      {hasBriefing && (
        <BriefingDialog
          open={briefingOpen}
          onClose={() => setBriefingOpen(false)}
          bookingId={booking.id}
          briefingId={booking.sessions!.briefing_id!}
        />
      )}
    </>
  );
}
