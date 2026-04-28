import { Ban, Contrast, ArrowUp, Maximize2, Minimize2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnimationStyle =
  | "none"
  | "fade-in"
  | "slide-up"
  | "scale-up"
  | "scale-down"
  | "reveal";

const OPTIONS: { id: AnimationStyle; label: string; icon: React.ReactNode }[] = [
  { id: "none", label: "None", icon: <Ban className="h-4 w-4" /> },
  { id: "fade-in", label: "Fade In", icon: <Contrast className="h-4 w-4" /> },
  { id: "slide-up", label: "Slide Up", icon: <ArrowUp className="h-4 w-4" /> },
  { id: "scale-up", label: "Scale Up", icon: <Maximize2 className="h-4 w-4" /> },
  { id: "scale-down", label: "Scale Down", icon: <Minimize2 className="h-4 w-4" /> },
  { id: "reveal", label: "Reveal", icon: <ArrowDown className="h-4 w-4" /> },
];

export default function AnimationsSubPanel({
  value,
  onChange,
}: {
  value: AnimationStyle;
  onChange: (v: AnimationStyle) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <section className="space-y-2.5">
        <h4 className="text-xs font-semibold text-foreground">Style</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {OPTIONS.map((opt) => {
            const active = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all"
                )}
                title={opt.label}
              >
                <div
                  className={cn(
                    "h-16 w-full rounded-md border bg-background flex items-center justify-center transition-all",
                    active
                      ? "border-primary ring-1 ring-primary text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  {opt.icon}
                </div>
                <span
                  className={cn(
                    "text-[11px]",
                    active ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
          Animations play once when each section scrolls into view. Visible in preview and on the published site.
        </p>
      </section>
    </div>
  );
}
