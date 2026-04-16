import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicSiteRenderer, { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";
import type { PageSection } from "@/components/store/SectionRenderer";
import { useLanguage } from "@/contexts/LanguageContext";

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

const StorePage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const previewTemplate = searchParams.get("preview");
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [homeSections, setHomeSections] = useState<string[] | null>(null);
  const [pageSections, setPageSections] = useState<PageSection[]>([]);
  const [extraNavLinks, setExtraNavLinks] = useState<Array<{ label: string; href: string }>>([]);
  const [emptyState, setEmptyState] = useState<{ title: string; description: string } | null>(null);
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

      if (!photoData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [{ data: siteData }, { data: sessionData }, { data: galleryData }, { data: pagesData }] = await Promise.all([
        supabase
          .from("photographer_site")
          .select("site_hero_image_url, site_headline, site_subheadline, cta_text, cta_link, logo_url, tagline, accent_color, about_title, about_image_url, instagram_url, facebook_url, pinterest_url, tiktok_url, youtube_url, whatsapp, linkedin_url, footer_text, show_about, show_store, show_booking, show_blog, show_contact, seo_title, seo_description, og_image_url, site_template, favicon_url, quote_text, quote_author, experience_title, experience_text, header_bg_color, header_text_color, header_visible_socials, footer_bg_color, footer_text_color, footer_show_logo, footer_show_socials, footer_visible_socials, footer_preset, hero_bg_color, hero_text_color, sessions_bg_color, sessions_text_color, portfolio_bg_color, portfolio_text_color, about_bg_color, about_text_color, quote_bg_color, quote_text_color, experience_bg_color, experience_text_color, contact_bg_color, contact_text_color, testimonials_bg_color, testimonials_text_color")
          .eq("photographer_id", photoData.id)
          .maybeSingle(),
        (supabase as any)
          .from("sessions")
          .select("id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url, session_type_id, session_types ( name )")
          .eq("photographer_id", photoData.id)
          .eq("status", "active")
          .neq("hide_from_store", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("galleries")
          .select("id, slug, title, category, cover_image_url")
          .eq("photographer_id", photoData.id)
          .eq("status", "published")
          .order("sort_order", { ascending: true }),
        supabase
          .from("site_pages")
          .select("id, title, slug, parent_id, sort_order, is_home, is_visible, sections_order, page_content")
          .eq("photographer_id", photoData.id)
          .order("sort_order", { ascending: true }),
      ]);

      const rawPages = (pagesData ?? []) as RawPage[];
      const homePage = rawPages.find((page) => page.is_home && !page.parent_id) ?? null;
      const homePageContent = (homePage?.page_content ?? {}) as Record<string, any>;
      const orderedSections = Array.isArray(homePage?.sections_order)
        ? (homePage?.sections_order as string[])
        : Array.isArray(homePageContent.sections)
          ? homePageContent.sections.map((section: any) => section?.type).filter(Boolean)
          : [];
      // Extract full PageSection[] from page_content.sections
      const fullSections: PageSection[] = Array.isArray(homePageContent.sections)
        ? homePageContent.sections.filter((s: any) => s?.type)
        : [];
      const visibleNavLinks = rawPages
        .filter((page) => page.is_visible && !page.is_home && !page.parent_id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((page) => ({ label: page.title, href: `/store/${slug}/page/${page.slug}` }));

      setPhotographer(photoData as Photographer);
      setSite(siteData as SiteConfig ?? null);
      setSessions((sessionData ?? []).map((s: any) => ({
        ...s,
        category: s.session_types?.name ?? null,
      })));
      setGalleries(galleryData ?? []);
      setExtraNavLinks(visibleNavLinks);
      setHomeSections(orderedSections);
      setPageSections(fullSections);
      setEmptyState(
        homePage
          ? null
          : {
              title: t.websiteEditor.emptySiteTitle,
              description: t.websiteEditor.emptySiteDescription,
            }
      );
      setLoading(false);
    };

    load();
  }, [slug, t.websiteEditor.emptySiteDescription, t.websiteEditor.emptySiteTitle]);

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
        <p className="text-sm font-light text-muted-foreground">Store not found.</p>
      </div>
    );
  }

  return (
    <PublicSiteRenderer
      photographer={photographer}
      site={site}
      sessions={sessions}
      galleries={galleries}
      emptyState={emptyState}
      scrolled={scrolled}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      seoUrl={`${window.location.origin}/store/${slug}`}
      sessionHref={(s) => `/store/${slug}/${s.slug ?? s.id}`}
      galleryHref={(g) => `/gallery/${g.slug ?? g.id}`}
      blogHref={`/store/${slug}/blog`}
      extraNavLinks={extraNavLinks}
      visibleSections={homeSections}
      pageSections={pageSections}
      previewTemplate={previewTemplate}
    />
  );
};

export default StorePage;
