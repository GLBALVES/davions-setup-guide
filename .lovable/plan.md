
## Root Cause Diagnosis

The CNAME workaround (`booking.giombelli.com.br` → CNAME → `davions.com`) is **fundamentally broken** and will always produce Error 1000 for Cloudflare users.

**Why:** DNS lookup confirms `davions.com` resolves to `185.158.133.1`. This is the **same Cloudflare infrastructure IP**. When a third-party Cloudflare account (giombelli.com.br) creates a CNAME pointing to `davions.com`, the CNAME chain ultimately resolves to a Cloudflare-owned IP. Cloudflare detects this cross-account conflict and throws Error 1000 — it doesn't matter that the CNAME is set to "DNS only" (grey cloud).

The CNAME workaround was never a real fix; it was a mistake in the original guidance.

## The Actual Fix: Create a Non-Cloudflare CNAME Target

`davions.com` is hosted at Hostinger (confirmed via SOA record: `ns1.dns-parking.com. dns.hostinger.com`). The DNS is managed in Hostinger, NOT proxied through Cloudflare. The A record in Hostinger simply points to `185.158.133.1`.

**The real origin IP needs to be added as a separate record** — specifically, create a subdomain like `cname.davions.com` or `origin.davions.com` that:
1. Points directly to the **actual server IP** (not the Cloudflare IP) — this is the IP of the Lovable/application infrastructure
2. Is published in Hostinger DNS directly

But wait — `185.158.133.1` IS the server's real IP (the application server). `davions.com` is managed in Hostinger DNS (not proxied through Cloudflare). The issue is that **this IP belongs to Cloudflare's IP range**, so any Cloudflare customer who tries to use it gets Error 1000.

This is a platform/infrastructure constraint. The real fix has two options:

**Option A — Remove CNAME guidance entirely**: The CNAME to `davions.com` never works for Cloudflare users because `davions.com` resolves to `185.158.133.1`, which IS in Cloudflare's prohibited IP range. The correct guidance for Cloudflare users is to **temporarily disable the Cloudflare proxy** (set to DNS only) on the A record pointing to `185.158.133.1`, OR move DNS to a non-Cloudflare provider like Namecheap/Cloudflare Registrar DNS-only.

Actually wait — if Cloudflare users set A record to `185.158.133.1` with **DNS only** (grey cloud), Error 1000 should NOT appear because Error 1000 only happens when the proxy (orange cloud) is enabled and the IP is another CF IP. Let me re-read the Error 1000 docs.

Error 1000 occurs when: "The DNS record for this domain in Cloudflare points to a Cloudflare IP address." — This means when Cloudflare is PROXYING (orange cloud) a domain whose A record points to another Cloudflare IP.

If the A record on Cloudflare uses **DNS only (grey cloud)**, the request goes directly to the IP without Cloudflare proxy, so Error 1000 should NOT occur.

If the A record uses **orange cloud (proxied)** and the destination IP is `185.158.133.1` (a Cloudflare IP), Error 1000 WILL occur.

So the correct fix for Cloudflare users:
- Use A record `185.158.133.1` with **DNS only** (grey cloud) ← this should work
- OR use CNAME pointing to `davions.com` with **DNS only** (grey cloud) ← this also routes to the same IP, so same Error 1000 issue

The screenshot shows the user HAS set DNS only (grey cloud) but is still getting Error 1000. This means the issue might be different — maybe the subdomain `booking.giombelli.com.br` is still being proxied somehow, or there's a Cloudflare zone-level setting intercepting.

Wait — looking at the screenshot again: the CNAME `booking` → `davions.com` is set to "Somente DNS" (DNS only, grey cloud). But Error 1000 still appears.

The explanation: When `booking.giombelli.com.br` has a CNAME to `davions.com`, and `davions.com` itself is A record `185.158.133.1` — the browser/Cloudflare follows the CNAME chain. `185.158.133.1` is a Cloudflare IP. Even though the CNAME on `booking.giombelli.com.br` is DNS only, Cloudflare's network detects that the final resolved IP belongs to Cloudflare's own infrastructure, which triggers Error 1000.

This confirms: **the CNAME to `davions.com` will NEVER work for Cloudflare users**, because `davions.com → 185.158.133.1` which is a Cloudflare-owned IP.

**The actual correct solution for Cloudflare users:**
- Use an A record `185.158.133.1` with **DNS only** (grey cloud) — this should bypass Error 1000 because in DNS-only mode, Cloudflare is just a DNS resolver, not a proxy, so the IP conflict check doesn't apply.

Let me reconsider: Does Error 1000 also trigger in DNS-only mode? The Cloudflare documentation says Error 1000 occurs when the DNS record "points to prohibited IP" but from the user's domain in Cloudflare proxy mode. In DNS-only mode, Cloudflare is just resolving the IP, not proxying, so Error 1000 shouldn't occur.

So the correct fix is: **Switch from CNAME to an A record with DNS only (grey cloud).** The CNAME to `davions.com` is causing Error 1000 because `davions.com` eventually resolves to a Cloudflare IP, which triggers the prohibition even in DNS-only CNAME resolution.

The issue is that our guidance told users "use CNAME to davions.com instead of A record" — but this was wrong. The A record with DNS only is the correct approach.

## Plan

### What to change

**1. Update the CNAME guidance in both WebsiteSettings.tsx and AdminDomains.tsx**

The current "Using Cloudflare? Use a CNAME instead" box recommends `CNAME → davions.com`. This is incorrect and causes Error 1000 because `davions.com` is itself `185.158.133.1` (a Cloudflare IP).

**Correct guidance for Cloudflare users:**
- Use the standard **A record** pointing to `185.158.133.1` 
- Set Proxy Status to **DNS only** (grey cloud)
- This is the only working solution for Cloudflare

The yellow box should be rephrased to say: "If you use Cloudflare, make sure the A record is set to **DNS only** (grey cloud icon), NOT proxied (orange cloud). Proxying a record pointing to our IP causes Error 1000."

**2. Update check-domain edge function**

Remove `cnameOk` check against `davions.com` since the CNAME workaround doesn't actually work. A domain is "active" only if the A record resolves to `185.158.133.1` directly.

**3. Remove the CNAME table from AdminDomains expanded view**

The "Cloudflare alternative CNAME" table should be replaced with proper guidance: "Set A record to DNS only (grey cloud)."

### Files to change
- `src/pages/dashboard/WebsiteSettings.tsx` — Replace yellow CNAME box with correct DNS-only guidance
- `src/pages/admin/AdminDomains.tsx` — Replace CNAME alternative table with correct guidance
- `supabase/functions/check-domain/index.ts` — Remove CNAME-to-davions.com as a valid alternative (since it doesn't work)
- `src/pages/dashboard/CustomDomainDocs.tsx` — Update CNAME section if it exists

### Visual change

Before (yellow box): "Use CNAME → davions.com with DNS only"
After (yellow box): "If using Cloudflare, set the A record proxy to DNS only (grey cloud). Do NOT use the orange cloud (proxy) mode, as this causes Error 1000."
