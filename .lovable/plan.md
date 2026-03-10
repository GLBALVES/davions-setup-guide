
## Plan: Restore Davions logo + fix collapsed sidebar structure

### Two changes needed

**1. Add logo to sidebar header**
Use `SidebarHeader` (already exported from `@/components/ui/sidebar`) at the top of the `<Sidebar>` to render the `logo_principal_preto.png`. When collapsed, the `SidebarHeader` area will shrink to the icon strip width — so show only the `selo_preto.png` (the stamp/seal icon) in collapsed state, and the full wordmark when expanded. This matches the luxury-minimal identity.

**2. Unify collapsed + expanded rendering — no more split branches**
The current code has two completely separate `return` blocks (one `if (collapsed)` flat list, one full expanded view). This is the root cause of the structure being lost when collapsed.

The fix: **remove the early `if (collapsed)` return entirely** and use a single unified render tree. The Shadcn `collapsible="icon"` mode on `<Sidebar>` handles icon-only display automatically via CSS — it hides `[data-sidebar="group-label"]` text and any `span` inside `SidebarMenuButton` when collapsed.

The key change for the group labels: instead of `Collapsible` wrapping the whole group (which collapses `CollapsibleContent` and hides items from the DOM), we keep all items always rendered and only conditionally show the collapsible toggle behavior when expanded.

Approach:
- Always render all groups and items
- Wrap groups in `Collapsible` as before, but `open` the collapsibles always when `collapsed === true` (so items stay in DOM and visible as icons)
- The group label's `CollapsibleTrigger` text/chevron will be naturally hidden by sidebar's CSS in collapsed mode
- Items render with `SidebarMenuButton tooltip={item.title}` so tooltips still work when collapsed

```text
Expanded:
  [DAVIONS logo]
  ▼ Favorites        ← collapsible label (clickable)
      ★ Dashboard
      ★ Sessions
  ▼ Photographers    ← collapsible label
      📷 Dashboard
      📷 Sessions
      ...

Collapsed (narrow strip):
  [seal icon]        ← small logo
  ★                  ← Favorites group icon
      🏠 💼 ...      ← item icons (tooltip on hover)
  📷                 ← Photographers group icon
      🏠 📅 ...
```

### Implementation

**File: `src/components/dashboard/DashboardSidebar.tsx`**

1. Add `SidebarHeader` import
2. Add logo imports at top (already in file scope — need to add `import logoPrincipal` and `import seloPrincipal`)
3. Add `<SidebarHeader>` block with:
   - When expanded: full `logo_principal_preto.png`
   - When collapsed: `selo_preto.png` (or just the seal as small icon)
4. Remove the early `if (collapsed)` return block (lines 398–442)
5. In the unified expanded return, change the `Collapsible open` prop to: `open={collapsed ? true : openGroups[title]}` — this forces all groups open when sidebar is collapsed so icons remain visible
6. Hide the chevron arrow in collapsed mode: `{!collapsed && <ChevronRight ... />}`
7. The group label text and item text are automatically hidden by Shadcn's `collapsible="icon"` CSS — no extra work needed
