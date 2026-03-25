

## What needs to change

The deadline button for `shot` and `post_production` stages (lines 409–421) currently:
- Shows a timer icon + deadline label as a button
- Has `hover:opacity-80` but **no pencil/edit icon visible on hover**
- Only says "Set deadline" when empty — no visual cue when a deadline already exists

### Goal
- When hovering, show a small `Pencil` icon to the right of the label
- The entire row (icon + label + pencil on hover) is clickable and opens the calendar popover
- Consistent with the gallery expiry button which already has `group-hover/expiry:opacity-60` for the pencil

---

## Technical plan

**File:** `src/pages/dashboard/Projects.tsx`

**Single change** — replace lines 409–421 (the deadline button for shot/post_production) to add:
1. A `group/deadline` class on the button
2. The `Pencil` icon after the label with `opacity-0 group-hover/deadline:opacity-60 transition-opacity` — mirrors the gallery expiry pencil already working at line 398

```tsx
) : showDeadlineEditor ? (
  <button
    ref={deadlineAnchorRef}
    type="button"
    onClick={(e) => { e.stopPropagation(); setDeadlinePopoverOpen(true); }}
    className={`group/deadline flex items-center gap-0.5 shrink-0 font-medium ${deadlineStatus ? DEADLINE_BADGE[deadlineStatus] : "text-muted-foreground/50"} hover:opacity-80 transition-opacity`}
  >
    {deadlineStatus === "overdue"
      ? <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      : <Timer className="h-2.5 w-2.5 shrink-0" />
    }
    <span>{deadlineLabel ?? p_t.setDeadline ?? "Set deadline"}</span>
    <Pencil className="h-2 w-2 shrink-0 opacity-0 group-hover/deadline:opacity-60 transition-opacity ml-0.5" />
  </button>
```

That's the entire change — one button gets `group/deadline` class and the `Pencil` icon appended at the end.

