
The user uploaded the Davions circular seal image (`selo_preto-2.png`) and the previous conversation was about how to set a favicon. The intent is clear: use this image as the site favicon.

## Plan: Set Favicon with Uploaded Seal

### Steps

1. **Copy the uploaded file** to `public/favicon.png`
   - Source: `user-uploads://selo_preto-2.png`
   - Destination: `public/favicon.png`

2. **Update `index.html`** — replace the existing `<link rel="icon">` (currently pointing to `/favicon.ico`) with the new PNG, and add Apple touch icon support:

```html
<link rel="icon" href="/favicon.png" type="image/png" />
<link rel="apple-touch-icon" href="/favicon.png" />
```

### Files changed
| File | Change |
|---|---|
| `public/favicon.png` | New file — copied from upload |
| `index.html` | Update `<link rel="icon">` to point to `/favicon.png` |
