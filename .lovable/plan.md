
## Favorites List for Lightroom Export

The user wants a feature identical to Alboom's "favorites export list" — a panel in the gallery detail that shows all photos favorited by the client, displaying their filenames in a format ready to copy-paste into Lightroom (Lightroom's Smart Collection or a text file used to filter/select photos by filename).

### How Alboom does it
Alboom shows a modal/panel with the list of favorited photo filenames, one per line (plain text), with a single "Copy all" button. The photographer pastes this list into Lightroom's search or uses it to manually select the photos for final editing.

### What already exists
- `photo_favorites` table: `photo_id`, `gallery_id`, `client_token` 
- `photos` table: `id`, `filename`, `storage_path`
- `GalleryDetail.tsx` already fetches `favorite_count` per photo (lines 335-344)
- The `fetchPhotos` function already has all the data needed: `photos` array with `filename` and `favorite_count`

### Plan

**Add a "Favorites" section** in `GalleryDetail.tsx` (in the sidebar/right panel area, below Client Access) that:

1. **Shows a count** of how many photos have at least 1 favorite
2. **Lists all favorited photo filenames**, one per line, in a `<textarea>` or styled box — exactly the filenames as they appear in Lightroom (e.g. `DSC_0042.jpg`)
3. **"Copy List" button** that copies all filenames to clipboard (newline-separated), with a check icon on success
4. **Empty state** when no photos have been favorited yet

The list is derived directly from the existing `photos` state array — filter by `favorite_count > 0`, sorted by `order_index`, extract `filename`. No new DB queries needed.

### Location in UI
Insert a new bordered section after the watermark section (or after photos grid), inside the right panel / same layout as the "Client Access" section. Specifically, add it between the photo grid and watermark section in the sidebar column.

Looking at the layout more carefully (lines 1135–1314), the page has:
- Upload zone
- Photo grid  
- Watermark section (proof only)
- Client Access section

The favorites list fits best as a new card **below the photo toolbar/grid** in the main column, or in a **dedicated "Favorites" card** in the sidebar. Given GalleryDetail has a two-column layout for the right side, it makes more sense as a panel section.

Let me check the layout structure.

### Files to edit
| File | Change |
|---|---|
| `src/pages/dashboard/GalleryDetail.tsx` | Add "Client Favorites" section with filename list + copy button |

### New section UI (after watermark, before client access)
```text
┌─ CLIENT FAVORITES ─────────────────────────────────┐
│ 3 photos favorited by client                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ DSC_0042.jpg                                    │ │
│ │ DSC_0087.jpg                                    │ │
│ │ DSC_0154.jpg                                    │ │
│ └─────────────────────────────────────────────────┘ │
│  [Copy for Lightroom]                               │
└─────────────────────────────────────────────────────┘
```

The list is plain text, one filename per line (without extension or with — as-is from the DB). Copying gives a newline-separated string.

### Implementation detail
- `favoritedPhotos = photos.filter(p => (p.favorite_count ?? 0) > 0)`
- `listText = favoritedPhotos.map(p => p.filename).join('\n')`
- Copy button uses `navigator.clipboard.writeText(listText)`
- State: `copiedFavorites` boolean for the check icon

This is a pure UI addition — no new queries, no DB migrations needed.
