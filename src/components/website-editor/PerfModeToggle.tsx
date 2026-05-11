import { useEffect, useState } from "react";
import { Zap, ZapOff, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPerfModeOverride,
  setPerfModeOverride,
} from "./usePerformanceMode";

/**
 * Floating "Performance Mode" toggle.
 *
 * Cycles through Auto → Full → Lite. Auto follows device capabilities and
 * live FPS sampling; Full forces all heavy effects on; Lite disables blur,
 * 3D tilt, ken-burns, parallax displacement, and backdrop-filters.
 */
export default function PerfModeToggle() {
  const [override, setOv] = useState<"auto" | "full" | "lite">(getPerfModeOverride());
  const [active, setActive] = useState<"full" | "lite">(
    () => ((typeof window !== "undefined" && (window as any).__lovPerfMode) || "full") as "full" | "lite",
  );

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "lite" || detail === "full") setActive(detail);
    };
    window.addEventListener("lov-perf-mode-change", onChange);
    return () => window.removeEventListener("lov-perf-mode-change", onChange);
  }, []);

  const cycle = () => {
    const next = override === "auto" ? "full" : override === "full" ? "lite" : "auto";
    setOv(next);
    setPerfModeOverride(next);
  };

  const label =
    override === "auto"
      ? `Auto (${active === "lite" ? "Lite" : "Full"})`
      : override === "full"
        ? "Full"
        : "Lite";

  const Icon = override === "lite" ? ZapOff : override === "full" ? Zap : Gauge;

  return (
    <div className="fixed bottom-4 right-4 z-[55] pointer-events-auto">
      <button
        type="button"
        onClick={cycle}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full",
          "bg-foreground text-background shadow-lg hover:opacity-90 transition",
          "text-[11px] font-medium",
        )}
        title="Performance mode: Auto / Full / Lite. Lite disables blur, 3D tilt, ken-burns and heavy parallax."
      >
        <Icon className="h-3.5 w-3.5" />
        Perf: {label}
      </button>
    </div>
  );
}
