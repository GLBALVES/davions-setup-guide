import {
  Ban,
  Contrast,
  ArrowUp,
  Maximize2,
  Minimize2,
  ArrowDown,
  ArrowRightFromLine,
  ArrowLeftFromLine,
  ZoomIn,
  Waves,
  Droplet,
  RotateCw,
  FlipHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AnimationStyle =
  | "none"
  | "fade-in"
  | "slide-up"
  | "scale-up"
  | "scale-down"
  | "reveal"
  | "fly-in-left"
  | "fly-in-right"
  | "zoom-in"
  | "parallax-soft"
  | "blur-in"
  | "rotate-in"
  | "flip-in";

const OPTIONS: { id: AnimationStyle; label: string; icon: React.ReactNode }[] = [
  { id: "none", label: "None", icon: <Ban className="h-4 w-4" /> },
  { id: "fade-in", label: "Fade In", icon: <Contrast className="h-4 w-4" /> },
  { id: "slide-up", label: "Slide Up", icon: <ArrowUp className="h-4 w-4" /> },
  { id: "scale-up", label: "Scale Up", icon: <Maximize2 className="h-4 w-4" /> },
  { id: "scale-down", label: "Scale Down", icon: <Minimize2 className="h-4 w-4" /> },
  { id: "reveal", label: "Reveal", icon: <ArrowDown className="h-4 w-4" /> },
  { id: "fly-in-left", label: "Fly In Left", icon: <ArrowRightFromLine className="h-4 w-4" /> },
  { id: "fly-in-right", label: "Fly In Right", icon: <ArrowLeftFromLine className="h-4 w-4" /> },
  { id: "zoom-in", label: "Pop / Zoom", icon: <ZoomIn className="h-4 w-4" /> },
  { id: "blur-in", label: "Blur In", icon: <Droplet className="h-4 w-4" /> },
  { id: "rotate-in", label: "Rotate In", icon: <RotateCw className="h-4 w-4" /> },
  { id: "flip-in", label: "Flip In", icon: <FlipHorizontal className="h-4 w-4" /> },
  { id: "parallax-soft", label: "Parallax", icon: <Waves className="h-4 w-4" /> },
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
        <h4 className="text-xs font-semibold text-foreground">Scroll Motion</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {OPTIONS.map((opt) => {
            const active = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
                className={cn("flex flex-col items-center gap-1.5 transition-all")}
                title={opt.label}
              >
                <div
                  className={cn(
                    "h-16 w-full rounded-md border bg-background flex items-center justify-center transition-all",
                    active
                      ? "border-primary ring-1 ring-primary text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  {opt.icon}
                </div>
                <span
                  className={cn(
                    "text-[11px] text-center leading-tight",
                    active ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
          Applied to every section. Entrance presets play once on scroll-in;
          <span className="font-medium"> Parallax</span> moves sections continuously as you scroll.
          For per-block effects (image parallax, reveal, zoom on scroll), open
          a section's settings and use the <span className="font-medium">Scroll Effect</span> control.
        </p>
      </section>
    </div>
  );
}
