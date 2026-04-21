

## Bug: Canvas "Delete Section" silently no-ops

### Root cause

In `src/pages/dashboard/WebsiteEditor.tsx`, the canvas toolbar actions (Delete, Duplicate, Move, Reorder) all flow through `pageActions.setSections(...)`. But `pageActions` is only registered when `editingSectionsPageId` is non-null — which **only happens after the user explicitly enters "Edit Sections" mode in the sidebar** (line 1707).

When the user is browsing pages normally (Pixieset behavior keeps the sidebar on the page list — line 1589 explicitly sets `editingSectionsPageId` to `null`), `pageActions` is `null`, so:

- `confirmDeleteBlock` exits early at the `!pageActions` guard → **section is never removed**
- `moveBlock`, `duplicateBlock`, reorder via DnD, and "+ Add Section" all fail the same way

The deletion confirmation dialog opens and closes correctly — but nothing happens after "Delete" because the action silently no-ops.

### Fix

Register `pageActions` against the **currently previewed page**, not against `editingSectionsPageId`. The preview always has an active page (`activePage`), and that's the page the canvas is editing.

**Changes in `src/pages/dashboard/WebsiteEditor.tsx`:**

1. **`PagesSidebar` effect (around line 1705-1716)** — change the dependency from `editingSectionsPageId` to the active preview page. Resolve the active page id from `activePage` (the slug/id used by the preview), and register `setSections` against that id. The setter still calls `findAndUpdate(activePageId, { sections })` so persistence to `site_pages` is unchanged.

2. Keep `PageSectionsPanel`'s own local actions intact (it already uses `findAndUpdate(editingSectionsPageId, ...)` directly via its `onSectionsChange` prop on line 1970-1972) — no change needed there.

3. **Sanity guard in `confirmDeleteBlock`** — after calling `actions.setSections(next)`, also clear `editingSection` if it pointed to the removed section, to avoid the right-side editor staying open on a ghost block.

### Secondary cleanup (same file)

- The console warning `Function components cannot be given refs` originates from the `AlertDialog` portal interacting with `AlertDialogFooter`. It's caused by a stray `forwardRef` issue in the local `Btn` helper inside `PreviewRenderer.tsx` (`React.forwardRef<HTMLButtonElement, any>` rendering a function child without ref forwarding). Wrap properly or drop the `forwardRef` since the ref isn't used. Cosmetic but worth fixing while we're here.

### Files touched

- `src/pages/dashboard/WebsiteEditor.tsx` — re-scope `registerActivePageActions` to the active preview page
- `src/components/website-editor/PreviewRenderer.tsx` — minor: remove unused `forwardRef` on toolbar `Btn`

### Verification after fix

- Click a page in the sidebar → preview shows it
- Hover a block in the canvas → click trash → confirm "Delete" → block disappears, toast with Undo appears, change persists on reload
- Same for Duplicate, Move up/down, drag reorder, and "+ Add Section" directly from the canvas

