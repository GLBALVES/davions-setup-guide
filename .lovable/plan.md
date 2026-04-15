

## Problem

Pages in the Website Editor are stored only in React state (`useState(INITIAL_PAGES)`). Every reload resets to the hardcoded list, discarding any additions or deletions.

A `site_pages` table already exists in the database with the right schema (`id`, `photographer_id`, `title`, `slug`, `parent_id`, `sort_order`, `is_home`, `is_visible`, `sections_order`, `page_content`).

## Plan

### 1. Load pages from database on mount

In the `PagesPanel` component, replace `useState(INITIAL_PAGES)` with a `useEffect` that fetches from `site_pages` filtered by `photographer_id`. Map DB rows to the `SitePage` interface (e.g. `title` → `label`, `is_visible` → `inMenu`, `is_home` → flag for Home page). Build the parent/children tree using `parent_id`. Fall back to `INITIAL_PAGES` only if no rows exist (first-time setup).

### 2. Persist changes on every mutation

Wrap the three mutation functions (`deletePage`, `findAndUpdate`, `addPage`/`handleTemplateSelect`, `duplicatePage`) so they also write to the database:

- **Delete**: `supabase.from('site_pages').delete().eq('id', pageId)`
- **Add / Duplicate**: `supabase.from('site_pages').insert(...)` with mapped fields
- **Update** (rename, toggle menu, toggle status): `supabase.from('site_pages').update(...)` matching by `id`

### 3. Lift photographer_id into PagesPanel

The `PagesPanel` currently has no access to `photographer_id`. Pass it down from the parent `WebsiteEditor` component (which already has auth context) as a prop.

### 4. Seed default pages on first use

When the DB query returns zero rows for a photographer, insert the `INITIAL_PAGES` set into `site_pages` so the user starts with the default structure and all future edits persist.

### Technical details

- The `SitePage.id` will use the DB UUID (or the existing string ID for seeded pages).
- `parent_id` maps to folder membership (children).
- `sort_order` preserves drag-and-drop ordering.
- `sections_order` and `page_content` store the template sections data (already JSONB columns).
- `slug` will be auto-generated from the label using the existing `slugify` pattern.
- No new tables or migrations needed — `site_pages` already exists with RLS.

