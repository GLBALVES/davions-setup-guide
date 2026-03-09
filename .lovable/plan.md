
## Problem

Business hours and buffer are currently configured individually for each of the 7 day rows — showing the same inputs 7 times. The user wants **one single config above the day list** that applies as a global rule to all days.

## Approach

Replace the per-day `Map<number, DayConfig>` state with a single `globalConfig` object. The UI shows one "Business Hours" + "Buffer" block above the day rows, inside the "Weekly Availability" section.

### State changes

Remove:
```ts
const [dayConfigs, setDayConfigs] = useState<Map<number, DayConfig>>(new Map());
```

Add:
```ts
const [globalConfig, setGlobalConfig] = useState<DayConfig>(DEFAULT_DAY_CONFIG());
```

All calls to `getDayConfig(dayIdx)` become just `globalConfig`. All calls to `updateDayConfig(dayIdx, patch)` become `setGlobalConfig(prev => ({...prev, ...patch}))`.

### DB: single row per session

The `session_day_config` table has a `day_of_week` column — but now we only save **one row with `day_of_week = -1` (sentinel for "global")**. This avoids any schema migration.

- **Save**: delete all existing rows for the session, then insert 1 row with `day_of_week = -1`.
- **Load**: read the single row where `day_of_week = -1` (or any row if none found with -1, for backward compat) and populate `globalConfig`.

### UI changes

1. **Remove** the business hours + buffer `<div>` block from inside the `DAY_ORDER.map(...)` loop (currently lines 751–819).
2. **Add** a single config block just above the `<div className="flex flex-col border ...">` day rows container (around line 703), between the section description and the day list.

Layout becomes:
```
Weekly Availability
Each day can have different time slots...

┌─ Business Hours ─────────────────────────────────┐
│  [09:00] → [17:00]   Buffer: [15] before [15] after │
└──────────────────────────────────────────────────┘

┌─ Monday ─────────────────────────┐
│ ▶ Monday     No slots            │ [+]
├─ Tuesday ────────────────────────┤
│ ▶ Tuesday    No slots            │ [+]
...
```

### Validation (no change needed)

`handleAddSlotForDay` already reads `getDayConfig(day)` — just replace that with `globalConfig` directly. Same logic, same toast messages.

`suggestNextStart` same — replace `cfg` reference with `globalConfig`.

### Files changed

| File | Change |
|---|---|
| `src/pages/dashboard/SessionForm.tsx` | Replace per-day Map state with single `globalConfig`; move config UI above day list; update save/load logic to use `day_of_week = -1` sentinel |

No DB migration needed.
