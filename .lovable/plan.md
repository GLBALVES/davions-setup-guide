
## Overview

Add **Step 3 — Payment** to the existing 2-step wizard. This step handles Stripe payment settings for the session: right now the price is already saved in Step 1, so Step 3 should show a **payment summary / confirmation** and allow the photographer to configure whether to require payment upfront (immediate checkout via Stripe) or allow free booking.

Looking at the codebase:
- Price is already stored on the `sessions` table (in cents)
- The checkout flow exists in `supabase/functions/create-session-checkout/index.ts`
- The `sessions` table doesn't have a "require payment" toggle — it's always paid
- The wizard currently has steps 1 and 2 with a step indicator

## What Step 3 should contain

Based on the existing implementation:
- **Payment method toggle**: "Require payment at booking" (Stripe Checkout) vs "Free / pay later" — stored as a new column or using `price = 0` as the indicator
- **Payment summary**: show session title + price as configured in Step 1
- **Stripe info**: informational note about how Stripe processes the payment
- **Final button**: "Publish & Finish" → calls `handleSaveAvailability` (which is currently the Step 2 final action) and navigates away

Since we don't need a new DB column (price = 0 already implies free), the step is primarily UI with a "require payment" toggle that sets price to 0 if disabled.

## Changes to `src/pages/dashboard/SessionForm.tsx`

### 1. Step state: `1 | 2 | 3`
```ts
const [step, setStep] = useState<1 | 2 | 3>(1);
```

### 2. Move `handleSaveAvailability` to advance to step 3
- Step 2 button: **"Save & Continue →"** → saves availability/config, advances to `step 3`
- Step 3 button: **"Save & Finish"** → navigates to `/dashboard/sessions`

### 3. New `handleFinish` function (Step 3)
- Optionally update the session price if the "require payment" toggle was changed
- Navigate to `/dashboard/sessions`
- Show success toast

### 4. Step indicator: add Step 3 circle
- Only clickable if `sessionId` exists (same rule as step 2)

### 5. Step 3 UI content
```text
┌─ Payment ──────────────────────────────────┐
│                                            │
│  Session: "Newborn Session"                │
│  Price: $250.00                            │
│                                            │
│  [toggle] Require payment at booking       │
│  Clients will be redirected to Stripe      │
│  Checkout to pay when booking.             │
│                                            │
│  [info box] Stripe is connected            │
└────────────────────────────────────────────┘

[← Back]                [Save & Finish]
```

The toggle controls a local `requirePayment` boolean state. When `false`, sets price to 0 on final save. When `true`, keeps the price from Step 1.

### 6. `handleSaveAvailability` refactored
- Saves slots + global config as before
- Instead of navigating away → calls `setStep(3)`

### 7. `handleFinish` (new)
- If `requirePayment` is `false` and original price > 0 → updates session price to 0
- If `requirePayment` is `true` and price is 0 → restores the price from the Step 1 field
- Navigates to `/dashboard/sessions`

## Files changed

| File | Change |
|---|---|
| `src/pages/dashboard/SessionForm.tsx` | Add step 3, update step indicator, split availability save from final navigation, add payment step UI and toggle |

No DB migration needed — price column already exists.
