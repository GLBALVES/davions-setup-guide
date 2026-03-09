
## Analysis: Current vs. Pixieset reference

**Pixieset layout (from screenshot):**
1. **Full-bleed hero image** (~40vh) with studio logo centered at top + "Please select a date and time" subtitle — the hero IS the booking page header, not just a cover image sitting in a column
2. **Floating centered card** below the hero (max-w ~640px, centered, white background with shadow) with session title + inline meta pills (duration · price · location) + description
3. **Second card** (same max-width, centered) with two columns inside:
   - Left: month calendar — clean, no border around the whole calendar, just a grid; available dates shown as light bordered rectangles; selected date is a filled dark brown circle; days with availability have a small dot indicator below the number
   - Right: date header ("Tuesday, March 17, 2026") + time zone selector dropdown + "PM" label + time chip buttons (outlined rectangles, e.g. "01:00 PM", "03:00 PM")
4. **"Continue" button** below the cards, centered, only enabled when a time is selected
5. Background of the page below the hero is a warm cream/off-white (`#f5f0eb` ish)

**Current layout:**
- 2-column `grid grid-cols-1 md:grid-cols-2 gap-10` inside `max-w-4xl mx-auto`
- Left col: cover image + session info + extras
- Right col: calendar + time chips + Continue button
- No full-bleed hero — just the regular `bg-background` page with a header bar
- Calendar is already implemented and working ✓
- Time chips are already working ✓
- The problem: the visual structure is completely different from Pixieset

**What needs to change:**

### 1. Page structure overhaul
Remove the 2-column layout. Replace with a single-column, centered layout:

```text
┌─────────────────────────────────────────────────────────────┐
│  HERO: cover_image_url full-bleed ~40vh                     │
│  ░░ dark gradient overlay                                    │
│  [studio logo circle — photographer initials or avatar]     │
│  "Please select a date and time"  ← centered white text     │
└─────────────────────────────────────────────────────────────┘
│  warm off-white background below                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Session title                                        │  │
│  │  ⏱ 2 hours  ·  $ 1,320  ·  📍 Katy, TX              │  │
│  │  Description                                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MARCH 2026    ←  →              │ Tuesday, March 17 │  │
│  │  [calendar grid]                 │ [time chips]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Extras card — if any]                                     │
│                                                             │
│            [ Continue → ]  (centered, full-width of card)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Hero section
- Use `session.cover_image_url` as the full-bleed hero image for the booking page itself (just like Pixieset uses the session's photo)
- Dark gradient overlay on top
- **Photographer initials avatar** (circle, white border) centered at top of hero — use `photographer.full_name` initials (need to fetch photographer name from `photographers` table using `session.photographer_id`)
- Below the logo: `"Please select a date and time"` in light serif-style text, white

### 3. Session info card
- White card, centered, `max-w-2xl`, floating with `shadow-sm` or `ring-1 ring-border`
- Session title + meta pills inline (Clock · Price · MapPin) + description paragraph

### 4. Calendar + time card
- White card, same max-width, two-column internal layout:
  - Left: calendar (already works), remove the separate "Choose a date" label above it
  - Right: when date selected → show date header + time chips vertically stacked; when no date selected → empty state "Select a date"
- Available dates: add a small dot indicator below the day number for days that have slots (using `modifiers` on DayPicker)
- Selected time chip: filled dark background (already done ✓)

### 5. Extras card
- Only show if there are extras — keep current logic, just style it as a card
  
### 6. Continue / Pay button
- Centered below the cards, `max-w-2xl` width
- Step 2 ("form") — keep exactly as-is but also style as a centered card

### 7. Page background
- Change the page background below the hero from `bg-background` (white) to a warm off-white: add `bg-[#f5f2ee]` or similar — or use the existing CSS variable to keep theme-aware. Use `bg-muted/40` as a softer approach.

### 8. Data: fetch photographer name
- Currently `SessionDetailPage` doesn't fetch `photographers`. Need to fetch `photographers.full_name` (and `hero_image_url` if we want to use it as fallback) using `session.photographer_id` after loading session.
- The RLS policy "Photographers can read own profile" is `SELECT` for `authenticated` only — but "Anyone can look up photographer by custom domain" only allows if `custom_domain IS NOT NULL`. There is NO public SELECT policy for photographers by id.
- **Solution**: fetch `full_name` from `photographers` using the `photographer_id` — but this will fail for anonymous users due to RLS. We should add a public SELECT policy OR fetch from the `photographers` table only the fields needed. Actually, looking at the policies: `Photographers can read own profile` requires `authenticated`. Public anon users can only look up by `custom_domain`. 
- **Workaround**: We'll display photographer initials using data already available — or attempt the fetch and gracefully fall back to showing nothing for the avatar. Actually we can add a migration: add a policy `Anyone can read photographer profile by id` for SELECT with `true` condition (public stores need this anyway). But that exposes all photographer rows.
- **Better approach**: Just use the session's `photographer_id` and the existing data; show "D" (Davions) or just skip the logo circle for now. OR add a targeted RLS policy: `Anyone can read photographer basic info for active sessions` → `EXISTS (SELECT 1 FROM sessions WHERE photographer_id = photographers.id AND status = 'active')`. This is the cleanest approach.

### Files to change
1. **Migration**: Add RLS policy on `photographers` table allowing anonymous SELECT where the photographer has at least one active session
2. **`src/pages/store/SessionDetailPage.tsx`**: Full layout redesign per the plan above + fetch photographer data

### No changes needed
- `StorePage.tsx` — stays as-is
- `Settings.tsx` — stays as-is
- No new dependencies
