import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBlogDefaults } from "@/lib/blog-defaults";
import { getShopDefaults } from "@/lib/shop-defaults";
import PublicSiteRenderer, {
  SiteConfig,
  Session,
  Gallery,
  Photographer,
} from "@/components/store/PublicSiteRenderer";
import BlogList, { type BlogListItem } from "@/components/store/BlogList";
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

const PAGE_SIZE = 12;

export default function PublicBlogListPage({ mode }: { mode: "store" | "custom-domain" }) {
  const { slug } = useParams();
  const { lang } = useLanguage();
  const t = getBlogDefaults(lang);
  const shopT = getShopDefaults(lang);

  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Array<Gallery & { price_per_photo?: number | null }>>([]);
  const [sitePages, setSitePages] = useState<RawPage[]>([]);
  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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
        { data: blogsData },
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
        supabase
          .from("blogs")
          .select(
            "id, slug, title, content, keyword, cover_image_url, published_at, reading_time_minutes",
          )
          .eq("photographer_id", photo.id)
          .eq("status", "published")
          .order("published_at", { ascending: false, nullsFirst: false }),
      ]);

      if (cancelled) return;
      setPhotographer(photo as Photographer);
      setSite((siteData as unknown as SiteConfig) ?? null);
      setSessions((sessionData as Session[]) ?? []);
      setGalleries((galleryData as any[]) ?? []);
      setSitePages((pagesData as RawPage[]) ?? []);
      setPosts((blogsData as BlogListItem[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, mode]);

  const keywords = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.keyword && set.add(p.keyword));
    return Array.from(set).slice(0, 10);
  }, [posts]);

  const filteredPosts = useMemo(
    () => (activeKeyword ? posts.filter((p) => p.keyword === activeKeyword) : posts),
    [posts, activeKeyword],
  );

  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const visiblePosts = filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
  const blogBaseHref = mode === "custom-domain" ? "/blog" : `/store/${slug}/blog`;
  const shopHref = mode === "custom-domain" ? "/shop" : `/store/${slug}/shop`;

  const baseNavLinks = buildPublicSiteNavLinks({
    pages: sitePages,
    homeHref,
    makePageHref,
  });

  const siteAny = (site ?? {}) as Record<string, any>;
  const extra: Array<{ label: string; href: string }> = [];

  // Inject Shop link if enabled & has content
  const shopEnabled = siteAny.show_store === true;
  const hasShopContent =
    ((siteAny.shop_show_sessions !== false) && sessions.length > 0) ||
    ((siteAny.shop_show_galleries !== false) && galleries.length > 0);
  if (shopEnabled && hasShopContent) {
    extra.push({ label: (siteAny.shop_title as string)?.trim() || shopT.navLabel, href: shopHref });
  }
  // Always inject Blog link (we're on the blog page, so we know there's content)
  extra.push({ label: (siteAny.blog_title as string)?.trim() || t.navLabel, href: blogBaseHref });

  const extraNavLinks =
    baseNavLinks.length > 0 ? [baseNavLinks[0], ...extra, ...baseNavLinks.slice(1)] : extra;

  const pageHeaderConfig: HeaderConfig = {
    ...DEFAULT_HEADER_CONFIG,
    slides: [],
    height: "0",
    overlayOpacity: 0,
  };

  const seoUrl =
    typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

  const heroTitle = (siteAny.blog_title as string)?.trim() || t.pageTitle;
  const heroDescription =
    (siteAny.blog_description as string)?.trim() || t.pageDescription;

  const blogBody = (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <header className="text-center mb-10 sm:mb-14">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.08em] uppercase mb-3">
          {heroTitle}
        </h1>
        <p className="text-sm font-light text-muted-foreground max-w-xl mx-auto">
          {heroDescription}
        </p>
      </header>

      {keywords.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <button
            type="button"
            onClick={() => {
              setActiveKeyword(null);
              setPage(1);
            }}
            className={`text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border transition-colors ${
              activeKeyword === null
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.allPosts}
          </button>
          {keywords.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => {
                setActiveKeyword(kw);
                setPage(1);
              }}
              className={`text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border transition-colors ${
                activeKeyword === kw
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      <BlogList posts={visiblePosts} baseHref={blogBaseHref} lang={lang} t={t} />

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {Array.from({ length: pageCount }).map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-8 h-8 text-[11px] font-light border transition-colors ${
                  p === page
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}
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
      blogHref={blogBaseHref}
      extraNavLinks={extraNavLinks}
      subPageTitle={heroTitle}
      subPageBody={blogBody}
      pageHeaderConfig={pageHeaderConfig}
    />
  );
}
