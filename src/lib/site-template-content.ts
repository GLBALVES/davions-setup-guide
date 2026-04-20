import { supabase } from "@/integrations/supabase/client";
import type { PageSection } from "@/components/website-editor/page-templates";

/**
 * Real-content data pulled from the photographer's account.
 * Used to fill template sections so the site never opens with placeholder text.
 */
export interface StudioContent {
  studioName: string;
  tagline: string;
  bio: string;
  heroImageUrl: string;
  aboutImageUrl: string;
  logoUrl: string;
  ctaText: string;
  ctaLink: string;
  testimonials: Array<{ quote: string; author: string; role?: string }>;
  galleryCovers: string[]; // up to 12 cover urls of published galleries
  instagramUrl: string;
  experienceTitle: string;
  experienceText: string;
  quoteText: string;
  quoteAuthor: string;
}

const EMPTY: StudioContent = {
  studioName: "",
  tagline: "",
  bio: "",
  heroImageUrl: "",
  aboutImageUrl: "",
  logoUrl: "",
  ctaText: "",
  ctaLink: "",
  testimonials: [],
  galleryCovers: [],
  instagramUrl: "",
  experienceTitle: "",
  experienceText: "",
  quoteText: "",
  quoteAuthor: "",
};

export async function loadStudioContent(photographerId: string): Promise<StudioContent> {
  if (!photographerId) return EMPTY;

  const [profileRes, siteRes, galleriesRes] = await Promise.all([
    supabase
      .from("photographers")
      .select("full_name, business_name, bio, hero_image_url")
      .eq("id", photographerId)
      .maybeSingle(),
    (supabase as any)
      .from("photographer_site")
      .select(
        "logo_url, tagline, site_headline, site_subheadline, site_hero_image_url, about_image_url, cta_text, cta_link, testimonials, instagram_url, experience_title, experience_text, quote_text, quote_author",
      )
      .eq("photographer_id", photographerId)
      .maybeSingle(),
    supabase
      .from("galleries")
      .select("cover_image_url, status, sort_order, created_at")
      .eq("photographer_id", photographerId)
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .limit(12),
  ]);

  const profile: any = profileRes.data ?? {};
  const site: any = siteRes.data ?? {};
  const galleries: any[] = galleriesRes.data ?? [];

  const studioName =
    profile.business_name?.trim() || profile.full_name?.trim() || "";

  const testimonialsRaw = Array.isArray(site.testimonials) ? site.testimonials : [];
  const testimonials = testimonialsRaw
    .filter((t: any) => t && (t.quote || t.text))
    .map((t: any) => ({
      quote: String(t.quote ?? t.text ?? ""),
      author: String(t.author ?? t.name ?? ""),
      role: t.role ? String(t.role) : undefined,
    }));

  return {
    studioName,
    tagline: site.tagline || site.site_subheadline || "",
    bio: profile.bio || "",
    heroImageUrl: site.site_hero_image_url || profile.hero_image_url || "",
    aboutImageUrl: site.about_image_url || "",
    logoUrl: site.logo_url || "",
    ctaText: site.cta_text || "",
    ctaLink: site.cta_link || "",
    testimonials,
    galleryCovers: galleries
      .map((g) => g.cover_image_url)
      .filter((u): u is string => !!u),
    instagramUrl: site.instagram_url || "",
    experienceTitle: site.experience_title || "",
    experienceText: site.experience_text || "",
    quoteText: site.quote_text || "",
    quoteAuthor: site.quote_author || "",
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when a value should be considered "empty" and safe to fill. */
const isEmpty = (v: unknown): boolean => {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
};

/** Set `props[key]` only if currently empty AND the new value is non-empty. */
const fillIfEmpty = (props: Record<string, unknown>, key: string, value: unknown) => {
  if (isEmpty(value)) return;
  if (isEmpty(props[key])) props[key] = value;
};

// ── Per-section enrichment ───────────────────────────────────────────────────

function enrichSection(section: PageSection, c: StudioContent): PageSection {
  const props: Record<string, unknown> = { ...(section.props ?? {}) };

  switch (section.type) {
    case "hero": {
      fillIfEmpty(props, "headline", c.studioName);
      fillIfEmpty(props, "subtitle", c.tagline);
      fillIfEmpty(props, "backgroundImage", c.heroImageUrl);
      fillIfEmpty(props, "ctaText", c.ctaText);
      fillIfEmpty(props, "ctaLink", c.ctaLink);
      break;
    }
    case "image-text":
    case "text-image": {
      fillIfEmpty(props, "image", c.aboutImageUrl || c.heroImageUrl);
      fillIfEmpty(props, "title", c.studioName ? `About ${c.studioName}` : "");
      fillIfEmpty(props, "body", c.bio);
      break;
    }
    case "text": {
      // Only fill empty body for "Bio" labelled blocks.
      if (/bio|about|story/i.test(section.label)) {
        fillIfEmpty(props, "body", c.bio);
      }
      break;
    }
    case "gallery-grid":
    case "gallery-masonry": {
      fillIfEmpty(props, "images", c.galleryCovers);
      break;
    }
    case "testimonials": {
      if (c.testimonials.length > 0) {
        const existing = Array.isArray(props.items) ? (props.items as any[]) : [];
        const allEmpty =
          existing.length === 0 ||
          existing.every((t) => isEmpty(t?.quote) && isEmpty(t?.author));
        if (allEmpty) props.items = c.testimonials;
      }
      break;
    }
    case "cta": {
      fillIfEmpty(props, "buttonText", c.ctaText);
      fillIfEmpty(props, "buttonLink", c.ctaLink);
      break;
    }
    case "slideshow":
    case "carousel": {
      fillIfEmpty(props, "images", c.galleryCovers);
      break;
    }
    case "social-links": {
      const existing = Array.isArray(props.links) ? (props.links as any[]) : [];
      if (existing.length === 0 && c.instagramUrl) {
        props.links = [{ platform: "instagram", url: c.instagramUrl }];
      }
      break;
    }
    default:
      break;
  }

  return { ...section, props };
}

/**
 * Fill empty fields in a list of sections with real studio content.
 * Never overwrites values the user has already set.
 */
export function enrichSectionsWithContent(
  sections: PageSection[],
  content: StudioContent,
): PageSection[] {
  return sections.map((s) => enrichSection(s, content));
}
