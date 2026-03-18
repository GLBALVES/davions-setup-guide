
## Root Cause Found

The network logs reveal the exact problem:

`davions.nevoxholding.com` is the test custom domain. But in `custom-domain.ts`, the `isCustomDomain()` check uses `endsWith`:

```
hostname.endsWith(`.${h}`)
```

Since `nevoxholding.com` is in `APP_HOSTNAMES`, the check `"davions.nevoxholding.com".endsWith(".nevoxholding.com")` returns **true** — so the app treats it as a platform URL instead of a photographer's custom domain. `CustomDomainStore` never renders.

The `endsWith` rule is correct for platform domains (e.g. `my-project.lovable.app`) where ALL subdomains are the app itself. But for owned domains like `nevoxholding.com` and `davions.com`, only the root and `www.` subdomain belong to the platform — arbitrary subdomains like `davions.nevoxholding.com` are photographer domains.

---

## Plan

**File: `src/lib/custom-domain.ts`**

Split the hostname list into two categories:

- **Platform domains** — subdomains are also the app (`lovable.app`, `lovable.dev`, `lovableproject.com`, `localhost`). Use `endsWith` for these.
- **Owned domains** — only exact matches are the app (`nevoxholding.com`, `www.nevoxholding.com`, `davions.com`, `www.davions.com`). Use exact match only.

```text
Before:
  APP_HOSTNAMES.some(h => hostname === h || hostname.endsWith(`.${h}`))
  → "davions.nevoxholding.com".endsWith(".nevoxholding.com") = TRUE ❌

After:
  EXACT_HOSTNAMES.includes(hostname) → false
  OR PLATFORM_DOMAINS.some(h => hostname.endsWith(`.${h}`)) → false
  → isCustomDomain returns TRUE ✅
```

### Technical change

```typescript
// Domains where ALL subdomains are app instances
const PLATFORM_DOMAINS = ["localhost", "lovable.app", "lovable.dev", "lovableproject.com"];

// Exact app hostnames (root + www of owned domains)
const EXACT_APP_HOSTNAMES = [
  "nevoxholding.com", "www.nevoxholding.com",
  "davions.com", "www.davions.com",
];

export function isCustomDomain(hostname = window.location.hostname): boolean {
  if (EXACT_APP_HOSTNAMES.includes(hostname)) return false;
  if (PLATFORM_DOMAINS.some(h => hostname === h || hostname.endsWith(`.${h}`))) return false;
  return true;
}
```

This single change makes `davions.nevoxholding.com` correctly resolve as a custom photographer domain, triggering `CustomDomainStore` when accessed directly in the browser.

### Scope
- 1 file changed: `src/lib/custom-domain.ts`
- No database, routing, or edge function changes needed
- The DNS check mismatch (pointing to `185.158.133.1` instead of `147.93.112.182`) is a DNS configuration issue, not a code bug — the store rendering will work once this fix is in place and the domain hits the VPS
