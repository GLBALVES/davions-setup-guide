

## Plan: Expand Page Settings to match Pixieset

### What changes
Update the `PageSettingsView` component in `WebsiteEditor.tsx` to include all three sections and bottom actions shown in the reference screenshots.

### Structure

**BASICS** (already exists — minor tweaks)
- Page Name, Page Status, Show Header/Footer (add "On"/"Off" label next to toggle), Menu Visibility

**SEO** (new section)
- Search Preview — Google SERP-style card showing page title, URL, and description
- URL Slug — input with helper text ("Unique url address slug for this page")
- Page Title — input with helper text ("Title of the page as it appears in search engine results")
- Page Description — textarea with helper text ("This description appears in search engine results")
- Hide Page from Search Engines — toggle with "On"/"Off" label

**SOCIAL** (new section)
- Social Image — placeholder/upload area with helper text ("Choose the image used when this page is shared on social networks")

**Bottom actions** (new)
- Switch Page Template (icon + text button)
- Set as Homepage (disabled/greyed if already home)
- Duplicate Page
- Delete Page (destructive style)

### Data model update
Add fields to `SitePage`:
```typescript
slug?: string;
pageTitle?: string;
pageDescription?: string;
hideFromSearch?: boolean;
socialImage?: string;
```

### Files to modify
1. **`src/pages/dashboard/WebsiteEditor.tsx`** — Expand `PageSettingsView` with SEO, Social sections and bottom actions; update `SitePage` interface and mock data
2. **`src/lib/i18n/translations.ts`** — Add keys for section headers, field labels, helper texts, and action buttons (EN/PT/ES)

