
## Understanding the Full Scope

### What is a "Session"?
A Session is a **bookable photography product** that the photographer creates and lists on their public store page. Clients browse the store, pick a session type, choose a date/time from the photographer's available slots, and pay online.

### Data Model Needed

**New tables:**

1. `sessions` — the product itself
   - `id`, `photographer_id`, `title`, `description`, `price` (integer, cents), `duration_minutes`, `num_photos`, `location`, `cover_image_url`, `status` (active/draft), `created_at`, `updated_at`

2. `session_availability` — slots the photographer configures
   - `id`, `session_id`, `photographer_id`, `date`, `start_time`, `end_time`, `is_booked` (bool)

3. `bookings` — when a client books a slot
   - `id`, `session_id`, `availability_id`, `photographer_id`, `client_name`, `client_email`, `status` (pending/confirmed/cancelled), `payment_status`, `stripe_payment_intent_id`, `created_at`

**Storage:** New bucket `session-covers` for cover images.

### Architecture

```text
/dashboard/sessions          → List & manage sessions (photographer)
/dashboard/sessions/new      → Create session form
/dashboard/sessions/:id      → Edit session + manage availability slots
/store/:photographerSlug     → Public store (client-facing)
/store/:photographerSlug/:sessionId → Session detail + booking calendar
```

### Implementation Plan

**Phase 1 — Database & Storage**
- Migration: `sessions`, `session_availability`, `bookings` tables with RLS
- Storage bucket `session-covers` (public)
- Add `store_slug` column to `photographers` table

**Phase 2 — Dashboard Pages**
- `Sessions` item added to `DashboardSidebar`
- `/dashboard/sessions` — grid of session cards with status, price, booking count
- `/dashboard/sessions/new` + `/dashboard/sessions/:id` — form with all fields, cover image upload, availability slot manager (date picker + time range rows)

**Phase 3 — Public Store**
- `/store/:slug` — photographer's public page listing active sessions
- `/store/:slug/:sessionId` — session detail with booking calendar (shows available slots)
- Booking form: client name, email → creates booking record → Stripe payment

**Phase 4 — Stripe Integration**
- Enable Stripe connector
- Edge function `create-checkout` → creates Stripe payment intent, redirects client
- Edge function `stripe-webhook` → on payment success, marks booking as confirmed and slot as booked

### Files to Create/Modify

- **Migration SQL** — 3 new tables + storage bucket + photographer slug column
- `src/App.tsx` — add new routes
- `src/components/dashboard/DashboardSidebar.tsx` — add Sessions nav item
- `src/pages/dashboard/Sessions.tsx` — sessions list page
- `src/pages/dashboard/SessionForm.tsx` — create/edit session with availability
- `src/pages/store/StorePage.tsx` — public store
- `src/pages/store/SessionDetailPage.tsx` — booking page
- `supabase/functions/create-checkout/index.ts` — Stripe checkout
- `supabase/functions/stripe-webhook/index.ts` — payment confirmation

### Key Questions Resolved
- **Scheduling**: Photographer pre-defines available time slots; client picks from them
- **Payment**: Online via Stripe at booking time
- **Store**: Public at `/store/:photographerSlug`

### What I Need to Proceed
- Stripe must be enabled first (requires the photographer's Stripe secret key)
- I'll ask the user if they want to start with the full flow (including Stripe payment) or first build the session management + store without payment (pay-later/external)

Actually — I should present the plan and then ask about Stripe order. Let me present the complete plan and note that Stripe will need to be enabled as a first step.
