import { useState } from "react";
import { Image, FolderOpen, User, Eye, Pencil, CalendarX2, Clock, Send, Loader2, Check, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

export function GalleryCard({ gallery, onEdit }: GalleryCardProps) {
  const { toast } = useToast();
  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState(gallery.client_email ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
    <div className={`border flex flex-col group transition-colors ${
      isExpired
        ? "border-destructive/40 hover:border-destructive/60"
        : isDraft
        ? "border-border border-dashed hover:border-foreground/30"
        : "border-border hover:border-foreground/30"
    }`}>
      {/* Thumbnail */}
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
        {/* Overlay badges on thumbnail */}
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

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/dashboard/galleries/${gallery.id}`}
            className="text-sm font-light tracking-wide truncate text-foreground hover:underline underline-offset-2 no-underline"
          >
            {gallery.title || "Untitled Gallery"}
          </Link>
          <Badge
            variant={gallery.category === "proof" ? "outline" : "default"}
            className="text-[9px] tracking-[0.2em] uppercase font-light shrink-0 rounded-none"
          >
            {gallery.category === "proof" ? "Proof" : "Final"}
          </Badge>
        </div>

        {(gallery.client_name || gallery.session_title) && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {[gallery.client_name, gallery.session_title].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground tracking-wider uppercase">
          <span className="flex items-center gap-1">
            <Image className="h-3 w-3" />
            {gallery.photo_count} photo{gallery.photo_count !== 1 ? "s" : ""}
          </span>
          <span>·</span>
          <span>{date}</span>
        </div>

        {/* Footer row: status + actions */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1.5">
            {isExpired ? (
              <span className="text-[10px] tracking-[0.2em] uppercase text-destructive font-light flex items-center gap-1">
                <CalendarX2 className="h-3 w-3" />
                Expired {gallery.expires_at && new Date(gallery.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            ) : (
              <>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isPublished ? "bg-green-500" : "bg-muted-foreground/30"
                  }`}
                />
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
                  {gallery.status}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Quick-send button — only for published, non-expired */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
