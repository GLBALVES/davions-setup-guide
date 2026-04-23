import { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session, Gallery } from "@/components/store/PublicSiteRenderer";
import { getShopDefaults } from "@/lib/shop-defaults";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ShopGridProps {
  sessions: Session[];
  galleries: Array<Gallery & { price_per_photo?: number | null }>;
  layout?: "grid-3" | "grid-4" | "grid-2-feature";
  showFilters?: boolean;
  showPrice?: boolean;
  ctaLabel?: string;
  /** Filter what to show */
  showSessions?: boolean;
  showGalleries?: boolean;
  /** Limit of total items (after filter). 0/undefined = no limit */
  limit?: number;
  /** Sort: 'manual' uses given order, others self-explanatory */
  order?: "manual" | "newest" | "price-asc" | "price-desc";
  sessionHref: (session: Session) => string;
  galleryHref: (gallery: Gallery) => string;
}

type Tab = "all" | "sessions" | "galleries";

interface UnifiedItem {
  kind: "session" | "gallery";
  id: string;
  slug: string | null;
  title: string;
  cover: string | null;
  price: number;
  badge: string;
  href: string;
  /** Whether the price represents a "from" price (galleries) */
  isFromPrice: boolean;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function ShopGrid({
  sessions,
  galleries,
  layout = "grid-3",
  showFilters = true,
  showPrice = true,
  ctaLabel,
  showSessions = true,
  showGalleries = true,
  limit,
  order = "manual",
  sessionHref,
  galleryHref,
}: ShopGridProps) {
  const { lang } = useLanguage();
  const d = getShopDefaults(lang);
  const [tab, setTab] = useState<Tab>("all");

  const items: UnifiedItem[] = useMemo(() => {
    const arr: UnifiedItem[] = [];
    if (showSessions) {
      sessions.forEach((s) =>
        arr.push({
          kind: "session",
          id: s.id,
          slug: s.slug,
          title: s.title,
          cover: s.cover_image_url,
          price: s.price ?? 0,
          badge: d.badgeSession,
          href: sessionHref(s),
          isFromPrice: false,
        }),
      );
    }
    if (showGalleries) {
      galleries.forEach((g) =>
        arr.push({
          kind: "gallery",
          id: g.id,
          slug: g.slug,
          title: g.title,
          cover: g.cover_image_url,
          price: (g.price_per_photo ?? 0) as number,
          badge: d.badgeGallery,
          href: galleryHref(g as Gallery),
          isFromPrice: true,
        }),
      );
    }

    let sorted = arr;
    if (order === "price-asc") sorted = [...arr].sort((a, b) => a.price - b.price);
    else if (order === "price-desc") sorted = [...arr].sort((a, b) => b.price - a.price);
    // 'newest' would need a created_at; skip — caller passes sorted data already.

    if (limit && limit > 0) sorted = sorted.slice(0, limit);
    return sorted;
  }, [sessions, galleries, showSessions, showGalleries, order, limit, sessionHref, galleryHref, d]);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    if (tab === "sessions") return items.filter((i) => i.kind === "session");
    return items.filter((i) => i.kind === "gallery");
  }, [items, tab]);

  const hasSessions = items.some((i) => i.kind === "session");
  const hasGalleries = items.some((i) => i.kind === "gallery");
  const showTabs = showFilters && hasSessions && hasGalleries;

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-sm font-light tracking-wide uppercase mb-2">{d.emptyTitle}</p>
        <p className="text-xs text-muted-foreground font-light">{d.emptyDescription}</p>
      </div>
    );
  }

  const gridCls =
    layout === "grid-4"
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      : layout === "grid-2-feature"
        ? "grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6";

  return (
    <div className="w-full">
      {showTabs && (
        <div className="flex items-center justify-center gap-1 mb-8 border-b border-border/60">
          {([
            { key: "all", label: d.allTab },
            { key: "sessions", label: d.sessionsTab },
            { key: "galleries", label: d.galleriesTab },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 text-[10px] tracking-[0.3em] uppercase font-light transition-colors border-b-2 -mb-px",
                tab === t.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className={gridCls}>
        {filtered.map((item) => (
          <a
            key={`${item.kind}-${item.id}`}
            href={item.href}
            className="group flex flex-col overflow-hidden bg-card border border-border/40 hover:border-border transition-colors"
          >
            <div className="relative aspect-[4/3] bg-muted/40 overflow-hidden">
              {item.cover ? (
                <img
                  src={item.cover}
                  alt={item.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                  <ImageOff className="h-8 w-8" />
                </div>
              )}
              <span className="absolute top-3 left-3 px-2.5 py-1 text-[9px] tracking-[0.25em] uppercase font-light bg-background/85 backdrop-blur-sm text-foreground border border-border/50">
                {item.badge}
              </span>
            </div>
            <div className="flex flex-col flex-1 p-4 sm:p-5 gap-2">
              <h3 className="text-sm sm:text-base font-light tracking-wide leading-tight line-clamp-2">
                {item.title}
              </h3>
              {showPrice && (
                <p className="text-xs text-muted-foreground font-light">
                  {item.price > 0 ? (
                    <>
                      {item.isFromPrice && <span className="opacity-70">{d.startingAt} </span>}
                      <span className="text-foreground">{formatPrice(item.price)}</span>
                      {item.isFromPrice && <span className="opacity-70"> {d.perPhoto}</span>}
                    </>
                  ) : (
                    <span className="opacity-70">{d.onRequest}</span>
                  )}
                </p>
              )}
              <span className="mt-auto pt-3 text-[10px] tracking-[0.3em] uppercase text-foreground/80 group-hover:text-foreground transition-colors">
                {ctaLabel || d.viewDetails} →
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
