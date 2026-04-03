import { useEffect, useState, useMemo } from "react";
import { useFirstBookingPushPrompt } from "@/hooks/useFirstBookingPushPrompt";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CreateGalleryDialog } from "@/components/dashboard/CreateGalleryDialog";
import { BookingsSkeleton } from "@/components/dashboard/skeletons/BookingsSkeleton";
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
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Plus,
} from "lucide-react";
import { CreateBookingDialog } from "@/components/dashboard/schedule/CreateBookingDialog";

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
  sessions?: { title: string; briefing_id?: string | null; session_type_id?: string | null; session_types?: { name: string } | null } | null;
  session_availability?: { start_time: string; end_time: string; date: string | null } | null;
}

type FilterStatus = "all" | "pending" | "confirmed" | "cancelled";
type SortMode = "newest" | "oldest" | "date" | "client";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-amber-50 text-amber-700 border border-amber-200" },
  confirmed: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border border-red-200" },
};

const PAYMENT_META: Record<string, { label: string; dot: string }> = {
  pending:      { label: "Unpaid",   dot: "bg-muted-foreground/40" },
  paid:         { label: "Paid",     dot: "bg-emerald-500" },
  deposit_paid: { label: "Partial",  dot: "bg-amber-500" },
  failed:       { label: "Failed",   dot: "bg-destructive" },
  refunded:     { label: "Refunded", dot: "bg-muted-foreground/40" },
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
  const { user, signOut, photographerId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const bk = t.bookings;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeConnectedAt, setStripeConnectedAt] = useState<string | null>(null);
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
  const [createBookingOpen, setCreateBookingOpen] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    const [bookingsRes, profileRes] = await Promise.all([
      (supabase as any)
        .from("bookings")
        .select(`
          *,
          sessions ( title, briefing_id, session_type_id, session_types ( name ) ),
          session_availability ( start_time, end_time, date )
        `)
        .eq("photographer_id", photographerId ?? user!.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("photographers")
        .select("stripe_account_id, stripe_connected_at")
        .eq("id", photographerId ?? user!.id)
        .single(),
    ]);

    if (bookingsRes.error) {
      toast({ title: "Failed to load bookings", variant: "destructive" });
    } else {
      setBookings((bookingsRes.data as Booking[]) ?? []);
    }

    if (profileRes.data) {
      setStripeAccountId((profileRes.data as any).stripe_account_id ?? null);
      setStripeConnectedAt((profileRes.data as any).stripe_connected_at ?? null);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (photographerId) fetchBookings();
  }, [photographerId]);

  // Prompt push permission on first booking
  useFirstBookingPushPrompt(photographerId, bookings.length, loading);

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

    // Sort
    list = [...list].sort((a, b) => {
      if (sortMode === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortMode === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortMode === "client") return a.client_name.localeCompare(b.client_name);
      if (sortMode === "date") {
        const dateA = a.session_availability?.date ?? a.booked_date ?? "";
        const dateB = b.session_availability?.date ?? b.booked_date ?? "";
        return dateA.localeCompare(dateB);
      }
      return 0;
    });

    return list;
  }, [bookings, filter, search, sortMode]);

  // Show custody banner when: stripe account exists but onboarding incomplete AND there are confirmed+paid bookings
  const hasFundsInCustody = useMemo(() => {
    if (!stripeAccountId || stripeConnectedAt) return false;
    return bookings.some(
      (b) => b.status === "confirmed" && (b.payment_status === "paid" || b.payment_status === "deposit_paid")
    );
  }, [bookings, stripeAccountId, stripeConnectedAt]);

  const confirmedPaidCount = useMemo(
    () => bookings.filter((b) => b.status === "confirmed" && (b.payment_status === "paid" || b.payment_status === "deposit_paid")).length,
    [bookings]
  );

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
    { key: "all", label: bk.all },
    { key: "pending", label: bk.pending },
    { key: "confirmed", label: bk.confirmed },
    { key: "cancelled", label: bk.cancelled },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    // Append T00:00:00 to date-only strings so they parse as local time, not UTC
    const safe = dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(safe));
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
            <div className="flex flex-col gap-8 max-w-6xl">

              {/* Header */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                   Schedule
                </p>
                <h1 className="text-2xl font-light tracking-wide">{bk.title}</h1>
              </div>

              {/* Funds-in-custody banner */}
              {hasFundsInCustody && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-border bg-muted/40 p-4">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                       <p className="text-xs font-light tracking-wide text-foreground">
                          {bk.fundsInCustody}
                        </p>
                      <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
                        You have {confirmedPaidCount} confirmed booking{confirmedPaidCount !== 1 ? "s" : ""} with payments received, but your banking details haven't been submitted yet. Complete your payment setup to release the funds to your account.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/dashboard/settings?tab=payments")}
                    className="gap-2 text-xs tracking-wider uppercase font-light shrink-0"
                  >
                    {bk.completeSetup}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Filters + Search */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-1 border-b border-border">
                  {FILTERS.map(({ key, label }) => {
                    const count =
                      key === "all"
                        ? bookings.length
                        : bookings.filter((b) => b.status === key).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-2 text-[10px] tracking-[0.2em] uppercase font-light transition-colors border-b-2 -mb-px ${
                          filter === key
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label}
                        <span className="ml-1.5 opacity-40 tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto flex-wrap">
                  <Button
                    size="sm"
                    className="h-8 gap-2 text-xs shrink-0"
                    onClick={() => setCreateBookingOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.schedule?.newBooking ?? "New Booking"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs shrink-0"
                    onClick={() => navigate("/dashboard/schedule")}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {bk.schedule}
                  </Button>

                  {/* Sort dropdown */}
                  <div className="relative shrink-0">
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as SortMode)}
                      className="h-8 pl-7 pr-3 text-[10px] tracking-wider uppercase font-light bg-background border border-border rounded-sm appearance-none cursor-pointer text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="newest">{bk.sortNewest}</option>
                      <option value="oldest">{bk.sortOldest}</option>
                      <option value="date">{bk.sortDate}</option>
                      <option value="client">{bk.sortClient}</option>
                    </select>
                    <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>

                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={bk.searchPlaceholder}
                      className="pl-9 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              {loading ? (
                <BookingsSkeleton />
              ) : filteredBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-dashed border-border rounded-sm">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-light text-muted-foreground">
                       {bookings.length === 0 ? bk.noBookingsYet : search ? `${bk.noResults} "${search}"` : bk.noMatch}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                       {bookings.length === 0 ? bk.clientsWillAppear : bk.differentSearchOrFilter}
                    </p>
                  </div>
                </div>
              ) : (() => {
                // Group by session type name
                const groups = new Map<string, Booking[]>();
                for (const b of filteredBookings) {
                  const cat = b.sessions?.session_types?.name ?? "";
                  if (!groups.has(cat)) groups.set(cat, []);
                  groups.get(cat)!.push(b);
                }
                const hasMultipleGroups = groups.size > 1;

                const SORT_COLUMNS: { label: string; mode: SortMode | null }[] = [
                  { label: bk.client, mode: "client" },
                  { label: bk.session, mode: null },
                  { label: bk.dateTime, mode: "date" },
                  { label: bk.payment, mode: null },
                  { label: bk.status, mode: null },
                  { label: bk.actions, mode: null },
                ];

                const tableHeader = (
                  <div className="hidden md:grid grid-cols-[2fr_1.5fr_140px_90px_100px_80px] gap-x-4 px-5 py-3 bg-muted/30 border-b border-border">
                    {SORT_COLUMNS.map(({ label, mode }) => (
                      <button
                        key={label}
                        onClick={() => mode && setSortMode((prev) => prev === mode ? "newest" : mode)}
                        className={`text-[9px] tracking-[0.25em] uppercase font-medium flex items-center gap-1 text-left ${
                          mode ? "cursor-pointer hover:text-foreground" : "cursor-default"
                        } ${sortMode === mode ? "text-foreground" : "text-muted-foreground"}`}
                        disabled={!mode}
                      >
                        {label}
                        {mode && <ArrowUpDown className={`h-2.5 w-2.5 shrink-0 ${sortMode === mode ? "opacity-100" : "opacity-30"}`} />}
                      </button>
                    ))}
                  </div>
                );

                const renderRow = (booking: Booking, idx: number, list: Booking[]) => {
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
                      className={`group flex flex-col md:grid md:grid-cols-[2fr_1.5fr_140px_90px_100px_80px] gap-x-4 gap-y-2 px-5 py-4 items-center transition-colors hover:bg-muted/20 ${
                        idx < list.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      {/* Client */}
                      <div className="flex flex-col gap-0.5 min-w-0 w-full">
                        <span className="text-sm font-light truncate text-foreground leading-snug">
                          {booking.client_name}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                          <Mail className="h-2.5 w-2.5 shrink-0 opacity-60" />
                          {booking.client_email}
                        </span>
                      </div>

                      {/* Session */}
                      <div className="min-w-0 w-full">
                        <span className="text-xs font-light text-muted-foreground truncate block leading-snug">
                          {booking.sessions?.title ?? "—"}
                        </span>
                      </div>

                      {/* Date & Time */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {dateLabel ? (
                          <>
                            <span className="flex items-center gap-1.5 text-xs text-foreground font-light whitespace-nowrap">
                              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                              {dateLabel}
                            </span>
                            {timeLabel && (
                              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                {timeLabel}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* Payment */}
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${paymentMeta.dot}`} />
                        <span className="text-xs font-light text-foreground whitespace-nowrap">
                          {paymentMeta.label}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-wider uppercase font-light whitespace-nowrap ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5">
                        {booking.status !== "confirmed" && booking.status !== "cancelled" && (
                          <button
                            onClick={() => setConfirmDialog({ open: true, bookingId: booking.id, action: "confirm" })}
                            title="Confirm booking"
                            className="text-muted-foreground hover:text-emerald-600 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {booking.status !== "cancelled" && (
                          <button
                            onClick={() => setConfirmDialog({ open: true, bookingId: booking.id, action: "cancel" })}
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
                          <span className="text-[10px] text-muted-foreground/30">—</span>
                        )}
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="flex flex-col gap-6">
                    {Array.from(groups.entries()).map(([cat, list]) => (
                      <div key={cat || "__none__"} className="border border-border rounded-sm overflow-hidden">
                        {/* Category header */}
                        <div className="px-5 py-2.5 bg-muted/50 border-b border-border flex items-center gap-3">
                          <div className="w-4 h-px bg-border" />
                          <span className="text-[9px] tracking-[0.35em] uppercase text-muted-foreground font-medium">
                            {cat || "Uncategorized"}
                          </span>
                          <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                            {list.length}
                          </span>
                        </div>
                        {tableHeader}
                        {list.map((b, i) => renderRow(b, i, list))}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </main>
        </div>
      </div>
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

      <CreateBookingDialog
        open={createBookingOpen}
        onOpenChange={setCreateBookingOpen}
        onCreated={fetchBookings}
      />
    </SidebarProvider>
  );
};

export default Bookings;
