
## What the user wants

Replace all `_davions` TXT record references with `_lovable` (and `davions_verify=` values with `lovable_verify=`) across the entire codebase, since Lovable is the actual infrastructure and requires its own TXT record format.

## Files to change

**4 files** contain the `_davions` / `davions_verify` strings:

### 1. `src/pages/dashboard/WebsiteSettings.tsx` (lines 903, 908)
The DNS records table shown to photographers after saving a domain.
- `name: "_davions"` → `name: "_lovable"`
- value: `` `davions_verify=${...}` `` → `` `lovable_verify=${...}` ``
(both subdomain and root domain branches)

### 2. `src/pages/dashboard/CustomDomainDocs.tsx` (lines 20, 163, 168)
The 4-step wizard DNS records shown during domain setup.
- Static `DNS_RECORDS` constant at line 20: `_davions` → `_lovable`, `davions_verify=<provided>` → `lovable_verify=<provided>`
- Dynamic records in Step2 at lines 163 and 168: same replacements

### 3. `src/pages/admin/AdminDomains.tsx` (lines 49, 54, 59–60)
The admin panel DNS expansion showing records per domain.
- `verifyValue` computation: `davions_verify=` → `lovable_verify=`
- Subdomain TXT name: `` `_davions.${subName!}` `` → `` `_lovable.${subName!}` ``
- Root domain TXT name: `"_davions"` → `"_lovable"`

### 4. `supabase/functions/notify-domain-saved/index.ts` (lines 54, 62)
The email notification sent to the team.
- `verifyValue`: `davions_verify=` → `lovable_verify=`
- `dnsBlock`: `TXT   _davions` → `TXT   _lovable`

### 5. `supabase/functions/help-assistant/index.ts` (line 27)
The AI help assistant's knowledge base text.
- `_davions TXT verification record` → `_lovable TXT verification record`

## No database migrations needed
This is a pure UI/text change — no schema is involved.
