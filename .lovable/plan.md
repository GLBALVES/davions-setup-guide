

## Fix Blog Settings Sub-Panel (Toggle + Layout)

### Problems
1. **Toggle doesn't visually update** — `updateSite` in `WebsiteEditor.tsx` rebuilds local `site` state from a fixed list of known fields (logo, fonts, colors…). `show_blog` isn't preserved, so after `onSiteChange({ show_blog: true })` the local state loses the new value and the `Switch` snaps back to off. (DB does get written, but UI lies.)
2. **Layout is poor**: buttons render in ALL CAPS with wide letter-spacing (likely inheriting site's heading font/tracking from the editor preview context), the panel feels cramped, and the helper text is awkwardly placed.

### Fix 1 — `updateSite` in `src/pages/dashboard/WebsiteEditor.tsx`
Make the optimistic merge generic so any patched key (including `show_blog`, `show_about`, `show_store`, etc.) is reflected immediately:

```ts
setSite((prev) => ({
  ...(prev || {}),
  ...patch,                       // ← merge all raw DB keys (snake_case)
  // keep camelCase aliases used elsewhere in the editor:
  logoUrl: patch.logo_url !== undefined ? patch.logo_url : prev?.logoUrl,
  accentColor: ...,
  // ... (existing aliases unchanged)
}));
```

This preserves backward compatibility while ensuring any `show_*` / SEO / tracking flag updates flow back to the UI.

### Fix 2 — Redesign `src/components/website-editor/settings/BlogSubPanel.tsx`
Cleaner Pixieset-style layout (matches the rest of `SettingsPanel`):

- Replace the boxed card with a flush row using the same visual style as other sub-panels (SeoSubPanel pattern).
- Use `normal-case tracking-normal` explicitly on buttons to override any inherited heading-font tracking from preview context.
- Trilingual labels via `useLanguage` (EN/PT/ES) — project is multi-language.
- Tighter spacing, clearer hierarchy:
  - Section header "Blog"
  - Toggle row (label + description on left, switch on right) — borderless, subtle divider
  - Two ghost-style action buttons stacked
  - Footnote in muted text

Translation keys to add to `src/lib/i18n/translations.ts`:
- `editor.settings.blog.title` → "Blog"
- `editor.settings.blog.toggleLabel` → "Show blog on site" / "Mostrar blog no site" / "Mostrar blog en el sitio"
- `editor.settings.blog.toggleDesc` → "Adds a /blog section to your public website."
- `editor.settings.blog.managePosts` → "Manage blog posts"
- `editor.settings.blog.settings` → "Blog settings & themes"
- `editor.settings.blog.footnote` → "Full blog management (posts, AI generation, SEO) lives in the Blog module."

### Files to edit
- `src/pages/dashboard/WebsiteEditor.tsx` — generic patch merge in `updateSite`
- `src/components/website-editor/settings/BlogSubPanel.tsx` — layout rewrite + i18n + `normal-case tracking-normal` overrides
- `src/lib/i18n/translations.ts` — new keys (EN/PT/ES)

### Out of scope
- The unrelated React `forwardRef` warnings for `AdvancedModal` / `SettingsPanel` (separate issue, not blocking the toggle).

