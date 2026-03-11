import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreateGalleryDialog } from "@/components/dashboard/CreateGalleryDialog";
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
import {
  Search,
  Calendar,
  User,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  BookOpen,
  Images,
  ClipboardList,
} from "lucide-react";

interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  status: string;
  payment_status: string;
  booked_date: string | null;
  created_at: string;
  session_id: string;
  availability_id: string;
  sessions?: { title: string; briefing_id?: string | null } | null;
  session_availability?: { start_time: string; end_time: string; date: string | null } | null;
}

type FilterStatus = "all" | "pending" | "confirmed" | "cancelled";

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

// ── Briefing response viewer ──────────────────────────────────────────────────

interface BriefingQuestion {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
}

interface BriefingResponseDialogProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  briefingId: string;
}

function BriefingResponseDialog({ open, onClose, bookingId, briefingId }: BriefingResponseDialogProps) {
  const [questions, setQuestions] = useState<BriefingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [briefingName, setBriefingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasResponse, setHasResponse] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const [{ data: briefingData }, { data: responseData }] = await Promise.all([
        (supabase as any).from("briefings").select("name, questions").eq("id", briefingId).single(),
        (supabase as any).from("booking_briefing_responses").select("answers").eq("booking_id", bookingId).eq("briefing_id", briefingId).maybeSingle(),
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
    load();
  }, [open, bookingId, briefingId]);

  const formatAnswer = (q: BriefingQuestion): string => {
    const ans = answers[q.id];
    if (!ans) return "—";
    if (Array.isArray(ans)) return ans.length ? ans.join(", ") : "—";
    return ans || "—";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
            {questions.map((q) => (
              <div key={q.id} className="flex flex-col gap-1">
                <p className="text-[10px] tracking-wider uppercase text-muted-foreground">{q.label}</p>
                <p className="text-sm font-light">{formatAnswer(q)}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const Bookings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; bookingId: string; action: "confirm" | "cancel" }>({
    open: false,
    bookingId: "",
    action: "confirm",
  });
  const [galleryDialog, setGalleryDialog] = useState<{ open: boolean; bookingId: string }>({
    open: false,
    bookingId: "",
  });
  const [briefingDialog, setBriefingDialog] = useState<{ open: boolean; bookingId: string; briefingId: string }>({
    open: false,
    bookingId: "",
    briefingId: "",
  });

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("bookings")
      .select(`
        *,
        sessions ( title, briefing_id ),
        session_availability ( start_time, end_time, date )
      `)
      .eq("photographer_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load bookings", variant: "destructive" });
    } else {
      setBookings((data as Booking[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    let list = bookings.filter((b) => {
      if (filter === "pending") return b.status === "pending";
      if (filter === "confirmed") return b.status === "confirmed";
      if (filter === "cancelled") return b.status === "cancelled";
      return true;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.client_name.toLowerCase().includes(q) ||
          b.client_email.toLowerCase().includes(q) ||
          (b.sessions?.title ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [bookings, filter, search]);

  const updateStatus = async (bookingId: string, status: "confirmed" | "cancelled") => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Failed to update booking", variant: "destructive" });
    } else {
      toast({
        title: status === "confirmed" ? "Booking confirmed" : "Booking cancelled",
        description: status === "confirmed"
          ? "The client will be notified."
          : "The booking has been cancelled.",
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
    }
    setConfirmDialog({ open: false, bookingId: "", action: "confirm" });
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">
              {/* Header */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  Schedule
                </p>
                <h1 className="text-2xl font-light tracking-wide">Bookings</h1>
              </div>

              {/* Filters + Search */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1 border-b border-border pb-1">
                  {FILTERS.map(({ key, label }) => {
                    const count =
                      key === "all"
                        ? bookings.length
                        : bookings.filter((b) => b.status === key).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-light transition-colors border-b-2 -mb-px ${
                          filter === key
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label}
                        <span className="ml-1.5 opacity-50">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by client or session…"
                    className="pl-9 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Content */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
                    Loading…
                  </span>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-dashed border-border">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-light text-muted-foreground">
                      {bookings.length === 0
                        ? "No bookings yet"
                        : search
                        ? `No results for "${search}"`
                        : "No bookings match this filter"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {bookings.length === 0
                        ? "Bookings from clients will appear here"
                        : "Try a different search or filter"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-border overflow-hidden">
                  {/* Table header */}
                  <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 bg-muted/40 border-b border-border text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
                    <span>Client</span>
                    <span>Session</span>
                    <span>Date & Time</span>
                    <span>Payment</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>

                  {filteredBookings.map((booking, idx) => {
                    const avail = booking.session_availability;
                    const dateLabel = avail?.date
                      ? formatDate(avail.date)
                      : booking.booked_date
                      ? formatDate(booking.booked_date)
                      : null;
                    const timeLabel =
                      avail?.start_time && avail?.end_time
                        ? `${formatTime(avail.start_time)} – ${formatTime(avail.end_time)}`
                        : null;
                    const statusMeta = STATUS_META[booking.status] ?? STATUS_META["pending"];
                    const paymentMeta = PAYMENT_META[booking.payment_status] ?? PAYMENT_META["pending"];
                    const hasBriefing = Boolean(booking.sessions?.briefing_id);

                    return (
                      <div
                        key={booking.id}
                        className={`grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 md:gap-4 px-5 py-4 items-center ${
                          idx < filteredBookings.length - 1 ? "border-b border-border" : ""
                        } hover:bg-muted/20 transition-colors`}
                      >
                        {/* Client */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-light truncate">
                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                            {booking.client_name}
                          </span>
                          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {booking.client_email}
                          </span>
                        </div>

                        {/* Session */}
                        <div className="text-xs font-light text-muted-foreground truncate">
                          {booking.sessions?.title ?? "—"}
                        </div>

                        {/* Date & Time */}
                        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                          {dateLabel ? (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {dateLabel}
                              </span>
                              {timeLabel && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {timeLabel}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </div>

                        {/* Payment */}
                        <span className={`text-[11px] font-light whitespace-nowrap ${paymentMeta.className}`}>
                          {paymentMeta.label}
                        </span>

                        {/* Status badge */}
                        <Badge
                          variant={statusMeta.variant}
                          className="text-[9px] tracking-wider uppercase font-light w-fit"
                        >
                          {statusMeta.label}
                        </Badge>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {booking.status !== "confirmed" && booking.status !== "cancelled" && (
                            <button
                              onClick={() =>
                                setConfirmDialog({ open: true, bookingId: booking.id, action: "confirm" })
                              }
                              title="Confirm booking"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {booking.status !== "cancelled" && (
                            <button
                              onClick={() =>
                                setConfirmDialog({ open: true, bookingId: booking.id, action: "cancel" })
                              }
                              title="Cancel booking"
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {booking.status === "confirmed" && (
                            <button
                              onClick={() => setGalleryDialog({ open: true, bookingId: booking.id })}
                              title="Create Proof Gallery"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Images className="h-4 w-4" />
                            </button>
                          )}
                          {hasBriefing && (
                            <button
                              onClick={() => setBriefingDialog({
                                open: true,
                                bookingId: booking.id,
                                briefingId: booking.sessions!.briefing_id!,
                              })}
                              title="View briefing responses"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ClipboardList className="h-4 w-4" />
                            </button>
                          )}
                          {booking.status === "cancelled" && !hasBriefing && (
                            <span className="text-[10px] text-muted-foreground/40">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Confirm / Cancel dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((d) => ({ ...d, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light tracking-wide">
              {confirmDialog.action === "confirm" ? "Confirm booking?" : "Cancel booking?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {confirmDialog.action === "confirm"
                ? "This will mark the booking as confirmed."
                : "This will mark the booking as cancelled. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs uppercase tracking-wider font-light">
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateStatus(confirmDialog.bookingId, confirmDialog.action === "confirm" ? "confirmed" : "cancelled")}
              className={`text-xs uppercase tracking-wider font-light ${
                confirmDialog.action === "cancel"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }`}
            >
              {confirmDialog.action === "confirm" ? "Confirm" : "Cancel booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateGalleryDialog
        open={galleryDialog.open}
        onOpenChange={(open) => setGalleryDialog((d) => ({ ...d, open }))}
        onCreated={() => {}}
        defaultCategory="proof"
        prefilledBookingId={galleryDialog.bookingId}
      />

      {briefingDialog.open && (
        <BriefingResponseDialog
          open={briefingDialog.open}
          onClose={() => setBriefingDialog({ open: false, bookingId: "", briefingId: "" })}
          bookingId={briefingDialog.bookingId}
          briefingId={briefingDialog.briefingId}
        />
      )}
    </SidebarProvider>
  );
};

export default Bookings;
