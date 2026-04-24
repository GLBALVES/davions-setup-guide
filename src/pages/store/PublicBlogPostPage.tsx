import { useEffect, useState } from "react";
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
import BlogPostView, { type BlogPost } from "@/components/store/BlogPostView";
import type { BlogListItem } from "@/components/store/BlogList";
import { buildPublicSiteNavLinks } from "@/lib/site-navigation";
import { DEFAULT_HEADER_CONFIG, type HeaderConfig } from "@/components/website-editor/PreviewHeader";
import SEOHead from "@/components/SEOHead";

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

export default function PublicBlogPostPage({ mode }: { mode: "store" | "custom-domain" }) {
  const { slug, postSlug } = useParams();
  const { lang } = useLanguage();
  const t = getBlogDefaults(lang);
  const shopT = getShopDefaults(lang);

  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Array<Gallery & { price_per_photo?: number | null }>>([]);
  const [sitePages, setSitePages] = useState<RawPage[]>([]);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogListItem[]>([]);
  const [seo, setSeo] = useState<{
    meta_title: string | null;
    meta_description: string | null;
    og_title: string | null;
    og_description: string | null;
  } | null>(null);
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

      // Find post by slug or id, and only when published
      let postQuery = supabase
        .from("blogs")
        .select(
          "id, slug, title, content, keyword, cover_image_url, cover_image_alt, middle_image_url, middle_image_alt, published_at, reading_time_minutes, cta_text, secondary_keywords, status",
        )
        .eq("photographer_id", photo.id)
        .eq("status", "published");

      // Match by slug first; if it looks like a UUID, also try id
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        postSlug ?? "",
      );
      postQuery = isUuid
        ? postQuery.or(`slug.eq.${postSlug},id.eq.${postSlug}`)
        : postQuery.eq("slug", postSlug ?? "");

      const { data: postData } = await postQuery.maybeSingle();

      if (cancelled) return;
      if (!postData) {
        setPhotographer(photo as Photographer);
        setSite((siteData as unknown as SiteConfig) ?? null);
        setSessions((sessionData as Session[]) ?? []);
        setGalleries((galleryData as any[]) ?? []);
        setSitePages((pagesData as RawPage[]) ?? []);
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Related posts + SEO in parallel
      const [{ data: relatedData }, { data: seoData }] = await Promise.all([
        supabase
          .from("blogs")
          .select("id, slug, title, content, keyword, cover_image_url, published_at, reading_time_minutes")
          .eq("photographer_id", photo.id)
          .eq("status", "published")
          .neq("id", (postData as any).id)
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(3),
        supabase
          .from("ai_blog_seo")
          .select("meta_title, meta_description, og_title, og_description")
          .eq("blog_id", (postData as any).id)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setPhotographer(photo as Photographer);
      setSite((siteData as unknown as SiteConfig) ?? null);
      setSessions((sessionData as Session[]) ?? []);
      setGalleries((galleryData as any[]) ?? []);
      setSitePages((pagesData as RawPage[]) ?? []);
      setPost(postData as BlogPost);
      setRelated((relatedData as BlogListItem[]) ?? []);
      setSeo(seoData as any);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, postSlug, mode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  const blogBaseHref = mode === "custom-domain" ? "/blog" : `/store/${slug}/blog`;

  if (notFound || !photographer || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-extralight tracking-[0.08em] uppercase">{t.notFoundTitle}</h1>
        <p className="text-sm font-light text-muted-foreground max-w-md">{t.notFoundDescription}</p>
        <a
          href={blogBaseHref}
          className="text-[10px] tracking-[0.3em] uppercase border-b border-foreground pb-1 mt-4"
        >
          {t.pageTitle}
        </a>
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

  const siteAny = (site ?? {}) as Record<string, any>;
  const extra: Array<{ label: string; href: string }> = [];
  const shopEnabled = siteAny.show_store === true;
  const hasShopContent =
    ((siteAny.shop_show_sessions !== false) && sessions.length > 0) ||
    ((siteAny.shop_show_galleries !== false) && galleries.length > 0);
  if (shopEnabled && hasShopContent) {
    extra.push({ label: (siteAny.shop_title as string)?.trim() || shopT.navLabel, href: shopHref });
  }
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

  const authorName =
    (photographer as any).business_name?.trim() ||
    photographer.full_name?.trim() ||
    "Studio";

  const seoTitle = seo?.meta_title?.trim() || `${post.title} — ${authorName}`;
  const seoDescription =
    seo?.meta_description?.trim() || (post.content ? post.content.replace(/<[^>]*>/g, " ").slice(0, 160) : "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at ?? undefined,
    author: { "@type": "Person", name: authorName },
    publisher: { "@type": "Organization", name: authorName },
    mainEntityOfPage: { "@type": "WebPage", "@id": seoUrl },
    description: seoDescription,
  };

  const postBody = (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogTitle={seo?.og_title || post.title}
        ogDescription={seo?.og_description || seoDescription}
        ogImage={post.cover_image_url ?? undefined}
        ogUrl={seoUrl}
        canonical={seoUrl}
        type="article"
        publishedTime={post.published_at ?? undefined}
        author={authorName}
        jsonLd={jsonLd}
      />
      <BlogPostView
        post={post}
        related={related}
        baseHref={blogBaseHref}
        authorName={authorName}
        lang={lang}
        t={t}
      />
    </>
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
      subPageTitle={post.title}
      subPageBody={postBody}
      pageHeaderConfig={pageHeaderConfig}
    />
  );
}
