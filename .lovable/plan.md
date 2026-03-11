

## Analysis

**Current state — what's lacking:**
- Contract editor is a plain `<textarea>` inside a small `max-w-lg` dialog. No formatting, no rich text, no variables.
- No sense of "document" — it looks like a text field, not a contract.

**Pixieset reference (the uploaded image) shows:**
- A dedicated **full-page editor** (not a dialog), with a left sidebar for settings and a large centered document preview
- **Rich text toolbar** at the top: bold, italic, underline, strikethrough, alignment, lists, horizontal rule, link, clear formatting
- **"Insert Field" button** — inserts dynamic variables (like `{{Client Name}}`, `{{Session Date}}`, etc.) at cursor position
- **"Variables" dropdown** — lists all available smart fields
- Document is rendered as a white paper-like canvas centered on a neutral background
- Left sidebar: Template name, settings like "My Signature Required", "Document Expiry", "Document Reminders"
- Variables are highlighted inline in the document text (underlined, colored)

**Plan: Replace the dialog with a full-page contract editor**

---

## What to build

### 1. New route: `/dashboard/contracts/:id/edit` (or `/new`)

A dedicated full-page editor that mimics the Pixieset feel:
- **Left sidebar** (250px): Contract name (editable inline), settings panel
- **Main area**: White document canvas centered on a warm off-white background
- **Top bar**: Rich text toolbar + "Insert Field" button + "Variables" dropdown + "Done" button (saves + returns to Personalize)

### 2. Variables system

When the photographer writes a contract, they can insert smart variables that get replaced with real data at booking time (when `contract_text` is frozen into the session). Variables rendered as highlighted chips inline in the editor.

Available variables:
```
{{Client Name}}     → clientName  (from booking form)
{{Client Email}}    → clientEmail
{{Session Title}}   → session.title
{{Session Date}}    → selectedSlot.label
{{Session Time}}    → selectedSlot.start_time
{{Session Duration}} → session.duration_minutes formatted
{{Session Price}}   → session.price formatted
{{Photographer Name}} → photographer.full_name
{{Studio Name}}     → photographer.businessName
{{Studio Address}}  → photographer.businessAddress
```

### 3. Contract body: switch from plain text to HTML

The `contracts.body` column already stores text. We'll store HTML (from Tiptap) instead. The `SessionDetailPage` already renders `contract_text` — we update it to render HTML with `dangerouslySetInnerHTML` instead of `whitespace-pre-wrap`.

Variable substitution: When a session is created with a contract, at save time we replace `{{Variable}}` tokens with actual values from the session data.

### 4. Contracts list in Personalize

Instead of just Edit/Delete icons, show a proper card with a thumbnail-like preview and an "Open editor" button that navigates to the full-page editor.

---

## Implementation details

### New file: `src/pages/dashboard/ContractEditor.tsx`

```
┌─ Top bar ─────────────────────────────────────────────────────────────────┐
│ ← [Back]   CONTRACT NAME (editable)  ·  All changes saved    [Done] btn  │
│ ─────────────────────────────────────────────────────────────────────────  │
│ B I U S | ≡ ≡ ≡ ≡ | ≡● ≡# — | 🔗 ✕link | [Insert Field ▾] [Variables ▾]│
└──────────────────────────────────────────────────────────────────────────┘
┌─ Left sidebar ──┐  ┌─ Document canvas (centered white paper) ────────────┐
│ Template name   │  │                                                      │
│ [___________]   │  │   CONTRACT TITLE                                     │
│                 │  │                                                       │
│ ─────────────── │  │  This agreement is made between {{Client Name}}...  │
│ Settings        │  │  Session: {{Session Title}} on {{Session Date}}...   │
│                 │  │                                                       │
│ (future: expiry,│  │                                                       │
│  signature etc) │  │                                                       │
└─────────────────┘  └──────────────────────────────────────────────────────┘
```

### Variable insertion with Tiptap

Use a custom Tiptap `Node` extension (`VariableNode`) that renders variables as styled inline chips (blue/teal underline, like Pixieset). When inserting via "Insert Field", call `editor.chain().focus().insertContent({ type: 'variable', attrs: { label: 'Client Name', key: 'client_name' } })`.

For storage: serialize variables as `[[client_name]]` tokens in the stored HTML so they survive editor round-trips. On rendering client-side (SessionDetailPage), replace `[[key]]` with actual values.

### Route

Add to `App.tsx`:
```tsx
<Route path="/dashboard/contracts/new" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
<Route path="/dashboard/contracts/:id/edit" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
```

### Update Personalize contracts list

Cards become:
```
┌──────────────────────────────────────────────────────┐
│  Standard Photography Agreement                       │
│  3 variables · Last edited 2 days ago                 │
│                                              [Open]   │
└──────────────────────────────────────────────────────┘
```
"Open" navigates to `/dashboard/contracts/:id/edit`.
"New contract" navigates to `/dashboard/contracts/new`.
Delete stays inline with a confirm.

### Variable substitution at session save

In `SessionForm.tsx`, when a contract is selected and `contractText` is copied from `contracts.body` (HTML), replace variable tokens at save time:

```typescript
function resolveContractVariables(html: string, data: {
  clientName?: string, sessionTitle: string, sessionDate?: string, ...
}) {
  return html
    .replace(/\[\[client_name\]\]/g, data.clientName ?? '')
    .replace(/\[\[session_title\]\]/g, data.sessionTitle)
    ...
}
```

Wait — since the session is created BEFORE the client books, we don't have the client name at session-save time. So variables are resolved at **booking time** in `SessionDetailPage`, not at session-save time. The `contract_text` stored in the session keeps the `[[variable]]` tokens. `SessionDetailPage` resolves them before rendering.

### Update SessionDetailPage contract rendering

Replace `whitespace-pre-wrap` text rendering with:
```tsx
const resolvedContract = resolveVariables(session.contract_text, {
  client_name: clientName,
  session_title: session.title,
  session_date: selectedSlot.label,
  session_time: selectedSlot.start_time,
  ...
});
<div dangerouslySetInnerHTML={{ __html: resolvedContract }} className="prose prose-sm max-w-none" />
```

---

## Files to change

| File | Change |
|---|---|
| `src/pages/dashboard/ContractEditor.tsx` | **New** — full-page contract editor |
| `src/App.tsx` | Add 2 new routes |
| `src/pages/dashboard/Personalize.tsx` | Contracts list → navigate to editor instead of dialog; remove contract dialog |
| `src/pages/store/SessionDetailPage.tsx` | Render HTML + variable substitution |

No DB migration needed — `contracts.body` already stores text, will now store HTML with `[[variable]]` tokens.

