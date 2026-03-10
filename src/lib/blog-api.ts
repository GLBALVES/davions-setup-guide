import { supabase } from "@/integrations/supabase/client";

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function calcReadingTime(content: string): number {
  const words = content?.trim().split(/\s+/).length || 0;
  return Math.max(1, Math.ceil(words / 200));
}

// ---- Posts ----

export async function fetchBlogPosts(onlyPublished = false) {
  let query = (supabase.from("blog_posts" as any) as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (onlyPublished) {
    query = query.eq("published", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

export async function fetchBlogPostBySlug(slug: string) {
  const { data, error } = await (supabase.from("blog_posts" as any) as any)
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchBlogPostById(id: string) {
  const { data, error } = await (supabase.from("blog_posts" as any) as any)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertBlogPost(post: Record<string, unknown>) {
  const { data, error } = await (supabase.from("blog_posts" as any) as any)
    .upsert(post)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBlogPost(id: string) {
  const { error } = await (supabase.from("blog_posts" as any) as any).delete().eq("id", id);
  if (error) throw error;
}

export async function togglePublishPost(id: string, published: boolean) {
  const updates: Record<string, unknown> = { published };
  if (published) updates.published_at = new Date().toISOString();
  const { error } = await (supabase.from("blog_posts" as any) as any).update(updates).eq("id", id);
  if (error) throw error;
}

// ---- Categories ----

export async function fetchBlogCategories() {
  const { data, error } = await (supabase.from("blog_categories" as any) as any)
    .select("*")
    .order("position");
  if (error) throw error;
  return data as any[];
}

// ---- Themes ----

export async function fetchBlogThemes(status?: string) {
  let query = (supabase.from("blog_themes" as any) as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

export async function insertBlogThemes(photographerId: string, themes: { theme: string; description: string; category: string }[]) {
  const rows = themes.map((t) => ({ ...t, photographer_id: photographerId }));
  const { data, error } = await (supabase.from("blog_themes" as any) as any)
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export async function updateBlogThemeStatus(id: string, status: string) {
  const { error } = await (supabase.from("blog_themes" as any) as any).update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteBlogTheme(id: string) {
  const { error } = await (supabase.from("blog_themes" as any) as any).delete().eq("id", id);
  if (error) throw error;
}

export async function upsertBlogTheme(theme: Record<string, unknown>) {
  const { data, error } = await (supabase.from("blog_themes" as any) as any)
    .upsert(theme)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- Blog Settings ----

export async function fetchBlogSetting(photographerId: string, key: string): Promise<string | null> {
  const { data, error } = await (supabase.from("blog_settings" as any) as any)
    .select("value")
    .eq("photographer_id", photographerId)
    .eq("key", key)
    .single();
  if (error) return null;
  return (data as any)?.value || null;
}

export async function upsertBlogSetting(photographerId: string, key: string, value: string) {
  const { error } = await (supabase.from("blog_settings" as any) as any)
    .upsert({ photographer_id: photographerId, key, value, updated_at: new Date().toISOString() }, { onConflict: "photographer_id,key" });
  if (error) throw error;
}
