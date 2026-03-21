import { useRef } from "react";
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

const VIEWPORT_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

// Map section ids / data-block-key values to BlockKey
const BLOCK_KEY_MAP: Record<string, BlockKey> = {
  hero: "hero",
  sessions: "sessions",
  portfolio: "portfolio",
  about: "about",
  quote: "quote",
  experience: "experience",
  contact: "contact",
  footer: "footer",
};

export function LivePreview({ data, photographer, sessions, galleries, viewport, onSelectBlock, activeBlock }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  // Handle clicks on the overlay — find the data-block-key of the clicked element
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const blockEl = target.closest("[data-block-key]") as HTMLElement | null;
    if (blockEl) {
      const key = blockEl.getAttribute("data-block-key") as BlockKey;
      if (key && BLOCK_KEY_MAP[key]) {
        onSelectBlock(BLOCK_KEY_MAP[key]);
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Actual site render — pointer-events disabled so links/buttons don't fire */}
      <div className="pointer-events-none">
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

      {/* Transparent overlay that captures clicks and shows hover highlights */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10 editor-overlay"
        onClick={handleOverlayClick}
      >
        {/* Invisible block zones matching the sections */}
        {(["hero", "sessions", "portfolio", "about", "quote", "experience", "contact", "footer"] as BlockKey[]).map((key) => (
          <BlockZone
            key={key}
            blockKey={key}
            isActive={activeBlock === key}
            onSelect={() => onSelectBlock(key)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Block Zone overlay ──────────────────────────────────────────────────────
// Each zone is a transparent absolute element that sits on top of the section.
// Because the actual rendered site has data-block-key attributes, we use a simpler
// approach: a full-coverage click overlay that reads data-block-key on the underlying
// elements. The visible hover highlight is done via CSS on the data-block-key elements.

function BlockZone({ blockKey, isActive, onSelect }: { blockKey: BlockKey; isActive: boolean; onSelect: () => void }) {
  // We don't render explicit zone divs — the click is handled at the overlay level.
  // This component is kept for potential future use (e.g., absolute positioning per-block).
  return null;
}
