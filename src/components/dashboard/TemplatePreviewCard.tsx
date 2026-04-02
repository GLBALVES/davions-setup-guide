import { Check } from "lucide-react";
import { useState } from "react";

// ── Per-template config ────────────────────────────────────────────────────────

const TEMPLATE_CONFIG: Record<string, {
  imageUrl: string;
  overlayColor: string;
  accentColor: string;
}> = {
  editorial: {
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80",
    overlayColor: "rgba(0,0,0,0.38)",
    accentColor: "rgba(255,255,255,0.85)",
  },
  grid: {
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    overlayColor: "rgba(15,23,42,0.45)",
    accentColor: "rgba(255,255,255,0.9)",
  },
  magazine: {
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    overlayColor: "rgba(30,10,5,0.42)",
    accentColor: "rgba(255,255,255,0.85)",
  },
  clean: {
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80",
    overlayColor: "rgba(245,245,244,0.55)",
    accentColor: "rgba(30,30,30,0.85)",
  },
  sierra: {
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    overlayColor: "rgba(0,0,0,0.50)",
    accentColor: "rgba(255,255,255,0.90)",
  },
  canvas: {
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80",
    overlayColor: "rgba(20,15,10,0.45)",
    accentColor: "rgba(255,255,255,0.85)",
  },
  avery: {
    imageUrl: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&q=80",
    overlayColor: "rgba(250,250,249,0.50)",
    accentColor: "rgba(30,30,30,0.80)",
  },
  seville: {
    imageUrl: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=600&q=80",
    overlayColor: "rgba(255,250,245,0.40)",
    accentColor: "rgba(40,30,20,0.80)",
  },
  milo: {
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    overlayColor: "rgba(250,245,235,0.60)",
    accentColor: "rgba(50,40,30,0.85)",
  },
};

// ── Template UI overlay (wireframe elements drawn on top of the photo) ─────────

function EditorialOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
      {/* Nav bar */}
      <div className="flex items-center justify-between">
        <div className="w-14 h-2 rounded-sm bg-white/60" />
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-8 h-1.5 rounded-sm bg-white/40" />)}
        </div>
      </div>
      {/* Hero text */}
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="w-28 h-3 rounded-sm bg-white/80" />
        <div className="w-20 h-2 rounded-sm bg-white/50" />
        <div className="mt-1 w-16 h-5 rounded-sm border border-white/70 flex items-center justify-center">
          <div className="w-10 h-1.5 rounded-sm bg-white/70" />
        </div>
      </div>
    </div>
  );
}

function GridOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Compact nav */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="w-12 h-2 rounded-sm bg-white/70" />
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-6 h-1.5 rounded-sm bg-white/40" />)}
        </div>
      </div>
      {/* Hero text — compact */}
      <div className="px-3 pb-2">
        <div className="w-20 h-2.5 rounded-sm bg-white/80 mb-1" />
        <div className="w-14 h-1.5 rounded-sm bg-white/45" />
      </div>
      {/* Dense 4-col image grid */}
      <div className="flex-1 px-2 pb-2 grid grid-cols-4 gap-1">
        {Array.from({length: 8}).map((_, i) => (
          <div key={i} className="rounded-sm bg-white/20 border border-white/10" />
        ))}
      </div>
    </div>
  );
}

function MagazineOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="w-12 h-2 rounded-sm bg-white/70" />
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-6 h-1.5 rounded-sm bg-white/40" />)}
        </div>
      </div>
      {/* Left-aligned headline */}
      <div className="px-3 pb-2">
        <div className="w-24 h-3 rounded-sm bg-white/85 mb-1" />
        <div className="w-16 h-1.5 rounded-sm bg-white/45" />
      </div>
      {/* Asymmetric layout: 1 big + 2 small */}
      <div className="flex-1 px-2 pb-2 flex gap-1.5">
        <div className="flex-[2] rounded-sm bg-white/20 border border-white/10" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex-1 rounded-sm bg-white/15 border border-white/10" />
          <div className="flex-1 rounded-sm bg-white/10 border border-white/10" />
        </div>
      </div>
    </div>
  );
}

function CleanOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Minimal nav */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-black/10">
        <div className="w-12 h-2 rounded-sm bg-foreground/60" />
        <div className="flex gap-2">
          {[0,1,2].map(i => <div key={i} className="w-6 h-1.5 rounded-sm bg-foreground/30" />)}
        </div>
      </div>
      {/* Centered hero */}
      <div className="flex flex-col items-center pt-3 pb-2 gap-1">
        <div className="w-24 h-3 rounded-sm bg-foreground/70" />
        <div className="w-16 h-1.5 rounded-sm bg-foreground/35" />
        <div className="mt-1 w-12 h-0.5 rounded-sm bg-foreground/20" />
      </div>
      {/* Vertical session list */}
      <div className="flex-1 px-3 pb-2 flex flex-col gap-1.5 justify-end">
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center justify-between px-2 py-1.5 border border-foreground/15 rounded-sm">
            <div>
              <div className="w-16 h-1.5 rounded-sm bg-foreground/50 mb-0.5" />
              <div className="w-10 h-1 rounded-sm bg-foreground/25" />
            </div>
            <div className="w-8 h-1.5 rounded-sm bg-foreground/35" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sierra overlay: full-screen hero, serif typography, bottom nav, slide counter ──
function SierraOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
      {/* Slide counter */}
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-0.5">
          <div className="w-4 h-1.5 rounded-sm bg-white/70" />
          <div className="w-3 h-1 rounded-sm bg-white/30" />
          <div className="w-3 h-1 rounded-sm bg-white/30" />
        </div>
      </div>
      {/* Center serif title */}
      <div className="flex flex-col items-center gap-1.5 mb-6">
        <div className="w-32 h-4 rounded-sm bg-white/80" />
        <div className="w-20 h-1.5 rounded-sm bg-white/40" />
      </div>
      {/* Bottom nav */}
      <div className="flex items-center justify-center gap-3">
        {[0,1,2,3].map(i => <div key={i} className="w-7 h-1.5 rounded-sm bg-white/50" />)}
      </div>
    </div>
  );
}

// ── Canvas overlay: poetic serif italic, centered nav with name ──
function CanvasOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Nav: centered name */}
      <div className="flex items-center justify-center px-3 py-2.5">
        <div className="flex gap-2 items-center">
          <div className="w-6 h-1.5 rounded-sm bg-white/40" />
          <div className="w-14 h-2 rounded-sm bg-white/70" />
          <div className="w-6 h-1.5 rounded-sm bg-white/40" />
        </div>
      </div>
      {/* Center italic title */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="w-28 h-4 rounded-sm bg-white/75 rotate-[-1deg]" />
        <div className="w-16 h-1.5 rounded-sm bg-white/35" />
      </div>
      {/* Arrows */}
      <div className="absolute top-1/2 left-2 w-3 h-3 border-l border-b border-white/50 rotate-45" />
      <div className="absolute top-1/2 right-2 w-3 h-3 border-r border-t border-white/50 rotate-45" />
    </div>
  );
}

// ── Avery overlay: sidebar + masonry grid ──
function AveryOverlay() {
  return (
    <div className="absolute inset-0 flex pointer-events-none">
      {/* Sidebar */}
      <div className="w-[22%] border-r border-foreground/10 bg-white/30 flex flex-col items-center py-3 gap-2">
        <div className="w-8 h-2 rounded-sm bg-foreground/50 mb-2" />
        {[0,1,2,3].map(i => <div key={i} className="w-6 h-1 rounded-sm bg-foreground/25" />)}
      </div>
      {/* Masonry grid */}
      <div className="flex-1 p-2 grid grid-cols-3 gap-1 content-start">
        <div className="col-span-2 row-span-2 rounded-sm bg-foreground/15 border border-foreground/10" style={{ minHeight: "50%" }} />
        <div className="rounded-sm bg-foreground/10 border border-foreground/10" />
        <div className="rounded-sm bg-foreground/12 border border-foreground/10" />
        <div className="rounded-sm bg-foreground/10 border border-foreground/10" />
        <div className="rounded-sm bg-foreground/08 border border-foreground/10" />
        <div className="rounded-sm bg-foreground/12 border border-foreground/10" />
      </div>
    </div>
  );
}

