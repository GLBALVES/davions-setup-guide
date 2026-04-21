import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/**
 * Reusable button-list schema. Used both at the block level (Hero / CTA / …)
 * and inside per-item editors (cards, slides, pricing plans, gallery items).
 */
export type BlockBtn = {
  id?: string;
  text: string;
  link?: string;
  variant?: "primary" | "secondary";
  newTab?: boolean;
};

/** Migrate legacy single-button fields (ctaText/ctaLink/buttonText/buttonLink/buttonVariant)
 *  into the new buttons[] array. Safe to call on any object. */
export function migrateLegacyToButtons(props: any): BlockBtn[] {
  if (Array.isArray(props?.buttons)) return props.buttons;
  const text = props?.ctaText || props?.buttonText;
  const link = props?.ctaLink || props?.buttonLink;
  if (!text && !link) return [];
  return [{
    text: text || "",
    link: link || "",
    variant: props?.buttonVariant === "secondary" ? "secondary" : "primary",
    newTab: false,
  }];
}

interface ButtonsListProps {
  buttons: BlockBtn[];
  onChange: (next: BlockBtn[]) => void;
  /** Optional label shown above the list. Defaults to "Buttons". */
  label?: string;
  /** Compact variant for nested item editors (smaller paddings & label). */
  compact?: boolean;
}

/**
 * Pure list editor: works with any `buttons[]` array. Use this inside
 * per-item editors (slides, cards, pricing plans, …) to give every item
 * its own button list.
 */
export function ButtonsList({ buttons, onChange, label = "Buttons", compact = false }: ButtonsListProps) {
  const updateAt = (i: number, patch: Partial<BlockBtn>) => {
    const next = [...buttons];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const addButton = () => {
    onChange([
      ...buttons,
      {
        text: "",
        link: "",
        variant: buttons.length === 0 ? "primary" : "secondary",
        newTab: false,
      },
    ]);
  };

  const removeAt = (i: number) => onChange(buttons.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={compact ? "text-[10px] uppercase tracking-wider text-muted-foreground" : "text-[11px] uppercase tracking-wider text-muted-foreground"}>
          {label}
        </label>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={addButton}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {buttons.length === 0 && (
        <p className="text-[11px] text-muted-foreground/70 italic">
          No buttons. Click Add to create one.
        </p>
      )}
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {buttons.map((b, i) => (
          <div
            key={i}
            className={
              compact
                ? "rounded border border-border bg-background p-2 space-y-1.5"
                : "rounded border border-border bg-muted/20 p-2 space-y-2"
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Button {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="text-muted-foreground hover:text-destructive p-1 rounded"
                aria-label="Remove button"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <Input
              value={b.text || ""}
              onChange={(e) => updateAt(i, { text: e.target.value })}
              className="h-8 text-xs"
              placeholder="Button text"
            />
            <Input
              value={b.link || ""}
              onChange={(e) => updateAt(i, { link: e.target.value })}
              className="h-8 text-xs"
              placeholder="https:// or #section"
            />
            <div className="flex items-center gap-2">
              <Select
                value={b.variant || "primary"}
                onValueChange={(v) => updateAt(i, { variant: v as any })}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!b.newTab}
                  onChange={(e) => updateAt(i, { newTab: e.target.checked })}
                  className="h-3 w-3"
                />
                New tab
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Block-level wrapper used by Hero / CTA / Image+Text / Text+Image editors.
 * Reads from `props.buttons` (or migrates legacy fields), and on save strips
 * the legacy fields so the canonical schema is always `buttons[]`.
 */
export function ButtonsListEditor({
  props,
  onChange,
}: {
  props: any;
  onChange: (p: any) => void;
}) {
  const buttons: BlockBtn[] = Array.isArray(props?.buttons)
    ? props.buttons
    : migrateLegacyToButtons(props);

  const apply = (next: BlockBtn[]) => {
    const cleaned = { ...props, buttons: next };
    delete cleaned.ctaText;
    delete cleaned.ctaLink;
    delete cleaned.buttonText;
    delete cleaned.buttonLink;
    delete cleaned.buttonVariant;
    onChange(cleaned);
  };

  return <ButtonsList buttons={buttons} onChange={apply} />;
}

export default ButtonsListEditor;
