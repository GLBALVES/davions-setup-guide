// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Writes public/sitemap.xml covering the marketing root plus every public
// Vitrine, custom sub-page, and published blog post per photographer.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const BASE_URL = "https://davions.com";
const SUPABASE_URL = "https://pjcegphrngpedujeatrl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqY2VncGhybmdwZWR1amVhdHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzkwODMsImV4cCI6MjA4ODYxNTA4M30.g5zfaUmSSWzU6sErJE_UBRfUXmcnHVBDV7CRTJqPVqQ";

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function urlTag({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const entries = [
    { loc: `${BASE_URL}/`, changefreq: "weekly", priority: "1.0" },
  ];

  let photographers = [];
  let pages = [];
  let posts = [];
  try {
    [photographers, pages, posts] = await Promise.all([
      rest("photographers?select=id,store_slug&store_slug=not.is.null"),
      rest("site_pages?select=photographer_id,slug,is_home,is_visible,updated_at&is_visible=eq.true&is_home=eq.false&deleted_at=is.null"),
      rest("blog_posts?select=photographer_id,slug,updated_at,published_at&published=eq.true"),
    ]);
  } catch (err) {
    console.warn(`[sitemap] dynamic fetch failed: ${err.message} — writing static skeleton.`);
  }

  const slugById = new Map(
    photographers.filter((p) => p.store_slug).map((p) => [p.id, p.store_slug]),
  );

  for (const p of photographers) {
    if (!p.store_slug) continue;
    entries.push({
      loc: `${BASE_URL}/vitrine/${p.store_slug}`,
      changefreq: "weekly",
      priority: "0.8",
    });
    entries.push({
      loc: `${BASE_URL}/vitrine/${p.store_slug}/shop`,
      changefreq: "weekly",
      priority: "0.7",
    });
    entries.push({
      loc: `${BASE_URL}/vitrine/${p.store_slug}/blog`,
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  for (const page of pages) {
    const slug = slugById.get(page.photographer_id);
    if (!slug || !page.slug) continue;
    entries.push({
      loc: `${BASE_URL}/vitrine/${slug}/page/${page.slug}`,
      lastmod: page.updated_at,
      changefreq: "monthly",
      priority: "0.5",
    });
  }

  for (const post of posts) {
    const slug = slugById.get(post.photographer_id);
    if (!slug || !post.slug) continue;
    entries.push({
      loc: `${BASE_URL}/vitrine/${slug}/blog/${post.slug}`,
      lastmod: post.updated_at || post.published_at,
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map(urlTag),
    `</urlset>`,
    "",
  ].join("\n");

  const out = resolve("public/sitemap.xml");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, xml);
  console.log(`[sitemap] wrote ${entries.length} entries -> public/sitemap.xml`);
}

main().catch((err) => {
  console.error("[sitemap] failed:", err);
  process.exit(0); // never block dev/build
});
