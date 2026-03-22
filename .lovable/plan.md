
## Problem

Clicking "Page 1" (or any custom page) in the sidebar immediately opens the `PageContentPanel` (title, cover image, headline fields) instead of loading the page's content into the preview — unlike Home, which loads its sections.

**Root cause (`WebsiteEditor.tsx` lines 562–572):**
```ts
// ANY click on a custom page → shows PageContentPanel
{activePageId !== null && activeBlock === null && (() => {
  const activePage = pages.find(p => p.id === activePageId);
  return activePage && !activePage.is_home ? <PageContentPanel ...> : null;
})()}
```

There is no distinction between "I just selected this page" vs "I want to edit its properties."

## Solution

Introduce a separate boolean state `pageContentPanelOpen` (default `false`). The `PageContentPanel` only appears when this flag is `true`. Clicking a page name selects it (updates preview) but does NOT set this flag. A dedicated button in the `PageRow` (e.g., the settings/gear icon or a "Page Settings" option in the existing dropdown menu) toggles it.

### Changes

**`WebsiteEditor.tsx`**:
1. Add `const [pageContentPanelOpen, setPageContentPanelOpen] = useState(false);`
2. Update `handleSelectPage` to reset `pageContentPanelOpen` to `false` when switching pages.
3. Change the sidebar condition: show `PageContentPanel` only when `pageContentPanelOpen === true` (and `activeBlock === null`).
4. Show `EditorSidebar` when `pageContentPanelOpen === false`.
5. Pass `onOpenPageSettings={(id) => { setActivePageId(id); setPageContentPanelOpen(true); }}` to `EditorSidebar`.
6. Update `PageContentPanel`'s back button to call `setPageContentPanelOpen(false)` instead of `setActivePageId(null)`.

**`EditorSidebar.tsx`**:
1. Accept new prop `onOpenPageSettings: (pageId: string) => void`.
2. In the dropdown menu of `PageRow`/`SortablePage`, add a "Page Settings" item that calls `onOpenPageSettings(page.id)`.
3. Remove or repurpose the `onSelect` handler — clicking the page row now only selects the page, never opens properties.

### Result
- Click page name → preview loads that page's sections (same behavior as Home) ✓
- Click "Page Settings" in dropdown → `PageContentPanel` opens for editing title, cover, CTA ✓
- Click back in `PageContentPanel` → returns to normal `EditorSidebar` ✓
- Section click still opens section editor as before ✓

**Files to edit:** `src/pages/dashboard/WebsiteEditor.tsx`, `src/components/website-editor/EditorSidebar.tsx`
