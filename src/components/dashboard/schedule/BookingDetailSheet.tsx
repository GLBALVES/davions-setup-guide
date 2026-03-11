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
} from "lucide-react";

export interface ScheduleBooking {
  id: string;
  client_name: string;
  client_email: string;
  status: string;
  payment_status: string;
  booked_date: string | null;
  session_id: string;
  availability_id: string;
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
      setBriefingName(briefingData.name ?? "");
      setQuestions((briefingData.questions as BriefingQuestion[]) ?? []);
    }
    if (responseData) {
      setAnswers((responseData.answers as Record<string, string | string[]>) ?? {});
      setHasResponse(true);
    } else {
      setHasResponse(false);
      setAnswers({});
    }
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
        else load();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-widest uppercase font-light flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            {briefingName || "Briefing"}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center animate-pulse">Loading…</p>
        ) : !hasResponse ? (
          <p className="text-[11px] text-muted-foreground italic py-4 text-center">
            The client hasn't submitted their briefing yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4 pt-1">
            {questions.map((q) => {
              const ans = answers[q.id];
              const display = !ans
                ? "—"
                : Array.isArray(ans)
                ? ans.length
                  ? ans.join(", ")
                  : "—"
                : ans || "—";
              return (
                <div key={q.id} className="flex flex-col gap-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">{q.label}</p>
                  <p className="text-sm font-light">{display}</p>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const PAYMENT_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Unpaid", className: "text-muted-foreground" },
  paid: { label: "Paid", className: "text-green-600" },
  failed: { label: "Failed", className: "text-destructive" },
  refunded: { label: "Refunded", className: "text-muted-foreground" },
};

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m));
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(s: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(s));
}

interface BookingDetailSheetProps {
  booking: ScheduleBooking | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: "confirmed" | "cancelled") => void;
}

export function BookingDetailSheet({ booking, open, onClose, onStatusChange }: BookingDetailSheetProps) {
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: "confirm" | "cancel" }>({
    open: false,
    action: "confirm",
  });
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

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

            {/* Date & Time */}
            {(dateLabel || timeLabel) && (
              <div className="flex flex-col gap-3">
                <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60">Schedule</p>
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
                </div>
              </div>
            )}

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
