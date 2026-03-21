import { useRef, useState } from "react";
import type { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";
import PublicSiteRenderer from "@/components/store/PublicSiteRenderer";
import type { BlockKey } from "./BlockPanel";

interface Props {
  data: Partial<SiteConfig>;
  photographer: Photographer;
  sessions: Session[];
  galleries: Gallery[];
  viewport: "desktop" | "tablet" | "mobile";
  onSelectBlock: (key: BlockKey) => void;
  activeBlock: BlockKey | null;
}

export function LivePreview({ data, photographer, sessions, galleries, viewport, onSelectBlock, activeBlock }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);

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
  };

  // Handle mouse events bubbled up through the overlay to find the closest data-block-key
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Get the element under the pointer from the rendered site (beneath the overlay)
    const overlay = e.currentTarget;
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    overlay.style.pointerEvents = "all";

    if (el) {
      const blockEl = el.closest("[data-block-key]") as HTMLElement | null;
      setHoveredBlock(blockEl?.getAttribute("data-block-key") ?? null);
    } else {
      setHoveredBlock(null);
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

  const handleMouseLeave = () => setHoveredBlock(null);

  // Determine cursor based on hovered block
  const cursor = hoveredBlock ? "pointer" : "default";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Site render — pointer-events disabled */}
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

      {/* Transparent full-coverage overlay that detects hover/click */}
      <div
        className="absolute inset-0 z-20"
        style={{ cursor }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* Hover/active highlight injected via style tag so it can target data-block-key */}
      <style>{`
        #editor-site-render [data-block-key="${hoveredBlock || "__none__"}"] {
          outline: 2px solid hsl(214, 100%, 55%);
          outline-offset: -2px;
        }
        #editor-site-render [data-block-key="${activeBlock || "__none__"}"] {
          outline: 2px solid hsl(214, 100%, 45%);
          outline-offset: -2px;
        }
      `}</style>
    </div>
  );
}
