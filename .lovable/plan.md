
## Plan: Payouts Section on Billing Page

### What already exists
The `get-stripe-balance` edge function already fetches the last 5 payouts from Stripe Connect (`stripe.payouts.list`) and returns them as `payouts: payouts.data` alongside the balance. The data is never used in the UI — it's returned but discarded.

Each Stripe payout object includes:
- `id`, `amount`, `currency`, `arrival_date` (Unix timestamp), `status` (`paid`, `pending`, `in_transit`, `canceled`, `failed`), `destination` (bank account ID), `description`, `bank_account` object with `bank_name` and `last4`

### Changes needed

**1. `src/pages/dashboard/Billing.tsx`**
- Add `Payout` interface with fields: `id`, `amount`, `currency`, `arrival_date`, `status`, `description`, `bank_name`, `last4`
- Add `payouts` state + `loadingPayouts` state
- In `fetchAll`, extract `balanceRes.data?.payouts` and store them
- Add a new **Payouts** section between "Payment Account Balance" and "Billing History", showing a table with 4 columns:
  - **Date** — `arrival_date` formatted
  - **Amount** — formatted currency
  - **Status** — colored badge (`paid` = green dot, `in_transit` = amber dot, `pending` = gray dot, `failed` / `canceled` = red dot)
  - **Destination** — bank name + `••••XXXX` masked last4 (e.g. "Chase ••••4242"). If no bank info, show "—"
- Empty state: "No payouts yet." when array is empty
- Hidden entirely when no Stripe account connected (same guard as balance section)

No backend changes needed — data is already returned by the existing edge function.

### Visual design
Consistent with existing table style (same border, grid, font-light, muted colors as Billing History). Status badge uses a small colored dot + label text, matching the booking list pattern.

```text
┌─────────────────────────────────────────────────────────────┐
│  ——  Recent Payouts                                         │
├────────────────┬──────────┬───────────────┬─────────────────┤
│  Date          │  Amount  │  Status       │  Destination    │
├────────────────┼──────────┼───────────────┼─────────────────┤
│  Mar 10, 2026  │ $271.88  │ ● Paid        │  Chase ••••4242 │
│  Feb 28, 2026  │ $198.00  │ ● In Transit  │  Chase ••••4242 │
└────────────────┴──────────┴───────────────┴─────────────────┘
```
