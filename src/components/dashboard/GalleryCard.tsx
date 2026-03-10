import { Image, FolderOpen, User } from "lucide-react";
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
    client_name?: string | null;
    session_title?: string | null;
  };
}

export function GalleryCard({ gallery }: GalleryCardProps) {
  const date = new Date(gallery.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      to={`/dashboard/galleries/${gallery.id}`}
      className="border border-border p-5 flex flex-col gap-4 hover:border-foreground/30 transition-colors group cursor-pointer no-underline"
    >
      {/* Thumbnail placeholder */}
      <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
        {gallery.cover_image_url ? (
          <img
            src={gallery.cover_image_url}
            alt={gallery.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <FolderOpen className="h-8 w-8 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-light tracking-wide truncate text-foreground">
            {gallery.title || "Untitled Gallery"}
          </h3>
          <Badge
            variant={gallery.category === "proof" ? "outline" : "default"}
            className="text-[9px] tracking-[0.2em] uppercase font-light shrink-0 rounded-none"
          >
            {gallery.category === "proof" ? "Proof" : "Final"}
          </Badge>
        </div>

        {/* Client + Session */}
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

        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              gallery.status === "published"
                ? "bg-green-500"
                : "bg-muted-foreground/30"
            }`}
          />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
            {gallery.status}
          </span>
        </div>
      </div>
    </Link>
  );
}
