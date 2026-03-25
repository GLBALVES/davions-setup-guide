/**
 * Rendered when a visitor hits the root "/" on a photographer's custom domain.
 * Resolves the photographer by `custom_domain = hostname`, then renders their
 * public site using all photographer_site configuration.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import { Camera } from "lucide-react";
import logoPreto from "@/assets/logo_principal_preto.png";
import CustomDomainLoader from "@/components/store/CustomDomainLoader";
import PublicSiteRenderer, { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";

const CustomDomainStore = () => {
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
      const hostname = getCurrentHostname();

      const { data: photoData } = await supabase
        .from("photographers")
        .select("id, full_name, email, store_slug, bio, business_name")
        .eq("custom_domain", hostname)
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
          .select("id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url, session_type_id, session_types ( name )")
          .eq("photographer_id", photoData.id)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),
        supabase
          .from("galleries")
          .select("id, slug, title, category, cover_image_url")
          .eq("photographer_id", photoData.id)
          .eq("status", "published")
          .order("sort_order", { ascending: true }),
      ]);

      setPhotographer(photoData as Photographer);
      setSite(siteData as SiteConfig ?? null);
      setSessions((sessionData ?? []).map((s: any) => ({
        ...s,
        category: s.session_types?.name ?? null,
      })));
      setGalleries(galleryData ?? []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return <CustomDomainLoader photographer={photographer} />;
  }

  if (notFound || !photographer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
        <img src={logoPreto} alt="Davions" className="h-6 object-contain invert opacity-70 mb-16" />
        <div className="relative mb-10">
          <div className="absolute -inset-6 rounded-full border border-white/5" />
          <div className="absolute -inset-12 rounded-full border border-white/[0.03]" />
          <Camera className="h-10 w-10 text-white/10" />
        </div>
        <h1 className="text-sm font-light tracking-[0.2em] uppercase text-white/60 mb-3 text-center">
          Domain not configured
        </h1>
        <p className="text-[11px] text-white/30 font-light text-center max-w-xs leading-relaxed">
          This domain has not been linked to any photographer's store yet. If you're the owner, complete your setup in the dashboard.
        </p>
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="w-8 h-px bg-white/10" />
          <p className="text-[9px] tracking-widest uppercase text-white/20">Powered by Davions</p>
        </div>
      </div>
    );
  }

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
      seoUrl={`https://${hostname}`}
      sessionHref={(s) => `/book/${s.slug ?? s.id}`}
      galleryHref={(g) => `/gallery/${g.slug ?? g.id}`}
      blogHref="/blog"
    />
  );
};

export default CustomDomainStore;
