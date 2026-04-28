import { Slider } from "@/components/ui/slider";
import { RotateCcw } from "lucide-react";

export const SPACING_DEFAULTS = {
  maxPageWidth: 1280,
  baseBlockPadding: 64,
};

export const SPACING_LIMITS = {
  width: { min: 960, max: 1920, step: 1 },
  padding: { min: 0, max: 200, step: 4 },
};

export default function SpacingSubPanel({
  maxPageWidth,
  baseBlockPadding,
  onChange,
}: {
  maxPageWidth: number;
  baseBlockPadding: number;
  onChange: (patch: { max_page_width?: number; base_block_padding?: number }) => void;
}) {
  const reset = () =>
    onChange({
      max_page_width: SPACING_DEFAULTS.maxPageWidth,
      base_block_padding: SPACING_DEFAULTS.baseBlockPadding,
    });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-7">
        {/* Max Page Width */}
        <section className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Max Page Width</h4>
          <div className="flex items-center gap-3">
            <Slider
              value={[maxPageWidth]}
              min={SPACING_LIMITS.width.min}
              max={SPACING_LIMITS.width.max}
              step={SPACING_LIMITS.width.step}
              onValueChange={([v]) => onChange({ max_page_width: v })}
              className="flex-1"
            />
            <span className="text-xs font-medium tabular-nums text-foreground w-16 text-right">
              {maxPageWidth}px
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            The maximum width your page content will span on larger screen sizes.
          </p>
        </section>

        {/* Base Block Padding */}
        <section className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Base Block Padding</h4>
          <div className="flex items-center gap-3">
            <Slider
              value={[baseBlockPadding]}
              min={SPACING_LIMITS.padding.min}
              max={SPACING_LIMITS.padding.max}
              step={SPACING_LIMITS.padding.step}
              onValueChange={([v]) => onChange({ base_block_padding: v })}
              className="flex-1"
            />
            <span className="text-xs font-medium tabular-nums text-foreground w-16 text-right">
              {baseBlockPadding}px
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            The amount of vertical space above and below all blocks. Padding can be further adjusted for each block from its block settings.
          </p>
        </section>
      </div>

      {/* Reset */}
      <div className="border-t border-border p-3 shrink-0">
        <button
          type="button"
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Site Spacing
        </button>
      </div>
    </div>
  );
}
