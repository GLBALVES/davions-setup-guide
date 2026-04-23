/**
 * Renders a sub-page of a photographer's site when reached via their
 * custom domain (e.g. https://booking.studio.com/page/contact).
 * Mirrors SiteSubPage but resolves the photographer by `custom_domain`
 * instead of by `store_slug`.
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import CustomDomainLoader from "@/components/store/CustomDomainLoader";
import PublicSiteRenderer, { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";
import { buildPublicSiteNavLinks } from "@/lib/site-navigation";

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
  header_config?: unknown;
  published_content?: Record<string, any> | null;
  published_header_config?: unknown;
  created_at: string;
  updated_at: string;
}

const CustomDomainSubPage = () => {
  const { pagePath } = useParams();
  const [searchParams] = useSearchParams();
  const isDraftPreview = searchParams.get("preview") === "1";
  const cacheBuster = searchParams.get("v");
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [page, setPage] = useState<RawPage | null>(null);
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
    const load = async () => {
      const hostname = getCurrentHostname();
      const { data: photoData } = await supabase
        .from("photographers")
        .select("id, full_name, email, store_slug, bio, business_name")
        .eq("custom_domain", hostname)
        .single();

      if (!photoData) { setNotFound(true); setLoading(false); return; }

      const [{ data: siteData }, { data: sessionData }, { data: galleryData }, { data: pagesData }] =
        await Promise.all([
          supabase.from("photographer_site").select("*").eq("photographer_id", photoData.id).maybeSingle(),
          (supabase as any)
            .from("sessions")
            .select("id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url, session_type_id, session_types ( name )")
            .eq("photographer_id", photoData.id)
            .eq("status", "active")
            .neq("hide_from_store", true),
          supabase.from("galleries").select("id, slug, title, category, cover_image_url").eq("photographer_id", photoData.id).eq("status", "published"),
          supabase.from("site_pages").select("*").eq("photographer_id", photoData.id).order("sort_order"),
        ]);

      const rawPages = (pagesData ?? []) as RawPage[];
      const foundPage = rawPages.find((p) => p.slug === pagePath && !p.is_home) ?? null;

      if (!foundPage) { setNotFound(true); setLoading(false); return; }

      setPhotographer(photoData as Photographer);
      setSite(siteData as unknown as SiteConfig ?? null);
      setPage(foundPage);
      setSitePages(rawPages);
      setSessions((sessionData ?? []).map((s: any) => ({
        ...s,
        category: s.session_types?.name ?? null,
      })));
      setGalleries(galleryData ?? []);
      setLoading(false);
    };
    load();
  }, [pagePath, isDraftPreview, cacheBuster]);

  if (loading) return <CustomDomainLoader photographer={photographer} />;

  if (notFound || !photographer || !page) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-light text-muted-foreground">Page not found.</p>
      </div>
    );
  }

  const extraNavLinks = buildPublicSiteNavLinks({
    pages: sitePages,
    homeHref: "/",
    makePageHref: (pageItem) => `/page/${pageItem.slug}`,
  });

  const rawContent = isDraftPreview
    ? (page.page_content as Record<string, any>)
    : ((page.published_content ?? page.page_content) as Record<string, any>);
  const pageContent = rawContent ?? {};
  const sections = Array.isArray(pageContent.sections) ? pageContent.sections.filter((s: any) => s?.type) : [];
  const headerConfig = isDraftPreview
    ? (page.header_config ?? null)
    : (page.published_header_config ?? page.header_config ?? null);

  const hostname = getCurrentHostname();

  return (
    <PublicSiteRenderer
      photographer={photographer}
      site={site}
      sessions={sessions}
      galleries={galleries}
      scrolled={scrolled}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      seoUrl={`https://${hostname}/page/${pagePath}`}
      sessionHref={(s) => `/book/${s.slug ?? s.id}`}
      galleryHref={(g) => `/gallery/${g.slug ?? g.id}`}
      blogHref="/blog"
      extraNavLinks={extraNavLinks}
      subPageData={pageContent}
      subPageTitle={page.title}
      subPageSections={sections}
      pageHeaderConfig={(headerConfig as any) ?? null}
    />
  );
};

export default CustomDomainSubPage;
