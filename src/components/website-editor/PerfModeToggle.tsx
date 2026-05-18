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

  // Floating toggle removed per UX request. Component returns null so existing
  // imports/usages don't break; performance mode still works via Auto detection.
  void cycle; void label; void Icon;
  return null;
}
