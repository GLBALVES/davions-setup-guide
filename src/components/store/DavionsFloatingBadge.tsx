/**
 * Floating "Made with Davions" badge — anchored to the bottom-right of the viewport,
 * shown on every published page unless the photographer has hidden it via
 * Footer settings (hide_branding = true).
 */
import davionsBadge from "@/assets/davions-badge-v2.png";

export default function DavionsFloatingBadge({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <a
      href="https://davions.com?ref=badge"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made with Davions"
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-background/95 backdrop-blur-md pl-3 pr-4 py-1.5 shadow-lg border border-border hover:bg-background transition-colors"
    >
      <img
        src={davionsBadge}
        alt=""
        className="h-5 w-5 object-contain"
      />
      <span className="text-xs font-medium text-foreground whitespace-nowrap">
        Made with Davions
      </span>
    </a>
  );
}
