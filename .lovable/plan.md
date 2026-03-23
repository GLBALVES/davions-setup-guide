

## Enriching the ProjectDetailSheet — Inspired by Reference

The reference image shows a full project management view with: Project Details sidebar (Client, Project Type, Date, Location, Description), Payments section, Documents, Sessions, and Notes. We'll adapt what's realistic given our data model.

### What we can add (we have the data)

1. **Two-column layout** — Left: session/booking details. Right: Project Details summary (read-only style like reference)
2. **Location field** — new DB column on `client_projects` (the session table already has `location`)
3. **Description field** — new DB column on `client_projects`  
4. **Client phone** — new DB column on `client_projects`
5. **Linked booking/session info** — already fetched via `booking_id` join; show session title, price, duration
6. **Notes section** — already exists, keep as-is but style like the reference (with placeholder "Write a note...")
7. **Stage badge next to title** — move stage to header area as a colored badge (like reference)

### What we won't add (no data available yet)
- Payments/invoices (no invoicing table linked to projects)
- Documents section (no document storage per project)
- Conversations (no chat per project)

These can be future features.

### Plan

**1. Database migration** — Add 3 new columns to `client_projects`:
```sql
ALTER TABLE public.client_projects 
  ADD COLUMN IF NOT EXISTS location text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_phone text DEFAULT NULL;
```

**2. ProjectDetailSheet.tsx** — Major redesign:

- **Header**: Project title (large, editable) + Stage badge inline (colored chip, clickable to change)
- **Two-column layout** (on `sm:` screens):
  - **Left column**: 
    - Session info section (linked booking session name, type, date/time, location)
    - Gallery deadline (existing)
    - Notes (existing, restyled)
  - **Right column** "Project Details" panel:
    - Client name (editable, linked style like reference)
    - Client email
    - Client phone (new)
    - Project Type (session type selector)
    - Project Date (shoot date + time)
    - Location (new, editable)
    - Description (new, editable)
- **Footer**: Archive/Delete actions + metadata timestamps

**3. Projects.tsx** — Update `ClientProject` interface and `fetchProjects` to include new fields. Update `ProjectSheetData` export.

**4. Translations** — Add keys for Location, Description, Phone in all 3 languages.

### Files to edit
- `src/components/dashboard/ProjectDetailSheet.tsx` — full redesign
- `src/pages/dashboard/Projects.tsx` — interface + fetch updates
- `src/lib/i18n/translations.ts` — new translation keys
- New migration SQL for the 3 columns

