
## Problem

**Cloudflare Error 1000** occurs when an A record points to an IP that Cloudflare owns or that creates a routing loop inside Cloudflare's network. The IP `185.158.133.1` is within a Cloudflare-owned range, so:

- Photographers using Cloudflare as their DNS provider → set A record to `185.158.133.1` → Cloudflare detects the target IP is its own infrastructure → blocks with Error 1000, even when set to "DNS only" (grey cloud).

The current warning says "set to DNS only (grey cloud)" but **that's not enough** — Cloudflare won't route A records to its own IPs regardless of proxy status.

### Root cause
`185.158.133.1` belongs to Cloudflare's IP range. Cloudflare prohibits pointing A records at its own IPs via third-party accounts (Error 1000). This is an infrastructure-level conflict that the A record approach cannot solve for Cloudflare users.

### The real fix
For photographers using **Cloudflare as their DNS provider**, they must use a **CNAME record** instead of an A record, pointing to the platform's hostname. Cloudflare handles CNAME flattening natively.

The platform needs a stable hostname to serve as CNAME target. The most direct option: use a CNAME pointing to `davions.com` (or a dedicated `domains.davions.com` hostname).

---

## Plan

### 1. Update DNS instructions — CNAME alternative for Cloudflare users

In all three places where DNS instructions are shown (`AdminDomains.tsx`, `WebsiteSettings.tsx`, `CustomDomainDocs.tsx`), replace the single "DNS only" warning with a **two-path instruction**:

**Path A — Not using Cloudflare (GoDaddy, Namecheap, etc.)**
```
A record | booking | 185.158.133.1
```

**Path B — Using Cloudflare**
```
CNAME record | booking | booking.davions.com   (or davions.com)
```
With a note: "Cloudflare blocks A records pointing to 185.158.133.1 (Error 1000). Use a CNAME instead."

This means:
- The current A record table stays as-is for non-Cloudflare users
- A second block is shown below with the Cloudflare-specific CNAME alternative
- The existing "DNS only" warning is upgraded to explain Error 1000 and provide the CNAME fix

### 2. Update the `check-domain` edge function

Currently `check-domain` only checks A records for `185.158.133.1`. It needs to also accept a CNAME pointing to `davions.com` (or `*.davions.com`) as a valid "active" domain. Update the A record check to also resolve CNAME → A, or check if the domain ultimately resolves to any Davions-operated address.

### Files to change

1. **`src/pages/admin/AdminDomains.tsx`** — `DnsExpansion` component
   - Replace the current single Cloudflare note with a structured "Cloudflare alternative" block showing the CNAME approach

2. **`src/pages/dashboard/WebsiteSettings.tsx`** — inline DNS block (~line 938–950)
   - Replace the current Cloudflare warning with the two-path block (A for standard, CNAME for Cloudflare)

3. **`src/pages/dashboard/CustomDomainDocs.tsx`** — Step2 component (~line 220–225)
   - Replace the current Cloudflare warning with the two-path block

4. **`supabase/functions/check-domain/index.ts`**
   - Add CNAME resolution: if the A lookup returns a Cloudflare IP but CNAME resolves correctly to the platform, mark as active
   - Or: also resolve CNAME records and check if they eventually point to the platform

### What the Cloudflare block will look like

```
⚠️ Using Cloudflare? Use a CNAME instead of an A record.

Cloudflare blocks A records pointing to 185.158.133.1 (Error 1000).
Add this instead:

  CNAME | booking | davions.com   [copy]

Leave Proxy Status as DNS only (grey cloud).
```

This is shown below the main A record table as an alternative section, not replacing the A record instructions (which remain valid for all other registrars).
