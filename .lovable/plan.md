
## Problem

Both "Save" buttons in the Galleries tab — **Default Expiration** and **Reactivation Fee** — share a single state variable `savingGallerySettings`. When either button is clicked, both become disabled and show "Saving…".

## Solution

Split the single `savingGallerySettings` into two independent states and two independent save handlers:

- `savingExpiry` + `handleSaveExpiry` — saves only `default_expiry_days`
- `savingFee` + `handleSaveReactivationFee` — saves only `reactivation_fee`

Each button only reacts to its own state, so they operate independently.

## File to modify

**`src/pages/dashboard/Personalize.tsx`**

1. Replace `savingGallerySettings` with `savingExpiry` and `savingFee`
2. Split `handleSaveGallerySettings` into two handlers
3. Wire each button to its own handler and state
