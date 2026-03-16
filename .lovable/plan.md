
## Understanding the Problem

The Stripe Checkout left panel shows product details from the `line_items` passed. In the screenshot, the deposit case shows only `"Business Session — Deposit"` and `R$ 150,00` — very sparse.

The Stripe Checkout left panel can show:
1. **Multiple line items** — each with a name and optional description
2. **`product_data.description`** — shown below the product name in the left panel
3. **`custom_text.submit.message`** — text shown above the Pay button (markdown supported)
4. **`custom_text.after_submit.message`** — text shown below the Pay button

## What We Can Improve

### For the DEPOSIT flow (currently shows nothing useful):
The deposit case currently creates 1 line item with no description. We can:
- Add `product_data.description` to the deposit line item with the full breakdown: full session value, extras, tax, and balance remaining
- Add informational line items for each component as `R$0` is not allowed, but we can add descriptive text in the description field
- Use `custom_text.submit.message` to show: *"After your session, the remaining balance of R$ X will be due before delivery."*

### For the FULL PAYMENT flow:
Already has multiple line items. We can enrich each with descriptions.

## Plan

**File: `supabase/functions/create-session-checkout/index.ts`**

Changes to the deposit branch:
1. Keep the deposit line item
2. Add detailed `product_data.description` to the deposit item with full breakdown:
   - Session: R$ X,XX
   - Extras (if any): R$ X,XX  
   - Tax (if any): R$ X,XX
   - **Total session value: R$ X,XX**
   - **Paid today (deposit): R$ X,XX**
   - **Remaining balance: R$ X,XX**
3. Add `custom_text.submit.message` in markdown showing the remaining balance clearly
4. Add `custom_text.after_submit.message` with a note like: "The remaining balance will be collected after your session."

Changes to the full payment branch:
1. Add `product_data.description` to the session line item (e.g., duration, location if available)
2. Enrich extras with quantity info in description

**Technical note:** The `product_data.description` field is natively displayed in the Stripe Checkout left panel below each item name. The `custom_text` fields are displayed near the submit button. This is all native Stripe Checkout functionality — no webhook changes needed.

We also need to fetch `duration_minutes` and `location` from sessions to show more session context. The session query will be updated to include those fields.

## Changes Summary

Single file: `supabase/functions/create-session-checkout/index.ts`
- Update session query to also fetch `duration_minutes`, `location`
- Enhance deposit line item with full financial breakdown in `product_data.description`
- Add `custom_text.submit.message` for deposit showing remaining balance (markdown bold)
- Enhance full-payment session line item with session details in description
- All changes are non-breaking and backward compatible
