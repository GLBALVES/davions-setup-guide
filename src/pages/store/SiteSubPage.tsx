import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicSiteRenderer, { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";
import type { SitePage } from "@/components/website-editor/PagesTab";

/**
 * Renders a sub-page of a photographer's public site.
 * Route: /store/:slug/:pagePath  (where pagePath is NOT a session slug)
 */
const SiteSubPage = () => {
  const { slug, pagePath } = useParams();
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [page, setPage] = useState<SitePage | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [sitePages, setSitePages] = useState<SitePage[]>([]);
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
      const { data: photoData } = await supabase
        .from("photographers")
        .select("id, full_name, email, store_slug, bio, business_name")
        .eq("store_slug", slug!)
        .single();

      if (!photoData) { setNotFound(true); setLoading(false); return; }

      const [{ data: siteData }, { data: sessionData }, { data: galleryData }, { data: pagesData }] =
        await Promise.all([
          supabase.from("photographer_site").select("*").eq("photographer_id", photoData.id).maybeSingle(),
          supabase.from("sessions").select("id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url").eq("photographer_id", photoData.id).eq("status", "active"),
          supabase.from("galleries").select("id, slug, title, category, cover_image_url").eq("photographer_id", photoData.id).eq("status", "published"),
          supabase.from("site_pages").select("*").eq("photographer_id", photoData.id).order("sort_order"),
        ]);

      const foundPage = (pagesData ?? []).find(
        (p: SitePage) => p.slug === pagePath && !p.is_home
      );

      if (!foundPage) { setNotFound(true); setLoading(false); return; }

      setPhotographer(photoData as Photographer);
      setSite(siteData as SiteConfig ?? null);
      setPage(foundPage);
      setSitePages(pagesData ?? []);
      setSessions(sessionData ?? []);
      setGalleries(galleryData ?? []);
      setLoading(false);
    };
    load();
  }, [slug, pagePath]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">Loading…</span>
      </div>
    );
  }

  if (notFound || !photographer || !page) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-light text-muted-foreground">Page not found.</p>
      </div>
    );
  }

  // Build nav links from sitePages
  const navLinks = (sitePages ?? [])
    .filter((p: SitePage) => p.is_visible && !p.is_home && !p.parent_id)
    .sort((a: SitePage, b: SitePage) => a.sort_order - b.sort_order)
    .map((p: SitePage) => ({ label: p.title, href: `/store/${slug}/${p.slug}` }));

  const pageContent = page.page_content ?? {};
  const sections = (page.sections_order ?? []) as any[];

  return (
    <PublicSiteRenderer
      photographer={photographer}
      site={site}
      sessions={sessions}
      galleries={galleries}
      scrolled={scrolled}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      seoUrl={`${window.location.origin}/store/${slug}/${pagePath}`}
      sessionHref={(s) => `/store/${slug}/${s.slug ?? s.id}`}
      galleryHref={(g) => `/gallery/${g.slug ?? g.id}`}
      blogHref={`/store/${slug}/blog`}
      extraNavLinks={navLinks}
      subPageData={pageContent}
      subPageTitle={page.title}
      subPageSections={sections}
    />
  );
};

export default SiteSubPage;
