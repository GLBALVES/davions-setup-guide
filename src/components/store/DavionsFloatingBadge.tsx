/**
 * Floating "Made with Davions" badge — anchored to the bottom-right of the viewport,
 * shown on every published page unless the photographer has hidden it via
 * Footer settings (hide_branding = true).
 */
import davionsBadge from "@/assets/davions-badge-v3.png";

export default function DavionsFloatingBadge({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;

  return (
    <a
      href="https://davions.com?ref=badge"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made with Davions"
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-primary px-2.5 py-1.5 text-primary-foreground shadow-lg transition-opacity hover:opacity-95"
    >
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-foreground">
        <img
          src={davionsBadge}
          alt=""
          className="h-5 w-5 object-contain"
        />
      </span>
      <span className="whitespace-nowrap text-xs font-medium text-primary-foreground">
        Made with Davions
      </span>
    </a>
  );
}
