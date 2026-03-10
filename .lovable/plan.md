
## Two changes: Business name in header + Collapsed sidebar shows only group icons

### Change 1 — Business name in all page headers

**Current state**: Every dashboard page header shows `<img src={logoPrincipal} ... />` (the Davions wordmark).

**New behavior**: Replace the logo image with the photographer's `business_name` from the `photographers` table. Display it as a short uppercase text label (matching the existing typographic style). Keep the `SidebarTrigger` button next to it.

**How**: Create a small shared hook `useBusinessName` (or inline the fetch) that reads `business_name` from `photographers` for the current user. Then create a reusable `DashboardHeader` component so all 7 pages don't need individual changes.

Actually the cleanest approach: create `src/components/dashboard/DashboardHeader.tsx` — a component that accepts no props, reads the business name itself via a single Supabase query, and renders the trigger + name. Then replace the header block in all 7 pages.

Pages to update:
- `src/pages/Dashboard.tsx`
- `src/pages/dashboard/Sessions.tsx`
- `src/pages/dashboard/Bookings.tsx`
- `src/pages/dashboard/Galleries.tsx`
- `src/pages/dashboard/GalleryDetail.tsx`
- `src/pages/dashboard/SessionForm.tsx`
- `src/pages/dashboard/Settings.tsx`

---

### Change 2 — Collapsed sidebar: group icons only, submenus on click

**Current state**: When `collapsed === true`, the `Collapsible` is forced `open={true}`, so all sub-items render as a long flat list of icons. The group headers are not clickable in collapsed mode.

**New behavior**: When collapsed, show **only the group header icons** (Star, Camera, Megaphone, etc.). When the user clicks a group icon, a **popover/flyout** opens to the right showing that group's sub-items. This is the standard pattern for icon-only sidebars with nested navigation.

**How**: 
- When `collapsed`, render each group as a `Popover`. The `PopoverTrigger` is the group icon button (with tooltip showing the group name). The `PopoverContent` renders the group's items as a vertical menu to the right of the sidebar.
- When expanded, keep the current `Collapsible` behavior unchanged.
- For the Favorites group when collapsed: show the Star icon; clicking opens a popover with the pinned items.

**Implementation detail**:
- Add a `collapsedOpenGroup` state (string | null) to track which group's popover is open.
- Use Radix `Popover` (already installed) with `side="right"` and `align="start"`.
- Each item in the popover renders as a clickable row (NavLink or disabled button) with icon + title.

---

### Files to change
- `src/components/dashboard/DashboardHeader.tsx` — new shared header component
- `src/components/dashboard/DashboardSidebar.tsx` — collapsed popover behavior
- `src/pages/Dashboard.tsx` — use DashboardHeader
- `src/pages/dashboard/Sessions.tsx` — use DashboardHeader
- `src/pages/dashboard/Bookings.tsx` — use DashboardHeader
- `src/pages/dashboard/Galleries.tsx` — use DashboardHeader
- `src/pages/dashboard/GalleryDetail.tsx` — use DashboardHeader
- `src/pages/dashboard/SessionForm.tsx` — use DashboardHeader
- `src/pages/dashboard/Settings.tsx` — use DashboardHeader
