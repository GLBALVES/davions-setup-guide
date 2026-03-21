import { useRef, useState } from "react";
import { Settings2, Eye, EyeOff, GripVertical, Plus } from "lucide-react";
import type { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";
import PublicSiteRenderer from "@/components/store/PublicSiteRenderer";
import type { BlockKey } from "./BlockPanel";
import type { SectionDef } from "./EditorSidebar";

const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero",
  sessions: "Sessions",
  portfolio: "Portfolio",
  about: "About",
  quote: "Quote",
  experience: "Experience",
  contact: "Contact",
  footer: "Footer",
};

interface Props {
  data: Partial<SiteConfig>;
  photographer: Photographer;
  sessions: Session[];
  galleries: Gallery[];
  viewport: "desktop" | "tablet" | "mobile";
  onSelectBlock: (key: BlockKey) => void;
  activeBlock: BlockKey | null;
  onToggleVisibility: (key: BlockKey) => void;
  onAddBlock: (insertAfterIndex: number) => void;
  sections: SectionDef[];
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
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [hoveredGap, setHoveredGap] = useState<{ index: number; top: number; left: number; width: number } | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  };

  const getBlockElementRect = (key: string) => {
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
  };

  const getVisibleSections = () =>
    sections.filter((s) => s.visible !== false);

  const detectGap = (mouseY: number) => {
    if (!containerRef.current) return null;
    const visibleSections = getVisibleSections();

    for (let i = 0; i < visibleSections.length; i++) {
      const rect = getBlockElementRect(visibleSections[i].key);
      if (!rect) continue;
      const bottomY = rect.bottom;
      if (Math.abs(mouseY - bottomY) <= 28) {
        return {
          index: sections.findIndex((s) => s.key === visibleSections[i].key) + 1,
          top: bottomY,
          left: rect.left,
          width: rect.width,
        };
      }
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Cancel any pending leave timer
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    const overlay = e.currentTarget;
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    overlay.style.pointerEvents = "all";

    const containerRect = containerRef.current?.getBoundingClientRect();
    const mouseY = containerRect ? e.clientY - containerRect.top : 0;

    const gap = detectGap(mouseY);
    setHoveredGap(gap);

    if (el) {
      const blockEl = el.closest("[data-block-key]") as HTMLElement | null;
      const key = blockEl?.getAttribute("data-block-key") ?? null;
      if (key !== hoveredBlock) {
        setHoveredBlock(key);
        if (key) {
          const rect = getBlockElementRect(key);
          setToolbarPos(rect ? { top: rect.top, left: rect.left, width: rect.width } : null);
        } else {
          setToolbarPos(null);
        }
      }
    } else {
      setHoveredBlock(null);
      setToolbarPos(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const overlay = e.currentTarget;
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    overlay.style.pointerEvents = "all";

    if (el) {
      const blockEl = el.closest("[data-block-key]") as HTMLElement | null;
      const key = blockEl?.getAttribute("data-block-key") as BlockKey | null;
      if (key) onSelectBlock(key);
    }
  };

  const handleMouseLeave = () => {
    // Delay clearing so the user can move to the floating toolbar without it vanishing
    leaveTimerRef.current = setTimeout(() => {
      setHoveredBlock(null);
      setToolbarPos(null);
      setHoveredGap(null);
    }, 300);
  };

  const isVisible = (key: string) => sections.find((s) => s.key === key)?.visible ?? true;
  const cursor = hoveredBlock ? "pointer" : "default";

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
        />
      </div>

      {/* Transparent overlay for hover/click detection */}
      <div
        className="absolute inset-0 z-20"
        style={{ cursor }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* Floating inline toolbar — shown on hover */}
      {hoveredBlock && toolbarPos && (
        <div
          className="absolute z-30 flex items-center gap-px pointer-events-none"
          style={{
            top: Math.max(0, toolbarPos.top),
            left: toolbarPos.left,
            width: toolbarPos.width,
          }}
        >
          <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-medium tracking-[0.15em] uppercase shadow-lg pointer-events-auto rounded-sm">
            <GripVertical className="h-3 w-3 opacity-50" />
            <span>{BLOCK_LABELS[hoveredBlock] ?? hoveredBlock}</span>
          </div>
          <div className="flex items-center gap-px pointer-events-auto ml-1">
            <button
              className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1.5 text-[10px] hover:bg-primary/80 transition-colors shadow-lg rounded-sm"
              onClick={(e) => { e.stopPropagation(); onSelectBlock(hoveredBlock as BlockKey); }}
              title="Edit section"
            >
              <Settings2 className="h-3 w-3" />
              <span className="tracking-widest uppercase text-[9px]">Edit</span>
            </button>
            <button
              className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1.5 text-[10px] hover:bg-primary/80 transition-colors shadow-lg rounded-sm ml-px"
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(hoveredBlock as BlockKey); }}
              title={isVisible(hoveredBlock) ? "Hide section" : "Show section"}
            >
              {isVisible(hoveredBlock) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
          </div>
        </div>
      )}

      {/* Gap "+" button between sections */}
      {hoveredGap && (
        <div
          className="absolute z-40 flex items-center justify-center pointer-events-none"
          style={{
            top: hoveredGap.top - 12,
            left: hoveredGap.left,
            width: hoveredGap.width,
            height: 24,
          }}
        >
          {/* Horizontal line */}
          <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-primary/60" />
          {/* Plus button */}
          <button
            className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 transition-transform pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onAddBlock(hoveredGap.index);
            }}
            title="Add section here"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hover/active highlight via injected style targeting data-block-key */}
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
