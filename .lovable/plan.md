
## Problem

The VPS `/api/certs` response returns `"expiresAt": null` for every domain — the API simply doesn't expose expiry dates. The badge component works correctly; it just has no data to display.

## Solution

Proxy certificate expiry lookups through a new edge function that queries the public `crt.sh` certificate transparency API. For each cert in the table with a null `expiresAt`, fetch the real SSL expiry date and display it.

### Flow
```text
Browser (VpsCertsTab)
  → load certs from VPS API (gets domains, expiresAt=null for all)
  → for each domain, call edge function `check-ssl-cert?domain=X`
      → edge function fetches crt.sh JSON for that domain
      → finds the most recent active cert's not_after date
      → returns { domain, expiresAt }
  → merge results into state
  → ExpiryBadge shows real colored badge
```

### crt.sh API

```
GET https://crt.sh/?q=davions.giombelli.com.br&output=json
Returns: [{ "not_after": "2025-12-01T00:00:00", "common_name": "...", ... }, ...]
```

Filter to the entry with the highest `not_after` that hasn't expired yet.

---

## Files to Change

### 1. New: `supabase/functions/check-ssl-cert/index.ts`

- Accepts `?domain=<domain>` query param
- Fetches `https://crt.sh/?q=<domain>&output=json`
- Finds the cert with the latest `not_after` (that's not expired)
- Returns `{ domain, expiresAt: "2025-12-01T..." }` or `{ domain, expiresAt: null }`
- CORS headers included

### 2. Edit: `src/pages/admin/AdminDomains.tsx` — `VpsCertsTab` component

- After loading certs from VPS, trigger a secondary lookup for each domain's expiry via the edge function
- Store results in a `Record<string, string | null>` state (`certExpiry`)
- `ExpiryBadge` reads from `certExpiry[cert.domain] ?? cert.expiresAt`
- Show a small `Loader2` spinner inline in the "Dias para vencer" cell while the secondary lookup is in flight
- Lookup is triggered once per cert load (not on every render), using `useEffect` watching the certs array

No new dependencies. No DB changes.
