
## Bug: Deposit calculation ignores `deposit_type`

### Root Cause

The bug lives in **two places**:

**1. `SessionDetailPage.tsx` — `chargeAmount` calculation (line 271–273)**

```ts
// WRONG — treats deposit_amount as fixed cents regardless of deposit_type
const chargeAmount = session?.deposit_enabled
  ? session.deposit_amount + extrasTotal + taxAmount
  : total;
```

When `deposit_type = 'percent'`, `deposit_amount` is stored as a percentage integer (e.g. `20` = 20%), not a cent amount. The code uses it directly as cents, producing a wildly wrong number.

**2. `supabase/functions/create-session-checkout/index.ts` — Stripe line item (lines 41, 82–93)**

Same problem: `deposit_type` is never fetched from the DB, and `depositBase = sessionData.deposit_amount` is used as-is as a Stripe `unit_amount` (cents), even when it's a percentage.

---

### Fix

#### `SessionDetailPage.tsx`

1. Add `deposit_type: string` to the `SessionDetail` interface.
2. Compute the actual deposit amount in cents before using it:
```ts
const depositAmountCents = session.deposit_type === 'percent'
  ? Math.round(subtotal * (session.deposit_amount / 100))
  : session.deposit_amount;

const chargeAmount = session?.deposit_enabled
  ? depositAmountCents + extrasTotal + taxAmount
  : total;
```

#### `supabase/functions/create-session-checkout/index.ts`

1. Add `deposit_type` to the `.select()` on line 41.
2. Compute the actual deposit cents before building the Stripe line item:
```ts
const depositBase = sessionData.deposit_type === 'percent'
  ? Math.round(subtotal * (sessionData.deposit_amount / 100))
  : (sessionData.deposit_amount as number);
```

### Files Changed
- `src/pages/store/SessionDetailPage.tsx` (interface + chargeAmount lines 40–44, 271–273)
- `supabase/functions/create-session-checkout/index.ts` (select + depositBase lines 41, 82)
