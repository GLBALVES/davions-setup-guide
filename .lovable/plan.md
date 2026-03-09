
## Overview

Transform the single-page `SessionForm` into a **2-step wizard**:

- **Step 1 — Session Details**: Cover photo + all basic fields (title, type, description, price, location, duration, break, photos, status) → button: **"Create Session"** (creates the record in DB, advances to step 2)
- **Step 2 — Availability**: Global business hours + buffer + weekly day slots → button: **"Save & Finish"** (saves availability + config, navigates to sessions list)

In **edit mode**, both steps are already unlocked. The wizard defaults to step 1 and the user can click between steps freely.

---

## State changes

Add:
```ts
const [step, setStep] = useState<1 | 2>(1);
const [sessionId, setSessionId] = useState<string | undefined>(id);
```

Remove the local `let sessionId = id` inside `handleSave` (it now lives in state).

---

## Two handler functions

### `handleCreateSession` (Step 1 → Step 2)
- Validates `title`
- Inserts (or updates) the session row only (no slots, no config)
- Sets `sessionId` in state
- Advances `step` to `2`

### `handleSaveAvailability` (Step 2 → done)
- Saves new local slots to `session_availability`
- Saves `globalConfig` to `session_day_config`
- Navigates to `/dashboard/sessions`

The existing `handleSave` is split into these two functions.

---

## UI structure

```text
Step indicator (top of form):
  ① Session Details  ──────  ② Availability

Step 1 content:
  [Cover photo]
  [All Session Details fields]
  [Cancel]  [Create Session →]

Step 2 content:
  [Business Hours + Buffer block]
  [Weekly day rows]
  [← Back]  [Save & Finish]
```

Step indicator: two numbered circles connected by a line. Active step is filled; inactive is outlined. Clicking step 2 only allowed after session is created.

---

## Edit mode behaviour

When `isEdit === true`:
- `sessionId` initialised from URL `id`
- `step` starts at `1`
- Both step tabs are clickable freely
- Step 1 button label: **"Save & Continue →"**
- Step 2 button label: **"Save & Finish"**

---

## Files changed

| File | Change |
|---|---|
| `src/pages/dashboard/SessionForm.tsx` | Add `step` state, split `handleSave` into two handlers, replace single-page layout with two conditional step sections, add step indicator UI |
