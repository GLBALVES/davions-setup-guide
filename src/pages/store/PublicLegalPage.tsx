import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLegalDefaults } from "@/lib/legal-defaults";
import SEOHead from "@/components/SEOHead";

type Kind = "terms" | "privacy";

interface PhotographerRow {
  id: string;
  full_name: string | null;
  business_name: string | null;
  store_slug: string | null;
}

interface SiteRow {
  terms_content: string | null;
  privacy_content: string | null;
  business_name?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
  font_family?: string | null;
}

/**
 * Renders a photographer's Terms or Privacy page using their custom override
 * (if any) or a sensible default text describing the photographer↔client
 * relationship. Resolves the photographer either from `:slug` (store route)
 * or from the current hostname (custom domain route).
 */
export default function PublicLegalPage({ kind, mode }: { kind: Kind; mode: "store" | "custom-domain" }) {
  const { slug } = useParams();
  const { lang: language } = useLanguage();
  const [photographer, setPhotographer] = useState<PhotographerRow | null>(null);
  const [site, setSite] = useState<SiteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let photoQuery;
      if (mode === "custom-domain") {
        photoQuery = supabase
          .from("photographers")
          .select("id, full_name, business_name, store_slug")
          .eq("custom_domain", getCurrentHostname())
          .maybeSingle();
      } else {
        photoQuery = supabase
          .from("photographers")
          .select("id, full_name, business_name, store_slug")
          .eq("store_slug", slug!)
          .maybeSingle();
      }
      const { data: photo } = await photoQuery;
      if (cancelled) return;
      if (!photo) { setNotFound(true); setLoading(false); return; }
      setPhotographer(photo as PhotographerRow);

      const { data: siteData } = await supabase
        .from("photographer_site")
        .select("terms_content, privacy_content, business_name, bg_color, text_color, font_family")
        .eq("photographer_id", photo.id)
        .maybeSingle();
      if (cancelled) return;
      setSite((siteData ?? {}) as SiteRow);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, mode]);

  const defaults = getLegalDefaults(language);
  const studioName =
    site?.business_name ||
    photographer?.business_name ||
    photographer?.full_name ||
    defaults.studioFallback;

  const customHtml = kind === "terms" ? site?.terms_content : site?.privacy_content;
  const defaultHtml = kind === "terms" ? defaults.termsHtml(studioName) : defaults.privacyHtml(studioName);
  const html = customHtml && customHtml.trim().length > 0 ? customHtml : defaultHtml;

  const title = kind === "terms" ? defaults.termsTitle : defaults.privacyTitle;
  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xs text-muted-foreground">…</div>
      </div>
    );
  }

  if (notFound || !photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xs text-muted-foreground">Not found</div>
      </div>
    );
  }

  const bg = site?.bg_color || "#ffffff";
  const fg = site?.text_color || "#111111";
  const fontFamily = site?.font_family || undefined;

  return (
    <>
      <SEOHead title={`${title} — ${studioName}`} description={`${title} for ${studioName}`} />
      <div
        className="min-h-screen"
        style={{ backgroundColor: bg, color: fg, fontFamily }}
      >
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide mb-2">{title}</h1>
          <p className="text-xs opacity-60 mb-10">
            {defaults.lastUpdatedLabel}: {today} · {studioName}
          </p>

          <article
            className="prose prose-sm max-w-none [&_h2]:text-sm [&_h2]:tracking-widest [&_h2]:uppercase [&_h2]:font-light [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:text-xs [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:text-xs [&_li]:mb-1 [&_strong]:font-medium"
            style={{ color: fg }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </>
  );
}
