
## Goal
Add a QR code + sharing panel (like the reference image) to both the **Store URL** section and the **Custom Domain** section in `WebsiteSettings.tsx`.

Each panel will show:
- The URL in a monospaced box
- A QR code for the URL
- **Copy link** button
- **Share via WhatsApp** button (green)
- **Share via Email** button (blue)

---

## Approach

### QR Code
No QR library is installed. Use the free public QR API `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=<url>` — renders as a plain `<img>` tag with no dependency, no install needed, works offline-gracefully (shows broken image only if no internet, which is fine for a dashboard).

### New Component: `StoreSharePanel`
A small reusable component placed inside `WebsiteSettings.tsx` that receives `url` and `label` props and renders the sharing card. This keeps both sections DRY.

```
StoreSharePanel({ url, label })
├── URL display box (monospaced, truncated)
├── QR code (160×160 from qrserver.com)
├── [ Copy link ]         ← icon + text, border
├── [ Share via WhatsApp ]  ← green bg
└── [ Share via Email ]     ← blue bg
```

### Placement
- **Store URL section** (line ~1209): replace the current minimal `<div>` that shows the URL + copy + external link icons with the new `StoreSharePanel`
- **Custom Domain section** (line ~1236): add `StoreSharePanel` below the domain display row (before the DNS records)

---

## Files to Edit

### `src/pages/dashboard/WebsiteSettings.tsx`
1. Add `StoreSharePanel` component (above `WebsiteSettings` function, after `Divider`)
2. Replace lines 1209–1218 (Store URL display) with `<StoreSharePanel url={`https://davions.com/store/${storeSlug}`} />`
3. Add `<StoreSharePanel url={`https://${customDomain}`} />` inside the custom domain `{customDomain ? (...)` block, right after the domain display row (line ~1246), before the DNS records

No new npm packages needed — uses free public QR image API.
