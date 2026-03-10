import { Image, FolderOpen, User, Eye, Pencil, CalendarX2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

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
    session_title?: string | null;
  };
  onEdit?: () => void;
}

export function GalleryCard({ gallery, onEdit }: GalleryCardProps) {
  const date = new Date(gallery.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const publicUrl = `/gallery/${gallery.slug ?? gallery.id}`;
  const isExpired = gallery.expires_at ? new Date(gallery.expires_at) < new Date() : false;
  const isDraft = gallery.status === "draft";
  const isPublished = gallery.status === "published";

  return (
    <div className="border border-border flex flex-col group hover:border-foreground/30 transition-colors">
      {/* Thumbnail */}
      <Link to={`/dashboard/galleries/${gallery.id}`} className="block aspect-[4/3] bg-muted overflow-hidden">
        {gallery.cover_image_url ? (
          <img
            src={gallery.cover_image_url}
            alt={gallery.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
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
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                gallery.status === "published" ? "bg-green-500" : "bg-muted-foreground/30"
              }`}
            />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
              {gallery.status}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {gallery.status === "published" && (
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
