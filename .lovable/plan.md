
## Problem

The Business Hours and Buffer config currently appears **inside** the expanded slot panel — only visible when the user clicks to expand a day. The user wants these to be a **standalone, always-visible section per day row**, separate from the slots.

## New Layout

Each day row should have two distinct areas:

```text
┌─────────────────────────────────────────────────────────┐
│  Monday                                                  │  ← day label row (always visible)
│  Business hrs  [09:00] → [17:00]  │  Buffer [15] before [15] after  │
└─────────────────────────────────────────────────────────┘
  ▼ (expanded)
  ┌── slot 09:00 → 10:00  [x] ─────────────────────────┐
  └── slot 10:15 → 11:15  [x] ─────────────────────────┘
  + Add slot form
```

The **Business Hours + Buffer row** lives directly inside the day container, **always visible** (not behind the expand toggle), between the day header and the slot list.

## Change: `src/pages/dashboard/SessionForm.tsx`

Move the business-hours + buffer `<div>` block (lines 754–820) from inside the `{isExpanded && (...)}` block to **outside it**, placed directly after the day header row `<div>` (after line 749), so it always renders regardless of expansion state.

- Remove the wrapping `bg-muted/10 border-t` container style from the config block (it should feel attached to the header, not the slot panel).
- Give it its own subtle separator / background so it's clearly a config strip.
- The `{isExpanded && (...)}` block then only contains the slots list and add-slot form.

This is a **layout-only change** — no state, no DB, no logic changes needed.
