import { useState } from "react";
import { ChevronRight, ChevronLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Generic "list ↔ detail" editor for arrays of items inside a block.
 * Shows a clickable list of items; clicking one reveals an inline detail
 * editor (rendered by the caller). Mirrors the Header Slider UX so users
 * can edit any item (FAQ, slide, member, plan, …) from the side panel.
 */
export function ItemListEditor<T>({
  items,
  onChange,
  renderLabel,
  renderDetail,
  newItem,
  addLabel = "Add item",
  itemLabel = "Item",
}: {
  items: T[];
  onChange: (next: T[]) => void;
  renderLabel: (item: T, idx: number) => string;
  renderDetail: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  newItem: () => T;
  addLabel?: string;
  itemLabel?: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const update = (idx: number, patch: Partial<T>) => {
    const next = [...items];
    next[idx] = { ...(next[idx] as any), ...patch };
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
    if (activeIdx === idx) setActiveIdx(null);
    else if (activeIdx !== null && idx < activeIdx) setActiveIdx(activeIdx - 1);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
    if (activeIdx === idx) setActiveIdx(target);
    else if (activeIdx === target) setActiveIdx(idx);
  };

  if (activeIdx !== null && items[activeIdx]) {
    const item = items[activeIdx];
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveIdx(null)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" />
          <span>Back to list</span>
        </button>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            {itemLabel} {activeIdx + 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => move(activeIdx, -1)}
              disabled={activeIdx === 0}
              className="p-1 rounded hover:bg-muted/50 disabled:opacity-30"
              title="Move up"
            >
              <ChevronLeft className="h-3 w-3 rotate-90" />
            </button>
            <button
              onClick={() => move(activeIdx, 1)}
              disabled={activeIdx === items.length - 1}
              className="p-1 rounded hover:bg-muted/50 disabled:opacity-30"
              title="Move down"
            >
              <ChevronRight className="h-3 w-3 rotate-90" />
            </button>
            <button
              onClick={() => remove(activeIdx)}
              className="p-1 text-destructive hover:bg-destructive/10 rounded"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        {renderDetail(item, (patch) => update(activeIdx, patch))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic px-1 py-2">
          No items yet — click below to add one.
        </p>
      )}
      <div className="space-y-1">
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded-md border border-border text-left",
              "bg-muted/10 hover:bg-muted/30 transition-colors group"
            )}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="text-[10px] text-muted-foreground font-medium shrink-0">
              {idx + 1}.
            </span>
            <span className="text-xs text-foreground flex-1 truncate">
              {renderLabel(item, idx) || `${itemLabel} ${idx + 1}`}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs gap-1"
        onClick={() => {
          onChange([...items, newItem()]);
          setActiveIdx(items.length);
        }}
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </Button>
    </div>
  );
}

export default ItemListEditor;
