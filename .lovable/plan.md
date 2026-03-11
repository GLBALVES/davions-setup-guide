

# Creative Studio + Social Media Settings

## Overview

Replicate the full "Criativo" (Creative) feature from Anglo Medicine into this project, translated to English, adapted to this project's layout (DashboardSidebar + DashboardHeader pattern). Also add a Social Media API configuration section in Settings.

---

## What Gets Built

### 1. Creative Studio Page (`/dashboard/creative`)
A full social media creative editor with AI-powered content generation. Two-panel layout: left sidebar with tabs, right canvas area.

**Left Panel Tabs:**
- **AI** -- Configure format, platforms, tone; generate text & background images via AI; solid/gradient backgrounds with favorites
- **Themes** -- AI-generated content theme suggestions by niche
- **Posts** -- List of saved creatives (draft/scheduled/published) with edit, duplicate, delete, download
- **Templates** -- Save/load reusable canvas templates by category
- **Assets** -- Brand asset library (logos, images) uploadable and draggable to canvas

**Right Panel (Canvas):**
- Visual drag-and-drop canvas editor with text, icons, images, containers
- Multi-format support (Square 1080, Portrait 4:5, Story 9:16, Landscape, Twitter, Pinterest, Carousel)
- Slide management for carousels with sortable thumbnails
- Element toolbar (bold, italic, align, color, font, size, layers, delete)
- Export to PNG via html2canvas
- Footer template system (reusable footer overlays with icons and text)
- Snap-to-grid alignment guides
- Zoom controls
- Publish to social media modal (Facebook/Instagram via API)

**Caption Panel** (below canvas):
- Generated caption with title, subtitle, CTA, hashtags
- Copy caption button

### 2. Social Media API Config (in Settings page, new tab)
A dedicated section to configure Facebook and Instagram API credentials for direct publishing:
- Platform cards (Facebook, Instagram) with fields: App ID, App Secret, Page Access Token, Page/Account ID
- Active toggle per platform
- Save & Test Connection buttons
- Prerequisites guide (Meta for Developers link, required permissions)

### 3. Edge Functions
- **`generate-creative`** -- Handles 4 AI operations: text generation, image generation, theme suggestions, gradient suggestions. Uses Lovable AI gateway.
- **`publish-social`** -- Handles testing connections and publishing images to Facebook/Instagram Graph API.

---

## Database Tables Required (4 new tables)

### `mkt_social_posts`
Stores saved creatives.
```
id, photographer_id, name, platform, post_type, caption, hashtags[], media_urls (jsonb), status, created_at
```

### `creative_templates`
Stores reusable canvas templates and footer templates.
```
id, photographer_id, name, category, format, background_config (jsonb), elements (jsonb), footer_config (jsonb), created_at, updated_at
```

### `creative_images`
Image bank for AI-generated and uploaded images.
```
id, photographer_id, file_url, name, is_favorite, created_at
```

### `social_api_connections`
API credentials for social platforms.
```
id, photographer_id, platform, credentials (jsonb), is_active, created_at
```

All tables get RLS: `photographer_id = auth.uid()` for ALL operations.

### Storage
Use existing `session-covers` bucket (or create `creative-assets` bucket) for uploaded images.

---

## Files to Create

| File | Description |
|---|---|
| `src/components/dashboard/creative/creative-types.ts` | Type definitions, format dimensions, font list, platform configs |
| `src/components/dashboard/creative/CreativeAIPanel.tsx` | AI configuration panel (format, platform, tone, text/image generation, backgrounds) |
| `src/components/dashboard/creative/CreativeCanvas.tsx` | Main canvas editor with drag, resize, text editing, export |
| `src/components/dashboard/creative/CreativeThemeGenerator.tsx` | AI theme suggestion component |
| `src/components/dashboard/creative/CreativePostsList.tsx` | Saved posts list with CRUD |
| `src/components/dashboard/creative/CreativeTemplateList.tsx` | Template save/load manager |
| `src/components/dashboard/creative/CreativeImageBank.tsx` | Image bank dialog |
| `src/components/dashboard/creative/IconLibrary.tsx` | Lucide icon picker for canvas |
| `src/components/dashboard/creative/FooterTemplateEditor.tsx` | Footer template list and apply |
| `src/components/dashboard/creative/FooterEditorModal.tsx` | Interactive footer builder modal |
| `src/components/dashboard/creative/footer-constants.ts` | Footer icon definitions, presets, config types |
| `src/components/dashboard/creative/BrandAssetsLibrary.tsx` | Brand asset upload/library |
| `src/components/dashboard/creative/UnsavedChangesModal.tsx` | Unsaved changes warning |
| `src/components/dashboard/creative/PublishSocialModal.tsx` | Publish to social media modal |
| `src/pages/dashboard/CreativeStudio.tsx` | Main page orchestrating all components |
| `supabase/functions/generate-creative/index.ts` | AI edge function |
| `supabase/functions/publish-social/index.ts` | Social publishing edge function |

## Files to Edit

| File | Change |
|---|---|
| `src/App.tsx` | Add route `/dashboard/creative` |
| `src/components/dashboard/DashboardSidebar.tsx` | Add "Creative Studio" under Marketing group; update Social Media link |
| `src/pages/dashboard/Settings.tsx` | Add "Social Media" tab with API configuration UI |

---

## Key Adaptations from Anglo Medicine

1. **Language**: All UI text translated to English
2. **Layout**: Uses `SidebarProvider + DashboardSidebar + DashboardHeader` pattern instead of `AdminLayout`
3. **Auth**: Uses `useAuth()` from this project's context, `photographer_id` instead of `created_by`
4. **Storage bucket**: Uses `session-covers` (existing) for image uploads
5. **Icon categories**: Adapted from health-focused to photography-focused (Photography, Social, Business, General)
6. **Footer presets**: Translated ("Follow us on social media", "Share with friends", etc.)
7. **Dependencies**: Requires `html2canvas` package for canvas export

---

## Implementation Order

1. Database migration (4 tables + RLS)
2. Edge functions (`generate-creative`, `publish-social`)
3. Type definitions and constants
4. Core components (Canvas, AI Panel, smaller components)
5. Main page (`CreativeStudio.tsx`)
6. Social Media config in Settings
7. Routing and sidebar navigation updates

