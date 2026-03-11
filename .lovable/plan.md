
## Scope of Changes

The entire app uses `HH:mm` (24-hour) in two distinct ways that need separate treatment:

**1. Display only (read-only text)** — convert `HH:mm` strings to `h:mm AM/PM` format
**2. Input fields** — `type="time"` HTML inputs which always store `HH:mm` internally (browsers use it as the underlying value regardless of locale). The displayed picker format depends on the OS, but we should add a helper to show the resolved time nicely alongside inputs.

---

## Files to Change

### Display formatting (reading `start_time`/`end_time` and rendering)

| File | What to fix |
|---|---|
| `WeekView.tsx` | `formatTime()` already exists and already uses `en-US` 12h — ✅ Already correct. But hour labels use `${h-12}pm` — need to verify the sidebar labels (e.g. `6am`, `12pm`, `1pm`) |
| `DayView.tsx` | Same — `formatTime()` already correct. Hour labels also already correct. |
| `SessionDetailPage.tsx` | Line 679: `{selectedSlot.start_time} – {selectedSlot.end_time}` — raw `HH:mm` shown to clients. Line 647: `<span>{slot.start_time}</span>` in the time picker — raw `HH:mm`. Line 919: `session_time` variable in contract. Need a `formatTime12` helper. |
| `BlockDayDialog.tsx` | Lines 131 in `WeekView` toast: shows raw `overlap.start_time`. Toast in `DayView` line 119. The conflict warning in `CreateBookingDialog` line 288 shows raw times. |
| `CreateBookingDialog.tsx` | Line 288: conflict warning shows `${conflictingBlock.start_time.slice(0,5)}–${conflictingBlock.end_time.slice(0,5)}` in raw format |
| `SessionForm.tsx` | Lines 1388-1389: slot chips show raw `{start} → {end}`. Need to display them in 12h. |

### Input fields (`type="time"`)

- `BlockDayDialog.tsx` — time range inputs (lines 176, 183): These are `type="time"` inputs. On most systems this will render as 12h when the OS is set to en-US. We should keep `type="time"` since it's needed for form value, but add an AM/PM custom picker using selects OR accept native behavior (most US browsers/OS show 12h for `type="time"` anyway).
- `SessionForm.tsx` — business hours inputs (lines 1251, 1265): same situation.
- `CreateBookingDialog.tsx` — start/end time inputs (lines 264, 273): same situation.
- `EmailCampaignEditor.tsx` — send time input: same situation.

**Decision for `type="time"` inputs**: The HTML `<input type="time">` renders in 12h AM/PM format on macOS/Windows with US locale automatically. However, the stored value is always `HH:mm`. The best approach is to **replace `type="time"` inputs with custom AM/PM select-based time pickers** to guarantee 12h format regardless of OS settings. This is the only way to truly enforce AM/PM in the UI.

---

## Implementation Plan

### Step 1 — Create a shared utility
Add `formatTime12(t: string): string` to `src/lib/utils.ts`:
```ts
export function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
```

### Step 2 — Create a `TimePickerInput` component
Create `src/components/ui/time-picker-input.tsx` — a custom component using two Selects (hour + minute) plus AM/PM toggle, reading/writing `HH:mm` internally. This replaces `<Input type="time">` everywhere.

### Step 3 — Fix display-only occurrences
- `SessionDetailPage.tsx`: Use `formatTime12` for slot buttons and "Selected slot" summary
- `CreateBookingDialog.tsx`: Use `formatTime12` in the conflict warning message
- `SessionForm.tsx`: Use `formatTime12` for slot chip labels

### Step 4 — Replace `type="time"` inputs
- `BlockDayDialog.tsx`: Replace time range inputs with `TimePickerInput`
- `CreateBookingDialog.tsx`: Replace start/end inputs with `TimePickerInput`
- `SessionForm.tsx`: Replace business hours inputs with `TimePickerInput`
- `EmailCampaignEditor.tsx`: Replace send time input with `TimePickerInput`

The `TimePickerInput` component will:
- Accept `value: string` (HH:mm) and `onChange: (v: string) => void`
- Render as: Hour select (1–12) + Minute select (00, 15, 30, 45 or 00–55 by step) + AM/PM toggle buttons
- Convert back to `HH:mm` internally for all data operations

---

## Summary

- 1 utility function added to `utils.ts`
- 1 new shared component `TimePickerInput`
- 6 files updated for display + input fixes
- All data stored and computed internally remains `HH:mm` — no DB changes needed
