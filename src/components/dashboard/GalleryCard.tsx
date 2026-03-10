import { useState } from "react";
import { Image, FolderOpen, User, Eye, Pencil, CalendarX2, Clock, Send, Loader2, Check, Mail, Trash2 } from "lucide-react";
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
  };
  onEdit?: () => void;
  onDelete?: () => void;
  /** Render as a compact single-row for list view */
  compact?: boolean;
}

export function GalleryCard({ gallery, onEdit, onDelete, compact = false }: GalleryCardProps) {
  const { toast } = useToast();
  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState(gallery.client_email ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Remove all photos from storage for this gallery
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

  return (
    <div className={`border flex group transition-colors ${
      isExpired
        ? "border-destructive/40 hover:border-destructive/60"
        : isDraft
        ? "border-border border-dashed hover:border-foreground/30"
        : "border-border hover:border-foreground/30"
    } ${compact ? "flex-row items-center gap-3 p-3" : "flex-col"}`}>

      {/* Thumbnail — hidden in compact list view */}
      {!compact && (
        <Link to={`/dashboard/galleries/${gallery.id}`} className="block aspect-[4/3] bg-muted overflow-hidden relative">
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
      <div className={compact ? "flex items-center gap-3 flex-1 min-w-0" : "p-4 flex flex-col gap-2 flex-1"}>
        {/* Title + badge */}
        <div className={compact ? "flex items-center gap-2 flex-1 min-w-0" : "flex items-start justify-between gap-2"}>
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

        {/* Meta — only in card mode */}
        {!compact && (gallery.client_name || gallery.session_title) && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {[gallery.client_name, gallery.session_title].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}

        {/* Photo count + date */}
        {!compact && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground tracking-wider uppercase">
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {gallery.photo_count} photo{gallery.photo_count !== 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>{date}</span>
          </div>
        )}

        {/* Compact meta bits */}
        {compact && (
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground tracking-wider uppercase shrink-0">
            {gallery.client_name && <span className="truncate max-w-[120px]">{gallery.client_name}</span>}
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

        {/* Footer row — only in card mode */}
        {!compact && (
          <div className="flex items-center justify-between mt-auto pt-1">
            <div className="flex items-center gap-1.5">
              {isExpired ? (
                <span className="text-[10px] tracking-[0.2em] uppercase text-destructive font-light flex items-center gap-1">
                  <CalendarX2 className="h-3 w-3" />
                  Expired {gallery.expires_at && new Date(gallery.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
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

            <div className="flex items-center gap-1">
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
