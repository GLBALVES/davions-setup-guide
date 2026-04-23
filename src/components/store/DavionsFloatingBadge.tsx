import { Sparkles } from "lucide-react";

/**
 * Floating "Made with Davions" badge — anchored to the bottom-right of the viewport,
 * shown on every published page unless the photographer has hidden it via
 * Footer settings (hide_branding = true).
 */
export default function DavionsFloatingBadge({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <a
      href="https://davions.com?ref=badge"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-1.5 rounded-full bg-foreground/90 text-background backdrop-blur-md px-3 py-1.5 text-[10px] font-medium tracking-wide shadow-lg hover:bg-foreground transition-colors"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <Sparkles className="h-3 w-3" />
      <span>Made with <span className="font-semibold">Davions</span></span>
    </a>
  );
}
