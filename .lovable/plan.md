

## Implementing Contract Templates

### What needs to be built

**1. Database** — New `contracts` table for reusable contract templates.

**2. Personalize → Studio tab** — A "Contracts" section below Session Types to create, edit, and delete contract templates.

**3. SessionForm → Step 1** — A "Service Agreement" selector that lets the photographer pick a contract from their templates (or none). The selected contract body is copied into `sessions.contract_text`.

---

### Database migration

```sql
CREATE TABLE public.contracts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  name            text NOT NULL DEFAULT '',
  body            text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own contracts"
  ON public.contracts FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
```

---

### Personalize → Studio tab (src/pages/dashboard/Personalize.tsx)

Add after the Session Types section (line 543), inside the same `TabsContent`:

```
STUDIO
├── Session Types  [existing]
├── ─────────────
└── Contracts
    ├── Description text
    ├── [+ New contract] button
    └── List:
        ├── Standard Agreement   [Edit] [Delete]
        └── Newborn Contract     [Edit] [Delete]
```

New state: `contracts`, `contractDialogOpen`, `editingContract`, `contractName`, `contractBody`, `savingContract`.

**Dialog** — opens for both create and edit:
- Name field (text input)
- Body field (plain `<textarea>`, matching the simple style used elsewhere; no Tiptap here since clients read it as plain text in the checkout checkbox)
- Save / Cancel

The `body` is plain text (not rich text) to keep it consistent with how `contract_text` is displayed client-side (simple checkbox acceptance text).

---

### SessionForm → Step 1 (src/pages/dashboard/SessionForm.tsx)

**New state:**
```typescript
const [contracts, setContracts] = useState<{id: string; name: string; body: string}[]>([]);
const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
const [contractText, setContractText] = useState("");
```

**On mount:** fetch `contracts` from the new table for the logged-in photographer.

**Loading (edit mode):** read `contract_text` from the session and pre-populate `contractText`. Since the text is frozen (copied from template), there's no way to reverse-match to a template ID — so on edit, if `contract_text` is set, display it with an info note "Contract from a previous template" + allow changing.

**Step 1 UI** — Add below the `location` field and before the `duration/break/numPhotos` grid (around line 984):

```
Service Agreement (optional)
[Select a contract template ▾]    ← dropdown of saved contracts + "No contract"

If a contract is selected:
  ┌─ contract body preview (read-only, 4 lines, truncated) ─┐
  │ "By booking this session, the client agrees to…"        │
  └──────────────────────────────────────────────────────────┘
  [View full contract] (expands inline)
```

**On save (`handleCreateSession`):** include `contract_text: contractText || null` in the payload.

**Flow:**
```
contracts.body → (copied to) contractText state → sessions.contract_text
```
The text is frozen at the moment of selection — future edits to the template don't affect existing sessions.

---

### Files changed

| File | Change |
|---|---|
| `supabase/migrations/` | New `contracts` table + RLS |
| `src/pages/dashboard/Personalize.tsx` | Contracts section in Studio tab |
| `src/pages/dashboard/SessionForm.tsx` | Contract selector + state in Step 1 |

