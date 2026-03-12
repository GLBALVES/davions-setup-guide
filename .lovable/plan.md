
## Context

The user wants a **white-label payment onboarding** — meaning photographers should never see the word "Stripe" anywhere in the dashboard UI. This is purely a **copy/branding change** across the frontend. The underlying technology remains Stripe Connect, but all UI-facing text should use neutral terminology like "Payments", "Payment Account", or "Connect your bank account".

---

## All places where "Stripe" brand is exposed

| Location | Text | Fix |
|---|---|---|
| `Settings.tsx` L47 | Toast: `"Stripe connected!"` | → `"Payments connected!"` |
| `Settings.tsx` L49 | Toast: `"Stripe connection failed"` | → `"Payment connection failed"` |
| `Settings.tsx` L305 | Toast: `"Stripe disconnected"` | → `"Payments disconnected"` |
| `Settings.tsx` L416 | Label: `"Stripe Account"` | → `"Payment Account"` |
| `Settings.tsx` L429 | Body text mentioning `"Stripe account"` | → `"payment account"` |
| `Settings.tsx` L445 | Button: `"Disconnect Stripe"` | → `"Disconnect"` |
| `Settings.tsx` L458 | Body text `"Stripe to authorize"` | → `"your payment provider"` |
| `Settings.tsx` L466 | How-it-works step 2: `"Log in to (or create) your Stripe account"` | → `"Log in or create your payment account"` |
| `Settings.tsx` L487 | Button: `"Connect with Stripe"` | → `"Connect payment account"` |
| `GalleryView.tsx` L1254 | Public footer: `"Secure payment via Stripe"` | → `"Secure payment"` |

---

## What will be changed

**`src/pages/dashboard/Settings.tsx`** — Payments tab:
- All toast messages: replace "Stripe" with "Payment account" / "Payments"
- Label "Stripe Account" → "Payment Account"
- Button labels: "Connect with Stripe" → "Connect payment account", "Disconnect Stripe" → "Disconnect"
- Explanatory copy: remove all Stripe brand references, use neutral language

**`src/pages/gallery/GalleryView.tsx`** — Public gallery checkout dialog:
- Remove `"Secure payment via Stripe"` → keep `"Secure payment"` (or remove entirely)

---

## What stays untouched
- All internal variable names (`stripeAccountId`, `handleConnectStripe`, etc.) — code-only, never shown to users
- Edge function names and logic — invisible to photographers
- The actual Stripe OAuth redirect (that page is owned by Stripe, no control over it — but once the photographer completes it and is redirected back, they only see the app's UI)

## Files to edit
```
EDIT  src/pages/dashboard/Settings.tsx      (Payments tab copy — ~10 text changes)
EDIT  src/pages/gallery/GalleryView.tsx     (1 line removal in gallery checkout)
```
