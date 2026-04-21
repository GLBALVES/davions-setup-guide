import { useEffect, useState, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionType } from "./page-templates";
import BlockThumbnail from "./BlockThumbnail";

interface QuickAddPopoverProps {
  /** Trigger button (must be a single React element) */
  children: React.ReactNode;
  /** Called when the user picks a quick block */
  onPick: (type: SectionType) => void;
  /** Called when the user clicks "More blocks" — should open the full picker */
  onMore: () => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

const QUICK_BLOCKS: { type: SectionType; label: string }[] = [
  { type: "hero",         label: "Header" },
  { type: "text",         label: "Text" },
  { type: "gallery-grid", label: "Gallery" },
  { type: "image-text",   label: "Image" },
  { type: "cta",          label: "CTA" },
  { type: "contact-form", label: "Contact" },
];

const FAVORITES_STORAGE_KEY = "davions_quickadd_favorites_v1";

function readFavorites(): SectionType[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SectionType[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favs: SectionType[]) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));
  } catch {
    /* ignore */
  }
}

export default function QuickAddPopover({
  children, onPick, onMore, align = "center", side = "bottom",
}: QuickAddPopoverProps) {
  const [favorites, setFavorites] = useState<SectionType[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  const toggleFavorite = useCallback((type: SectionType) => {
    setFavorites((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type];
      writeFavorites(next);
      return next;
    });
  }, []);

  // Sort: favorited blocks first, then defaults.
  const orderedBlocks = [
    ...favorites
      .map((fav) => QUICK_BLOCKS.find((b) => b.type === fav))
      .filter((b): b is (typeof QUICK_BLOCKS)[number] => Boolean(b)),
    ...QUICK_BLOCKS.filter((b) => !favorites.includes(b.type)),
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={8}
        className="w-[300px] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <p className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
            Quick add
          </p>
          {favorites.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] font-medium tracking-wider uppercase text-primary">
              <Star className="h-2.5 w-2.5 fill-current" />
              {favorites.length}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {orderedBlocks.map(({ type, label }) => {
            const isFav = favorites.includes(type);
            return (
              <div key={type} className="relative group/tile">
                <button
                  type="button"
                  onClick={() => onPick(type)}
                  className={cn(
                    "w-full flex flex-col items-center gap-1 p-1.5 rounded-md border transition-colors text-center",
                    isFav
                      ? "border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"
                      : "border-transparent hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  <BlockThumbnail type={type} />
                  <span className="text-[10px] font-medium text-foreground leading-none mt-0.5">{label}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(type); }}
                  title={isFav ? "Remove from favorites" : "Add to favorites"}
                  aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                  className={cn(
                    "absolute top-0.5 right-0.5 p-0.5 rounded transition-opacity",
                    isFav
                      ? "opacity-100 text-primary hover:text-primary/80"
                      : "opacity-0 group-hover/tile:opacity-100 text-muted-foreground hover:text-primary"
                  )}
                >
                  <Star className={cn("h-3 w-3", isFav && "fill-current")} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onMore}
            className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            More blocks…
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
