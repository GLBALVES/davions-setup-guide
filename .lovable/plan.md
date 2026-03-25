
## Problem
The template grid is already built and working (`TemplatePreviewCard` + `TemplatePreviewModal`) but it is buried as **section 6** in a very long settings page — the user has to scroll through Branding, Hero, About, Social, and Navigation sections to find it.

## Fix: Add top-level Tabs to `/dashboard/website`

Transform `WebsiteSettings.tsx` to have two tabs at the top:
- **Templates** — the template grid (currently section 6), shown first
- **Site Settings** — everything else (branding, hero, social, nav, SEO, domain, etc.)

### What changes in `WebsiteSettings.tsx`

1. Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
2. Wrap the main content area in `<Tabs defaultValue="templates">`
3. Add a `TabsList` with two triggers: `Templates` and `Site Settings`
4. Move the template grid (`<section>` with the 2-col `TemplatePreviewCard` grid) into `<TabsContent value="templates">` — this becomes the landing view
5. Everything else goes into `<TabsContent value="settings">`

### Result

```text
/dashboard/website
├── Header: "Website" + "Open Visual Editor" + "Preview Site"
├── Tabs: [Templates ★] [Site Settings]
│
├── Tab "Templates" (default — visible on load)
│   └── 2-col grid of TemplatePreviewCard
│       ├── Editorial — mockup SVG + badge "Current" + Preview button
│       ├── Grid — mockup SVG + Preview button
│       ├── Magazine — mockup SVG + Preview button
│       └── Clean — mockup SVG + Preview button
│
└── Tab "Site Settings"
    └── All existing sections: Branding, Hero, Quote, About, Social, Navigation, SEO, Analytics, Footer, Store URL, Custom Domain
```

### Files to edit
- `src/pages/dashboard/WebsiteSettings.tsx` — add Tabs, move template section to first tab
