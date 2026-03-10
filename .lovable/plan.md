

## Site & SEO Manager for Davions

Replicate the Anglo Medicine SEO management tool, adapted to Davions' layout (DashboardSidebar + DashboardHeader pattern), translated to English, and scoped per photographer.

### What it includes

**Tab 1 — Analytics** (traffic dashboard)
- KPI cards: Total Visits, Pages Visited, Blog Visits, Action Types
- Daily visits area chart (recharts)
- Top Pages ranking + Blog post visits bar chart
- Actions breakdown badges
- Period selector (7/14/30/90 days)

**Tab 2 — SEO Manager**
- List all registered pages with SERP preview (Google-style)
- Edit dialog per page: title, meta description, keywords, OG fields, canonical URL, noindex/nofollow toggles, sitemap priority/changefreq
- Toggle indexing directly from the list
- AI-powered meta description and keyword suggestions (reuse existing `ai-blog-seo` edge function with new actions)

### Database changes (migration)

1. **`page_seo_settings`** table — stores per-page SEO config per photographer
   - `id`, `photographer_id`, `page_path`, `page_name`, `title`, `meta_description`, `meta_keywords[]`, `og_title`, `og_description`, `og_image`, `canonical_url`, `noindex`, `nofollow`, `priority`, `changefreq`, `structured_data jsonb`, `created_at`, `updated_at`
   - RLS: authenticated photographers CRUD own rows; anon SELECT allowed for rendering

2. **`analytics_pageviews`** table — stores page visit events
   - `id`, `photographer_id`, `page_path`, `action`, `created_at`
   - RLS: anon INSERT (for tracking); authenticated photographer SELECT own rows

3. **Seed default pages** via a trigger on `photographers` insert, or let the UI auto-create entries for known routes on first load.

### Files to create/edit

| File | Action |
|---|---|
| `supabase/migrations/…_seo_tables.sql` | Create `page_seo_settings` + `analytics_pageviews` tables with RLS |
| `src/pages/dashboard/SiteSeo.tsx` | New page — two-tab layout (Analytics + SEO Manager), uses DashboardSidebar/Header layout, all English |
| `src/lib/seo-api.ts` | API helpers: `fetchPageSeoSettings`, `upsertPageSeo`, `togglePageIndex`, `fetchPageviews`, `trackPageview` |
| `src/App.tsx` | Add route `/dashboard/seo` |
| `src/components/dashboard/DashboardSidebar.tsx` | Add `to: "/dashboard/seo"` to the SEO menu item |
| `supabase/functions/ai-blog-seo/index.ts` | Add `action: "seo_suggest_meta"` and `"seo_suggest_keywords"` branches |

### Key adaptations from Anglo Medicine

- Replace `AdminLayout` with Davions `SidebarProvider + DashboardSidebar + DashboardHeader` pattern
- Replace Portuguese labels with English equivalents
- Scope all queries by `photographer_id = auth.uid()`
- Use `analytics_pageviews` instead of `analytics_acessos`
- SERP preview URL uses photographer's `store_slug` or `custom_domain`
- Reuse existing `ai-blog-seo` edge function for AI-powered SEO suggestions

### Tracking snippet
Add a lightweight `usePageTracking()` hook that inserts into `analytics_pageviews` on route change, so analytics data populates automatically.

