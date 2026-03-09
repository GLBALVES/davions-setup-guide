
## New step: Review screen before checkout

### What the image shows
The reference image is a 2-column layout used as a **review/confirmation step** before the payment:
- **Left column (main):** client info summary at the top, then the full **contract document** (long scrollable text) with an "I agree" checkbox + signature-style field at the bottom, and a "Continue" button.
- **Right column (floating sidebar):** booking summary card — photographer photo, session name, date/time, add-ons, pricing breakdown (subtotal, tax, total, due today).

### Current flow (3 steps)
```
slots → form → addons (pay)
```

### New flow (4 steps)
```
slots → form → addons → review (new)
```

The new `review` step appears **between addons and checkout**. It shows:
1. The contract (if the session has one) — scrollable, with an "I agree" checkbox required to unlock the pay button
2. If no contract — just a clean confirmation summary
3. A **floating right sidebar** with the order summary (slot, client, pricing, due today)

### Layout change
The `review` step will break out of the current single-column `max-w-2xl` wrapper and use a **2-column layout**:
- Left: `flex-1` — contract + client summary
- Right: `w-72` sticky — order summary card

On mobile: right column collapses to below the contract.

### Data change needed
Add `contract_text` (nullable text) column to the `sessions` table via migration. No UI to edit it yet (user said "we'll configure that later") — just the read/display side.

### Files to change
1. **Migration** — add `contract_text text` nullable to `sessions`
2. **`src/pages/store/SessionDetailPage.tsx`**:
   - Add `contract_text` to `SessionDetail` interface and the select query
   - Add `review` to the `BookingStep` type: `"slots" | "form" | "addons" | "review"`
   - Change "Continue →" button in `addons` step to go to `"review"` instead of calling `handleCheckout`
   - Add `contractAgreed` boolean state
   - Add the full `review` step JSX:
     - 2-column wrapper (`flex flex-col lg:flex-row gap-6`) with a wider max width (`max-w-5xl`)
     - Left: client info summary block + contract block (if `contract_text` exists) with scrollable prose area + agree checkbox; or a plain "All set — review your order" confirmation if no contract
     - Right: sticky order summary card (slot, client name/email, session price, extras, tax, total, deposit callout)
     - Bottom buttons: Back + Pay button (disabled if contract exists and not agreed)
   - Hero subtitle: add `step === "review" && "Review & confirm"` case

### Key detail on the contract block
- The contract text renders in a scrollable `div` with `max-h-[60vh] overflow-y-auto` and a subtle inner shadow at bottom to indicate scrollability
- The "I agree" checkbox is outside the scroll area, below it
- The Pay button is disabled when `contract_text` is present and `!contractAgreed`

### No changes to checkout logic
`handleCheckout` remains identical — it's just now called from the `review` step button instead of the `addons` step button.
