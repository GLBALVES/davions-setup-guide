
## Diagnóstico

The `session-booking-webhook` edge function has **never been called** — confirmed by logs showing zero invocations. The root cause is that the Stripe webhook endpoint is not registered to point to this function's URL. Additionally, `STRIPE_WEBHOOK_SECRET` is missing from project secrets (only `STRIPE_SECRET_KEY`, `STRIPE_CLIENT_ID`, and `STRIPE_PUBLISHABLE_KEY` exist).

The current flow breaks at step 3:
```text
1. Client fills form        → ✅ works
2. create-session-checkout  → ✅ called, returns Stripe URL
3. Stripe calls webhook     → ❌ no endpoint registered / no secret
4. Booking status updated   → ❌ never happens
```

All recent bookings (5 in the last 2 hours) remain `status: pending, payment_status: pending` despite checkouts being created.

## Fix Plan

**Two parts:**

### Part 1 — Register the webhook on Stripe (manual step, one-time)
The user must go to the Stripe Dashboard and register the webhook endpoint:
- URL: `https://pjcegphrngpedujeatrl.supabase.co/functions/v1/session-booking-webhook`
- Event: `checkout.session.completed`
- Copy the **Signing secret** (starts with `whsec_`) that Stripe generates

### Part 2 — Save the webhook secret + add a fallback sync in BookingSuccess
Two code changes:

1. **Add `STRIPE_WEBHOOK_SECRET` secret** via the `add_secret` tool once the user provides the `whsec_` value from Stripe.

2. **Add a client-side confirmation fallback** in `src/pages/BookingSuccess.tsx` — when the success page loads, call a new lightweight edge function `confirm-booking` that polls/verifies the Stripe Checkout session status directly (using `stripe.checkout.sessions.retrieve`) and confirms the booking if payment is complete. This makes confirmation **immediate and resilient** even if the webhook is delayed.

### New edge function: `confirm-booking`
```text
POST /confirm-booking
body: { bookingId, checkoutSessionId }

1. Retrieve checkout session from Stripe Connect account
2. If session.payment_status === "paid" → update booking to confirmed
3. Return { confirmed: boolean }
```

This edge function uses the Stripe API directly without needing a webhook secret, so it works **immediately** without waiting for webhook registration.

### BookingSuccess change
After loading the booking, if `status === "pending"` and `stripe_checkout_session_id` exists → call `confirm-booking` once → refresh booking state.

## Files to change
- `supabase/functions/confirm-booking/index.ts` — new edge function
- `src/pages/BookingSuccess.tsx` — call confirm-booking on load when status is pending
