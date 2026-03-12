
## Current State Analysis

The platform currently uses a **single global Stripe secret key** stored as a server-side secret (`STRIPE_SECRET_KEY`). This means ALL photographers' payments go through ONE Stripe account — the platform owner's. There is no per-photographer Stripe configuration.

The `photographers` table has no Stripe-related columns. The `create-session-checkout` and `create-gallery-checkout` edge functions use the global key directly.

## What Needs to Be Built

The photographer needs to configure their OWN Stripe account so they receive payments directly. The best approach for a multi-photographer SaaS is **Stripe Connect**, but that requires platform-level setup. A simpler and more practical approach — given this is a tool photographers configure themselves — is to let each photographer paste their own **Stripe Secret Key** (restricted key, for server-side) and **Publishable Key** (for client-side), stored securely per photographer.

### Architecture Decision: Per-Photographer Keys

Store `stripe_secret_key` and `stripe_publishable_key` encrypted in the `photographers` table. Edge functions retrieve the photographer's own keys at checkout time instead of using the global key.

---

## Plan

### 1. Database — add columns to `photographers`

```text
ALTER TABLE photographers 
  ADD COLUMN stripe_secret_key   text,
  ADD COLUMN stripe_publishable_key text;
```

RLS: only the photographer can read/write their own row (already enforced).

### 2. Settings UI — new "Payments" tab in Settings page

Add a **Payments** tab alongside Profile, with:

```text
┌─────────────────────────────────────────────────────────┐
│ PAYMENTS                                                 │
├─────────────────────────────────────────────────────────┤
│  Connect your Stripe account to receive payments        │
│  directly from your clients.                            │
│                                                         │
│  Stripe Secret Key (sk_live_... or sk_test_...)        │
│  [••••••••••••••••••••••••]  [Show]  [Save]            │
│                                                         │
│  Stripe Publishable Key (pk_live_... or pk_test_...)   │
│  [••••••••••••••••••••••••]  [Show]  [Save]            │
│                                                         │
│  ⓘ Where to find these keys →                          │
│    stripe.com/dashboard → Developers → API keys        │
│                                                         │
│  ✓ Connected (shows green badge when keys are saved)   │
└─────────────────────────────────────────────────────────┘
```

- Keys stored via masked input (type=password by default, toggle to show)
- On save, validate by making a lightweight test call (`stripe.accounts.retrieve()`)
- Show connection status badge: "Connected" (green) or "Not configured" (muted)

### 3. Edge Functions — use photographer's own key

Update `create-session-checkout` and `create-gallery-checkout` to:
1. Fetch `sessions.photographer_id` → look up `photographers.stripe_secret_key`
2. Use that key to initialize Stripe instead of the global `STRIPE_SECRET_KEY`
3. Fallback: if photographer has no key configured, return a clear error so the UI can prompt them to set it up

### 4. Session Form — gate payment features

In the Payment step of SessionForm, if the photographer hasn't configured Stripe yet:
- Show a warning banner: "Configure your Stripe account in Settings → Payments to accept payments"
- Disable the "Require payment" toggle with a tooltip

### Files to edit/create

| File | Action |
|------|--------|
| `supabase/migrations/...` | Add `stripe_secret_key`, `stripe_publishable_key` to `photographers` |
| `src/pages/dashboard/Settings.tsx` | Add Payments tab with key input + save + status |
| `supabase/functions/create-session-checkout/index.ts` | Use photographer's own key |
| `supabase/functions/create-gallery-checkout/index.ts` | Use photographer's own key |
| `src/pages/dashboard/SessionForm.tsx` | Add Stripe not-configured warning on payment step |
