/**
 * Per-language overrides for the public Vitrine.
 *
 * Stored on `photographer_site.i18n` as:
 *   { "en": { seo_title: "..." }, "pt": { ... }, "es": { ... } }
 *
 * Reads fall back to the legacy flat columns (`seo_title`, `shop_title`, …)
 * when no i18n value is set, and finally to whatever default the caller
 * provides — keeping the existing data working untouched.
 */

import type { Lang } from "@/lib/i18n/translations";

export type SiteI18nLang = Lang; // "en" | "pt" | "es"

/** Keys we currently expose to per-language editing. */
export type SiteI18nKey =
  | "seo_title"
  | "seo_description"
  | "site_headline"
  | "site_subheadline"
  | "shop_title"
  | "shop_description"
  | "blog_title"
  | "blog_description";

export type SiteI18n = Partial<Record<SiteI18nLang, Partial<Record<SiteI18nKey, string>>>>;

const LANGS: SiteI18nLang[] = ["en", "pt", "es"];

function readI18nMap(site: any): SiteI18n {
  const raw = site?.i18n;
  if (!raw || typeof raw !== "object") return {};
  return raw as SiteI18n;
}

/** Read a per-language field with fallback to the flat column, then default. */
export function getI18nField(
  site: any,
  lang: SiteI18nLang,
  key: SiteI18nKey,
  fallback?: string | null,
): string {
  const map = readI18nMap(site);
  const v = map?.[lang]?.[key];
  if (typeof v === "string" && v.trim()) return v;
  const flat = site?.[key];
  if (typeof flat === "string" && flat.trim()) return flat;
  return (fallback ?? "") as string;
}

/** Build a patch suitable for saving a per-language field via `onSiteChange`. */
export function setI18nField(
  site: any,
  lang: SiteI18nLang,
  key: SiteI18nKey,
  value: string | null,
): { i18n: SiteI18n } {
  const current = readI18nMap(site);
  const langMap = { ...(current[lang] ?? {}) };
  if (value && value.trim()) {
    langMap[key] = value;
  } else {
    delete langMap[key];
  }
  const next: SiteI18n = { ...current, [lang]: langMap };
  // Drop empty language buckets so the JSON stays compact.
  for (const l of LANGS) {
    if (next[l] && Object.keys(next[l]!).length === 0) delete next[l];
  }
  return { i18n: next };
}

export const SITE_I18N_LANGS: SiteI18nLang[] = LANGS;

export const SITE_I18N_LANG_LABELS: Record<SiteI18nLang, string> = {
  en: "EN",
  pt: "PT",
  es: "ES",
};
