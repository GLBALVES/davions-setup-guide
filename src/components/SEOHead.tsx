import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
  type?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  jsonLd?: Record<string, unknown>;
}

export default function SEOHead({
  title, description, ogTitle, ogDescription, ogImage, ogUrl,
  canonical, type = "website", publishedTime, modifiedTime, author, jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (property: string, content: string | undefined) => {
      if (!content) return;
      const isOg = property.startsWith("og:") || property.startsWith("article:");
      const attr = isOg ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", description);
    setMeta("og:title", ogTitle || title);
    setMeta("og:description", ogDescription || description);
    setMeta("og:image", ogImage);
    setMeta("og:url", ogUrl);
    setMeta("og:type", type);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", ogTitle || title);
    setMeta("twitter:description", ogDescription || description);
    setMeta("twitter:image", ogImage);
    if (publishedTime) setMeta("article:published_time", publishedTime);
    if (modifiedTime) setMeta("article:modified_time", modifiedTime);
    if (author) setMeta("article:author", author);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
      link.href = canonical;
    }

    const existingScript = document.querySelector('script[data-seo-jsonld]');
    if (existingScript) existingScript.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => { const s = document.querySelector('script[data-seo-jsonld]'); if (s) s.remove(); };
  }, [title, description, ogTitle, ogDescription, ogImage, ogUrl, canonical, type, publishedTime, modifiedTime, author, jsonLd]);

  return null;
}
