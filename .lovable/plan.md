
## Root Cause Analysis

There are **3 distinct bugs** found:

### Bug 1 — Payment status never becomes `deposit_paid`
The webhook (`session-booking-webhook`) **always** sets `payment_status = "paid"` regardless of whether a deposit or a full payment was made. When a deposit checkout is completed, it should set `payment_status = "deposit_paid"` instead.

```typescript
// CURRENT (wrong) — always marks as "paid"
.update({ status: "confirmed", payment_status: "paid", ... })

// FIX — check if it was a deposit
const wasDeposit = session.metadata?.is_deposit === "true";
.update({ status: "confirmed", payment_status: wasDeposit ? "deposit_paid" : "paid", ... })
```

The checkout creation also needs to pass `is_deposit: "true"` in metadata when `deposit_enabled` is true.

### Bug 2 — `calcTotal` ignores extras and tax correctly, but the data model doesn't store `extras_total` on the booking
The Revenue page fetches `sessions.price` and recalculates total on the fly, but **extras chosen at booking time are never stored on the booking record**. So for a booking with $500 session + $100 extra + $200 extra, the page shows $540 (session $500 + 8% tax = $540) instead of $864 (session + extras + tax).

The booking doesn't have an `extras_total` column. We need to **store `extras_total` in the bookings table** when the checkout is created, and use it in calculations.

### Bug 3 — `deposit_type` mismatch: checkout uses `"percent"` but Revenue uses `"percentage"`
In `create-session-checkout`, the check is `sessionData.deposit_type === "percent"` but in the database schema and `Revenue.tsx` calcPaid function, it's compared against `"percentage"`. This could cause deposit amounts to be calculated as $0 for percentage deposits.

## Plan

### 1. Database migration
Add `extras_total` column (integer, default 0) to `bookings` table to store the extras amount at checkout time.

### 2. Fix `create-session-checkout` edge function
- Pass `is_deposit: "true"` in checkout session metadata when deposit is enabled
- Save `extras_total` to the booking record when creating checkout
- Fix `deposit_type` comparison: change `"percent"` → `"percentage"` to match the DB value

### 3. Fix `session-booking-webhook` edge function
- Read `session.metadata?.is_deposit` to determine if payment was a deposit
- Set `payment_status: "deposit_paid"` when deposit was paid, `"paid"` otherwise

### 4. Fix `Revenue.tsx` (and all shared finance pages)
- Add `extras_total` to `BookingRow` interface
- Fetch `extras_total` from bookings query
- Fix `calcTotal` to include extras: `base + extras_total + tax`
- Fix `calcPaid` deposit calculation for `"percentage"` type: apply deposit % against the **full total** (session + extras + tax), consistent with the checkout

This same fix needs to be applied to `FinanceDashboard.tsx`, `FinanceCashFlow.tsx`, `FinanceReceivables.tsx`, and `FinanceReports.tsx` since they all share the same `BookingRow` + `calcTotal`/`calcPaid` pattern.

### Files to change
```
supabase/migrations/         → add extras_total to bookings
supabase/functions/create-session-checkout/index.ts  → fix is_deposit metadata + save extras_total + fix "percent" → "percentage"
supabase/functions/session-booking-webhook/index.ts  → use is_deposit metadata to set correct payment_status
src/pages/dashboard/Revenue.tsx              → include extras_total in total calc
src/pages/dashboard/FinanceDashboard.tsx     → same fix
src/pages/dashboard/FinanceCashFlow.tsx      → same fix
src/pages/dashboard/FinanceReceivables.tsx   → same fix
src/pages/dashboard/FinanceReports.tsx       → same fix
```
