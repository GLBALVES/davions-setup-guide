import { useEffect, useState, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Image as ImageIcon, Type, LayoutGrid, Columns2,
  Target, Mail, MoreHorizontal, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionType } from "./page-templates";

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

const QUICK_BLOCKS: { type: SectionType; label: string; icon: React.ElementType }[] = [
  { type: "hero",         label: "Header",   icon: ImageIcon },
  { type: "text",         label: "Text",     icon: Type },
  { type: "gallery-grid", label: "Gallery",  icon: LayoutGrid },
  { type: "image-text",   label: "Image",    icon: Columns2 },
  { type: "cta",          label: "CTA",      icon: Target },
  { type: "contact-form", label: "Contact",  icon: Mail },
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

  // Sort: favorited blocks first (in user-pinned order), then the rest in default order.
  const orderedBlocks = [
    ...favorites
      .map((fav) => QUICK_BLOCKS.find((b) => b.type === fav))
      .filter((b): b is (typeof QUICK_BLOCKS)[number] => Boolean(b)),
    ...QUICK_BLOCKS.filter((b) => !favorites.includes(b.type)),
  ];

  const hasFavorites = favorites.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={8}
        className="w-[260px] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <p className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
            Quick add
          </p>
          {hasFavorites && (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-medium tracking-wider uppercase text-primary"
              title="Favorites appear first"
            >
              <Star className="h-2.5 w-2.5 fill-current" />
              {favorites.length}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {orderedBlocks.map(({ type, label, icon: Icon }) => {
            const isFav = favorites.includes(type);
            return (
              <div key={type} className="relative group/tile">
                <button
                  type="button"
                  onClick={() => onPick(type)}
                  className={cn(
                    "w-full flex flex-col items-center justify-center gap-1.5 p-2 rounded-md",
                    "border transition-colors text-center group",
                    isFav
                      ? "border-primary/50 bg-primary/5 hover:border-primary/70 hover:bg-primary/10"
                      : "border-transparent hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                      isFav
                        ? "bg-primary/15 group-hover:bg-primary/20"
                        : "bg-muted/60 group-hover:bg-primary/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isFav
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-primary"
                      )}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-foreground">{label}</span>
                </button>

                {/* Favorite toggle (top-right corner of the tile) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(type);
                  }}
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
