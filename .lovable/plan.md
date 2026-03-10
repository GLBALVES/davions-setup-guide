
## Understanding the feature

The user wants to add a **purchase flow** to the Proof Gallery public view (`GalleryView.tsx`). The concept:
- Client browses the proof gallery and marks photos as favorites (already works)
- The "favorites" ARE the selection of photos to buy — no separate concept needed
- After favoriting, the client should see a **"Purchase my selection"** CTA/summary bar
- Since the favorites in `photo_favorites` table are what the photographer sees on the dashboard as "favorited", completing the purchase simply **confirms** those favorites as the final selection

The flow needs:
1. A sticky bottom bar in the proof gallery showing `{N} photos selected · Purchase`
2. A checkout modal/sheet where the client:
   - Sees the list of selected (favorited) photos
   - Enters their name + email
   - Proceeds to Stripe checkout
3. A new edge function `create-gallery-checkout` that creates a Stripe payment session for the photo selection
4. After payment, the favorites remain as-is in `photo_favorites` — the photographer already sees them as the purchased selection

## Pricing model
The photographer already has `session_photo_tiers` (price per photo by quantity range) linked to sessions. However, the gallery is linked to a booking which is linked to a session — but this might not always be the case. To keep it simple for now, the gallery needs a way to define a **per-photo price** or **flat price for the selection**. 

Looking at the schema: `galleries` table doesn't have a price per photo field. `session_photo_tiers` exists on sessions. The gallery has `booking_id` → booking has `session_id` → session has `session_photo_tiers`.

The cleanest approach given the current schema: the photographer sets a price per extra photo on the session via `session_photo_tiers`. But galleries may not always be linked to a booking/session.

**Simplest viable approach**: Add a `price_per_photo` field to the `galleries` table. The photographer sets the price on the gallery directly. When the client checks out, the total = `favorites.count × price_per_photo`.

## What needs to be built

### 1. Database migration
- Add `price_per_photo integer DEFAULT 0` column to `galleries` table (in cents, same as rest of the app)

### 2. Dashboard — Gallery Detail (`GalleryDetail.tsx`)
- Add a "Price per photo" input field in the gallery settings panel (alongside access code, expiry, etc.)
- Save `price_per_photo` when saving gallery settings

### 3. New edge function: `create-gallery-checkout`
- Receives: `galleryId`, `clientEmail`, `clientName`, `clientToken`, `photoCount`
- Looks up gallery `price_per_photo`
- Creates Stripe Checkout session with `price_per_photo × photoCount`
- On success redirect: `/gallery/{slug}?purchased=true`
- Metadata: `gallery_id`, `client_token`

### 4. Public Gallery View (`GalleryView.tsx`) — PROOF GALLERY ONLY
- **Sticky bottom purchase bar** (only visible when `gallery.category === "proof"` AND `favorites.size > 0`):
  - Shows: `{N} photo(s) selected`
  - Shows price if `price_per_photo > 0`: `Total: R$ X,XX`
  - CTA button: `Purchase Selection`
- **Purchase modal** (`Dialog`):
  - Photo count + total price summary
  - Input: Client Name (text)
  - Input: Client Email (email)
  - CTA: `Proceed to Checkout` → calls `create-gallery-checkout` edge function → redirects to Stripe
  - If `price_per_photo === 0`: button text becomes `Submit Selection` (free gallery, no payment — just confirm)
- Translate lightbox favorite buttons from Portuguese (`"Favoritar"/"Favorita"`) to English (`"Save"/"Saved"`)

### 5. Free gallery (price_per_photo = 0)
- If the gallery has no price set, the "Purchase" bar becomes a "Submit Selection" flow — no Stripe, just a confirmation that the client's selection has been received (the favorites are already saved in DB)

## Files to change
1. **DB migration** — new `price_per_photo` column on `galleries`
2. `src/pages/gallery/GalleryView.tsx` — sticky purchase bar + purchase modal + fix Portuguese strings
3. `src/pages/dashboard/GalleryDetail.tsx` — add price_per_photo field in settings
4. `supabase/functions/create-gallery-checkout/index.ts` — new edge function
5. `supabase/config.toml` — register new function

## UI sketch for the sticky bar
```text
┌────────────────────────────────────────────┐
│  ♡ 5 photos selected          R$ 250,00   │
│  [         Purchase Selection            ] │
└────────────────────────────────────────────┘
```
Fixed at bottom, appears/disappears based on `favorites.size > 0`.

## Purchase modal sketch
```text
┌────────────────────────────────┐
│  Your Selection                │
│  ─────────────────────────────│
│  5 photos × R$ 50 = R$ 250    │
│                                │
│  Name  [___________________]   │
│  Email [___________________]   │
│                                │
│  [ Proceed to Checkout ]       │
└────────────────────────────────┘
```

No new tables needed — `photo_favorites` already stores the selection tied to `client_token`.
