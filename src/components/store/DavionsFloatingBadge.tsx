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
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center justify-center rounded-full hover:shadow-lg transition-shadow"
    >
      <img
        src={davionsBadge}
        alt="Davions"
        className="h-10 w-10 object-contain"
      />
    </a>
  );
}
