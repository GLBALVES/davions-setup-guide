/**
 * Rendered when a visitor hits the root "/" on a photographer's custom domain.
 * Resolves the photographer by `custom_domain = hostname`, then renders their
 * public site using all photographer_site configuration.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import { Camera, Clock, MapPin, Image as ImageIcon, Images, Instagram, Facebook, Youtube, Linkedin, Menu, X } from "lucide-react";
import logoPreto from "@/assets/logo_principal_preto.png";
import CustomDomainLoader from "@/components/store/CustomDomainLoader";
import SEOHead from "@/components/SEOHead";

interface Photographer {
  id: string;
  full_name: string | null;
  email: string;
  store_slug: string | null;
  bio: string | null;
  business_name: string | null;
}

interface SiteConfig {
  site_hero_image_url: string | null;
  site_headline: string | null;
  site_subheadline: string | null;
  cta_text: string | null;
  cta_link: string | null;
  logo_url: string | null;
  tagline: string | null;
  accent_color: string | null;
  about_title: string | null;
  about_image_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  pinterest_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  whatsapp: string | null;
  linkedin_url: string | null;
  footer_text: string | null;
  show_about: boolean | null;
  show_store: boolean | null;
  show_booking: boolean | null;
  show_blog: boolean | null;
  show_contact: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
}

interface Session {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  num_photos: number;
  location: string | null;
  cover_image_url: string | null;
}

interface Gallery {
  id: string;
  slug: string | null;
  title: string;
  category: string;
  cover_image_url: string | null;
}

const CustomDomainStore = () => {
  const navigate = useNavigate();
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
          .select("site_hero_image_url, site_headline, site_subheadline, cta_text, cta_link, logo_url, tagline, accent_color, about_title, about_image_url, instagram_url, facebook_url, pinterest_url, tiktok_url, youtube_url, whatsapp, linkedin_url, footer_text, show_about, show_store, show_booking, show_blog, show_contact, seo_title, seo_description, og_image_url")
          .eq("photographer_id", photoData.id)
          .maybeSingle(),
        supabase
          .from("sessions")
          .select("id, slug, title, description, price, duration_minutes, num_photos, location, cover_image_url")
          .eq("photographer_id", photoData.id)
          .eq("status", "active")
          .order("created_at", { ascending: true }),
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
  }, []);

  if (loading) {
    return <CustomDomainLoader photographer={photographer} />;
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
        <img
          src={logoPreto}
          alt="Davions"
          className="h-6 object-contain invert opacity-70 mb-16"
        />
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
          <p className="text-[9px] tracking-widest uppercase text-white/20">
            Powered by Davions
          </p>
        </div>
      </div>
    );
  }

  const displayName =
    site?.tagline ||
    photographer?.business_name ||
    photographer?.full_name ||
    photographer?.email ||
    "";

  const headline = site?.site_headline || displayName;
  const subheadline = site?.site_subheadline || photographer?.bio || "";
  const ctaText = site?.cta_text || "Book a session";
  const accentColor = site?.accent_color || "#000000";

  const showStore = site?.show_store !== false;
  const showAbout = site?.show_about !== false;
  const showBooking = site?.show_booking !== false;
  const showBlog = site?.show_blog === true;
  const showContact = site?.show_contact !== false;

  const hasSocials =
    site?.instagram_url ||
    site?.facebook_url ||
    site?.tiktok_url ||
    site?.youtube_url ||
    site?.linkedin_url ||
    site?.pinterest_url ||
    site?.whatsapp;

  const seoTitle = site?.seo_title || `${displayName} — Photography`;
  const seoDescription = site?.seo_description || subheadline || undefined;

  // Nav links based on toggles
  const navLinks: { label: string; href: string }[] = [
    ...(showStore ? [{ label: "Sessions", href: "#sessions" }] : []),
    ...(showAbout ? [{ label: "About", href: "#about" }] : []),
    ...(showBlog ? [{ label: "Blog", href: "/blog" }] : []),
    ...((showContact && hasSocials) ? [{ label: "Contact", href: "#contact" }] : []),
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const el = document.getElementById(href.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(href);
    }
  };

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage={site?.og_image_url || site?.site_hero_image_url || undefined}
        ogUrl={`https://${getCurrentHostname()}`}
        canonical={`https://${getCurrentHostname()}`}
      />

      <div className="min-h-screen bg-background">
        {/* ── Sticky Nav Bar ── */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? "bg-background/95 backdrop-blur-sm border-b border-border shadow-sm"
              : "bg-transparent"
          }`}
        >
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Logo or name */}
            {site?.logo_url ? (
              <img
                src={site.logo_url}
                alt={displayName}
                className={`h-8 object-contain transition-all duration-300 ${scrolled ? "" : "brightness-0 invert"}`}
              />
            ) : (
              <span
                className={`text-[10px] tracking-[0.4em] uppercase font-light transition-colors duration-300 ${
                  scrolled ? "text-foreground" : "text-white/80"
                }`}
              >
                {displayName}
              </span>
            )}

            {/* Desktop nav links */}
            {navLinks.length > 0 && (
              <nav className="hidden md:flex items-center gap-7">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href)}
                    className={`text-[10px] tracking-[0.3em] uppercase font-light transition-colors duration-300 hover:opacity-100 ${
                      scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                {showBooking && (
                  <button
                    onClick={() => handleNavClick("#sessions")}
                    style={{ borderColor: scrolled ? accentColor : "rgba(255,255,255,0.6)" }}
                    className={`px-4 py-1.5 border text-[9px] tracking-[0.3em] uppercase transition-colors duration-300 ${
                      scrolled ? "text-foreground hover:bg-foreground hover:text-background" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {ctaText}
                  </button>
                )}
              </nav>
            )}

            {/* Mobile hamburger */}
            {navLinks.length > 0 && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden transition-colors duration-300 ${scrolled ? "text-foreground" : "text-white"}`}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-background/98 backdrop-blur-sm border-b border-border">
              <nav className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href)}
                    className="text-left text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/50 last:border-0"
                  >
                    {link.label}
                  </button>
                ))}
                {showBooking && (
                  <button
                    onClick={() => handleNavClick("#sessions")}
                    className="mt-2 text-left text-[11px] tracking-[0.3em] uppercase font-light text-foreground py-2.5"
                  >
                    {ctaText} →
                  </button>
                )}
              </nav>
            </div>
          )}
        </header>

        {/* ── Hero ── */}
        <div className="relative w-full h-[60vh] min-h-[380px] overflow-hidden">
          {site?.site_hero_image_url ? (
            <img
              src={site.site_hero_image_url}
              alt={headline}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-foreground" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />

          <div className="relative z-10 h-full flex flex-col items-center justify-end pb-14 px-6 text-center">
            {!site?.logo_url && (
              <p className="text-[9px] tracking-[0.5em] uppercase text-white/60 mb-3">
                Photography by
              </p>
            )}
            <h1 className="text-4xl md:text-5xl font-light tracking-[0.15em] uppercase text-white mb-4">
              {headline}
            </h1>
            {subheadline && (
              <p className="text-sm font-light text-white/70 max-w-md leading-relaxed mb-6">
                {subheadline}
              </p>
            )}
            {showBooking && (
              site?.cta_link ? (
                <a
                  href={site.cta_link}
                  style={{ borderColor: accentColor }}
                  className="mt-2 px-8 py-2.5 border text-[10px] tracking-[0.3em] uppercase bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  {ctaText}
                </a>
              ) : (
                <button
                  onClick={() => handleNavClick("#sessions")}
                  className="mt-2 px-8 py-2.5 border border-white/50 text-[10px] tracking-[0.3em] uppercase bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  {ctaText}
                </button>
              )
            )}
            {!showBooking && (
              <>
                <div className="mt-2 w-8 h-px bg-white/30" />
                <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mt-3">
                  {displayName}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Sessions ── */}
        {showStore && (
          <main id="sessions" className="max-w-5xl mx-auto px-6 py-14">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Camera className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-light text-muted-foreground">
                  No sessions available yet.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-10">
                  Available sessions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sessions.map((session) => {
                    const priceFormatted = new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(session.price / 100);

                    return (
                      <button
                        key={session.id}
                        onClick={() => navigate(`/book/${session.slug ?? session.id}`)}
                        className="group text-left border border-border hover:border-foreground/30 transition-all duration-300 overflow-hidden flex flex-col bg-card"
                      >
                        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                          {session.cover_image_url ? (
                            <img
                              src={session.cover_image_url}
                              alt={session.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                            </div>
                          )}
                        </div>

                        <div className="p-5 flex flex-col gap-3 flex-1">
                          <h2 className="text-sm font-light tracking-wide">{session.title}</h2>
                          {session.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {session.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mt-auto pt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.duration_minutes}min
                            </span>
                            <span className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              {session.num_photos} photos
                            </span>
                            {session.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.location}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                            <span className="text-lg font-light">{priceFormatted}</span>
                            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                              Book →
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </main>
        )}

        {/* ── Published Galleries ── */}
        {galleries.length > 0 && (
          <section className="border-t border-border">
            <div className="max-w-5xl mx-auto px-6 py-14">
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-10">
                Portfolio
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleries.map((gallery) => (
                  <button
                    key={gallery.id}
                    onClick={() => navigate(`/gallery/${gallery.slug ?? gallery.id}`)}
                    className="group text-left border border-border hover:border-foreground/30 transition-all duration-300 overflow-hidden flex flex-col bg-card"
                  >
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {gallery.cover_image_url ? (
                        <img
                          src={gallery.cover_image_url}
                          alt={gallery.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Images className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 text-[9px] tracking-[0.3em] uppercase bg-black/50 text-white/70 px-2 py-1 backdrop-blur-sm">
                        {gallery.category}
                      </span>
                    </div>
                    <div className="p-5 flex items-center justify-between">
                      <h2 className="text-sm font-light tracking-wide">{gallery.title}</h2>
                      <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-3">
                        View →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── About ── */}
        {showAbout && (photographer?.bio || site?.about_image_url) && (
          <section id="about" className="border-t border-border">
            <div className="max-w-5xl mx-auto px-6 py-14">
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-10">
                {site?.about_title || "About"}
              </p>
              <div className="flex flex-col md:flex-row gap-10 items-center">
                {site?.about_image_url && (
                  <div className="w-full md:w-64 shrink-0">
                    <img
                      src={site.about_image_url}
                      alt={displayName}
                      className="w-full aspect-[3/4] object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-light tracking-[0.1em] uppercase mb-4">
                    {photographer?.full_name || photographer?.business_name || displayName}
                  </h2>
                  {photographer?.bio && (
                    <p className="text-sm font-light text-muted-foreground leading-relaxed">
                      {photographer.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer id="contact" className="border-t border-border py-10">
          {showContact && hasSocials && (
            <div className="flex items-center justify-center gap-5 mb-6">
              {site?.instagram_url && (
                <a href={site.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {site?.facebook_url && (
                <a href={site.facebook_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {site?.youtube_url && (
                <a href={site.youtube_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {site?.linkedin_url && (
                <a href={site.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {site?.tiktok_url && (
                <a href={site.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors text-[11px] tracking-widest font-medium">
                  TK
                </a>
              )}
              {site?.pinterest_url && (
                <a href={site.pinterest_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors text-[11px] tracking-widest font-medium">
                  PT
                </a>
              )}
              {site?.whatsapp && (
                <a href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors text-[11px] tracking-widest font-medium">
                  WA
                </a>
              )}
            </div>
          )}
          {site?.footer_text && (
            <p className="text-[10px] font-light text-muted-foreground text-center mb-3">
              {site.footer_text}
            </p>
          )}
          <p className="text-[9px] tracking-widest uppercase text-muted-foreground/50 text-center">
            Powered by Davions
          </p>
        </footer>
      </div>
    </>
  );
};

export default CustomDomainStore;
