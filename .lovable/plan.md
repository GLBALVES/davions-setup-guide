
## What's changing

In `SessionDetailPage.tsx`, the Review & Confirm step (line 940–950) has a fallback "else" block shown when the session has no contract. Currently it renders a generic "Everything looks good!" message. The user wants that replaced with:

1. **Client data summary** — a structured view of the client's filled-in info (name, email, phone, notes)
2. **Acceptance term checkbox** — a short "I confirm the above information is correct and agree to proceed with this booking" agreement

The contract flow (lines 904–939) stays intact — it already shows the contract HTML + "I have read and agree" checkbox.

---

## Changes to make

**`src/pages/store/SessionDetailPage.tsx`**

- Replace the "else" block (lines 940–950) with a card that shows:
  - Section header "Your information"
  - Grid with: Full Name, Email, Phone (if filled), Notes (if filled)
  - Acceptance checkbox: "I confirm the above information is correct and agree to proceed with this booking."
- Update the button's `disabled` condition (line 959): remove the `!!session.contract_text &&` guard so the button is also blocked until the checkbox is checked when there is no contract. Both paths will now require `contractAgreed = true` to proceed.

No database changes, no new files.
