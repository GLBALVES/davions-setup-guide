
## Root Cause

In `SessionForm.tsx`, the "Quantity" field of each extra (stored as `session_extras.quantity`, default = 1) is used as the hard `maxQty` cap in the booking page — `maxQty: extra.quantity` (line 247 of `SessionDetailPage.tsx`). Since the default is 1, the `+` button on the stepper is immediately disabled after the first selection.

## Two-Part Fix

### 1 · `SessionForm.tsx` — rename "Quantity" label to "Max Qty" + add hint

Change the label on line 1693 from `Quantity` → `Max Qty` and add a small helper text below the input so photographers understand this is the upper limit the client can select per booking. Also raise the default for new extras from `"1"` → `"10"` so it's a more useful default out of the box.

### 2 · `SessionDetailPage.tsx` — always show the stepper + make fallback max sensible

Currently the +/− stepper is hidden until the extra is selected (which is correct). But `maxQty` is taken verbatim from `extra.quantity`. Two small changes:

- In `toggleExtra` (line 247), add a fallback so `maxQty` is at least 10 if the stored quantity is 1 (guards against old records where quantity was never intended as a cap):
  ```ts
  maxQty: extra.quantity > 1 ? extra.quantity : 10
  ```
  Actually, better to just keep it as-is but fix the label in the form so photographers consciously set it. Keep the existing cap logic but remove the `"max {extra.quantity}"` display text that exposes the internal limit in a confusing way.

Wait — re-reading the user message: "a quantidade está fixa" — the client CAN'T change it at all. This is because `extra.quantity` defaults to `1`, so `maxQty = 1`, and `disabled={sel.qty >= sel.maxQty}` is immediately `true` (1 >= 1). The client sees only `1` and can't press `+`.

### Definitive Plan

**`SessionDetailPage.tsx`** — 1 line change (line 247):
```ts
// Before:
maxQty: extra.quantity
// After:
maxQty: extra.quantity > 1 ? extra.quantity : 99
```
This makes "quantity=1" (the default) mean "no effective cap" (up to 99), while quantities > 1 set by the photographer work as an explicit cap.

Also remove the `· max {extra.quantity}` text from the booking UI (line 748-750) since surfacing the raw DB number is confusing. Replace with the price-per-unit only.

**`SessionForm.tsx`** — rename the label + update hint text:
- Line 1693: Label `Quantity` → `Max per booking`
- Add a tiny helper under the input: `"Max qty a client can select. Leave at 1 for unlimited-style (up to 99)."`

### Files Changed
- `src/pages/store/SessionDetailPage.tsx` (lines 247, 748–750)  
- `src/pages/dashboard/SessionForm.tsx` (line 1693, add helper text)
