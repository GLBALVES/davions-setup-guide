
## Plan: Add-ons as a dedicated third step in the booking flow

**Current flow**: Step 1 (slots + add-ons shown after slot pick) → Step 2 (form + pay)
**New flow**: Step 1 (slots) → Step 2 (client details form) → Step 3 (add-ons + order summary + pay)

### Changes to `src/pages/store/SessionDetailPage.tsx`

**1. Extend `BookingStep` type** (line 80):
```tsx
// From:
type BookingStep = "slots" | "form";
// To:
type BookingStep = "slots" | "form" | "addons";
```

**2. Remove the extras card from step 1** (lines 585–643) — delete it entirely from the `step === "slots"` block.

**3. In step 2 ("form")**: Keep only the slot summary + client name/email fields. Change the "Pay" button to a "Continue →" button that advances to `"addons"` instead of calling `handleCheckout`. Add a Back button to go back to `"slots"`.

**4. Add new step 3 ("addons")** — a new card rendered when `step === "addons"`:
- Slot summary box (same as in step 2)
- Client details summary (name + email, read-only — show it so the user sees context)
- Add-ons section (same UI as current extras card, only shown if `extras.length > 0`)
- Order summary box (same as current)
- Back button → `setStep("form")`, Pay button → `handleCheckout`

**Hero subtitle** should reflect the current step:
- Step 1: "Please select a date and time"
- Step 2: "Enter your details"
- Step 3: "Customize your session" (or "Review & pay")

This is clean, no DB changes, no new dependencies.
