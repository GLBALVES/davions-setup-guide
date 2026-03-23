
## Problem

The current card has a separate "deadline row" below the shoot date that includes a `Popover` with a full `Calendar` component for setting per-card deadlines. The user says: "É só para mostrar o prazo" — it should only **display** the deadline, not allow editing from the card. And it should be on the **same line as the shoot date**.

## Solution

Simplify the `KanbanCard` deadline display:

1. **Remove** the entire `showDeadlineRow` section (lines 277–336) — the `Popover`, `Calendar`, and separate row.
2. **Remove** `deadlineOpen` state, `onSetDeadline` prop usage from the card display area, and the calendar import dependency from the card.
3. **Add** the deadline info inline on the same line as the shoot date — right side of the date row.

### New shoot date + deadline line

```tsx
{project.shoot_date && (
  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground min-w-0">
    <span className="flex items-center gap-1 shrink-0">
      <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
      <span>{format(new Date(project.shoot_date), "MMM d, h:mm a")}</span>
    </span>
    {effectiveDeadline && deadlineLabel && (
      <span className={`flex items-center gap-0.5 shrink-0 font-medium ${deadlineStatus ? DEADLINE_BADGE[deadlineStatus] : ""}`}>
        {deadlineStatus === "overdue"
          ? <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
          : <Timer className="h-2.5 w-2.5 shrink-0" />
        }
        <span>{deadlineLabel}</span>
      </span>
    )}
  </div>
)}
```

### What stays the same
- `effectiveDeadline` computation (shot + post_production) — unchanged
- `deadlineStatus` and color logic — unchanged  
- `deadlineLabel` human-readable text — unchanged
- Border color alert on the card — unchanged
- `onSetDeadline` prop can be removed from `KanbanCard` entirely (per-card deadline setting moves exclusively to `ProjectDetailSheet`)

### Files to edit
- `src/pages/dashboard/Projects.tsx` only — lines 150–340 (KanbanCard body)

Remove: `deadlineOpen` state, the `showDeadlineRow` block, the separate deadline row JSX, the `onSetDeadline` prop from KanbanCard interface.
Add: inline deadline display on the shoot date row.
