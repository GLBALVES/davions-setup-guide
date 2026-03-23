
## Problem

Currently the `gallery_deadline` is a per-project field editable only inside the `ProjectDetailSheet`. The user wants a **single column-level deadline** set directly in the "FOTOGRAFADAS" column header, which applies to all projects in that column and drives the color alerts.

The user's intent: "define the deadline for creating galleries" is a **studio-wide policy** (e.g., "I deliver proof galleries within 7 days of the shoot"). This deadline should live in the column header, not buried in each card.

## Solution

Two approaches are viable:
1. **Per-photographer default deadline offset** (e.g., "7 days after shoot date") — stored in DB
2. **A single absolute date** set in the column header — simpler but less useful

The best UX is a **delivery window in days** (e.g., "deliver within X days of shoot date"), shown in the column header with an editable input. This automatically calculates each card's deadline based on `shoot_date + X days`, without needing per-card manual dates.

But re-reading the request: the user says "o prazo vale para todas" — the deadline is **one value for the whole column**. The simplest interpretation is: a single date or day-count in the column header that all "shot" cards share.

### Chosen approach: Column header date picker + per-card auto-fill

Add a date/deadline button in the "FOTOGRAFADAS" column header. When clicked, opens a small Popover with a date picker. This selected date is stored in `localStorage` (no DB change needed for a per-user quick setting) and used as the `gallery_deadline` for all shot-stage cards that don't already have one set individually.

**However**, if the user wants it more like a "default delivery window", a better approach is: **number of days** (e.g., "14 days") stored as a photographer preference. This sets the delivery expectation for all new shot projects.

### Final plan

Add a **deadline input in the KanbanColumn header** for the "shot" column only:
- Shows a small `Calendar` icon button next to the column title
- Clicking opens a Popover with a date picker
- The selected date is stored as a **per-photographer setting** in a new `localStorage` key (`shot_gallery_deadline`)
- All cards in "FOTOGRAFADAS" without a manually set `gallery_deadline` will use this column-level deadline for the color alerts
- Cards with their own `gallery_deadline` continue using their individual date

### Changes

**`Projects.tsx`**:

1. Add state `const [shotDeadline, setShotDeadline] = useState<string | null>(...)` — initialized from `localStorage`
2. Persist to `localStorage` when changed
3. Pass `shotDeadline` and `onSetShotDeadline` to `KanbanColumn`
4. In `KanbanColumn` header for `stage.key === "shot"`:
   - Add a `Calendar` icon button that opens a Popover with a shadcn Calendar date picker
   - Show the selected date formatted (e.g., "until Jun 5") or nothing if not set
5. In `KanbanCard` / deadline logic: use `project.gallery_deadline ?? shotDeadline` as the effective deadline for color/badge rendering

No DB migration needed — this is a UI-level default stored in localStorage.

### Files to edit
- `src/pages/dashboard/Projects.tsx` only — add `shotDeadline` state, pass to column, update card deadline logic, add Popover+Calendar in column header for "shot" stage
