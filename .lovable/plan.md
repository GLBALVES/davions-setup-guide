
## Problem Analysis

Two issues:

**1. Duplicate collapse buttons**
- The sidebar (`DashboardSidebar.tsx`) renders its own `PanelLeftClose/Open` button inside the sidebar header (lines 412–418).
- Every dashboard page header also renders a `<SidebarTrigger>` (which is also a toggle button) — visible in Dashboard.tsx, Sessions.tsx, GalleryDetail.tsx, SessionForm.tsx, Bookings.tsx, Galleries.tsx, Settings.tsx.
- Result: two buttons doing the same thing simultaneously.

**Fix**: Remove the custom `PanelLeftClose/Open` button from inside `DashboardSidebar.tsx`. Keep the `SidebarTrigger` in every page header — that's the correct pattern per Shadcn docs (trigger lives *outside* the sidebar so it's always visible when collapsed).

**2. When collapsed, everything disappears (no icons shown)**
- The sidebar uses `collapsible="icon"` on the `<Sidebar>` — this is correct and *should* show icons in the narrow strip.
- The problem is that the group labels (Favorites, Photographers, etc.) are rendered as `<CollapsibleTrigger>` buttons, and their `Collapsible` is set to `open={!collapsed && openGroups[...]}`. When collapsed, the open state is forced to `false`, so the `CollapsibleContent` (which contains the items) is hidden.
- But the group *label icons* (Star, Camera, etc.) are shown in the collapsed branch of the ternary. So labels are visible. However, the items themselves are inside `CollapsibleContent` which is closed → they don't render.
- The Shadcn `collapsible="icon"` mode relies on items being *always rendered* in the DOM, just with text hidden via CSS. The current approach uses conditional rendering (`CollapsibleContent`) which removes items from DOM.

**Fix**: When collapsed, bypass the Collapsible system entirely and render a flat list of all group icons (and their items' icons) directly — or better: render each group's items *outside* CollapsibleContent when in collapsed state, showing only the icon.

### Implementation Plan

**File: `src/components/dashboard/DashboardSidebar.tsx`**

1. **Remove** the logo + toggle button `<div>` block (lines 407–419) from the sidebar. The logo with the seal is no longer needed inside the sidebar since the header already has the logo. Keep only the sidebar content.

2. **Fix collapsed icon display**: In the group rendering, when `collapsed === true`, render a simple flat list of item icons (for items that have a `to` route) directly — no Collapsible wrapping needed. When `collapsed === false`, render the full collapsible groups as they are now.

Specifically: render a different branch when `collapsed`:
```text
if collapsed:
  Show each group's icon as a clickable header (using the group icon)
  Below it, show all items' icons in that group as SidebarMenuButton items with tooltip
  (No collapsible — all visible)
else:
  Current collapsible group rendering
```

This is the cleanest approach that works with `collapsible="icon"`.

**Files to change:**
- `src/components/dashboard/DashboardSidebar.tsx` — remove inner toggle button, fix collapsed rendering

No changes needed to any page files (they correctly have `SidebarTrigger` in the header).
