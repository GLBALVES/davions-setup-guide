
## Current State

The "shot" column header has a small bare number input (`[ __ ] d`) with no context. The user wants:
1. A clear icon (clock or hourglass) that signals "deadline"
2. Clicking it opens a focused popover/panel with:
   - Clear title: "Prazo para publicação da galeria de prova"
   - The numeric days input, nicely labeled
   - A summary of what it means (e.g., "7 dias após a sessão = prazo calculado automaticamente")
   - A clear/reset button

## Plan

**File to edit:** `src/pages/dashboard/Projects.tsx` only — modify the `KanbanColumn` header section for the "shot" stage.

### Changes

**1. Replace bare input with an icon button + Popover**

In the `KanbanColumn` header (lines 314–330), replace the raw `<input>` with:

```tsx
{stage.key === "shot" && (
  <Popover>
    <PopoverTrigger asChild>
      <button
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] transition-colors
          ${shotDeadlineDays != null
            ? "text-purple-500 bg-purple-500/10 hover:bg-purple-500/20"
            : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40"
          }`}
        title="Prazo para publicação da galeria de prova"
      >
        <Timer className="h-3 w-3 shrink-0" />
        {shotDeadlineDays != null && (
          <span>{shotDeadlineDays}d</span>
        )}
      </button>
    </PopoverTrigger>
    <PopoverContent side="bottom" align="end" className="w-64 p-4">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold">Prazo para galeria de prova</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Dias após a data da sessão para publicar a galeria de provas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" min={1} max={365}
            value={inputVal}
            onChange={...}
            onBlur={handleDaysBlur}
            onKeyDown={...}
            placeholder="ex: 7"
            className="w-16 h-8 text-center text-sm border rounded-sm ..."
          />
          <span className="text-sm text-muted-foreground">dias</span>
        </div>
        {shotDeadlineDays != null && (
          <p className="text-[11px] text-muted-foreground italic">
            Ex.: sessão em 1 Jun → prazo em {calculated example}
          </p>
        )}
        {shotDeadlineDays != null && (
          <button onClick={() => { onSetShotDeadlineDays?.(null); setInputVal(""); }}
            className="text-[11px] text-destructive/70 hover:text-destructive">
            Remover prazo
          </button>
        )}
      </div>
    </PopoverContent>
  </Popover>
)}
```

**2. Import `Timer` icon** from lucide-react (already has Clock/AlertTriangle; add `Timer` which is clearer than hourglass for "countdown deadline").

**3. The Popover state** — the current bare input is inline in the column. We move the `inputVal` state + `handleDaysBlur` inside the Popover, keeping same logic.

**4. Visual result:**
- When no deadline set: a subtle `⏱` icon, muted, barely visible — clean
- When deadline is set: a small colored chip `⏱ 7d` in purple (matching the shot column color) — immediately visible and informative
- Click → focused popover with title, description, number input and remove option

**Scope:** Only `src/pages/dashboard/Projects.tsx` — lines 292–330 (the `KanbanColumn` header section for "shot").
