
## Multi-Page Site Builder — Pages + Site Menu

### What the user wants
Following the Pixieset model from the uploaded image: a site menu tree in the editor sidebar where the photographer can create multiple pages (Home, About, Investment, Blog, Contact, etc.), rename them, organize them with sub-items, and each page has its own sections/blocks. This gives full autonomy over site structure and navigation.

### Current architecture assessment
- Single-page site: all content in `photographer_site` table as flat fields
- Sections (hero, about, quote, etc.) are ordered via `site_sections_order` JSONB
- `PublicSiteRenderer` renders everything on one page with anchor navigation
- No concept of multiple pages in DB or routing

### Architecture of the new system

```text
DB: site_pages table
  id, photographer_id, title, slug, parent_id (nullable),
  sort_order, is_home (bool), sections_order JSONB, is_visible bool

Each page has its own sections_order array (same SectionDef structure)
Home page uses photographer_site for the global config (colors, logo, etc.)
Other pages share the same global styles but have their own blocks
```

Public routing:
```
/store/:slug          → Home page
/store/:slug/about    → About page
/store/:slug/investment → Investment page (and sub-pages)
```

### What we build

**1. DB migration: `site_pages` table**
```sql
CREATE TABLE public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Page',
  slug text NOT NULL,
  parent_id uuid REFERENCES public.site_pages(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_home bool NOT NULL DEFAULT false,
  is_visible bool NOT NULL DEFAULT true,
  sections_order jsonb DEFAULT '[]',
  page_content jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(photographer_id, slug)
);
```
- `page_content` stores page-specific block data (headline, images per page) as a JSON object
- RLS: photographer CRUD own, public SELECT

**2. `PagesTab` in `EditorSidebar.tsx`**
- New 3rd tab: "Pages" (icon: `FileStack` or `LayoutList`)
- Shows tree: Home (always first, not deletable), then flat list of pages with indentation for sub-pages
- Each item: drag handle + editable name (click to rename inline, like Pixieset) + add subpage + delete
- "+ Add Page" button at top right
- Clicking a page → switches the canvas to show that page's preview and its sections in the Sections tab

**3. `WebsiteEditor.tsx` state expansion**
- New state: `activePage: string | null` (page id, null = home)
- Load pages from `site_pages` on mount
- When `activePage` changes → load that page's `sections_order` and `page_content`
- Save logic: home page saves to `photographer_site` (existing), other pages save to `site_pages.page_content` + `site_pages.sections_order`

**4. Per-page sections in `EditorSidebar`**
- When a non-home page is active, the Sections tab shows that page's sections
- Pages other than Home can have a more limited set of blocks (no Hero duplicate rule — each page is independent)
- Re-using the same `SortableItem` + drag logic

**5. `LivePreview` pages support**
- Add `activePage` prop
- Pass `pageContent` (the current page's data) merged with global site config (colors, logo)
- For non-home pages: render only that page's sections, not all of `PublicSiteRenderer`

**6. Public routing for multi-page**
- `StorePage.tsx`: load `site_pages` for the photographer, pass to renderer
- `PublicSiteRenderer.tsx`: nav links now come from `site_pages` (visible pages), not the old `show_*` toggles
- New route: `/store/:slug/*` catches sub-paths for pages
- Sub-page routing handled inside `StorePage` via `useParams` catch-all

### Simplified scope to keep it manageable

To avoid a massive rewrite of `PublicSiteRenderer`, the multi-page system will:
1. Keep Home page working exactly as today (no change to `photographer_site` flow)
2. New pages render as simple single-column block pages (title + sections)
3. Nav bar dynamically built from visible `site_pages` rows
4. Sub-pages shown as dropdown in nav (hover menu)

### Files to create/edit

**New:**
- `src/components/website-editor/PagesTab.tsx` — page tree with inline rename, add, delete, drag-sort

**Migration:**
- `site_pages` table with RLS

**Edited:**
- `src/components/website-editor/EditorSidebar.tsx` — add Pages tab, wire up `activePage`
- `src/pages/dashboard/WebsiteEditor.tsx` — load/save pages, `activePage` state
- `src/components/website-editor/LivePreview.tsx` — pass active page content to preview
- `src/pages/store/StorePage.tsx` — load `site_pages`, support multi-page routing
- `src/components/store/PublicSiteRenderer.tsx` — nav links from `site_pages`, render page content
- `src/App.tsx` — add `/store/:slug/*` catch-all route for sub-pages

### Key UX flows

**Creating a page:** Click "+ Add Page" → new page appears in list with editable name → click to focus canvas on that page → use Sections tab to add/reorder blocks

**Renaming:** Click page name in tree → turns into inline input → blur or Enter to save

**Sub-pages:** "..." menu next to each page → "Add Sub-page" → indented item appears

**Home page:** Always first, lock icon, cannot delete or rename

**Nav bar on public site:** Automatically built from `site_pages` ordered by `sort_order`, parent pages with sub-pages get a dropdown arrow
