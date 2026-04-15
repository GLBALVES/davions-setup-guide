

## Plan: Enhanced Pages Panel (Pixieset-style)

### What changes
Rebuild the `PagesPanel` in `WebsiteEditor.tsx` to closely mirror Pixieset's page management structure with two sections, context menus, and a page settings side-panel.

### Structure

**Two sections in the page list:**
1. **SITE MENU** — Pages visible in the navigation menu (top-level items and folders with subpages)
2. **NOT IN MENU** — Pages that exist but are hidden from the menu

**Page types with distinct icons:**
- **Page** (`FileText`) — standard page
- **Folder** (`FolderOpen`) — collapsible group containing subpages, shows chevron `▾`/`▸`
- **Link** (`Link2` icon) — external/internal link item (e.g. Blog, Store)
- **Home** (`Home` icon) — special first item

**Context menu (MoreHorizontal "..." on hover):**
Each page item shows a `...` button on hover that opens a `DropdownMenu` with:
- Get direct link (`Link2`)
- Settings (`Settings`)
- Rename (`Type`)
- Switch template (`Paintbrush`)
- Show on Menu / Hide from Menu (`Globe`/`EyeOff`)
- Get QR Code (`QrCode`)
- Duplicate (`Copy`)
- Delete (`Trash2`)

**Page Settings panel:**
When "Settings" is clicked from the context menu, the sidebar content switches to a Page Settings view (with back arrow) containing:
- Page Name (input)
- Page Status (select: Online / Offline)
- Show Page Header and Footer (toggle switch)
- Menu Visibility (select: Visible / Hidden)

**Drag-and-drop:** Not in this iteration — placeholder only. Pages are reorderable conceptually but we use static mock data for now.

### Data model (local state for now)
```typescript
type PageType = "page" | "folder" | "link";
interface SitePage {
  id: string;
  label: string;
  type: PageType;
  icon?: string; // emoji override (e.g. Home 🏠)
  inMenu: boolean;
  children?: SitePage[]; // only for folders
  slug?: string;
  status?: "online" | "offline";
  showHeaderFooter?: boolean;
}
```

Initial mock data mirrors the Pixieset screenshots (Home, The Experience folder with subpages, Investment folder, Blog link, Contact, plus NOT IN MENU items like Clients, Thank you!, Bio Links, etc.).

### Technical details
- All new code stays in `WebsiteEditor.tsx` (PagesPanel, PageItem, PageGroup components)
- Use `DropdownMenu` from shadcn/ui for the context menu
- Use local `useState` for pages array and selected page settings
- Add i18n keys in `translations.ts` for section headers, context menu items, and settings labels
- The "..." button appears on hover via `group` / `group-hover` Tailwind classes

### Files to modify
1. **`src/pages/dashboard/WebsiteEditor.tsx`** — Rebuild PagesPanel with two sections, context menus, page settings view
2. **`src/lib/i18n/translations.ts`** — Add keys for "Site Menu", "Not in Menu", context menu labels, page settings labels

