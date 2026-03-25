
## Root Cause (definitive)

The deadline popover (`div` at lines 474–512) is rendered **inside** `<div ref={setNodeRef}>` — the sortable node managed by dnd-kit. Two compounding problems:

1. The dnd-kit `PointerSensor` still captures the `pointerdown` on the outer `<div onClick={() => onView(project)}>` wrapper (line 316–317), which fires `onView()` and closes/prevents the popover.
2. Even if `setDeadlinePopoverOpen(true)` does fire, the `fixed` overlay is inside the sortable DOM node — dnd-kit applies CSS transforms to it, which break `position: fixed` rendering (a known browser behavior: `position: fixed` is relative to the nearest transform ancestor, not the viewport).

**The correct fix** requires two changes:

1. Move the popover portals **outside the card DOM** using `ReactDOM.createPortal(..., document.body)` so they escape both the transform context and the sortable node entirely.
2. Move the `<div onClick={() => onView(project)}>` to be a sibling (not parent) of the deadline button area, or use `e.stopPropagation()` on the whole deadline zone's `onClick` to prevent `onView` from firing.

---

## What changes in `src/pages/dashboard/Projects.tsx`

### Change 1 — Add `import ReactDOM from "react-dom"` at top (line 1)

### Change 2 — Split the card's clickable area from interactive elements

The inner `div` at line 315–472 has `onClick={() => onView(project)}` wrapping **everything** including the deadline button. The deadline button does `e.stopPropagation()` but the outer div still may receive the event.

Replace the single `onClick` wrapper div with a structure where the deadline/expiry buttons are siblings outside the click zone — or keep the structure but ensure the popover opens via portal.

### Change 3 — Portal the deadline popover (lines 474–512)

Wrap the deadline popover `div` in `ReactDOM.createPortal(..., document.body)`:

```tsx
{showDeadlineEditor && deadlinePopoverOpen && ReactDOM.createPortal(
  <div
    className="fixed inset-0 z-[9999]"
    onClick={(e) => { e.stopPropagation(); setDeadlinePopoverOpen(false); }}
  >
    <div
      className="absolute z-[10000] bg-popover border border-border rounded-md shadow-md p-0 w-auto"
      style={{
        top: deadlineAnchorRef.current ? deadlineAnchorRef.current.getBoundingClientRect().bottom + 4 : 0,
        left: deadlineAnchorRef.current ? deadlineAnchorRef.current.getBoundingClientRect().left : 0
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Calendar + TimePickerInput unchanged */}
    </div>
  </div>,
  document.body
)}
```

### Change 4 — Portal the gallery expiry popover (lines 514–544)

Same treatment — wrap in `ReactDOM.createPortal(..., document.body)`.

### Change 5 — Fix the card click handler conflict

The deadline button already does `e.stopPropagation()` on `onClick`. The problem is the outer `div`'s `onClick={() => onView(project)}` is on the **same element** as the content div. The button's `stopPropagation` should work in the bubble phase. But to be safe, also add `onPointerDown={(e) => e.stopPropagation()}` at the deadline button — which was already done. The key missing piece was the portal.

---

## Summary of file edits

- Line ~1: add `import ReactDOM from "react-dom";`  
- Lines ~474–512: wrap deadline popover in `ReactDOM.createPortal(..., document.body)`, bump z-index to `9999/10000`  
- Lines ~514–544: wrap gallery expiry popover in `ReactDOM.createPortal(..., document.body)`, same z-index
