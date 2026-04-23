/**
 * Floating "Made with Davions" badge — anchored to the bottom-right of the viewport,
 * shown on every published page unless the photographer has hidden it via
 * Footer settings (hide_branding = true).
 */
import davionsBadge from "@/assets/davions-badge.png";

export default function DavionsFloatingBadge({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <a
      href="https://davions.com?ref=badge"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made with Davions"
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center justify-center rounded-full bg-foreground/90 backdrop-blur-md p-2 shadow-lg hover:bg-foreground transition-colors"
    >
      <img
        src={davionsBadge}
        alt="Davions"
        className="h-6 w-6 object-contain invert"
      />
    </a>
  );
}