// ── Seville overlay: contained hero, elegant typography ──
function SevilleOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="w-14 h-2 rounded-sm bg-foreground/50" />
        <div className="flex gap-2">
          {[0,1,2].map(i => <div key={i} className="w-6 h-1.5 rounded-sm bg-foreground/30" />)}
        </div>
      </div>
      {/* Contained hero */}
      <div className="mx-3 mt-1 flex-1 rounded-sm bg-foreground/10 border border-foreground/10 relative overflow-hidden flex flex-col items-center justify-center gap-1.5">
        <div className="w-24 h-3 rounded-sm bg-foreground/40" />
        <div className="w-16 h-1.5 rounded-sm bg-foreground/20" />
        <div className="mt-1 w-14 h-4 rounded-sm border border-foreground/30 flex items-center justify-center">
          <div className="w-8 h-1.5 rounded-sm bg-foreground/30" />
        </div>
      </div>
      {/* Bottom spacer */}
      <div className="h-3" />
    </div>
  );
}

// ── Milo overlay: text-only hero, asymmetric photos below ──
function MiloOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Nav: centered name + CTA */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="w-6 h-1.5 rounded-sm bg-foreground/30" />
        <div className="w-12 h-2 rounded-sm bg-foreground/50" />
        <div className="w-10 h-3 rounded-sm bg-foreground/60 border border-foreground/20" />
      </div>
      {/* Big text hero (no image) */}
      <div className="flex flex-col items-center justify-center py-3 gap-1">
        <div className="w-32 h-4 rounded-sm bg-foreground/50" />
        <div className="w-20 h-1.5 rounded-sm bg-foreground/25" />
      </div>
      {/* Asymmetric photos */}
      <div className="flex-1 px-2 pb-2 flex gap-1.5 items-stretch">
        <div className="w-[25%] rounded-sm bg-foreground/10 border border-foreground/10" />
        <div className="flex-1 rounded-sm bg-foreground/15 border border-foreground/10" />
        <div className="w-[25%] rounded-sm bg-foreground/10 border border-foreground/10" />
      </div>
    </div>
  );
}

const OVERLAYS: Record<string, React.FC> = {
  editorial: EditorialOverlay,
  grid: GridOverlay,
  magazine: MagazineOverlay,
  clean: CleanOverlay,
  sierra: SierraOverlay,
  canvas: CanvasOverlay,
  avery: AveryOverlay,
  seville: SevilleOverlay,
  milo: MiloOverlay,
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
  const config = TEMPLATE_CONFIG[value] ?? TEMPLATE_CONFIG.editorial;
  const Overlay = OVERLAYS[value] ?? EditorialOverlay;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col border text-left transition-all duration-200 overflow-hidden ${
        selected
          ? "border-foreground ring-1 ring-foreground/20"
          : "border-border hover:border-foreground/40"
      }`}
    >
      {/* Thumbnail area */}
      <button onClick={onClick} className="w-full text-left focus:outline-none">
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16/10" }}
        >
          {/* Real photo */}
          <img
            src={config.imageUrl}
            alt={label}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? "scale-105" : "scale-100"}`}
          />

          {/* Color overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{ backgroundColor: config.overlayColor, opacity: hovered ? 0.85 : 1 }}
          />

          {/* Wireframe UI overlay */}
          <Overlay />

          {/* Selected badge */}
          {selected && (
            <div className="absolute top-2 right-2 z-10 bg-foreground text-background rounded-full p-0.5">
              <Check className="h-2.5 w-2.5" />
            </div>
          )}

          {/* Preview button on hover */}
          {onPreview && hovered && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
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
