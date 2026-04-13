

## Security Audit — Full Findings & Fix Plan

### CRITICAL Severity (6 issues)

**C1. Anonymous users can overwrite ANY client record**
- Table: `clients` — policy "Anon can update clients" with `USING (true)` for the `{anon}` role
- Impact: Any unauthenticated user can modify names, emails, phones, addresses for ALL photographers' clients
- Fix: DROP the anon UPDATE policy. The existing "Photographers can update own clients" policy is sufficient. The booking flow should use an edge function with service_role for any anon-triggered client update.

**C2. All bookings (with PII) are publicly readable**
- Table: `bookings` — policy "Anyone can read booking by id" with `USING (true)` for `{anon}`
- Impact: client_name, client_email, stripe_checkout_session_id, stripe_payment_intent_id exposed to everyone
- Fix: Replace with a scoped policy that only allows anon SELECT when the booking id is explicitly known (or restrict to authenticated + photographer scope). For the confirmation page flow, use an edge function to return only needed fields.

**C3. Client briefing responses publicly readable**
- Table: `booking_briefing_responses` — policy "Anyone can read own briefing responses" with `USING (true)` for `{anon}`
- Impact: All client-submitted briefing answers visible to anyone
- Fix: DROP the anon SELECT policy. Access from the confirmation flow should go through an edge function.

**C4. All support messages publicly readable**
- Table: `support_messages` — policy "Anyone can read support messages" with `USING (true)` for `{anon}`
- Impact: Full support conversation history of every photographer visible to anyone
- Fix: Replace with a policy scoped to the ticket's creator or authenticated photographer.

**C5. Photographer PII and payment credentials publicly exposed**
- Table: `photographers` — two anon SELECT policies return ALL columns including email, business_phone, business_tax_id, stripe_account_id
- Impact: Sensitive financial and personal data exposed
- Fix: Create a database VIEW (`public_photographer_profile`) exposing only safe columns (id, full_name, store_slug, custom_domain, bio, hero_image_url, business_name, business_currency). Adjust frontend queries for the public store to use this view or select only needed columns.

**C6. Realtime broadcasts booking and support data to any subscriber**
- Tables `bookings` and `support_messages` are published to Supabase Realtime
- Impact: Any authenticated user can subscribe to realtime channels and receive all change events
- Fix: Remove `bookings` and `support_messages` from `supabase_realtime` publication if realtime isn't needed for these, or add realtime authorization policies.

### HIGH Severity (4 issues)

**H1. Anonymous can insert bookings without validation**
- Table: `bookings` — INSERT with `WITH CHECK (true)` for `{anon}`
- Justified by the public booking flow, but should validate photographer_id exists. Acceptable if the edge function `confirm-booking` handles creation — then the direct INSERT policy should be removed.
- Fix: Verify flow — if bookings are only created via edge function, DROP the anon INSERT policy.

**H2. Anonymous can insert support tickets and messages without scoping**
- Tables: `support_tickets`, `support_messages` — INSERT with `WITH CHECK (true)` for `{anon}`
- Risk: Spam/abuse vector. Anyone can create unlimited tickets/messages.
- Fix: Add rate limiting via edge function; scope the INSERT to require a valid ticket reference.

**H3. Anonymous can insert notifications without scoping**
- Table: `notifications` — INSERT with `WITH CHECK (true)` for `{anon}`
- Risk: Anyone can inject fake notifications into any photographer's notification feed.
- Fix: DROP the anon INSERT policy. Notifications should only be created via edge functions with service_role.

**H4. Leaked password protection disabled**
- Auth configuration does not check passwords against the HIBP database
- Fix: Enable via `configure_auth` tool with `password_hibp_enabled: true`.

### MEDIUM Severity (4 issues)

**M1. Invoice line items publicly readable**
- Table: `booking_invoice_items` — anon SELECT with `USING (true)`
- Fix: DROP anon SELECT; access through edge function for payment pages.

**M2. Photo favorites DELETE with `USING (true)`**
- Table: `photo_favorites` — DELETE for `{anon}` with `USING (true)`
- Risk: Anyone can delete any user's favorites
- Fix: Scope DELETE to match gallery_id + some client identifier.

**M3. CORS set to `*` on all edge functions**
- All 46+ edge functions use `Access-Control-Allow-Origin: *`
- Fix: For functions that only serve the app frontend, restrict origin to the app domain. Low risk since auth tokens are still required.

**M4. Function search_path mutable**
- Some database functions don't set `search_path`
- Fix: Add `SET search_path = public` to affected functions.

### LOW Severity (3 issues)

**L1. ssl_alert_state has RLS enabled but no policies**
- Table is inaccessible, likely service_role only — intentional.
- Fix: Confirm and document.

**L2. Extension in public schema**
- Minor: extensions should be in a dedicated schema.
- Fix: Move to `extensions` schema in a future migration.

**L3. `select("*")` usage on sensitive tables**
- Several frontend queries use `select("*")` on tables like `photographers`, `bookings`, `clients`
- Fix: Replace with explicit column selection on sensitive tables.

---

### Implementation Plan

**Migration 1 — Fix critical and high RLS policies:**

```sql
-- C1: Drop dangerous anon UPDATE on clients
DROP POLICY "Anon can update clients" ON public.clients;

-- C2: Restrict anon bookings read (drop open policy)
DROP POLICY "Anyone can read booking by id" ON public.bookings;

-- C3: Drop anon SELECT on briefing responses
DROP POLICY "Anyone can read own briefing responses" ON public.booking_briefing_responses;

-- C4: Drop open anon SELECT on support_messages
DROP POLICY "Anyone can read support messages" ON public.support_messages;
-- Add scoped policy for ticket creators
CREATE POLICY "Ticket creators can read own messages" ON public.support_messages
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_messages.ticket_id
    AND t.email = current_setting('request.headers', true)::json->>'x-client-email'
  ));

-- H3: Drop anon INSERT on notifications
DROP POLICY "Anon can insert notifications" ON public.notifications;

-- M1: Drop anon SELECT on invoice items
DROP POLICY "Anyone can read invoice items" ON public.booking_invoice_items;

-- C6: Remove sensitive tables from realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.support_messages;
```

**Migration 2 — Create secure view for public photographer data:**

```sql
CREATE VIEW public.public_photographer_profile AS
SELECT id, full_name, store_slug, custom_domain, bio, hero_image_url,
       business_name, business_currency, business_city, business_country
FROM public.photographers;
```

**Code changes:**
- Update `StorePage.tsx` and public store components to select only needed columns from `photographers` instead of `*`
- Update booking confirmation flow to use edge functions for fetching booking data instead of direct anon queries
- Enable HIBP password protection via auth configuration

**Files to modify:**
- New migration SQL file
- `src/pages/store/StorePage.tsx` — scoped column selection
- `src/pages/BookingConfirm.tsx` — use edge function instead of direct query
- `src/pages/BookingSuccess.tsx` — same
- `src/components/store/PublicSiteRenderer.tsx` — scoped column selection

### Summary Table

| Severity | Count | Auto-fix |
|----------|-------|----------|
| Critical | 6     | Yes      |
| High     | 4     | Yes      |
| Medium   | 4     | Partial  |
| Low      | 3     | No       |

