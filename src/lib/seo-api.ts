import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */
export interface PageSeoSetting {
  id: string;
  photographer_id: string;
  page_path: string;
  page_name: string;
  title: string | null;
  meta_description: string | null;
  meta_keywords: string[];
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  noindex: boolean;
  nofollow: boolean;
  priority: number;
  changefreq: string;
  structured_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsPageview {
  id: string;
  photographer_id: string;
  page_path: string;
  action: string;
  created_at: string;
}

/* ── Default pages to seed for new photographers ── */
export const DEFAULT_PAGES = [
  { page_path: "/", page_name: "Home" },
  { page_path: "/store", page_name: "Store" },
  { page_path: "/gallery", page_name: "Gallery" },
];

/* ── SEO Settings CRUD ── */

export async function fetchPageSeoSettings(photographerId: string) {
  const { data, error } = await supabase
    .from("page_seo_settings")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("page_name");
  if (error) throw error;
  return data as PageSeoSetting[];
}

export async function upsertPageSeo(
  photographerId: string,
  pagePath: string,
  updates: Record<string, any>
) {
  // Check if exists
  const { data: existing } = await supabase
    .from("page_seo_settings")
    .select("id")
    .eq("photographer_id", photographerId)
    .eq("page_path", pagePath)
    .maybeSingle();

  // Remove fields that shouldn't be sent
  const { id, photographer_id, created_at, updated_at, structured_data, ...safeUpdates } = updates;

  if (existing) {
    const { error } = await supabase
      .from("page_seo_settings")
      .update(safeUpdates)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("page_seo_settings")
      .insert({
        photographer_id: photographerId,
        page_path: pagePath,
        page_name: safeUpdates.page_name || pagePath,
        ...safeUpdates,
      });
    if (error) throw error;
  }
}

export async function togglePageIndex(id: string, noindex: boolean) {
  const { error } = await supabase
    .from("page_seo_settings")
    .update({ noindex })
    .eq("id", id);
  if (error) throw error;
}

export async function ensureDefaultPages(photographerId: string) {
  const existing = await fetchPageSeoSettings(photographerId);
  const existingPaths = new Set(existing.map((p) => p.page_path));

  const toInsert = DEFAULT_PAGES.filter((p) => !existingPaths.has(p.page_path)).map((p) => ({
    photographer_id: photographerId,
    ...p,
  }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("page_seo_settings").insert(toInsert);
    if (error) throw error;
  }
}

/* ── Analytics ── */

export async function trackPageview(photographerId: string, pagePath: string, action = "view") {
  const { error } = await supabase
    .from("analytics_pageviews")
    .insert({ photographer_id: photographerId, page_path: pagePath, action });
  if (error) console.error("Track pageview error:", error);
}

export async function fetchPageviews(photographerId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("analytics_pageviews")
    .select("*")
    .eq("photographer_id", photographerId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as AnalyticsPageview[];
}
