
## Problem

### What's wrong in the screenshot
For `booking.giombelli.com.br`, the DNS table shows:
- `TXT | _lovable | lovable_verify=booking_giombelli_com_br`

This value is **fabricated** — this app generates it from the domain name. But Lovable's real verification system generates a **unique random token** (e.g. `lovable_verify=abc123xyz`) in the project settings dashboard. The photographer would copy our made-up value and it would fail Lovable's verification check.

### Secondary bug
`notify-domain-saved` edge function still uses the old subdomain detection (`parts.slice(1).length >= 2`), so it misidentifies `giombelli.com.br` as a subdomain in the notification email.

---

## The correct flow

The Davions team is responsible for adding the domain in **Lovable Project Settings → Domains**, which generates the real unique `lovable_verify=<token>`. The photographer only controls their DNS provider. So:

- Photographers need the **A record(s)** — correct, that's what they set at their registrar
- The **TXT `_lovable`** record value comes from Lovable's project settings — **the Davions team tells them what value to enter**, not the app

---

## Fix

### Option A (recommended): Remove TXT row from photographer-facing UI
The TXT record setup is a collaboration step: the team generates it, then tells the photographer. Remove the TXT row from `WebsiteSettings.tsx` and `CustomDomainDocs.tsx` and replace it with a note: *"After saving your domain, our team will provide the TXT verification record needed to complete setup."*

### In `AdminDomains.tsx` (admin only)
Keep the TXT row but clarify the value is **placeholder only** — the real token comes from Lovable settings. Add a note: *"Get the actual verification value from Lovable Project Settings → Domains."*

### In `notify-domain-saved` edge function
Fix the subdomain detection to use the same compound-TLD logic as the frontend files.

---

## Files to change

1. **`src/pages/dashboard/WebsiteSettings.tsx`** (~lines 901–910)
   - Remove TXT record from `dnsRecords` array
   - Add note below the DNS table explaining the team will provide the TXT record

2. **`src/pages/dashboard/CustomDomainDocs.tsx`** (~lines 162–171)
   - Remove TXT record from both subdomain/root `dnsRecords` arrays
   - Add note in the DNS step explaining the team will provide the TXT record after domain is submitted

3. **`src/pages/admin/AdminDomains.tsx`** (~lines 55–66)
   - Keep TXT row but change `verifyValue` to `"<get from Lovable project settings>"` 
   - Add a small annotation that this value must come from Lovable settings

4. **`supabase/functions/notify-domain-saved/index.ts`** (~lines 51–54)
   - Replace old subdomain detection with compound-TLD-aware version
   - Remove the fabricated `verifyValue` from the email DNS block (A records only, with a note)
