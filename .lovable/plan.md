
## Problem

Three bugs in the DNS instructions across `AdminDomains.tsx`, `WebsiteSettings.tsx`, and `CustomDomainDocs.tsx`:

**Bug 1 — Subdomain detection broken for `.com.br`** (affects all 3 files)

The current logic: `isSubdomain = remainingAfterFirst.length >= 2`

- `giombelli.com.br` → parts: `["giombelli","com","br"]` → remainingAfterFirst length = **2** → wrongly classified as subdomain
- `booking.giombelli.com.br` → parts: `["booking","giombelli","com","br"]` → length = **3** → correctly a subdomain

Fix: detect compound TLDs (`.com.br`, `.net.br`, `.co.uk`, etc.) and require 4+ parts to be a subdomain when compound TLD is present.

**Bug 2 — TXT record name wrong for subdomains in `AdminDomains.tsx`**

Current code: `name: "_lovable.${subName}"` (e.g. `_lovable.booking`)  
Correct (per Lovable docs + WebsiteSettings): `name: "_lovable"` — flat, never prefixed with subdomain name.

**Bug 3 — `verifyValue` separator inconsistency in `AdminDomains.tsx`**

`AdminDomains.tsx` uses `-` as separator (`lovable_verify=booking-giombelli-com-br`), but `WebsiteSettings.tsx` and `CustomDomainDocs.tsx` use `_` (`lovable_verify=booking_giombelli_com_br`). Align to `_`.

---

## Fix

A shared helper for subdomain detection (applied inline in all 3 files):

```text
const COMPOUND_TLDS = ["com.br","net.br","org.br","edu.br","gov.br",
                       "co.uk","com.au","co.nz","com.ar","com.mx","com.co"];
const lastTwo = parts.slice(-2).join(".");
const rootPartsCount = COMPOUND_TLDS.includes(lastTwo) ? 3 : 2;
const isSubdomain = parts.length > rootPartsCount;
```

Results:
- `giombelli.com.br` (3 parts, compound) → rootPartsCount=3 → **NOT subdomain** ✓
- `booking.giombelli.com.br` (4 parts, compound) → **subdomain** ✓
- `giombelli.com` (2 parts) → rootPartsCount=2 → **NOT subdomain** ✓
- `booking.giombelli.com` (3 parts) → **subdomain** ✓

---

## Files to change

1. **`src/pages/admin/AdminDomains.tsx`** — `getDomainInfo()` function (~lines 43–63)
   - Replace isSubdomain logic with compound-TLD-aware version
   - TXT name: `_lovable.${subName}` → `_lovable`
   - verifyValue separator: `.replace(/\./g, "-")` → `.replace(/\./g, "_")`

2. **`src/pages/dashboard/WebsiteSettings.tsx`** — inline DNS block (~lines 895–909)
   - Replace isSubdomain logic with compound-TLD-aware version

3. **`src/pages/dashboard/CustomDomainDocs.tsx`** — Step2 component (~lines 156–169)
   - Replace isSubdomain logic with compound-TLD-aware version
