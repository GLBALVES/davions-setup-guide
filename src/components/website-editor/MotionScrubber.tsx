import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * Floating "scroll scrubber" used inside the editor preview.
 *
 * When active, it sets `window.__lovScrubProgress` (0..1) and
 * `window.__lovScrubActive = true`. The scroll-effects engine
 * (`useScrollEffects`) checks these flags every frame: while active,
 * the engine forces every tracked element's `--se-progress` to the
 * scrubbed value, ignoring real scroll position. This lets editors
 * preview every effect without scrolling the page.
 */
export default function MotionScrubber() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(50);

  useEffect(() => {
    if (!open) {
      delete (window as any).__lovScrubActive;
      window.dispatchEvent(new CustomEvent("lov-scrub-change"));
      return;
    }
    (window as any).__lovScrubActive = true;
    (window as any).__lovScrubProgress = value / 100;
    window.dispatchEvent(new CustomEvent("lov-scrub-change"));
    return () => {
      delete (window as any).__lovScrubActive;
      window.dispatchEvent(new CustomEvent("lov-scrub-change"));
    };
  }, [open, value]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[55] pointer-events-auto">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full",
            "bg-foreground text-background shadow-lg hover:opacity-90 transition",
            "text-[11px] font-medium",
          )}
          title="Preview scroll effects without scrolling"
        >
          <Play className="h-3.5 w-3.5" />
          Preview Motion
        </button>
      ) : (
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-full",
            "bg-foreground text-background shadow-xl",
            "min-w-[360px]",
          )}
        >
          <span className="text-[10px] uppercase tracking-wider opacity-70 shrink-0">
            Scroll
          </span>
          <Slider
            value={[value]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => setValue(v)}
            className="flex-1 [&_[role=slider]]:bg-background [&_[role=slider]]:border-background"
          />
          <span className="text-[10px] tabular-nums opacity-80 w-8 text-right">
            {value}%
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-full hover:bg-background/10 transition"
            title="Close scrubber"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
