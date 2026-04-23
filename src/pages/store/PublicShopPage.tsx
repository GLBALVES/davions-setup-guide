import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import { useLanguage } from "@/contexts/LanguageContext";
import { getShopDefaults } from "@/lib/shop-defaults";
import PublicSiteRenderer, {
  SiteConfig,
  Session,
  Gallery,
  Photographer,
} from "@/components/store/PublicSiteRenderer";
import ShopGrid from "@/components/store/ShopGrid";
import { buildPublicSiteNavLinks } from "@/lib/site-navigation";
import { DEFAULT_HEADER_CONFIG, type HeaderConfig } from "@/components/website-editor/PreviewHeader";

interface RawPage {
  id: string;
  photographer_id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_home: boolean;
  is_visible: boolean;
}

/**
 * Dedicated public Shop page — lists sessions + galleries inside the
 * site's normal header (menu only, no slides) and footer.
 */
export default function PublicShopPage({ mode }: { mode: "store" | "custom-domain" }) {
  const { slug } = useParams();
  const { lang } = useLanguage();
  const d = getShopDefaults(lang);

  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Array<Gallery & { price_per_photo?: number | null }>>([]);
  const [sitePages, setSitePages] = useState<RawPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
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
      if (!photo) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [
        { data: siteData },
        { data: sessionData },
        { data: galleryData },
        { data: pagesData },
      ] = await Promise.all([
        supabase.from("photographer_site").select("*").eq("photographer_id", photo.id).maybeSingle(),
        (supabase as any)
          .from("sessions")
          .select(
            "id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url",
          )
          .eq("photographer_id", photo.id)
          .eq("status", "active")
          .neq("hide_from_store", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("galleries")
          .select("id, slug, title, category, cover_image_url, price_per_photo")
          .eq("photographer_id", photo.id)
          .eq("status", "published")
          .order("sort_order", { ascending: true }),
        supabase
          .from("site_pages")
          .select("id, photographer_id, title, slug, parent_id, sort_order, is_home, is_visible")
          .eq("photographer_id", photo.id)
          .order("sort_order"),
      ]);

      if (cancelled) return;
      setPhotographer(photo as Photographer);
      setSite((siteData as unknown as SiteConfig) ?? null);
      setSessions((sessionData as Session[]) ?? []);
      setGalleries((galleryData as any[]) ?? []);
      setSitePages((pagesData as RawPage[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, mode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
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

  const homeHref = mode === "custom-domain" ? "/" : `/store/${slug}`;
  const makePageHref = (p: { slug: string }) =>
    mode === "custom-domain" ? `/page/${p.slug}` : `/store/${slug}/page/${p.slug}`;
  const shopHref = mode === "custom-domain" ? "/shop" : `/store/${slug}/shop`;

  const baseNavLinks = buildPublicSiteNavLinks({
    pages: sitePages,
    homeHref,
    makePageHref,
  });

  // Inject Shop link right after Home (or at start if no Home)
  const shopLink = { label: (site as any)?.shop_title || d.navLabel, href: shopHref };
  const extraNavLinks =
    baseNavLinks.length > 0
      ? [baseNavLinks[0], shopLink, ...baseNavLinks.slice(1)]
      : [shopLink];

  // Header WITHOUT slides — only the menu (mirrors the legal pages UX)
  const pageHeaderConfig: HeaderConfig = {
    ...DEFAULT_HEADER_CONFIG,
    slides: [],
    height: "0",
    overlayOpacity: 0,
  };

  const layout = ((site as any)?.shop_layout as "grid-3" | "grid-4" | "grid-2-feature") || "grid-3";
  const showSessionsCol = (site as any)?.shop_show_sessions !== false;
  const showGalleriesCol = (site as any)?.shop_show_galleries !== false;

  const seoUrl =
    typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

  const shopBody = (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <header className="text-center mb-10 sm:mb-14">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.08em] uppercase mb-3">
          {(site as any)?.shop_title || d.pageTitle}
        </h1>
        <p className="text-sm font-light text-muted-foreground max-w-xl mx-auto">
          {(site as any)?.shop_description || d.pageDescription}
        </p>
      </header>
      <ShopGrid
        sessions={sessions}
        galleries={galleries}
        layout={layout}
        showFilters
        showPrice
        showSessions={showSessionsCol}
        showGalleries={showGalleriesCol}
        sessionHref={(s) =>
          mode === "custom-domain" ? `/book/${s.slug ?? s.id}` : `/store/${slug}/${s.slug ?? s.id}`
        }
        galleryHref={(g) => `/gallery/${g.slug ?? g.id}`}
      />
    </div>
  );

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
      sessionHref={(s) =>
        mode === "custom-domain" ? `/book/${s.slug ?? s.id}` : `/store/${slug}/${s.slug ?? s.id}`
      }
      galleryHref={(g) => `/gallery/${g.slug ?? g.id}`}
      blogHref={mode === "custom-domain" ? `/blog` : `/store/${slug}/blog`}
      extraNavLinks={extraNavLinks}
      subPageTitle={(site as any)?.shop_title || d.pageTitle}
      subPageBody={shopBody}
      pageHeaderConfig={pageHeaderConfig}
    />
  );
}
