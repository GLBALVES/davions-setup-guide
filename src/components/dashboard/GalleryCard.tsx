import { Image, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GalleryCardProps {
  gallery: {
    id: string;
    title: string;
    slug: string | null;
    category: string;
    status: string;
    created_at: string;
    photo_count: number;
  };
}

export function GalleryCard({ gallery }: GalleryCardProps) {
  const date = new Date(gallery.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="border border-border p-5 flex flex-col gap-4 hover:border-foreground/30 transition-colors group cursor-pointer">
      {/* Thumbnail placeholder */}
      <div className="aspect-[4/3] bg-muted flex items-center justify-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-light tracking-wide truncate">
            {gallery.title || "Untitled Gallery"}
          </h3>
          <Badge
            variant={gallery.category === "proof" ? "outline" : "default"}
            className="text-[9px] tracking-[0.2em] uppercase font-light shrink-0 rounded-none"
          >
            {gallery.category === "proof" ? "Proof" : "Final"}
          </Badge>
        </div>

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
    </div>
  );
}
