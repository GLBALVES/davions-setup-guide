import { useRef, useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, GripVertical, Plus, X } from "lucide-react";
import type { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";
import PublicSiteRenderer from "@/components/store/PublicSiteRenderer";
import type { BlockKey } from "./BlockPanel";
import { BlockPanel } from "./BlockPanel";
import type { SectionDef } from "./EditorSidebar";

const BLOCK_LABELS: Record<string, string> = {
  header: "Header",
  hero: "Hero",
  sessions: "Sessions",
  portfolio: "Portfolio",
  about: "About",
  testimonials: "Testimonials",
  quote: "Quote",
  experience: "Experience",
  contact: "Contact",
  footer: "Footer",
};

interface Props {
  data: Partial<SiteConfig> & { bio?: string };
  photographer: Photographer;
  sessions: Session[];
  galleries: Gallery[];
  viewport: "desktop" | "tablet" | "mobile";
  onSelectBlock: (key: BlockKey) => void;
  activeBlock: BlockKey | null;
  onToggleVisibility: (key: BlockKey) => void;
  onAddBlock: (insertAfterIndex: number) => void;
  sections: SectionDef[];
  onDataChange: (patch: Partial<SiteConfig> & { bio?: string }) => void;
  storeSlug?: string | null;
  activePageId?: string | null;
}

export function LivePreview({
  data,
  photographer,
  sessions,
  galleries,
  viewport,
  onSelectBlock,
  activeBlock,
  onToggleVisibility,
  onAddBlock,
  sections,
  onDataChange,
  storeSlug,
  activePageId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [hoveredGap, setHoveredGap] = useState<{ index: number; top: number; left: number; width: number } | null>(null);

  // Scroll to active block whenever it changes.
  // We retry with increasing delays because newly-added sections may not be in the DOM yet.
  // activePageId is included so the effect re-fires when switching between pages even if
  // activeBlock key stays the same (e.g. "hero" exists on both pages).
  useEffect(() => {
    if (!activeBlock) return;
    const scrollTo = () => {
      const el = document.querySelector(`#editor-site-render [data-block-key="${activeBlock}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };
    // Immediate attempt (works for already-rendered blocks)
    if (!scrollTo()) {
      // Retry after first paint (newly added section / page still rendering)
      const t1 = setTimeout(() => { if (!scrollTo()) setTimeout(scrollTo, 400); }, 100);
      return () => clearTimeout(t1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlock, activePageId]);
  // Debounced hide: schedule clearing hover state so that moving from overlay → toolbar/gap
  // doesn't cause a flicker (the enter handler cancels the timer before it fires).
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setHoveredBlock(null);
      setToolbarPos(null);
      setHoveredGap(null);
    }, 120);
  }, []);
  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const siteConfig: SiteConfig = {
    site_hero_image_url: data.site_hero_image_url ?? null,
    site_headline: data.site_headline ?? null,
    site_subheadline: data.site_subheadline ?? null,
    cta_text: data.cta_text ?? "Book a Session",
    cta_link: data.cta_link ?? null,
    logo_url: data.logo_url ?? null,
    tagline: data.tagline ?? null,
    accent_color: data.accent_color ?? "#000000",
    about_title: data.about_title ?? "About",
    about_image_url: data.about_image_url ?? null,
    instagram_url: data.instagram_url ?? null,
    facebook_url: data.facebook_url ?? null,
    pinterest_url: data.pinterest_url ?? null,
    tiktok_url: data.tiktok_url ?? null,
    youtube_url: data.youtube_url ?? null,
    whatsapp: data.whatsapp ?? null,
    linkedin_url: data.linkedin_url ?? null,
    footer_text: data.footer_text ?? null,
    show_about: data.show_about ?? true,
    show_store: data.show_store ?? true,
    show_booking: data.show_booking ?? true,
    show_blog: data.show_blog ?? false,
    show_contact: data.show_contact ?? true,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    og_image_url: data.og_image_url ?? null,
    site_template: data.site_template ?? "editorial",
    favicon_url: data.favicon_url ?? null,
    quote_text: data.quote_text ?? null,
    quote_author: data.quote_author ?? null,
    experience_title: data.experience_title ?? null,
    experience_text: data.experience_text ?? null,
    hero_layout: (data as any).hero_layout ?? "full",
    about_layout: (data as any).about_layout ?? "image-right",
    testimonials: (data as any).testimonials ?? [],
    testimonials_title: (data as any).testimonials_title ?? null,
    testimonials_layout: (data as any).testimonials_layout ?? "cards",
    header_bg_color: (data as any).header_bg_color ?? null,
    header_text_color: (data as any).header_text_color ?? null,
    header_visible_socials: (data as any).header_visible_socials ?? null,
  };

  const getBlockRect = useCallback((key: string) => {
    const el = document.querySelector(`#editor-site-render [data-block-key="${key}"]`) as HTMLElement | null;
    if (!el || !containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return {
      top: elRect.top - containerRect.top,
      left: elRect.left - containerRect.left,
      width: elRect.width,
      bottom: elRect.bottom - containerRect.top,
    };
  }, []);

  const getGapForBlock = useCallback((hoveredKey: string | null) => {
    if (!hoveredKey) return null;
    const rect = getBlockRect(hoveredKey);
    if (!rect) return null;
    return {
      index: sections.findIndex((s) => s.key === hoveredKey) + 1,
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
    };
  }, [sections, getBlockRect]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    cancelHide();
    const overlay = e.currentTarget as HTMLDivElement;
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    overlay.style.pointerEvents = "auto";

    const blockEl = el?.closest("[data-block-key]") as HTMLElement | null;
    const key = blockEl?.getAttribute("data-block-key") ?? null;

    const gap = getGapForBlock(key);
    setHoveredGap(gap);

    if (key !== hoveredBlock) {
      setHoveredBlock(key);
      if (key) {
        const rect = getBlockRect(key);
        setToolbarPos(rect ? { top: rect.top, left: rect.left, width: rect.width } : null);
      } else {
        setToolbarPos(null);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const overlay = e.currentTarget as HTMLDivElement;
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    overlay.style.pointerEvents = "auto";

    // If the user clicked a CTA / nav scroll button, open site preview in new tab
    const scrollTarget = el?.closest("[data-scroll-to]")?.getAttribute("data-scroll-to");
    if (scrollTarget) {
      if (storeSlug) {
        window.open(`/store/${storeSlug}`, "_blank", "noopener,noreferrer");
      }
      return;
    }

    const blockEl = el?.closest("[data-block-key]") as HTMLElement | null;
    const key = blockEl?.getAttribute("data-block-key") as BlockKey | null;
    if (key) onSelectBlock(key);
  };

  const handleMouseLeave = () => {
    scheduleHide();
  };

  const isVisible = (key: string) => sections.find((s) => s.key === key)?.visible ?? true;

  // Panel width for the floating editor
  const PANEL_W = 300;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Site render */}
      <div id="editor-site-render">
        <PublicSiteRenderer
          photographer={photographer}
          site={siteConfig}
          sessions={sessions}
          galleries={galleries}
          scrolled={false}
          mobileMenuOpen={false}
          setMobileMenuOpen={() => {}}
          seoUrl=""
          sessionHref={() => "#"}
          galleryHref={() => "#"}
          blogHref="#"
          editMode={!!activeBlock}
          onFieldChange={(fieldKey, value) => onDataChange({ [fieldKey]: value } as any)}
          visibleSections={sections.filter((s) => s.visible !== false).map((s) => s.key)}
        />
      </div>

      {/* Transparent interaction overlay — disabled when a block is being edited inline */}
      <div
        className="absolute inset-0 z-10"
        style={{ cursor: hoveredBlock ? "pointer" : "default", pointerEvents: activeBlock ? "none" : "auto" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* Floating toolbar — only when no block is actively being edited */}
      {!activeBlock && hoveredBlock && toolbarPos && (
        <div
          className="absolute z-20 flex items-center gap-px select-none"
          style={{
            top: Math.max(0, toolbarPos.top),
            left: toolbarPos.left,
            width: toolbarPos.width,
            pointerEvents: "auto",
          }}
          onMouseEnter={() => { cancelHide(); }}
          onMouseLeave={() => {
            scheduleHide();
          }}
        >
          <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-medium tracking-[0.15em] uppercase shadow-lg rounded-sm cursor-default shrink-0">
            <GripVertical className="h-3 w-3 opacity-50" />
            <span>{BLOCK_LABELS[hoveredBlock] ?? hoveredBlock}</span>
          </div>
          <div className="flex items-center gap-px ml-1">
            <button
              className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1.5 text-[10px] hover:bg-primary/80 active:bg-primary/70 transition-colors shadow-lg rounded-sm"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelectBlock(hoveredBlock as BlockKey); }}
              title="Edit section"
            >
              <span className="tracking-widest uppercase text-[9px]">Edit</span>
            </button>
            <button
              className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1.5 text-[10px] hover:bg-primary/80 active:bg-primary/70 transition-colors shadow-lg rounded-sm ml-px"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggleVisibility(hoveredBlock as BlockKey); }}
              title={isVisible(hoveredBlock) ? "Hide section" : "Show section"}
            >
              {isVisible(hoveredBlock) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
          </div>
        </div>
      )}

      {/* Gap "+" button */}
      {!activeBlock && hoveredGap && (
        <div
          className="absolute z-20 flex items-center justify-center"
          style={{ top: hoveredGap.top - 12, left: hoveredGap.left, width: hoveredGap.width, height: 24, pointerEvents: "auto" }}
          onMouseEnter={() => { cancelHide(); }}
          onMouseLeave={() => {
            scheduleHide();
          }}
        >
          <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-primary/60 pointer-events-none" />
          <button
            className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 active:scale-95 transition-transform"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAddBlock(hoveredGap.index); }}
            title="Add section here"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Active block indicator: accent bar + label badge pinned at top of the active section */}
      {activeBlock && (() => {
        const rect = getBlockRect(activeBlock);
        if (!rect) return null;
        return (
          <div
            className="absolute z-30 pointer-events-none"
            style={{ top: rect.top, left: rect.left, width: rect.width }}
          >
            {/* Top accent bar */}
            <div className="w-full h-[2px] bg-primary" />
            {/* Section name + Done badge */}
            <div className="absolute top-[2px] left-0 flex items-center gap-1.5 bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-medium tracking-[0.15em] uppercase shadow-md rounded-b-sm pointer-events-auto">
              <span>{BLOCK_LABELS[activeBlock] ?? activeBlock}</span>
              <span className="opacity-40 text-[8px]">|</span>
              <button
                className="opacity-70 hover:opacity-100 transition-opacity text-[9px] tracking-widest underline decoration-dotted"
                onMouseDown={(e) => { e.preventDefault(); onSelectBlock(null as any); }}
              >
                Done
              </button>
            </div>
          </div>
        );
      })()}

      {/* Hover/active highlight */}
      <style>{`
        #editor-site-render [data-block-key="${hoveredBlock || "__none__"}"] {
          outline: 2px solid hsl(214, 100%, 55%);
          outline-offset: -2px;
        }
        #editor-site-render [data-block-key="${activeBlock || "__none__"}"] {
          outline: 2px solid hsl(214, 100%, 45%);
          outline-offset: -2px;
          background-color: hsla(214, 100%, 55%, 0.04);
        }
      `}</style>
    </div>
  );
}
