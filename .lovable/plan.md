

# Per-User Favorites with Edit Mode

## Current State
Favorites are stored in `localStorage` (`davions_sidebar_favorites`), meaning they are device-specific and not tied to the user account. The only way to pin/unpin is via right-click context menu.

## What Changes

### 1. Database Table
Create a `sidebar_favorites` table to persist favorites per user:
- `id`, `photographer_id`, `item_key` (e.g. `"Photographers:Dashboard"`), `position` (integer for ordering), `created_at`
- RLS: `photographer_id = auth.uid()` for ALL operations

### 2. Edit Mode Toggle (Pencil Button)
Add a pencil icon button next to the "Favorites" group label. When clicked, it toggles an **edit mode** that:
- Opens a panel/overlay listing ALL menu items grouped by section
- Each item shows a star icon — filled if favorited, outline if not
- Clicking the star toggles the favorite on/off
- Drag-and-drop reordering remains available in the favorites list
- Clicking the pencil again (or a "Done" button) exits edit mode

### 3. DashboardSidebar Changes
- Replace `localStorage` read/write (`loadFavorites`/`saveFavorites`) with database queries using `supabase` from `@/integrations/supabase/client`
- On mount: fetch `sidebar_favorites` for the current user, ordered by `position`
- On toggle pin: insert or delete from `sidebar_favorites`
- On drag reorder: update `position` values
- Keep the right-click context menu as an alternative way to pin/unpin
- Add the edit pencil button in the Favorites group header (expanded mode) and in the collapsed favorites popover

### Files to Create
- Migration SQL for `sidebar_favorites` table + RLS

### Files to Edit
- `src/components/dashboard/DashboardSidebar.tsx` — replace localStorage with DB, add edit mode UI with pencil toggle

