import { Check } from "lucide-react";
import { useState } from "react";

// ── Inline SVG mockups for each template ─────────────────────────────────────

function EditorialMockup({ hovered }: { hovered: boolean }) {
  return (
    <svg viewBox="0 0 200 130" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Full-bleed hero bg */}
      <rect width="200" height="80" fill="currentColor" className="text-foreground/90" rx="1" />
      {/* Hero overlay gradient */}
      <rect width="200" height="80" fill="url(#editorialGrad)" rx="1" />
      {/* Logo / studio name */}
      <rect x="70" y="18" width="60" height="4" fill="white" opacity="0.6" rx="1" />
      {/* Headline */}
      <rect x="50" y="28" width="100" height="8" fill="white" opacity="0.9" rx="1" />
      {/* Sub */}
      <rect x="65" y="40" width="70" height="3" fill="white" opacity="0.4" rx="1" />
      {/* CTA button outline */}
      <rect
        x="72" y="50" width="56" height="14" fill="none" stroke="white"
        strokeWidth="1" opacity={hovered ? "1" : "0.5"}
        rx="1"
        style={{ transition: "opacity 0.3s" }}
      />
      <rect x="82" y="55" width="36" height="3" fill="white" opacity="0.7" rx="1" />

      {/* Session cards */}
      <rect x="4" y="86" width="59" height="38" fill="currentColor" className="text-muted/40" rx="1" />
      <rect x="4" y="86" width="59" height="22" fill="currentColor" className="text-foreground/15" rx="1" />
      <rect x="7" y="112" width="30" height="3" fill="currentColor" className="text-foreground/40" rx="1" />
      <rect x="7" y="117" width="20" height="2" fill="currentColor" className="text-foreground/20" rx="1" />

      <rect x="71" y="86" width="59" height="38" fill="currentColor" className="text-muted/40" rx="1" />
      <rect x="71" y="86" width="59" height="22" fill="currentColor" className="text-foreground/20" rx="1" />
      <rect x="74" y="112" width="30" height="3" fill="currentColor" className="text-foreground/40" rx="1" />
      <rect x="74" y="117" width="20" height="2" fill="currentColor" className="text-foreground/20" rx="1" />

      <rect x="138" y="86" width="59" height="38" fill="currentColor" className="text-muted/40" rx="1" />
      <rect x="138" y="86" width="59" height="22" fill="currentColor" className="text-foreground/10" rx="1" />
      <rect x="141" y="112" width="30" height="3" fill="currentColor" className="text-foreground/40" rx="1" />
      <rect x="141" y="117" width="20" height="2" fill="currentColor" className="text-foreground/20" rx="1" />

      <defs>
        <linearGradient id="editorialGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="black" stopOpacity="0.2" />
          <stop offset="100%" stopColor="black" stopOpacity="0.65" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GridMockup({ hovered }: { hovered: boolean }) {
  return (
    <svg viewBox="0 0 200 130" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Compact hero */}
      <rect width="200" height="44" fill="currentColor" className="text-foreground/85" rx="1" />
      <rect width="200" height="44" fill="url(#gridGrad)" rx="1" />
      <rect x="60" y="14" width="80" height="6" fill="white" opacity="0.85" rx="1" />
      <rect x="75" y="24" width="50" height="3" fill="white" opacity="0.4" rx="1" />

      {/* Dense 4-col grid */}
      {[0, 1, 2, 3].map((col) => (
        <g key={col}>
          <rect x={4 + col * 48} y="50" width="45" height="36" fill="currentColor" className="text-foreground/20" rx="1" />
          {/* Hover overlay on first card */}
          {col === 0 && (
            <rect
              x={4} y="50" width="45" height="36"
              fill="black" opacity={hovered ? "0.45" : "0"}
              rx="1"
              style={{ transition: "opacity 0.3s" }}
            />
          )}
          {col === 0 && hovered && (
            <>
              <rect x="8" y="72" width="25" height="3" fill="white" opacity="0.85" rx="1" />
              <rect x="8" y="78" width="16" height="2" fill="white" opacity="0.5" rx="1" />
            </>
          )}
        </g>
      ))}

      {/* Row 2 */}
      {[0, 1, 2, 3].map((col) => (
        <rect key={col} x={4 + col * 48} y="90" width="45" height="36" fill="currentColor" className="text-foreground/15" rx="1" />
      ))}

      <defs>
        <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="black" stopOpacity="0.15" />
          <stop offset="100%" stopColor="black" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MagazineMockup({ hovered }: { hovered: boolean }) {
  return (
    <svg viewBox="0 0 200 130" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Hero — left-aligned text over image */}
      <rect width="200" height="55" fill="currentColor" className="text-foreground/80" rx="1" />
      <rect width="200" height="55" fill="url(#magGrad)" rx="1" />
      {/* Large headline left-aligned */}
      <rect x="8" y="28" width="80" height="8" fill="white" opacity="0.9" rx="1" />
      <rect x="8" y="40" width="55" height="4" fill="white" opacity="0.5" rx="1" />

      {/* Asymmetric layout: 1 big + 2 small */}
      <rect x="4" y="60" width="90" height="65" fill="currentColor" className="text-foreground/20" rx="1" />
      <rect x={hovered ? "6" : "4"} y={hovered ? "108" : "110"} width="60" height="4" fill="currentColor" className="text-foreground/60" rx="1"
        style={{ transition: "all 0.3s" }} />
      <rect x="4" y="116" width="40" height="3" fill="currentColor" className="text-foreground/30" rx="1" />

      <rect x="100" y="60" width="96" height="30" fill="currentColor" className="text-foreground/15" rx="1" />
      <rect x="103" y="94" width="50" height="3" fill="currentColor" className="text-foreground/40" rx="1" />
      <rect x="103" y="99" width="35" height="2" fill="currentColor" className="text-foreground/20" rx="1" />

      <rect x="100" y="105" width="96" height="19" fill="currentColor" className="text-foreground/10" rx="1" />
      <rect x="103" y="109" width="50" height="3" fill="currentColor" className="text-foreground/35" rx="1" />
      <rect x="103" y="114" width="30" height="2" fill="currentColor" className="text-foreground/20" rx="1" />

      <defs>
        <linearGradient id="magGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="black" stopOpacity="0.1" />
          <stop offset="100%" stopColor="black" stopOpacity="0.7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CleanMockup({ hovered }: { hovered: boolean }) {
  return (
    <svg viewBox="0 0 200 130" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* White/bg hero — centered */}
      <rect width="200" height="55" fill="currentColor" className="text-muted/30" rx="1" />
      {/* Centered large type */}
      <rect x="50" y="16" width="100" height="9" fill="currentColor" className="text-foreground/70" rx="1" />
      <rect x="65" y="29" width="70" height="4" fill="currentColor" className="text-foreground/30" rx="1" />
      {/* Thin CTA line */}
      <rect x="85" y="38" width="30" height="1" fill="currentColor" className="text-foreground/20" rx="0.5" />

      {/* Centered vertical session list */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x="30" y={62 + i * 23} width="140" height="18"
            fill="currentColor"
            className="text-foreground/[0.06]"
            stroke="currentColor"
            strokeWidth={hovered && i === 0 ? "0.8" : "0.4"}
            strokeOpacity={hovered && i === 0 ? "0.5" : "0.2"}
            rx="1"
            style={{ transition: "stroke-width 0.3s, stroke-opacity 0.3s" }}
          />
          <rect x="36" y={67 + i * 23} width="55" height="4" fill="currentColor" className="text-foreground/50" rx="1" />
          <rect x="36" y={73 + i * 23} width="38" height="2" fill="currentColor" className="text-foreground/25" rx="1" />
          <rect x="148" y={68 + i * 23} width="16" height="4" fill="currentColor" className="text-foreground/40" rx="1" />
        </g>
      ))}
    </svg>
  );
}

