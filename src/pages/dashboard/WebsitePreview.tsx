import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Camera, Clock, MapPin, Image as ImageIcon, Images, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";
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

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

const WebsitePreview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const { data: photoData } = await supabase
      .from("photographers")
      .select("id, full_name, email, store_slug, bio, business_name")
      .eq("id", user.id)
      .single();

    if (!photoData) {
      setLoading(false);
      return;
    }

    const [{ data: siteData }, { data: sessionData }, { data: galleryData }] =
      await Promise.all([
        supabase
          .from("photographer_site")
          .select(
            "site_hero_image_url, site_headline, site_subheadline, cta_text, cta_link, logo_url, tagline, accent_color, about_title, about_image_url, instagram_url, facebook_url, pinterest_url, tiktok_url, youtube_url, whatsapp, linkedin_url, footer_text, show_about, show_store, seo_title, seo_description, og_image_url"
          )
          .eq("photographer_id", photoData.id)
          .maybeSingle(),
        supabase
          .from("sessions")
          .select(
            "id, slug, title, description, price, duration_minutes, num_photos, location, cover_image_url"
          )
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
    setSite((siteData as SiteConfig) ?? null);
    setSessions(sessionData ?? []);
    setGalleries(galleryData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user, refreshKey]);

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
  const showAbout = site?.show_about !== false;

  const hasSocials =
    site?.instagram_url ||
    site?.facebook_url ||
    site?.tiktok_url ||
    site?.youtube_url ||
    site?.linkedin_url ||
    site?.pinterest_url ||
    site?.whatsapp;

  const publicUrl = photographer?.store_slug
    ? `${window.location.origin}/store/${photographer.store_slug}`
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 h-12 z-50">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/website")}
            className="h-7 px-2 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Settings
          </Button>
          <div className="w-px h-4 bg-border" />
          <span className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-light">
            Website Preview
          </span>
        </div>

        {/* Center — viewport switcher */}
        <div className="flex items-center border border-border divide-x divide-border overflow-hidden">
          {(
            [
              { key: "desktop", Icon: Monitor },
              { key: "tablet", Icon: Tablet },
              { key: "mobile", Icon: Smartphone },
            ] as { key: Viewport; Icon: React.ElementType }[]
          ).map(({ key, Icon }) => (
            <button
              key={key}
              onClick={() => setViewport(key)}
              className={`px-3 h-7 flex items-center gap-1.5 text-[11px] transition-colors ${
                viewport === key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="capitalize hidden sm:inline">{key}</span>
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Refresh preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-7 px-3 border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open live site
            </a>
          )}
        </div>
      </div>

      {/* ── Preview canvas ── */}
      <div className="flex-1 overflow-auto bg-muted/20 flex justify-center py-6 px-4">
        {loading ? (
          <div className="flex items-center justify-center w-full">
            <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
              Loading preview…
            </span>
          </div>
        ) : (
          <div
            className="bg-background shadow-2xl transition-all duration-300 overflow-auto"
            style={{
              width: VIEWPORT_WIDTHS[viewport],
              maxWidth: "100%",
              minHeight: "600px",
            }}
          >
            {/* ── Preview banner ── */}
            <div className="sticky top-0 z-50 bg-foreground/90 text-background text-[10px] tracking-[0.3em] uppercase text-center py-1.5 select-none">
              Preview — changes are not saved here
            </div>

            {/* ── Rendered site ── */}
            <div className="min-h-screen bg-background">
              {/* Logo bar */}
              {site?.logo_url && (
                <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-6 px-6 pointer-events-none">
                  <img
                    src={site.logo_url}
                    alt={displayName}
                    className="h-10 object-contain"
                  />
                </div>
              )}

              {/* Hero */}
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
                    {headline || "Your Studio Name"}
                  </h1>
                  {subheadline && (
                    <p className="text-sm font-light text-white/70 max-w-md leading-relaxed mb-6">
                      {subheadline}
                    </p>
                  )}
                  {site?.cta_link ? (
                    <span
                      style={{ borderColor: accentColor, color: accentColor }}
                      className="mt-2 px-8 py-2.5 border text-[10px] tracking-[0.3em] uppercase bg-white/10 text-white cursor-default"
                    >
                      {ctaText}
                    </span>
                  ) : (
                    <>
                      <div className="mt-2 w-8 h-px bg-white/30" />
                      <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mt-3">
                        {ctaText}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Sessions */}
              <main className="max-w-5xl mx-auto px-6 py-14">
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <Camera className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-light text-muted-foreground">
                      No active sessions yet.
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Sessions you publish will appear here.
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
                          <div
                            key={session.id}
                            className="text-left border border-border overflow-hidden flex flex-col bg-card"
                          >
                            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                              {session.cover_image_url ? (
                                <img
                                  src={session.cover_image_url}
                                  alt={session.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                                </div>
                              )}
                            </div>
                            <div className="p-5 flex flex-col gap-3 flex-1">
                              <h2 className="text-sm font-light tracking-wide">
                                {session.title}
                              </h2>
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
                                <span className="text-lg font-light">
                                  {priceFormatted}
                                </span>
                                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
                                  Book →
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </main>

              {/* Galleries */}
              {galleries.length > 0 && (
                <section className="border-t border-border">
                  <div className="max-w-5xl mx-auto px-6 py-14">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-10">
                      Portfolio
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {galleries.map((gallery) => (
                        <div
                          key={gallery.id}
                          className="text-left border border-border overflow-hidden flex flex-col bg-card"
                        >
                          <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                            {gallery.cover_image_url ? (
                              <img
                                src={gallery.cover_image_url}
                                alt={gallery.title}
                                className="w-full h-full object-cover"
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
                            <h2 className="text-sm font-light tracking-wide">
                              {gallery.title}
                            </h2>
                            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground shrink-0 ml-3">
                              View →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* About */}
              {showAbout && (photographer?.bio || site?.about_image_url) && (
                <section className="border-t border-border">
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
                          {photographer?.full_name ||
                            photographer?.business_name ||
                            displayName}
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

              {/* Footer */}
              <footer className="border-t border-border py-10">
                {hasSocials && (
                  <div className="flex items-center justify-center gap-5 mb-6">
                    {site?.instagram_url && (
                      <span className="text-muted-foreground">
                        <Instagram className="h-4 w-4" />
                      </span>
                    )}
                    {site?.facebook_url && (
                      <span className="text-muted-foreground">
                        <Facebook className="h-4 w-4" />
                      </span>
                    )}
                    {site?.youtube_url && (
                      <span className="text-muted-foreground">
                        <Youtube className="h-4 w-4" />
                      </span>
                    )}
                    {site?.linkedin_url && (
                      <span className="text-muted-foreground">
                        <Linkedin className="h-4 w-4" />
                      </span>
                    )}
                    {site?.tiktok_url && (
                      <span className="text-muted-foreground text-[11px] tracking-widest font-medium">
                        TK
                      </span>
                    )}
                    {site?.pinterest_url && (
                      <span className="text-muted-foreground text-[11px] tracking-widest font-medium">
                        PT
                      </span>
                    )}
                    {site?.whatsapp && (
                      <span className="text-muted-foreground text-[11px] tracking-widest font-medium">
                        WA
                      </span>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsitePreview;
