import { cn } from "@/lib/utils";
import type { SectionType } from "./page-templates";

/**
 * Lightweight SVG wireframe previews for each section type.
 * Used inside the Add-block pickers so users can pick visually.
 *
 * These are pure CSS/SVG — no real images — so they render instantly
 * regardless of the user's actual content.
 */
interface BlockThumbnailProps {
  type: SectionType;
  className?: string;
}

const FG = "currentColor";

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 60"
      preserveAspectRatio="xMidYMid meet"
      className={cn("w-full h-full text-foreground/70", className)}
      fill="none"
      stroke={FG}
      strokeWidth={0.7}
    >
      {children}
    </svg>
  );
}

export default function BlockThumbnail({ type, className }: BlockThumbnailProps) {
  const wrapper = (children: React.ReactNode) => (
    <div
      className={cn(
        "w-full aspect-[5/3] rounded-md bg-muted/40 border border-border/60 overflow-hidden p-1.5",
        className
      )}
    >
      {children}
    </div>
  );

  switch (type) {
    case "hero":
      return wrapper(
        <Frame>
          <rect x="2" y="2" width="96" height="56" fill="hsl(var(--muted))" stroke="none" />
          <rect x="22" y="22" width="56" height="6" fill={FG} opacity={0.45} stroke="none" />
          <rect x="32" y="32" width="36" height="3" fill={FG} opacity={0.25} stroke="none" />
          <rect x="40" y="42" width="20" height="5" fill={FG} opacity={0.55} stroke="none" />
        </Frame>
      );

    case "text":
      return wrapper(
        <Frame>
          <rect x="10" y="10" width="55" height="3.5" fill={FG} opacity={0.55} stroke="none" />
          {[20, 26, 32, 38, 44, 50].map((y, i) => (
            <rect
              key={y}
              x="10"
              y={y}
              width={i % 2 === 0 ? 80 : 65}
              height="1.8"
              fill={FG}
              opacity={0.3}
              stroke="none"
            />
          ))}
        </Frame>
      );

    case "image-text":
      return wrapper(
        <Frame>
          <rect x="4" y="6" width="40" height="48" fill="hsl(var(--muted))" stroke={FG} />
          <path d="M8 50 L18 38 L28 46 L40 30" />
          <circle cx="14" cy="16" r="2.5" fill={FG} opacity={0.5} stroke="none" />
          {[14, 22, 30, 38, 46].map((y) => (
            <rect key={y} x="50" y={y} width={y === 14 ? 36 : 30} height="2" fill={FG} opacity={0.4} stroke="none" />
          ))}
        </Frame>
      );

    case "text-image":
      return wrapper(
        <Frame>
          {[14, 22, 30, 38, 46].map((y) => (
            <rect key={y} x="6" y={y} width={y === 14 ? 36 : 30} height="2" fill={FG} opacity={0.4} stroke="none" />
          ))}
          <rect x="56" y="6" width="40" height="48" fill="hsl(var(--muted))" stroke={FG} />
          <path d="M60 50 L70 38 L80 46 L92 30" />
          <circle cx="66" cy="16" r="2.5" fill={FG} opacity={0.5} stroke="none" />
        </Frame>
      );

    case "gallery-grid":
      return wrapper(
        <Frame>
          {[0, 1, 2].map((c) =>
            [0, 1].map((r) => (
              <rect
                key={`${c}-${r}`}
                x={6 + c * 30}
                y={8 + r * 22}
                width="26"
                height="18"
                fill="hsl(var(--muted))"
                stroke={FG}
              />
            ))
          )}
        </Frame>
      );

    case "gallery-masonry":
      return wrapper(
        <Frame>
          <rect x="6" y="6" width="26" height="22" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="6" y="32" width="26" height="14" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="36" y="6" width="26" height="14" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="36" y="24" width="26" height="22" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="66" y="6" width="28" height="28" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="66" y="38" width="28" height="10" fill="hsl(var(--muted))" stroke={FG} />
        </Frame>
      );

    case "contact-form":
      return wrapper(
        <Frame>
          <rect x="20" y="8" width="60" height="4" fill={FG} opacity={0.5} stroke="none" />
          <rect x="20" y="18" width="60" height="6" rx="1" stroke={FG} />
          <rect x="20" y="28" width="60" height="6" rx="1" stroke={FG} />
          <rect x="20" y="38" width="60" height="10" rx="1" stroke={FG} />
          <rect x="38" y="50" width="24" height="6" rx="1" fill={FG} opacity={0.6} stroke="none" />
        </Frame>
      );

    case "map":
      return wrapper(
        <Frame>
          <rect x="4" y="4" width="92" height="52" fill="hsl(var(--muted))" stroke={FG} />
          <path d="M4 30 L96 22" opacity={0.4} />
          <path d="M30 4 L40 56" opacity={0.4} />
          <circle cx="50" cy="28" r="3" fill={FG} stroke="none" />
          <path d="M50 28 L50 38" />
        </Frame>
      );

    case "cta":
      return wrapper(
        <Frame>
          <rect x="2" y="2" width="96" height="56" fill="hsl(var(--accent))" opacity={0.3} stroke="none" />
          <rect x="22" y="18" width="56" height="5" fill={FG} opacity={0.55} stroke="none" />
          <rect x="32" y="28" width="36" height="2.5" fill={FG} opacity={0.3} stroke="none" />
          <rect x="38" y="38" width="24" height="8" rx="1" fill={FG} opacity={0.7} stroke="none" />
        </Frame>
      );

    case "pricing-table":
      return wrapper(
        <Frame>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={6 + i * 30} y="6" width="26" height="48" stroke={FG} />
              <rect x={10 + i * 30} y="12" width="18" height="3" fill={FG} opacity={0.5} stroke="none" />
              <rect x={12 + i * 30} y="20" width="14" height="5" fill={FG} opacity={0.7} stroke="none" />
              {[30, 36, 42].map((y) => (
                <rect key={y} x={10 + i * 30} y={y} width="18" height="1.6" fill={FG} opacity={0.3} stroke="none" />
              ))}
            </g>
          ))}
        </Frame>
      );

    case "faq-accordion":
      return wrapper(
        <Frame>
          {[8, 20, 32, 44].map((y) => (
            <g key={y}>
              <rect x="8" y={y} width="84" height="8" rx="1" stroke={FG} />
              <rect x="12" y={y + 3} width="50" height="2" fill={FG} opacity={0.5} stroke="none" />
              <path d={`M86 ${y + 3} L88 ${y + 5} L90 ${y + 3}`} />
            </g>
          ))}
        </Frame>
      );

    case "timeline":
      return wrapper(
        <Frame>
          <line x1="50" y1="6" x2="50" y2="54" />
          {[12, 24, 36, 48].map((y, i) => (
            <g key={y}>
              <circle cx="50" cy={y} r="2" fill={FG} stroke="none" />
              <rect x={i % 2 === 0 ? 18 : 56} y={y - 1.5} width="26" height="3" fill={FG} opacity={0.45} stroke="none" />
            </g>
          ))}
        </Frame>
      );

    case "testimonials":
      return wrapper(
        <Frame>
          <text x="14" y="22" fontSize="14" fill={FG} opacity={0.4} stroke="none">"</text>
          <rect x="22" y="14" width="60" height="2.5" fill={FG} opacity={0.45} stroke="none" />
          <rect x="22" y="20" width="50" height="2.5" fill={FG} opacity={0.4} stroke="none" />
          <rect x="22" y="26" width="40" height="2.5" fill={FG} opacity={0.35} stroke="none" />
          <circle cx="32" cy="44" r="4" fill={FG} opacity={0.5} stroke="none" />
          <rect x="40" y="42" width="30" height="2" fill={FG} opacity={0.5} stroke="none" />
          <rect x="40" y="46" width="20" height="1.5" fill={FG} opacity={0.3} stroke="none" />
        </Frame>
      );

    case "stats":
      return wrapper(
        <Frame>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={4 + i * 24} y="18" width="20" height="10" fill={FG} opacity={0.55} stroke="none" />
              <rect x={6 + i * 24} y="32" width="16" height="2" fill={FG} opacity={0.35} stroke="none" />
            </g>
          ))}
        </Frame>
      );

    case "team":
      return wrapper(
        <Frame>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx={20 + i * 30} cy="22" r="8" fill="hsl(var(--muted))" stroke={FG} />
              <rect x={10 + i * 30} y="36" width="20" height="2.5" fill={FG} opacity={0.5} stroke="none" />
              <rect x={13 + i * 30} y="42" width="14" height="2" fill={FG} opacity={0.3} stroke="none" />
            </g>
          ))}
        </Frame>
      );

    case "spacer":
      return wrapper(
        <Frame>
          <line x1="6" y1="30" x2="94" y2="30" strokeDasharray="2 2" opacity={0.5} />
          <text x="42" y="38" fontSize="6" fill={FG} opacity={0.5} stroke="none">space</text>
        </Frame>
      );

    case "divider":
      return wrapper(
        <Frame>
          <line x1="10" y1="30" x2="90" y2="30" />
        </Frame>
      );

    case "video":
      return wrapper(
        <Frame>
          <rect x="6" y="8" width="88" height="44" fill="hsl(var(--muted))" stroke={FG} />
          <polygon points="46,22 46,38 60,30" fill={FG} opacity={0.7} stroke="none" />
        </Frame>
      );

    case "columns-2":
      return wrapper(
        <Frame>
          <rect x="6" y="8" width="40" height="44" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="54" y="8" width="40" height="44" fill="hsl(var(--muted))" stroke={FG} />
        </Frame>
      );

    case "columns-3":
      return wrapper(
        <Frame>
          <rect x="6" y="8" width="26" height="44" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="37" y="8" width="26" height="44" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="68" y="8" width="26" height="44" fill="hsl(var(--muted))" stroke={FG} />
        </Frame>
      );

    case "slideshow":
      return wrapper(
        <Frame>
          <rect x="2" y="2" width="96" height="50" fill="hsl(var(--muted))" stroke={FG} />
          <polygon points="6,27 12,22 12,32" fill={FG} opacity={0.6} stroke="none" />
          <polygon points="94,27 88,22 88,32" fill={FG} opacity={0.6} stroke="none" />
          {[44, 50, 56].map((x, i) => (
            <circle key={x} cx={x} cy="56" r="1.2" fill={FG} opacity={i === 1 ? 0.8 : 0.3} stroke="none" />
          ))}
        </Frame>
      );

    case "carousel":
      return wrapper(
        <Frame>
          <rect x="2" y="14" width="22" height="32" fill="hsl(var(--muted))" stroke={FG} opacity={0.6} />
          <rect x="28" y="10" width="44" height="40" fill="hsl(var(--muted))" stroke={FG} />
          <rect x="76" y="14" width="22" height="32" fill="hsl(var(--muted))" stroke={FG} opacity={0.6} />
        </Frame>
      );

    case "instagram-feed":
      return wrapper(
        <Frame>
          {[0, 1, 2].map((c) =>
            [0, 1, 2].map((r) => (
              <rect
                key={`${c}-${r}`}
                x={8 + c * 28}
                y={3 + r * 18}
                width="24"
                height="14"
                fill="hsl(var(--muted))"
                stroke={FG}
              />
            ))
          )}
        </Frame>
      );

    case "social-links":
      return wrapper(
        <Frame>
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={20 + i * 15} cy="30" r="4" stroke={FG} fill="hsl(var(--muted))" />
          ))}
        </Frame>
      );

    case "embed":
      return wrapper(
        <Frame>
          <rect x="6" y="6" width="88" height="48" stroke={FG} strokeDasharray="2 2" />
          <text x="34" y="34" fontSize="8" fill={FG} opacity={0.6} stroke="none">{"</>"}</text>
        </Frame>
      );

    case "logo-strip":
      return wrapper(
        <Frame>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={6 + i * 18}
              y="22"
              width="14"
              height="14"
              fill="hsl(var(--muted))"
              stroke={FG}
              opacity={0.7}
            />
          ))}
        </Frame>
      );

    default:
      return wrapper(
        <Frame>
          <rect x="6" y="6" width="88" height="48" stroke={FG} strokeDasharray="2 2" />
        </Frame>
      );
  }
}
