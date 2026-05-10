## Goal

Add a new "Links" category to the **Add Block** picker (Pixieset-style), allowing users to insert link sections with multiple visual presets — image overlay links, image grid links, text links, "as featured in", "vendors", "sponsors", and client galleries.

## New Block Types

Three new `SectionType`s, each with multiple variants (visual presets):

1. **`image-links`** — One or more cards combining image + clickable label/link
   - Variants: `overlay-bottom-left`, `overlay-center`, `side-by-side`, `row-3`, `grid-3-portrait`
2. **`text-links`** — Text-only link rows, no images
   - Variants: `centered-3`, `boxed-3`, `underlined-3`, `featured-in`, `vendors-2col`, `sponsors-stack`
3. **`image-grid-links`** — Multi-image clickable grid (1+1, 1+2, 3-up)
   - Variants: `feature-plus-2`, `2-up`, `3-up`, `1-feature`

Each block stores its data as:
```ts
{ variant: string, links: Array<{ image?: string; label: string; sublabel?: string; href: string }> }
```

## Files to change

**Schema / factory**
- `src/components/website-editor/page-templates.ts`
  - Add `"image-links" | "text-links" | "image-grid-links"` to `SectionType` union
  - Add factories `imageLinks()`, `textLinks()`, `imageGridLinks()` with sensible default link arrays
  - Wire them into `createSection()`

**Variants**
- `src/components/website-editor/block-variants.ts`
  - Register variant arrays for the 3 new types

**Picker UI**
- `src/components/website-editor/AddBlockPicker.tsx`
  - Add a new category `Links` (icon `Link2`, emoji 🔗) listing the 3 new blocks

**Thumbnails**
- `src/components/website-editor/BlockThumbnail.tsx`
  - Add SVG wireframe cases for the 3 new types

**Public renderer**
- `src/components/store/SectionRenderer.tsx`
  - Add `renderImageLinks`, `renderTextLinks`, `renderImageGridLinks` honoring `variant`
  - Use semantic design tokens, responsive layout, hover states

**Settings panel (editor)**
- `src/components/website-editor/BlockSettingsPanel.tsx`
  - Add editors for the 3 new types: variant selector + list editor for `links` (image upload via `ImageUploadField`, label, sublabel, href)
  - Reuse existing `ItemListEditor` patterns where possible

**i18n**
- All UI labels (category name "Links", block labels, settings labels) added in EN / PT-BR / ES via the existing labeling pattern in the picker (the picker currently uses English literals — keep consistent with surrounding code; no LanguageContext keys needed for picker labels since other categories are also English).

## Out of scope

- No DB migration (sections are stored as JSON in the existing `photographer_site_pages` rows)
- No changes to navigation, routing, or auth
- No new shared components beyond the renderer + settings editor

## Acceptance

- "Links" appears as a new category in Add Block with the 3 presets
- Selecting a preset inserts a working block with placeholder links
- Each block can switch variant in the right panel
- Links render correctly on the published public site with hover and proper navigation (internal anchors and external URLs)
