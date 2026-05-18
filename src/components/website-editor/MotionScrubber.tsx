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

  // Floating button removed per UX request. Component kept as no-op so existing
  // imports/usages don't break; can be re-mounted inside a settings panel later.
  return null;
}
