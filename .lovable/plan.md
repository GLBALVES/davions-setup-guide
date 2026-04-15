

## Plan: Add Page dropdown with 3 options (Page, Folder, Link)

### What changes
Modify the `PagesPanel` component in `src/pages/dashboard/WebsiteEditor.tsx` to replace the current "Add Page" button with a dropdown (using Popover or DropdownMenu) that shows three options:

1. **Page** — icon: `FileText`, description: "Add a new page"
2. **Folder** — icon: `FolderOpen`, description: "Use folder to show subpages in a dropdown menu"
3. **Link** — icon: `Link2`, description: "Add a link to your menu"

### Technical details
- Use `Popover` from shadcn/ui for the dropdown (matches the reference screenshot style better than DropdownMenu)
- Each option renders as a row with icon, title (bold), and description text below
- Clicking an option closes the popover (functionality is placeholder for now)
- Style: white card with subtle shadow, matching the luxury minimal design system
- Add i18n support for the 3 option labels and descriptions in `translations.ts`

### Files to modify
1. **`src/pages/dashboard/WebsiteEditor.tsx`** — Update `PagesPanel` to use `Popover` with the 3 options
2. **`src/lib/i18n/translations.ts`** — Add translation keys for the dropdown labels (EN/PT/ES)

