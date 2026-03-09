
## Problem
The "Business Hours" and "Buffer" inputs live inside a collapsible section per day. The section only opens when the user clicks the day name. There is no visual affordance (chevron, arrow, etc.) indicating the row is expandable — so users never discover those inputs.

## Fix
Add a **ChevronDown / ChevronRight icon** to each day row header that rotates when the day is expanded. This is a standard disclosure pattern and immediately communicates "click to see more".

### Single change: `src/pages/dashboard/SessionForm.tsx`

1. Import `ChevronRight` from `lucide-react` (already imported as a bundle, just add the name).
2. In the day header `<button>` (around line 712), add a `<ChevronRight>` icon at the end that rotates 90° when `isExpanded`.

```text
BEFORE (day header button):
  [ Monday ]  [ 2 slots ]                         [+]

AFTER:
  [ > ] [ Monday ]  [ 2 slots ]                   [+]
         ↳ chevron rotates to ↓ when expanded
```

This is a **one-area, zero-logic change** — no new state, no DB changes, no new files. Just the icon and the CSS rotation class `transition-transform` + `rotate-90` when `isExpanded`.

### Files changed
| File | Change |
|---|---|
| `src/pages/dashboard/SessionForm.tsx` | Add ChevronRight icon to day row header with rotation on expand |
