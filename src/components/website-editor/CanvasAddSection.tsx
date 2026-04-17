import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pixieset-style "Add Section" divider rendered between blocks inside the
 * preview canvas. Hidden until the gap is hovered, then expands into a
 * full-width line with a centered + button.
 */
interface CanvasAddSectionProps {
  onClick: () => void;
  /** Label shown next to the + button */
  label?: string;
  /** Always show (used for the empty-canvas state) */
  alwaysVisible?: boolean;
}

export default function CanvasAddSection({
  onClick,
  label = "Add Section",
  alwaysVisible = false,
}: CanvasAddSectionProps) {
  return (
    <div
      className={cn(
        "relative h-0 z-20",
        alwaysVisible ? "opacity-100" : "opacity-0 hover:opacity-100 focus-within:opacity-100",
        "transition-opacity"
      )}
      // Increase hit area so it's easy to discover.
      style={{ height: alwaysVisible ? "auto" : 0 }}
    >
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center",
          alwaysVisible ? "static py-8" : "-top-3"
        )}
      >
        {/* Hover hit zone (taller than the visible line) */}
        {!alwaysVisible && (
          <div className="absolute inset-x-0 -top-4 h-8" aria-hidden />
        )}

        <div className="relative flex items-center w-full max-w-3xl px-6">
          <div className="flex-1 h-px bg-primary/40" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={cn(
              "mx-3 inline-flex items-center gap-1.5 rounded-full",
              "px-3 py-1 text-[11px] font-medium tracking-wide",
              "bg-primary text-primary-foreground shadow-md",
              "hover:bg-primary/90 transition-colors"
            )}
            title={label}
          >
            <Plus className="h-3.5 w-3.5" />
            {label}
          </button>
          <div className="flex-1 h-px bg-primary/40" />
        </div>
      </div>
    </div>
  );
}
