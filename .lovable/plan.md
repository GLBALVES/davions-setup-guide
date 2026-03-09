
## Plan: Business Hours + Buffer Times per Day

### What the user wants

Two new per-day settings for the Weekly Availability section:

1. **Business Hours Range** — a `from/to` time range (e.g. 09:00–17:00) that limits when slots can be scheduled. Acts as a guard: no slot can start before `from` or end after `to`.
2. **Buffer / Blocking time** — extra padding before the first slot of the day and after the last slot of the day (e.g. 15 min before, 15 min after). Different from "break between sessions" which already exists.

### Data model

Add two new columns to `session_availability` — but those are *per-slot* rows. Business hours and buffers are *per-day* settings, not per-slot.

Best approach: a new **`session_day_config`** table:

```
id                 uuid  PK
session_id         uuid  FK → sessions
photographer_id    uuid  FK → photographers
day_of_week        int   (0–6)
hours_start        time  nullable  -- e.g. "09:00"
hours_end          time  nullable  -- e.g. "17:00"
buffer_before_min  int   DEFAULT 0
buffer_after_min   int   DEFAULT 0
```

RLS: same pattern as other tables (photographer owns their own rows).

This avoids duplicating the same values on every slot row and keeps per-day config separate from per-slot availability.

### UI changes — per day expanded section

When a day is expanded, show a config bar **above the slot list**:

```
┌───────────────────────────────────────────────────────┐
│ BUSINESS HOURS   [09:00] → [17:00]                    │
│ BUFFER           [15] min before  [15] min after      │
└───────────────────────────────────────────────────────┘
── existing slots ──
```

These are small inline inputs rendered for the expanded day. Changes are stored in component state as a `Map<day, DayConfig>` and saved alongside slots on form save.

### Validation changes in `handleAddSlotForDay`

When the user confirms a slot, validate:
1. `newStart` >= `hours_start + buffer_before_min` (if hours_start is set)
2. computed `end_time` + `buffer_after_min` <= `hours_end` (if hours_end is set)

Show descriptive toast errors if violated.

### `suggestNextStart` update

If the day has no slots yet and `hours_start` is set, the default suggestion becomes `hours_start + buffer_before_min` instead of `"09:00"`.

### Files changed

| File | Action |
|---|---|
| `supabase/migrations/` | New migration: create `session_day_config` table + RLS |
| `src/pages/dashboard/SessionForm.tsx` | Add `DayConfig` state, UI inputs per expanded day, validation, save/load logic |

No new component needed — the day-config inputs are small enough to live inline in `SessionForm.tsx`.

### Load (edit mode)

On `loadSession`, also fetch `session_day_config` rows for the session and populate the `dayConfigs` map.

### Save

After upserting the session and inserting slots, upsert the `session_day_config` rows (one per day that has a config set, using `day_of_week` + `session_id` as the natural key via an `ON CONFLICT` clause or delete+insert).
