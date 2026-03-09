
## Problem

The `session_day_config` table has a database CHECK constraint: `day_of_week >= 0 AND day_of_week <= 6`. The code tries to save a global business-hours row using `day_of_week = -1` as a sentinel, which the constraint rejects silently. This means business hours are never actually saved to the database, so they can't be loaded back when reopening a session.

## Solution

**Two-part fix:**

1. **Database migration** — Drop the `day_of_week >= 0` part of the constraint, changing it to `day_of_week >= -1 AND day_of_week <= 6` to allow the `-1` sentinel for the global config row.

2. **Frontend fix in `SessionForm.tsx`** — The `handleSaveAvailability` function already has the correct logic (saves `day_of_week: -1`), and `loadSession` already reads it back (`rows.find(r => r.day_of_week === -1)`). Once the DB constraint is fixed, both save and load will work correctly as written.

## Technical Details

```text
session_day_config
─────────────────────────────────────────
Current:  CHECK (day_of_week >= 0 AND day_of_week <= 6)
Fix:      CHECK (day_of_week >= -1 AND day_of_week <= 6)
                           ^^
                  -1 = global config sentinel
```

Migration SQL:
```sql
ALTER TABLE public.session_day_config
  DROP CONSTRAINT session_day_config_day_of_week_check;

ALTER TABLE public.session_day_config
  ADD CONSTRAINT session_day_config_day_of_week_check
    CHECK (day_of_week >= -1 AND day_of_week <= 6);
```

No frontend code changes needed — the load/save logic is already correct.
