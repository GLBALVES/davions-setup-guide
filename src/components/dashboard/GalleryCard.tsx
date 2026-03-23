import { useState, useEffect, useCallback } from "react";
import { Image, FolderOpen, Eye, Pencil, CalendarX2, Clock, Send, Loader2, Check, Mail, Trash2, UserX, UserCheck, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  booked_date: string | null;
  session_title: string | null;
}

interface GalleryCardProps {
  gallery: {
    id: string;
    title: string;
    slug: string | null;
    category: string;
    status: string;
    created_at: string;
    photo_count: number;
    cover_image_url?: string | null;
    expires_at?: string | null;
    client_name?: string | null;
    client_email?: string | null;
    session_title?: string | null;
    booking_id?: string | null;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onAssigned?: () => void;
  /** Render as a compact single-row for list view */
  compact?: boolean;
}

export function GalleryCard({ gallery, onEdit, onDelete, onAssigned, compact = false }: GalleryCardProps) {
  const { toast } = useToast();
  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState(gallery.client_email ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Assign-client popover
  const [assignOpen, setAssignOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingQuery, setBookingQuery] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, booked_date, sessions(title)")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    setBookings(
      (data ?? []).map((b: any) => ({
        id: b.id,
        client_name: b.client_name,
        client_email: b.client_email,
        booked_date: b.booked_date ?? null,
        session_title: b.sessions?.title ?? null,
      }))
    );
    setBookingsLoading(false);
  }, []);

  useEffect(() => {
    if (assignOpen) {
      setBookingQuery("");
      fetchBookings();
    }
  }, [assignOpen, fetchBookings]);

  const filteredBookings = bookings.filter((b) => {
    if (!bookingQuery.trim()) return true;
    const q = bookingQuery.toLowerCase();
    return (
      b.client_name.toLowerCase().includes(q) ||
      b.client_email.toLowerCase().includes(q) ||
      (b.session_title?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleAssign = async (booking: Booking) => {
    setAssigning(true);
    try {
      // Build a new title from the booking data, only if gallery has no meaningful title
      const suggestedTitle = [booking.client_name, booking.session_title]
        .filter(Boolean)
        .join(" · ");
      const currentTitle = gallery.title?.trim() ?? "";
      const isTitleGeneric =
        !currentTitle ||
        currentTitle === "Untitled Gallery" ||
        currentTitle === gallery.id;
      const updates: Record<string, string> = { booking_id: booking.id };
      if (isTitleGeneric && suggestedTitle) updates.title = suggestedTitle;

      const { error } = await supabase
        .from("galleries")
        .update(updates)
        .eq("id", gallery.id);
      if (error) throw error;
      toast({
        title: "Client assigned",
        description: isTitleGeneric && suggestedTitle
          ? `Title updated to "${suggestedTitle}"`
          : `${booking.client_name} linked to this gallery.`,
      });
      setAssignOpen(false);
      onAssigned?.();
    } catch {
      toast({ title: "Failed to assign client", variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: photos } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("gallery_id", gallery.id);

      if (photos && photos.length > 0) {
        const paths = photos.map((p) => p.storage_path).filter(Boolean) as string[];
        if (paths.length > 0) {
          await supabase.storage.from("gallery-photos").remove(paths);
        }
        await supabase.from("photos").delete().eq("gallery_id", gallery.id);
      }

      await supabase.from("galleries").delete().eq("id", gallery.id);
      toast({ title: "Gallery deleted" });
      onDelete?.();
    } catch {
      toast({ title: "Failed to delete gallery", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const date = new Date(gallery.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const publicUrl = `/gallery/${gallery.slug ?? gallery.id}`;
  const isExpired = gallery.expires_at ? new Date(gallery.expires_at) < new Date() : false;
  const isDraft = gallery.status === "draft";
  const isPublished = gallery.status === "published";
  const isUnassigned = !gallery.booking_id;

  // Expiry urgency for published galleries approaching expiration
  const expiryUrgency: "critical" | "warning" | "soon" | null = (() => {
    if (!gallery.expires_at || isExpired || !isPublished) return null;
    const msLeft = new Date(gallery.expires_at).getTime() - Date.now();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);
    if (daysLeft <= 1) return "critical";
    if (daysLeft <= 3) return "warning";
    if (daysLeft <= 7) return "soon";
    return null;
  })();

  const expiryBorderClass = isExpired
    ? "border-destructive/50 hover:border-destructive/70"
    : expiryUrgency === "critical"
    ? "border-destructive/60 hover:border-destructive/80"
    : expiryUrgency === "warning"
    ? "border-orange-500/50 hover:border-orange-500/70"
    : expiryUrgency === "soon"
    ? "border-yellow-500/40 hover:border-yellow-500/60"
    : isDraft
    ? "border-border border-dashed hover:border-foreground/30"
    : "border-border hover:border-foreground/30";

  const expiryLabelClass = expiryUrgency === "critical"
    ? "bg-destructive text-destructive-foreground"
    : expiryUrgency === "warning"
    ? "bg-orange-500 text-white"
    : "bg-yellow-500 text-white";

  const expiryLabel = (() => {
    if (!gallery.expires_at || isExpired || !expiryUrgency) return null;
    const msLeft = new Date(gallery.expires_at).getTime() - Date.now();
    const h = Math.floor(msLeft / (1000 * 60 * 60));
    if (h < 24) return `${h}h`;
    const d = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    return `${d}d`;
  })();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gallery-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            galleryId: gallery.id,
            clientEmail: email.trim(),
            clientName: gallery.client_name ?? undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send");
      }
      setSent(true);
      toast({ title: "Gallery link sent", description: `Email sent to ${email.trim()}` });
      setTimeout(() => {
        setSent(false);
        setSendOpen(false);
      }, 2000);
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  /** Assign-client popover content (shared between grid and compact) */
  const assignPopover = (
    <Popover open={assignOpen} onOpenChange={setAssignOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          title="Assign client booking"
          className="p-1.5 text-warning/70 hover:text-warning transition-colors"
        >
          <UserCheck className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 rounded-none border-border"
        side="top"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] tracking-[0.2em] uppercase font-light flex-1">Assign Client</p>
          <button
            onClick={() => setAssignOpen(false)}
            className="text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border relative">
          <Search className="absolute left-5.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={bookingQuery}
            onChange={(e) => setBookingQuery(e.target.value)}
            placeholder="Search client or session…"
            className="h-7 pl-7 text-xs font-light rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground/40"
            autoFocus
          />
        </div>

        {/* Booking list */}
        <div className="max-h-56 overflow-y-auto">
          {bookingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground font-light">No confirmed bookings found</p>
            </div>
          ) : (
            filteredBookings.map((b) => (
              <button
                key={b.id}
                disabled={assigning}
                onClick={() => handleAssign(b)}
                className="w-full flex flex-col gap-0.5 px-4 py-3 text-left border-b border-border last:border-0 hover:bg-accent transition-colors disabled:opacity-50"
              >
                <span className="text-xs font-light text-foreground truncate">{b.client_name}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {[b.session_title, b.client_email].filter(Boolean).join(" · ")}
                </span>
                {b.booked_date && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(b.booked_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
    <div className={`border flex group transition-colors ${
      isExpired
        ? "border-destructive/40 hover:border-destructive/60"
        : isDraft
        ? "border-border border-dashed hover:border-foreground/30"
        : "border-border hover:border-foreground/30"
    } ${compact ? "flex-row items-center gap-3 p-3" : "flex-col"}`}>

      {/* Thumbnail — hidden in compact list view */}
      {!compact && (
        <Link to={`/dashboard/galleries/${gallery.id}`} className="block h-32 bg-muted overflow-hidden relative">
          {gallery.cover_image_url ? (
            <img
              src={gallery.cover_image_url}
              alt={gallery.title}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isExpired ? "opacity-50 grayscale" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
            </div>
          )}
          {isExpired && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-destructive text-destructive-foreground px-2 py-0.5 text-[9px] tracking-[0.15em] uppercase font-light">
              <CalendarX2 className="h-2.5 w-2.5" />
              Expired
            </div>
          )}
          {isDraft && !isExpired && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-muted/90 text-muted-foreground px-2 py-0.5 text-[9px] tracking-[0.15em] uppercase font-light border border-border">
              <Clock className="h-2.5 w-2.5" />
              Draft
            </div>
          )}
          {isUnassigned && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-warning text-warning-foreground px-2 py-0.5 text-[9px] tracking-[0.15em] uppercase font-light">
              <UserX className="h-2.5 w-2.5" />
              No client
            </div>
          )}
        </Link>
      )}

      {/* Compact thumbnail */}
      {compact && (
        <Link
          to={`/dashboard/galleries/${gallery.id}`}
          className="shrink-0 w-14 h-10 bg-muted overflow-hidden relative"
        >
          {gallery.cover_image_url ? (
            <img
              src={gallery.cover_image_url}
              alt={gallery.title}
              className={`w-full h-full object-cover group-hover:brightness-90 transition-all duration-300 ${isExpired ? "opacity-50 grayscale" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FolderOpen className="h-4 w-4 text-muted-foreground/30" />
            </div>
          )}
        </Link>
      )}

      {/* Info */}
      <div className={compact ? "flex items-center gap-3 flex-1 min-w-0" : "p-3 flex flex-col gap-1.5 flex-1"}>
        {/* Title + badge */}
        <div className={compact ? "flex items-center gap-2 flex-1 min-w-0" : "flex items-center justify-between gap-2"}>
          <Link
            to={`/dashboard/galleries/${gallery.id}`}
            className="text-sm font-light tracking-wide truncate text-foreground hover:underline underline-offset-2 no-underline"
          >
            {gallery.title || "Untitled Gallery"}
          </Link>
          {!compact && (
            <Badge
              variant={gallery.category === "proof" ? "outline" : "default"}
              className="text-[9px] tracking-[0.2em] uppercase font-light shrink-0 rounded-none"
            >
              {gallery.category === "proof" ? "Proof" : "Final"}
            </Badge>
          )}
        </div>

        {/* Photo count + status inline */}
        {!compact && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground tracking-wider uppercase">
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {gallery.photo_count} photo{gallery.photo_count !== 1 ? "s" : ""}
            </span>
            <span>·</span>
            {isExpired ? (
              <span className="flex items-center gap-1 text-destructive">
                <CalendarX2 className="h-3 w-3" />
                Expired
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                {gallery.status}
              </span>
            )}
            {isUnassigned && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-warning">
                  <UserX className="h-3 w-3" />
                  No client
                </span>
              </>
            )}
          </div>
        )}

        {/* Compact meta bits */}
        {compact && (
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground tracking-wider uppercase shrink-0">
            {gallery.client_name && <span className="truncate max-w-[120px]">{gallery.client_name}</span>}
            {isUnassigned && (
              <span className="flex items-center gap-1 text-warning">
                <UserX className="h-3 w-3" />
                No client
              </span>
            )}
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {gallery.photo_count}
            </span>
            <span>{date}</span>
          </div>
        )}

        {/* Status */}
        {compact && (
          <div className="flex items-center gap-1.5 shrink-0">
            {isExpired ? (
              <span className="text-[10px] tracking-[0.2em] uppercase text-destructive font-light flex items-center gap-1">
                <CalendarX2 className="h-3 w-3" />
                Expired
              </span>
            ) : (
              <>
                <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
                  {gallery.status}
                </span>
              </>
            )}
          </div>
        )}

        {/* Actions row — only in card mode */}
        {!compact && (
          <div className="flex items-center justify-end pt-0.5">
            <div className="flex items-center gap-1">
              {/* Assign-client button — only for unassigned galleries */}
              {isUnassigned && assignPopover}

              {isPublished && !isExpired && (
                <Popover open={sendOpen} onOpenChange={(v) => { setSendOpen(v); if (!v) { setSent(false); setEmail(gallery.client_email ?? ""); } }}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      title="Send gallery to client"
                      className="p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-72 p-0 rounded-none border-border"
                    side="top"
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-[11px] tracking-[0.2em] uppercase font-light">Send Gallery Link</p>
                    </div>
                    <form onSubmit={handleSend} className="p-4 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-muted-foreground font-light">
                          Client email
                        </label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@example.com"
                          required
                          className="h-8 text-sm font-light rounded-none"
                          autoFocus
                        />
                      </div>
                      {gallery.client_name && (
                        <p className="text-[10px] text-muted-foreground/70 -mt-1">
                          Sending to <span className="text-foreground/70">{gallery.client_name}</span>
                        </p>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sending || sent || !email.trim()}
                        className="gap-2 text-[10px] tracking-widest uppercase font-light rounded-none w-full"
                      >
                        {sent ? (
                          <><Check className="h-3.5 w-3.5" /> Sent!</>
                        ) : sending ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                        ) : (
                          <><Send className="h-3.5 w-3.5" /> Send</>
                        )}
                      </Button>
                    </form>
                  </PopoverContent>
                </Popover>
              )}

              {isPublished && !isExpired && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="View public gallery"
                  className="p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                </a>
              )}
              {onEdit && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                  title="Edit gallery info"
                  className="p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteOpen(true); }}
                title="Delete gallery"
                className="p-1.5 text-muted-foreground/50 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Compact actions */}
        {compact && (
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {/* Assign-client button in compact mode */}
            {isUnassigned && assignPopover}

            {onEdit && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                title="Edit gallery info"
                className="p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteOpen(true); }}
              title="Delete gallery"
              className="p-1.5 text-muted-foreground/50 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>

    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete gallery?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <span className="font-medium text-foreground">"{gallery.title}"</span> and all its photos. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete gallery"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
