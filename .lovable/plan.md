
## Understanding the Request

The user has shared the full Davions knowledge base. They want to build the project page by page. Before building any page, the design system needs to be aligned to the brand spec. Then we start with the landing page.

## What Needs to Happen

### Step 1 — Design System Foundation
Update `src/index.css` and `tailwind.config.ts` to reflect the Davions brand:

**CSS Variables (index.css):**
- `--background: 0 0% 100%` (white)
- `--foreground: 0 0% 0%` (pure black)
- `--primary: 0 0% 0%` (black)
- `--primary-foreground: 0 0% 100%` (white)
- `--secondary: 0 0% 96%` (near-white #F5F5F5)
- `--secondary-foreground: 0 0% 10%`
- `--muted: 0 0% 96%` (#F5F5F5)
- `--muted-foreground: 0 0% 40%` (#666666)
- `--border: 0 0% 88%` (thin 1px borders, light gray)
- `--radius: 0.125rem` (minimal border radius, 2px)
- Remove dark mode (not in spec, brand is strictly black/white)

**Add Google Font** in `index.html`:
- Inter (thin/light weights: 300, 400) via Google Fonts

**Tailwind — add custom font family:**
```
fontFamily: { sans: ['Inter', 'sans-serif'] }
```

**Button component** — update to match brand:
- Primary: black, no radius or 2px
- Secondary: white bg, black border
- Ghost: transparent + hover black

### Step 2 — Landing Page (`/`)

**File:** `src/pages/Index.tsx`  
**Components to create:** `src/components/Navbar.tsx`

Layout (top to bottom):

```
┌─────────────────────────────────┐
│  NAVBAR: Logo | Links | CTA     │
├─────────────────────────────────┤
│  HERO                           │
│  "Your work. Delivered          │
│   beautifully."                 │
│  [Get Started] [See Demo]       │
├─────────────────────────────────┤
│  FEATURES (4 cards)             │
│  Galleries / Portfolio /        │
│  Store / Lightroom Plugin       │
├─────────────────────────────────┤
│  LIGHTROOM PLUGIN SPOTLIGHT     │
│  (key differentiator section)   │
├─────────────────────────────────┤
│  PRICING (3 plans)              │
│  Free / Pro $19 / Business $39  │
├─────────────────────────────────┤
│  FOOTER: logo, links, copyright │
└─────────────────────────────────┘
```

**Navbar:**
- Logo text "DAVIONS" (wordmark, thin uppercase, tracked) — left
- Nav links center: Features, Pricing, Integrations
- CTA right: "Get Started" (black button) + "Log In" (ghost)

**Design details throughout:**
- No gradients, no shadows
- Corner bracket `[ ]` motifs as decorative elements
- 1px borders
- Generous whitespace
- Uppercase section labels with wide letter-spacing

### Files to Create/Edit

| File | Action |
|---|---|
| `src/index.css` | Update design system variables + font import |
| `tailwind.config.ts` | Add Inter font family |
| `index.html` | Add Google Fonts link |
| `src/components/ui/button.tsx` | Update variants to match brand |
| `src/components/Navbar.tsx` | New — top navigation |
| `src/pages/Index.tsx` | Full landing page |

### What Will NOT be built yet
- Dashboard, auth, galleries, store — saved for subsequent pages
- Logo image files (will use text wordmark until assets are provided)
