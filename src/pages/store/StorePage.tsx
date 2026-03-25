import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicSiteRenderer, { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";

const StorePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewTemplate = searchParams.get("preview");
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
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

      const [{ data: siteData }, { data: sessionData }, { data: galleryData }] = await Promise.all([
        supabase
          .from("photographer_site")
          .select("site_hero_image_url, site_headline, site_subheadline, cta_text, cta_link, logo_url, tagline, accent_color, about_title, about_image_url, instagram_url, facebook_url, pinterest_url, tiktok_url, youtube_url, whatsapp, linkedin_url, footer_text, show_about, show_store, show_booking, show_blog, show_contact, seo_title, seo_description, og_image_url, site_template, favicon_url, quote_text, quote_author, experience_title, experience_text, header_bg_color, header_text_color, header_visible_socials, footer_bg_color, footer_text_color, footer_show_logo, footer_show_socials, footer_visible_socials, footer_preset")
          .eq("photographer_id", photoData.id)
          .maybeSingle(),
        supabase
          .from("sessions")
          .select("id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url")
          .eq("photographer_id", photoData.id)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),
        supabase
          .from("galleries")
          .select("id, slug, title, category, cover_image_url")
          .eq("photographer_id", photoData.id)
          .eq("status", "published")
          .order("created_at", { ascending: false }),
      ]);

      setPhotographer(photoData as Photographer);
      setSite(siteData as SiteConfig ?? null);
      setSessions(sessionData ?? []);
      setGalleries(galleryData ?? []);
      setLoading(false);
    };

    load();
  }, [slug]);

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
      scrolled={scrolled}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      seoUrl={`${window.location.origin}/store/${slug}`}
      sessionHref={(s) => `/store/${slug}/${s.slug ?? s.id}`}
      galleryHref={(g) => `/gallery/${g.slug ?? g.id}`}
      blogHref={`/store/${slug}/blog`}
      previewTemplate={previewTemplate}
    />
  );
};

export default StorePage;
