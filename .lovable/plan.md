
## Root Cause

The deadline button in Shot/Post-production cards is not responding to clicks because it sits inside a **DnD Sortable context** (`useSortable`). The `PointerSensor` captures all `pointerdown` events on the card element — including those on child buttons — intercepting them before the click handler fires.

The gallery expiry button likely has the same issue (or appears to work by luck due to event order differences).

The fix is well-established for dnd-kit: add `onPointerDown={(e) => e.stopPropagation()}` to any interactive child button inside a sortable card to prevent the DnD sensor from swallowing the event.

---

## What needs to change

**File:** `src/pages/dashboard/Projects.tsx`

**Two buttons** need `onPointerDown` protection:

1. **Deadline button** (Shot / Post-production) — line ~410
2. **Gallery expiry button** (Proof / Final gallery) — line ~387

Add to each:
```tsx
onPointerDown={(e) => e.stopPropagation()}
```

This is the only change needed. The pencil icon and popover logic are already correct.

---

## Technical detail

dnd-kit's `PointerSensor` listens to `pointerdown` on the draggable node. Because the draggable node is the outer card `div`, any `pointerdown` inside it is captured by the sensor — blocking child button clicks. Stopping propagation on `pointerdown` in the child button prevents the sensor from seeing the event, allowing the click to fire normally.
