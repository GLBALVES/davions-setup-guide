
## Root Cause (Definitive)

Live DNS lookup confirms: `booking.giombelli.com.br` now resolves correctly to `185.158.133.1` as an A record with DNS only (grey cloud). **The DNS setup is technically correct.**

The fundamental problem: **`185.158.133.1` is a Cloudflare-owned IP (AS13335 - CLOUDFLARENET)**. Cloudflare blocks any zone they manage from routing traffic to another Cloudflare customer's IP block — this is an anti-spoofing protection that fires even in DNS-only mode for certain IP blocks within their infrastructure.

**There is no DNS record change that will fix this** while `giombelli.com.br` remains on Cloudflare's nameservers. The Error 1000 is triggered at Cloudflare's network level, before the request reaches the server.

## The Only Real Fix

Move `giombelli.com.br`'s nameservers **away from Cloudflare** to any non-Cloudflare DNS provider:

- **Registro.br** (Brazil's official registrar — recommended for `.com.br` domains) — free, manages DNS directly
- **Namecheap FreeDNS** — free
- The domain registrar's own nameservers (e.g., GoDaddy, HostGator, etc.)

After changing nameservers, the A record `booking → 185.158.133.1` will work perfectly because it won't be routed through Cloudflare's network at all.

## Plan: Update All Cloudflare Warning Messages in the App

Replace the current misleading "set to DNS only" guidance (which doesn't actually work because the IP itself is Cloudflare-owned) with accurate guidance that explains:
1. The IP is in Cloudflare's infrastructure — DNS-only does not fix it
2. The real solution is to move nameservers out of Cloudflare

### Files to change

**`src/pages/dashboard/WebsiteSettings.tsx`** — lines 948–961 (yellow Cloudflare box inside DNS records section)

Before:
```
Using Cloudflare? Keep the A record, set Proxy Status to DNS only (grey cloud)...
```

After:
```
Using Cloudflare? Our server IP (185.158.133.1) belongs to Cloudflare's own infrastructure. 
Cloudflare blocks all zones they manage from routing to this IP — even in DNS-only mode — 
triggering Error 1000. The only fix is to move your domain's nameservers away from Cloudflare 
to your registrar's DNS (e.g. Registro.br for .com.br domains) or Namecheap FreeDNS.
```

**`src/pages/dashboard/CustomDomainDocs.tsx`** — lines 220–231 (yellow Cloudflare box in Step 2)

Same update as above — replace "use DNS only" with the accurate explanation and nameserver migration guidance.

**`src/pages/admin/AdminDomains.tsx`** — lines 218–229 (Cloudflare note in expanded domain row)

Same update — admins will see the accurate explanation for Cloudflare-hosted domains.

### Visual design

The yellow warning box stays but gets clearer, more direct content with:
- A short explanation of why Error 1000 persists even with correct A + DNS-only setup
- Explicit actionable step: move nameservers to Registro.br (or registrar DNS)
- A link to `https://registro.br` for `.com.br` domains as the most common case

No new components needed. Only text content changes inside existing yellow `AlertTriangle` boxes.
