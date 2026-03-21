import { useState } from "react";
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
}

const VIEWPORT_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

export function LivePreview({ data, photographer, sessions, galleries, viewport, onSelectBlock }: Props) {
  const [scrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const containerWidth = VIEWPORT_WIDTHS[viewport];
  const scale = viewport === "desktop" ? 1 : undefined;

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

  const innerStyle = viewport !== "desktop"
    ? { width: `${containerWidth}px`, transformOrigin: "top left" }
    : { width: "100%" };

  return (
    <div className="relative flex-1 h-full overflow-auto bg-muted/30">
      {/* Viewport frame */}
      <div
        className="relative mx-auto bg-background shadow-lg overflow-hidden"
        style={
          viewport === "desktop"
            ? { width: "100%", minHeight: "100%" }
            : { width: `${containerWidth}px`, minHeight: "100%" }
        }
      >
        {/* Click overlay layer to intercept section clicks */}
        <div className="relative">
          <div className="pointer-events-none" style={innerStyle}>
            <PublicSiteRenderer
              photographer={photographer}
              site={siteConfig}
              sessions={sessions}
              galleries={galleries}
              scrolled={scrolled}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              seoUrl=""
              sessionHref={() => "#"}
              galleryHref={() => "#"}
              blogHref="#"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
