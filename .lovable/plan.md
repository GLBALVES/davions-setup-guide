
## Full picture

**What's needed:**
1. **Database** — Two new tables: `briefings` (questionnaire templates with questions as JSONB) and `booking_briefing_responses` (client answers after payment)
2. **Personalize → Studio tab** — "Briefings" section below Contracts, with a Google-Forms-style question builder
3. **SessionForm → Step 1** — Optional briefing selector (same pattern as contracts)
4. **BookingSuccess page** — After payment, if the session has a briefing, show the questionnaire inline for the client to fill out
5. **Bookings dashboard** — Show client responses per booking (read-only)

---

## Question types

Like Google Forms, each question has a type chosen at creation:
- **Short text** — single line text input
- **Long text** — textarea
- **Multiple choice** — radio buttons (one answer)
- **Checkboxes** — multiple answers
- **Yes / No** — two-option radio

Each question also has:
- `label` (the question text)
- `required` toggle (true/false)
- `options` array (only for multiple choice and checkboxes)

Questions stored as JSONB array in the `briefings` table:
```json
[
  { "id": "uuid", "type": "short_text", "label": "Client full name", "required": true },
  { "id": "uuid", "type": "multiple_choice", "label": "Mood preference", "required": false, "options": ["Natural", "Dramatic", "Soft"] },
  { "id": "uuid", "type": "checkboxes", "label": "What to include", "required": false, "options": ["Pets", "Props", "Outdoor"] },
  { "id": "uuid", "type": "yes_no", "label": "Any allergies we should know about?", "required": false },
  { "id": "uuid", "type": "long_text", "label": "Anything else you'd like us to know?", "required": false }
]
```

---

## Database migration

```sql
-- Briefing templates
CREATE TABLE public.briefings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  name            text NOT NULL DEFAULT '',
  questions       jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own briefings"
  ON public.briefings FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- Client answers (linked to booking)
CREATE TABLE public.booking_briefing_responses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL,
  briefing_id uuid NOT NULL,
  answers     jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_briefing_responses ENABLE ROW LEVEL SECURITY;
-- Anyone can insert (client submits after payment, no auth)
CREATE POLICY "Anyone can insert briefing responses"
  ON public.booking_briefing_responses FOR INSERT TO anon, authenticated
  WITH CHECK (true);
-- Photographers can read responses to their own bookings
CREATE POLICY "Photographers can read own briefing responses"
  ON public.booking_briefing_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id AND b.photographer_id = auth.uid()
    )
  );

-- Add briefing_id column to sessions
ALTER TABLE public.sessions ADD COLUMN briefing_id uuid REFERENCES public.briefings(id) ON DELETE SET NULL;
```

---

## Personalize → Studio tab

Add after the Contracts section (line 638 in Personalize.tsx), following the same visual pattern:

```
── Briefings
   "Create questionnaires to understand your clients before the session."
   [+ New briefing] button
   
   List:
   ├── Newborn Briefing   [Edit] [Delete]
   └── Wedding Brief      [Edit] [Delete]
```

**Briefing builder dialog** — full-screen or large dialog:

```
┌─ New Briefing ──────────────────────────────────────────────┐
│ Name: [_________________________________]                   │
│                                                             │
│ Questions                                                   │
│ ┌─ Question 1 ────────────────────────────────── [✕] ──┐   │
│ │ Type: [Short text ▾]   Required [toggle]              │   │
│ │ Question: [_____________________________________]      │   │
│ └───────────────────────────────────────────────────────┘   │
│ ┌─ Question 2 ────────────────────────────────── [✕] ──┐   │
│ │ Type: [Multiple choice ▾]   Required [toggle]         │   │
│ │ Question: [Mood preference?___________________]       │   │
│ │ Options:                                              │   │
│ │   Natural  [✕]                                        │   │
│ │   Dramatic [✕]                                        │   │
│ │   [+ Add option]                                      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Add question]                                            │
│                              [Cancel] [Save briefing]       │
└─────────────────────────────────────────────────────────────┘
```

State: `briefings`, `briefingDialogOpen`, `editingBriefing`, `briefingName`, `briefingQuestions` (array), `savingBriefing`, `deletingBriefingId`

Each question in `briefingQuestions`:
```typescript
interface BriefingQuestion {
  id: string;
  type: "short_text" | "long_text" | "multiple_choice" | "checkboxes" | "yes_no";
  label: string;
  required: boolean;
  options: string[]; // only for multiple_choice / checkboxes
}
```

---

## SessionForm → Step 1

Add below the Service Agreement selector (line ~1068), same visual pattern:

```
Briefing / Questionnaire (optional)
[Select a briefing ▾]    ← dropdown + "No briefing"
```

- New state: `briefingTemplates`, `selectedBriefingId`
- On mount: fetch `briefings` from DB
- On save: include `briefing_id: selectedBriefingId !== "none" ? selectedBriefingId : null` in the session upsert payload
- On load (edit): pre-select the stored `briefing_id`

Unlike contracts (where the body is frozen into the session), briefings use a FK reference (`briefing_id`) — the questions are read live at booking time. This is the right approach since the questionnaire is rendered at `BookingSuccess`, not at checkout.

---

## BookingSuccess page

After the confirmation card, if the session has a `briefing_id`:
1. Fetch the briefing questions from `briefings` where `id = briefing_id`
2. Check if a response already exists for this `booking_id` (prevent double submission)
3. Render the questionnaire inline:

```
──────────────────────────────
Before your session
We'd love to know a little more about you.

[Question 1 — short text field]
[Question 2 — radio buttons]
[Question 3 — checkboxes]
...

[Submit Briefing]    ← button, disabled after submit
──────────────────────────────
```

After submit: insert into `booking_briefing_responses`, show a thank-you message.

Data to fetch: sessions already includes `briefing_id` — add it to the select query in BookingSuccess.

---

## Bookings dashboard — viewing responses

In `src/pages/dashboard/Bookings.tsx`, when a photographer opens a booking detail, add a "Briefing" section that shows the answers if a response exists. (Low priority — can be done in same pass.)

---

## Files to change

| File | Change |
|---|---|
| `supabase/migrations/` | New `briefings` + `booking_briefing_responses` tables; `sessions.briefing_id` column |
| `src/pages/dashboard/Personalize.tsx` | Briefings CRUD section in Studio tab + builder dialog |
| `src/pages/dashboard/SessionForm.tsx` | Briefing selector state + UI in Step 1; save `briefing_id` |
| `src/pages/BookingSuccess.tsx` | Fetch briefing, render questionnaire, submit response |
| `src/pages/dashboard/Bookings.tsx` | Read-only response viewer in booking details |
