import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLegalDefaults } from "@/lib/legal-defaults";
import PublicSiteRenderer, { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";
import { buildPublicSiteNavLinks } from "@/lib/site-navigation";
import { DEFAULT_HEADER_CONFIG, type HeaderConfig } from "@/components/website-editor/PreviewHeader";

type Kind = "terms" | "privacy";

interface RawPage {
  id: string;
  photographer_id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_home: boolean;
  is_visible: boolean;
  sections_order: unknown;
  page_content: Record<string, any> | null;
}

/**
 * Renders the photographer's Terms or Privacy page wrapped in the same
 * header (slides removed, only menu) and footer used by the rest of the site,
 * for full visual consistency.
 */
export default function PublicLegalPage({ kind, mode }: { kind: Kind; mode: "store" | "custom-domain" }) {
  const { slug } = useParams();
  const { lang } = useLanguage();
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [sitePages, setSitePages] = useState<RawPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const photoQuery =
        mode === "custom-domain"
          ? supabase
              .from("photographers")
              .select("id, full_name, email, store_slug, bio, business_name")
              .eq("custom_domain", getCurrentHostname())
              .maybeSingle()
          : supabase
              .from("photographers")
              .select("id, full_name, email, store_slug, bio, business_name")
              .eq("store_slug", slug!)
              .maybeSingle();

      const { data: photo } = await photoQuery;
      if (cancelled) return;
      if (!photo) { setNotFound(true); setLoading(false); return; }

      const [{ data: siteData }, { data: sessionData }, { data: galleryData }, { data: pagesData }] =
        await Promise.all([
          supabase.from("photographer_site").select("*").eq("photographer_id", photo.id).maybeSingle(),
          (supabase as any)
            .from("sessions")
            .select("id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url")
            .eq("photographer_id", photo.id)
            .eq("status", "active")
            .neq("hide_from_store", true),
          supabase.from("galleries").select("id, slug, title, category, cover_image_url").eq("photographer_id", photo.id).eq("status", "published"),
          supabase.from("site_pages").select("*").eq("photographer_id", photo.id).order("sort_order"),
        ]);

      if (cancelled) return;
      setPhotographer(photo as Photographer);
      setSite((siteData as unknown as SiteConfig) ?? null);
      setSessions((sessionData as Session[]) ?? []);
      setGalleries((galleryData as Gallery[]) ?? []);
      setSitePages((pagesData as RawPage[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, mode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">Loading…</span>
      </div>
    );
  }

  if (notFound || !photographer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-light text-muted-foreground">Not found.</p>
      </div>
    );
  }

  const defaults = getLegalDefaults(lang);
  const studioName =
    (site as any)?.business_name ||
    photographer.business_name ||
    photographer.full_name ||
    defaults.studioFallback;

  const customHtml = kind === "terms" ? (site as any)?.terms_content : (site as any)?.privacy_content;
  const defaultHtml = kind === "terms" ? defaults.termsHtml(studioName) : defaults.privacyHtml(studioName);
  const html = customHtml && String(customHtml).trim().length > 0 ? String(customHtml) : defaultHtml;
  const title = kind === "terms" ? defaults.termsTitle : defaults.privacyTitle;

  const homeHref = mode === "custom-domain" ? "/" : `/store/${slug}`;
  const makePageHref = (pageItem: { slug: string }) =>
    mode === "custom-domain" ? `/page/${pageItem.slug}` : `/store/${slug}/page/${pageItem.slug}`;

  const extraNavLinks = buildPublicSiteNavLinks({
    pages: sitePages,
    homeHref,
    makePageHref,
  });

  // Header config WITHOUT slides — only the menu bar.
  const pageHeaderConfig: HeaderConfig = {
    ...DEFAULT_HEADER_CONFIG,
    slides: [],
    height: "0",
    overlayOpacity: 0,
  };

  const seoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "";

  return (
    <PublicSiteRenderer
      photographer={photographer}
      site={site}
      sessions={sessions}
      galleries={galleries}
      scrolled={scrolled}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      seoUrl={seoUrl}
      sessionHref={(s) => (mode === "custom-domain" ? `/book/${s.slug ?? s.id}` : `/store/${slug}/${s.slug ?? s.id}`)}
      galleryHref={(g) => `/gallery/${g.slug ?? g.id}`}
      blogHref={mode === "custom-domain" ? `/blog` : `/store/${slug}/blog`}
      extraNavLinks={extraNavLinks}
      subPageTitle={title}
      subPageHtml={html}
      pageHeaderConfig={pageHeaderConfig}
    />
  );
}
