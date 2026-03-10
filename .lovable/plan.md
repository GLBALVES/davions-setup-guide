
## Root Causes Identified

### 1. Lightbox doesn't open
The hover overlay div (lines 602–620) covers the entire card with `onClick={(e) => e.stopPropagation()`. Any click on the image area hits this overlay first and the event never reaches the parent `div`'s `onClick={() => setLightboxIndex(index)}`.

**Fix**: Remove `stopPropagation` from the overlay container. Only the Select/Remove button itself should stop propagation. The overlay should let clicks "fall through" to the card's open-lightbox handler.

### 2. Watermark not showing
The `watermarks` table RLS policy is `TO authenticated` only. Public gallery visitors are unauthenticated, so `supabase.from("watermarks").select(...)` returns zero rows. The state `watermark` stays `null` → nothing renders.

**Fix**: Add a public read RLS policy to the `watermarks` table:
```sql
CREATE POLICY "Public can read watermarks"
  ON public.watermarks FOR SELECT
  TO anon
  USING (true);
```

### 3. Secondary watermark visibility issue in grid
The hover overlay has `z-30`, and `WatermarkOverlay` uses `z-20`. When hovering, the dark overlay covers the watermark layer. Fix: raise watermark to `z-40` (above the hover overlay) in the card context.

## Implementation Plan

**Step 1 — DB migration**: Add anon SELECT policy on `watermarks` table so unauthenticated clients can read watermark settings.

**Step 2 — Fix lightbox click** (`GalleryView.tsx` lines ~602–620):
- Remove `onClick={(e) => e.stopPropagation()}` from the overlay container div
- The underlying card div already handles `onClick={() => setLightboxIndex(index)}`; clicks on the card body (not the button) should open the lightbox

**Step 3 — Fix watermark z-index** in grid cards:
- Change `WatermarkOverlay` `z-20` → `z-40` so it stays visible above the hover dark overlay (`z-30`) in thumbnail mode

```text
Card z-index stack (grid):
  z-10  rose tint overlay (selected state)
  z-20  → z-40  WatermarkOverlay  ← raise this
  z-30  hover CTA overlay
  z-30  checkmark badge (already z-30)
```

No changes to the lightbox watermark (already correct at `z-20` inside a standalone container).
