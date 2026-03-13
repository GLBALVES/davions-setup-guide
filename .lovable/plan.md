
## Gallery Renewal Flow — Expired Gallery Purchase

### Current state
- `GalleryView.tsx` detects `isExpired` and shows a static "expired" screen with no action
- `gallery_settings` table already stores `reactivation_fee` (amount in dollars) and `default_expiry_days` (how many days to extend) per photographer
- `create-gallery-checkout` edge function handles Stripe Connect payments — needs a parallel edge function for reactivation
- After successful payment, `expires_at` must be extended on the gallery

### What to build

**1. New edge function: `reactivate-gallery`**
- Accepts: `galleryId`, `clientEmail`, `clientName`
- Reads `reactivation_fee` and `default_expiry_days` from `gallery_settings` for the gallery's photographer
- If fee = 0 or null → extends for free (just updates `expires_at`)
- If fee > 0 → creates Stripe Checkout session via photographer's Connect account with application fee split
- On success URL (`?reactivated=true`) → updates `expires_at = now() + default_expiry_days` (handled by a second lightweight function or webhook-free: uses a verify step)

**2. New edge function: `confirm-gallery-reactivation`**
- Called from frontend after Stripe redirects back with `?reactivated=true&session_id=xxx`
- Verifies Stripe checkout session status = `complete`
- Updates `galleries.expires_at = now() + default_expiry_days`
- No webhook needed — pull-based verification pattern consistent with rest of the app

**3. Updated `GalleryView.tsx` — expired screen**
- Fetch `reactivation_fee` and `default_expiry_days` from `gallery_settings` for this gallery's photographer
- Show renewal CTA with price and extension period
- Collect client name + email in a simple form
- Handle free reactivation (no Stripe, directly calls confirm function)
- Handle paid reactivation (redirects to Stripe Checkout)
- On return with `?reactivated=true`, auto-call confirm function → reload gallery

**4. Personalize page — add `reactivation_extension_days` setting** (separate from `default_expiry_days`)
- The extension duration on renewal should be configurable independently
- Re-use `default_expiry_days` as the extension period (no new field needed — consistent and sensible default: same period as initial expiry)

### Data flow

```text
Client lands on /gallery/[slug] (expired)
  ↓
GalleryView fetches reactivation_fee + default_expiry_days from gallery_settings
  ↓
Shows: "This gallery expired on [date]. Renew access for $X for [N] days."
  ↓
[Free] → calls confirm-gallery-reactivation → updates expires_at → reloads
[Paid] → calls reactivate-gallery → Stripe Checkout (Connect) → success_url?reactivated=true
  ↓
On ?reactivated=true → calls confirm-gallery-reactivation → updates expires_at → reloads
```

### Files to change
- `supabase/functions/reactivate-gallery/index.ts` — New: creates Stripe checkout for renewal
- `supabase/functions/confirm-gallery-reactivation/index.ts` — New: verifies payment + extends expires_at
- `src/pages/gallery/GalleryView.tsx` — Update expired screen with renewal UI
- `supabase/config.toml` — Add `verify_jwt = false` for both new functions
