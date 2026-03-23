
## Problem Identified

There are **3 places** where stage labels are hardcoded in Portuguese instead of using translations:

### 1. `STAGES` constant — module level (lines 81–87)
```ts
const STAGES = [
  { key: "upcoming", label: "Próximas sessões", ... },
  { key: "shot",     label: "Fotografadas",     ... },
  ...
]
```
This is a **module-level constant**, so `useLanguage()` can't be used here. The `stage.label` value is then rendered directly in the column header (`KanbanColumn`, line 447) and in the summary pills (line 1392).

### 2. `stageLabels` in `ProjectModal` (lines 637–640)
```ts
const stageLabels = {
  upcoming: "Próximas sessões", shot: "Fotografadas", ...
}
```
Used in the `<Select>` dropdown for stage selection. Already inside a component but not using translations.

### 3. `stageLabels` in `ListView` (lines 753–756)
```ts
const stageLabels = {
  upcoming: "Próximas sessões", shot: "Fotografadas", ...
}
```
Used to render the stage badge on each row. Already inside a component but not using translations.

---

## Solution

The fix is straightforward — no new translation keys needed (they all exist already in all 3 languages under `t.projects.upcoming`, `t.projects.shot`, etc.).

### Fix 1 — `STAGES` constant: remove labels, resolve at render time

Keep `STAGES` as a pure array of `{ key, color }` (no `label`). Then resolve labels from `t.projects[key]` wherever the stage label is rendered. Two render sites:

**Column header** (`KanbanColumn`, line 447):
```tsx
<span>{t.projects[stage.key as keyof typeof t.projects] as string ?? stage.key}</span>
```

**Summary pills** (main `Projects` page, line 1392):
```tsx
<span>{p_t[s.key as keyof typeof p_t] as string ?? s.key}</span>
```

Alternatively — simpler and cleaner — build a `stageLabels` inside `KanbanColumn` and in the main page using `t.projects`.

### Fix 2 — `ProjectModal` `stageLabels`

Replace hardcoded object with:
```tsx
const stageLabels: Record<string, string> = {
  upcoming: p_t.upcoming, shot: p_t.shot, proof_gallery: p_t.proof_gallery,
  post_production: p_t.post_production, final_gallery: p_t.final_gallery,
};
```

### Fix 3 — `ListView` `stageLabels`

Same as Fix 2:
```tsx
const stageLabels: Record<string, string> = {
  upcoming: p_t.upcoming, shot: p_t.shot, proof_gallery: p_t.proof_gallery,
  post_production: p_t.post_production, final_gallery: p_t.final_gallery,
};
```

### Fix 4 — `KanbanColumn` column header label

The column header renders `{stage.label}` from the STAGES object (line 447). Since `STAGES` will remain with hardcoded labels (it's module-level), we need the column component to resolve the label from translations instead.

Add a `stageLabels` lookup inside `KanbanColumn`:
```tsx
const stageLabels: Record<string, string> = {
  upcoming: t.projects.upcoming, shot: t.projects.shot,
  proof_gallery: t.projects.proof_gallery,
  post_production: t.projects.post_production,
  final_gallery: t.projects.final_gallery,
};
// Then render:
<span>{stageLabels[stage.key] ?? stage.label}</span>
```

---

## Files to Edit

- `src/pages/dashboard/Projects.tsx` only — 4 targeted line edits:
  1. `KanbanColumn` body: add `stageLabels` lookup and use it in the header (line 447)
  2. `ProjectModal` body: replace hardcoded `stageLabels` with translation-based one (lines 637–640)
  3. `ListView` body: replace hardcoded `stageLabels` with translation-based one (lines 753–756)
  4. Main `Projects` component summary pills: replace `s.label` with `p_t[s.key]` lookup (line 1392)

No translation keys need to be added — all keys exist in EN, PT, and ES. The fix is entirely in `Projects.tsx`.