const MOCKUPS: Record<string, React.FC<{ hovered: boolean }>> = {
  editorial: EditorialMockup,
  grid: GridMockup,
  magazine: MagazineMockup,
  clean: CleanMockup,
};

// ── Template card ─────────────────────────────────────────────────────────────

interface TemplatePreviewCardProps {
  value: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  onPreview?: () => void;
}

export function TemplatePreviewCard({
  value,
  label,
  description,
  selected,
  onClick,
  onPreview,
}: TemplatePreviewCardProps) {
  const [hovered, setHovered] = useState(false);
  const Mockup = MOCKUPS[value] ?? EditorialMockup;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col gap-0 border text-left transition-all duration-200 overflow-hidden ${
        selected
          ? "border-foreground ring-1 ring-foreground/20"
          : "border-border hover:border-foreground/40"
      }`}
    >
      {/* Mockup area — clickable to select */}
      <button
        onClick={onClick}
        className="w-full text-left focus:outline-none"
      >
        <div
          className={`w-full aspect-[200/130] relative overflow-hidden bg-background transition-all duration-300 ${
            hovered ? "scale-[1.02]" : "scale-100"
          }`}
          style={{ transformOrigin: "center center" }}
        >
          <Mockup hovered={hovered} />

          {/* Selected badge */}
          {selected && (
            <div className="absolute top-2 right-2 bg-foreground text-background rounded-full p-0.5">
              <Check className="h-2.5 w-2.5" />
            </div>
          )}

          {/* Preview overlay on hover */}
          {onPreview && hovered && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(); }}
                className="flex items-center gap-1.5 border border-foreground bg-background px-3 py-1.5 text-[10px] tracking-widest uppercase font-light text-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                Preview
              </button>
            </div>
          )}
        </div>
      </button>

      {/* Label + description + actions */}
      <div className={`px-3 py-2.5 border-t transition-colors duration-200 ${selected ? "border-foreground/20 bg-foreground/[0.03]" : "border-border"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-[10px] tracking-[0.25em] uppercase font-light truncate">{label}</p>
            {selected && (
              <span className="shrink-0 text-[9px] tracking-widest uppercase bg-foreground text-background px-1.5 py-0.5 font-light">
                Current
              </span>
            )}
          </div>
          {onPreview && (
            <button
              onClick={onPreview}
              className="shrink-0 text-[9px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors font-light"
            >
              Preview
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
