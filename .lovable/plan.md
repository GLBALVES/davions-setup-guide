
## Analysis

**Reference (Pixieset)** — key layout observations from the screenshot:
1. **Full-bleed hero image** at top, overlaid with photographer logo + "Please select a date and time" headline
2. **Floating card** below the hero with session name, duration, price, and location as inline pills
3. **Calendar + time slots side by side** in a second card — full month calendar on the left, time chip list on the right, with the selected day shown as a filled dark circle
4. No separate "step 1 / step 2" — the calendar and time selection are always visible simultaneously; only after picking a time does a "Continue" button appear

**Current state:**
- `StorePage.tsx` — minimal text header, grid of session cards (no hero, no photographer bio/photo)
- `SessionDetailPage.tsx` — 2-column layout (image + info left, scrollable slot list as chips right), then transitions to a "form" step. No calendar.
- `photographers` table — has `full_name`, `email`, `store_slug`, `custom_domain` but **no bio, no avatar/hero image**

**What needs to change:**

### StorePage — Hero + bio + sessions
- Add `bio` and `hero_image_url` columns to `photographers` table (migration)
- Update Settings page to allow uploading/editing these two new fields
- Redesign layout: full-bleed hero image (or gradient fallback if no image), photographer name centered over it, bio below, then session cards

### SessionDetailPage — Visual calendar
- Replace the scrollable chip-grouped-by-date list with a full month `Calendar` (react-day-picker, already installed via shadcn) on the left
- Days with at least one available slot are highlighted/selectable; days with no slots are disabled
- Selecting a day shows time slot chips for that day on the right (mirroring Pixieset)
- Keep the "Continue → form" 2-step flow

---

## Plan

### Database migration
Add two columns to `photographers`:
```sql
ALTER TABLE photographers ADD COLUMN bio text;
ALTER TABLE photographers ADD COLUMN hero_image_url text;
```

### Settings page update
Add a "Bio" textarea and a "Hero image URL" text input (or file upload to storage) to the existing Settings page.

### StorePage redesign
```text
┌────────────────────────────────────────────────────────────┐
│  [HERO IMAGE — full bleed, ~50vh, object-cover]            │
│  ░░ dark overlay gradient                                  │
│    PHOTOGRAPHY BY                                          │
│    PHOTOGRAPHER NAME   ← centered white text over hero     │
│    bio excerpt                                             │
└────────────────────────────────────────────────────────────┘
│  max-w-5xl grid: session cards (same cards, cleaner)       │
│  ...                                                       │
└────────────────────────────────────────────────────────────┘
```
- If no hero image: elegant solid dark background with brand typography
- Session cards: keep the existing design but tighten spacing

### SessionDetailPage redesign
```text
┌────────────────────────────────────────────────────────────┐
│ ← [back arrow]                                             │
├──────────────────────────┬─────────────────────────────────┤
│  [Cover image]           │  Session title                  │
│  Title · Price · Meta    │  ── March 2026 ← →              │
│  Description             │  Calendar grid (react-day-picker)│
│  Add-ons                 │  ── Selected day header          │
│                          │  [10:00] [14:00] chips           │
│                          │  [Continue →] button             │
└──────────────────────────┴─────────────────────────────────┘
Step 2 (form) — same as current, no change needed
```
- Calendar: available days = days that have ≥1 slot in `generatedSlots`. Disabled days = no slots
- Selecting a day: sets a `selectedDate` state, filters slots to show only that day's chips
- `selectedSlot` set when user clicks a time chip — same as today
- `pointer-events-auto` on Calendar per shadcn docs

### Files to change
1. **Migration** — new SQL migration adding `bio` and `hero_image_url` to `photographers`
2. **`src/pages/store/StorePage.tsx`** — full redesign with hero section
3. **`src/pages/store/SessionDetailPage.tsx`** — replace slot list with calendar + day chips layout
4. **`src/pages/store/CustomDomainStore.tsx`** — same as StorePage, passes same props (likely just imports StorePage internals — confirm it wraps StorePage)
5. **`src/pages/dashboard/Settings.tsx`** — add bio textarea + hero image URL input

No new dependencies needed — `react-day-picker` and `Calendar` component already exist in the project.
