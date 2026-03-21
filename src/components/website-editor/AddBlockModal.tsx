import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import type { BlockKey } from "./BlockPanel";

interface BlockDef {
  key: BlockKey;
  /** Unique id per variant — used for selection state when multiple cards share the same key */
  variantId: string;
  label: string;
  description: string;
  thumbnail: React.ReactNode;
}

interface Category {
  id: string;
  label: string;
  blocks: BlockDef[];
}

// ─── Thumbnail components ──────────────────────────────────────────────────

function ThumbHeroFull() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-sm bg-foreground/90">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
      {/* Thin nav bar */}
      <div className="absolute top-0 left-0 right-0 h-3 flex items-center justify-between px-2">
        <div className="w-6 h-1 bg-white/50 rounded-full" />
        <div className="flex gap-1">
          <div className="w-3 h-0.5 bg-white/30 rounded-full" />
          <div className="w-3 h-0.5 bg-white/30 rounded-full" />
          <div className="w-3 h-0.5 bg-white/30 rounded-full" />
        </div>
      </div>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 mt-2">
        <div className="w-16 h-2 bg-white/80 rounded-full" />
        <div className="w-20 h-1 bg-white/50 rounded-full" />
        <div className="w-10 h-0.5 bg-white/30 rounded-full" />
        {/* CTA button */}
        <div className="mt-1 px-3 py-1 border border-white/60 rounded-sm flex items-center justify-center">
          <div className="w-8 h-0.5 bg-white/70 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ThumbHeroSplit() {
  return (
    <div className="relative w-full h-full flex overflow-hidden rounded-sm">
      {/* Left — text */}
      <div className="w-1/2 bg-background flex flex-col justify-center px-2 gap-1.5">
        <div className="w-4 h-0.5 bg-foreground/30 rounded-full" />
        <div className="w-full h-2 bg-foreground/70 rounded-full" />
        <div className="w-4/5 h-1 bg-foreground/40 rounded-full" />
        <div className="w-3/5 h-1 bg-foreground/25 rounded-full" />
        <div className="mt-1 w-10 h-3 border border-foreground/40 rounded-sm flex items-center justify-center">
          <div className="w-6 h-0.5 bg-foreground/50 rounded-full" />
        </div>
      </div>
      {/* Right — image */}
      <div className="w-1/2 bg-foreground/20 relative overflow-hidden">
        {/* Simulated photo grain */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/10 via-foreground/20 to-foreground/30" />
        <div className="absolute bottom-2 left-2 w-8 h-0.5 bg-white/20 rounded-full" />
      </div>
    </div>
  );
}

function ThumbAboutImageRight() {
  return (
    <div className="relative w-full h-full flex overflow-hidden rounded-sm bg-background">
      {/* Left text block */}
      <div className="flex-1 flex flex-col justify-center px-2 gap-1">
        <div className="w-3 h-0.5 bg-foreground/20 rounded-full mb-0.5" />
        <div className="w-14 h-2 bg-foreground/60 rounded-full" />
        <div className="w-full h-0.5 bg-foreground/15 rounded-full" />
        <div className="w-full h-0.5 bg-foreground/15 rounded-full" />
        <div className="w-4/5 h-0.5 bg-foreground/15 rounded-full" />
        <div className="w-full h-0.5 bg-foreground/12 rounded-full" />
        <div className="w-3/4 h-0.5 bg-foreground/12 rounded-full" />
        <div className="mt-1 w-8 h-2.5 border border-foreground/30 rounded-sm flex items-center justify-center">
          <div className="w-5 h-0.5 bg-foreground/40 rounded-full" />
        </div>
      </div>
      {/* Right image */}
      <div className="w-2/5 bg-foreground/15 relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-foreground/25" />
        {/* portrait frame lines */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-8 border border-foreground/10 rounded-sm" />
      </div>
    </div>
  );
}

function ThumbAboutImageLeft() {
  return (
    <div className="relative w-full h-full flex overflow-hidden rounded-sm bg-background">
      {/* Left image */}
      <div className="w-2/5 bg-foreground/15 relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-foreground/25" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-8 border border-foreground/10 rounded-sm" />
      </div>
      {/* Right text block */}
      <div className="flex-1 flex flex-col justify-center px-2 gap-1">
        <div className="w-3 h-0.5 bg-foreground/20 rounded-full mb-0.5" />
        <div className="w-14 h-2 bg-foreground/60 rounded-full" />
        <div className="w-full h-0.5 bg-foreground/15 rounded-full" />
        <div className="w-full h-0.5 bg-foreground/15 rounded-full" />
        <div className="w-4/5 h-0.5 bg-foreground/15 rounded-full" />
        <div className="w-full h-0.5 bg-foreground/12 rounded-full" />
        <div className="mt-1 w-8 h-2.5 border border-foreground/30 rounded-sm flex items-center justify-center">
          <div className="w-5 h-0.5 bg-foreground/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ThumbTextOnly() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 bg-background rounded-sm">
      {/* eyebrow */}
      <div className="w-8 h-0.5 bg-foreground/20 rounded-full" />
      {/* headline */}
      <div className="w-20 h-2.5 bg-foreground/60 rounded-full" />
      {/* subtitle */}
      <div className="w-16 h-1 bg-foreground/30 rounded-full" />
      {/* body lines */}
      <div className="flex flex-col gap-0.5 w-full mt-0.5">
        <div className="w-full h-0.5 bg-foreground/12 rounded-full" />
        <div className="w-11/12 h-0.5 bg-foreground/12 rounded-full" />
        <div className="w-full h-0.5 bg-foreground/12 rounded-full" />
        <div className="w-3/4 h-0.5 bg-foreground/12 rounded-full" />
      </div>
    </div>
  );
}

function ThumbQuote() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 bg-muted/50 rounded-sm overflow-hidden">
      {/* Big decorative quote mark */}
      <div className="absolute top-1 left-2 text-2xl font-serif text-foreground/10 leading-none select-none">"</div>
      <div className="absolute bottom-1 right-2 text-2xl font-serif text-foreground/10 leading-none select-none rotate-180">"</div>
      {/* Quote text lines */}
      <div className="flex flex-col gap-1 items-center w-full px-2">
        <div className="w-full h-1 bg-foreground/25 rounded-full" />
        <div className="w-10/12 h-1 bg-foreground/20 rounded-full" />
        <div className="w-8/12 h-1 bg-foreground/20 rounded-full" />
      </div>
      {/* Divider */}
      <div className="w-6 h-px bg-foreground/20" />
      {/* Author */}
      <div className="w-12 h-0.5 bg-foreground/25 rounded-full" />
    </div>
  );
}

function ThumbSessions() {
  return (
    <div className="relative w-full h-full flex flex-col gap-1 p-1.5 bg-background rounded-sm overflow-hidden">
      {/* Section header */}
      <div className="flex flex-col items-center gap-0.5 mb-0.5">
        <div className="w-10 h-1.5 bg-foreground/50 rounded-full" />
        <div className="w-7 h-0.5 bg-foreground/20 rounded-full" />
      </div>
      {/* Cards row */}
      <div className="flex gap-1 flex-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 flex flex-col rounded-sm overflow-hidden border border-border/50">
            {/* Card image */}
            <div className="flex-1 bg-foreground/12 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
            </div>
            {/* Card info */}
            <div className="bg-background px-0.5 py-0.5 flex flex-col gap-0.5">
              <div className="w-full h-0.5 bg-foreground/30 rounded-full" />
              <div className="w-2/3 h-0.5 bg-foreground/15 rounded-full" />
              <div className="w-1/2 h-1.5 bg-foreground/20 rounded-full mt-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThumbPortfolio() {
  return (
    <div className="relative w-full h-full flex flex-col gap-1 p-1.5 bg-background rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col items-center gap-0.5 mb-0.5">
        <div className="w-10 h-1.5 bg-foreground/50 rounded-full" />
        <div className="w-7 h-0.5 bg-foreground/20 rounded-full" />
      </div>
      {/* Masonry-like grid */}
      <div className="flex gap-0.5 flex-1">
        {/* Left col */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-3/5 bg-foreground/15 rounded-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-foreground/20" />
          </div>
          <div className="h-2/5 bg-foreground/10 rounded-sm" />
        </div>
        {/* Center col */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-2/5 bg-foreground/10 rounded-sm" />
          <div className="h-3/5 bg-foreground/18 rounded-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tl from-foreground/5 to-foreground/15" />
          </div>
        </div>
        {/* Right col */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-1/2 bg-foreground/12 rounded-sm" />
          <div className="h-1/2 bg-foreground/8 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

function ThumbContact() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-1.5 px-2.5 bg-background rounded-sm">
      {/* Heading */}
      <div className="w-12 h-2 bg-foreground/55 rounded-full" />
      <div className="w-16 h-0.5 bg-foreground/15 rounded-full" />
      {/* Form fields */}
      <div className="w-full flex flex-col gap-1 mt-0.5">
        <div className="w-full h-3 bg-muted border border-border/50 rounded-sm" />
        <div className="w-full h-3 bg-muted border border-border/50 rounded-sm" />
        <div className="w-full h-5 bg-muted border border-border/50 rounded-sm" />
      </div>
      {/* Submit button */}
      <div className="w-12 h-3 bg-foreground/70 rounded-sm flex items-center justify-center mt-0.5">
        <div className="w-7 h-0.5 bg-background/80 rounded-full" />
      </div>
    </div>
  );
}

function ThumbFooter() {
  return (
    <div className="relative w-full h-full flex flex-col rounded-sm overflow-hidden bg-background">
      {/* Page content placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full mx-2 h-0.5 bg-border/50 border-dashed border-t border-foreground/10" />
      </div>
      {/* Footer bar */}
      <div className="bg-foreground/85 pt-2 pb-1.5 px-2 flex flex-col gap-1">
        {/* Logo + nav */}
        <div className="flex items-center justify-between">
          <div className="w-8 h-1 bg-background/60 rounded-full" />
          <div className="flex gap-1">
            <div className="w-3 h-0.5 bg-background/30 rounded-full" />
            <div className="w-3 h-0.5 bg-background/30 rounded-full" />
            <div className="w-3 h-0.5 bg-background/30 rounded-full" />
          </div>
        </div>
        {/* Divider */}
        <div className="w-full h-px bg-background/10" />
        {/* Social icons row */}
        <div className="flex gap-1 justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-2.5 h-2.5 bg-background/20 rounded-full" />
          ))}
        </div>
        {/* Copyright */}
        <div className="w-16 h-0.5 bg-background/15 rounded-full mx-auto" />
      </div>
    </div>
  );
}

function ThumbExperience() {
  return (
    <div className="relative w-full h-full flex flex-col justify-center px-2.5 gap-1 bg-background rounded-sm">
      {/* Heading centered */}
      <div className="flex flex-col items-center gap-0.5 mb-1">
        <div className="w-12 h-2 bg-foreground/55 rounded-full" />
        <div className="w-16 h-0.5 bg-foreground/15 rounded-full" />
      </div>
      {/* Items list */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-1.5 items-start">
          {/* Number badge */}
          <div className="w-3 h-3 rounded-full bg-foreground/15 flex-shrink-0 flex items-center justify-center">
            <div className="w-1 h-1 bg-foreground/40 rounded-full" />
          </div>
          {/* Text */}
          <div className="flex-1 flex flex-col gap-0.5 pt-0.5">
            <div className="w-3/4 h-0.5 bg-foreground/35 rounded-full" />
            <div className="w-full h-0.5 bg-foreground/12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────

function ThumbTestimonialsCards() {
  return (
    <div className="relative w-full h-full flex flex-col justify-center px-2.5 gap-1.5 bg-background rounded-sm">
      {/* Section label */}
      <div className="w-14 h-1.5 bg-foreground/40 rounded-full mx-auto mb-1" />
      {/* 3-column card grid */}
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-border/50 rounded-sm p-1 flex flex-col gap-0.5">
            {/* Stars */}
            <div className="flex gap-0.5">
              {[0,1,2,3,4].map((s) => <div key={s} className="w-1 h-1 bg-foreground/50 rounded-full" />)}
            </div>
            {/* Quote lines */}
            <div className="w-full h-0.5 bg-foreground/12 rounded-full mt-0.5" />
            <div className="w-4/5 h-0.5 bg-foreground/12 rounded-full" />
            <div className="w-3/5 h-0.5 bg-foreground/12 rounded-full" />
            {/* Avatar + name */}
            <div className="flex items-center gap-0.5 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-foreground/30 shrink-0" />
              <div className="w-5 h-0.5 bg-foreground/30 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThumbTestimonialsQuotes() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-2.5 bg-muted/20 rounded-sm">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 w-full">
          <div className="w-2 h-1.5 bg-foreground/20 rounded-sm" />
          <div className="w-full h-0.5 bg-foreground/20 rounded-full" />
          <div className="w-4/5 h-0.5 bg-foreground/15 rounded-full" />
          <div className="flex gap-0.5 mt-0.5">
            {[0,1,2,3,4].map((s) => <div key={s} className="w-1 h-1 bg-foreground/40 rounded-full" />)}
          </div>
          <div className="w-8 h-0.5 bg-foreground/30 rounded-full" />
        </div>
      ))}
    </div>
  );
}

const CATEGORIES: Category[] = [
  {
    id: "hero",
    label: "Hero / Banner",
    blocks: [
      { key: "hero", variantId: "hero-full", label: "Hero — Full Bleed", description: "Full-width image with centered headline and CTA", thumbnail: <ThumbHeroFull /> },
      { key: "hero", variantId: "hero-split", label: "Hero — Split", description: "Text on one side, image on the other", thumbnail: <ThumbHeroSplit /> },
    ],
  },
  {
    id: "content",
    label: "Content",
    blocks: [
      { key: "about", variantId: "about-right", label: "About — Image Right", description: "Bio text with photo to the right", thumbnail: <ThumbAboutImageRight /> },
      { key: "about", variantId: "about-left", label: "About — Image Left", description: "Bio text with photo to the left", thumbnail: <ThumbAboutImageLeft /> },
      { key: "experience", variantId: "experience", label: "Experience", description: "Highlight key points of your experience", thumbnail: <ThumbExperience /> },
    ],
  },
  {
    id: "testimonials",
    label: "Testimonials",
    blocks: [
      { key: "testimonials", variantId: "testimonials-cards", label: "Reviews — Cards", description: "Client reviews in a card grid with star ratings", thumbnail: <ThumbTestimonialsCards /> },
      { key: "testimonials", variantId: "testimonials-quotes", label: "Reviews — Quotes", description: "Centered pull-quote style testimonials", thumbnail: <ThumbTestimonialsQuotes /> },
    ],
  },
  {
    id: "quote",
    label: "Quote",
    blocks: [
      { key: "quote", variantId: "quote", label: "Pull Quote", description: "Large styled quote with attribution", thumbnail: <ThumbQuote /> },
    ],
  },
  {
    id: "links",
    label: "Sessions & Portfolio",
    blocks: [
      { key: "sessions", variantId: "sessions", label: "Sessions", description: "Grid of your bookable photo sessions", thumbnail: <ThumbSessions /> },
      { key: "portfolio", variantId: "portfolio", label: "Portfolio", description: "Masonry grid of your published galleries", thumbnail: <ThumbPortfolio /> },
    ],
  },
  {
    id: "contact",
    label: "Contact & Footer",
    blocks: [
      { key: "contact", variantId: "contact", label: "Contact", description: "Contact form or social links section", thumbnail: <ThumbContact /> },
      { key: "footer", variantId: "footer", label: "Footer", description: "Site footer with social icons and copyright", thumbnail: <ThumbFooter /> },
    ],
  },
];

interface Props {
  open: boolean;
  insertAfterIndex: number;
  hiddenSections: string[];
  onAdd: (blockKey: BlockKey, insertAfterIndex: number, variantId?: string) => void;
  onClose: () => void;
}

export function AddBlockModal({ open, insertAfterIndex, hiddenSections, onAdd, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];
  const isAvailable = (_key: BlockKey) => true;

  // Resolve the BlockKey from the selected variantId
  const selectedBlockKey = selectedVariantId
    ? CATEGORIES.flatMap(c => c.blocks).find(b => b.variantId === selectedVariantId)?.key ?? null
    : null;

  const handleClose = () => {
    setSelectedVariantId(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedBlockKey || !selectedVariantId) return;
    onAdd(selectedBlockKey, insertAfterIndex, selectedVariantId);
    setSelectedVariantId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl h-[620px] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-border shrink-0 flex-row items-center justify-between">
          <DialogTitle className="text-sm font-light tracking-[0.12em] uppercase">
            Add Section
          </DialogTitle>
          {selectedVariantId && (
            <div className="flex items-center gap-2 mr-6">
              <span className="text-[10px] text-muted-foreground tracking-wide">
                {CATEGORIES.flatMap(c => c.blocks).find(b => b.variantId === selectedVariantId)?.label}
              </span>
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-1.5 text-[10px] tracking-[0.1em] uppercase bg-foreground text-background hover:bg-foreground/90 transition-colors rounded-sm"
              >
                Add Section
              </button>
            </div>
          )}
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left category nav */}
          <nav className="w-44 border-r border-border flex flex-col py-2 shrink-0 overflow-y-auto bg-muted/20">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-left px-4 py-2.5 text-[11px] tracking-[0.08em] uppercase transition-colors ${
                  activeCategory === cat.id
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </nav>

          {/* Right block grid */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-3 gap-4">
              {currentCategory.blocks.map((block, i) => {
                const available = isAvailable(block.key);
                const hoverKey = `${block.variantId}-${i}`;
                const isHovered = hoveredBlock === hoverKey;
                const isSelected = selectedVariantId === block.variantId;

                return (
                  <button
                    key={block.variantId}
                    onClick={() => available && setSelectedVariantId(isSelected ? null : block.variantId)}
                    onMouseEnter={() => available && setHoveredBlock(hoverKey)}
                    onMouseLeave={() => setHoveredBlock(null)}
                    className={`group flex flex-col rounded-md overflow-hidden text-left transition-all duration-200 ${
                      available
                        ? isSelected
                          ? "ring-2 ring-foreground shadow-lg border border-foreground"
                          : isHovered
                            ? "ring-1 ring-foreground/40 shadow-md border border-foreground/40"
                            : "border border-border hover:border-foreground/30 hover:shadow-sm"
                        : "border border-border/40 opacity-50 cursor-not-allowed"
                    }`}
                    disabled={!available}
                  >
                    {/* Thumbnail */}
                    <div
                      className={`relative w-full overflow-hidden bg-background transition-transform duration-200 ${
                        (isHovered || isSelected) && available ? "scale-[1.01]" : "scale-100"
                      }`}
                      style={{ aspectRatio: "16/9" }}
                    >
                      {block.thumbnail}

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-foreground flex items-center justify-center shadow-md">
                          <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-background" />
                          </svg>
                        </div>
                      )}

                      {/* Hover select overlay */}
                      {available && isHovered && !isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/5">
                          <span className="px-3 py-1 bg-foreground text-background text-[10px] tracking-[0.1em] uppercase font-medium rounded-sm shadow-md">
                            Select
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Label row */}
                    <div
                      className={`px-2.5 py-2 border-t transition-colors duration-200 ${
                        isSelected
                          ? "border-foreground/30 bg-foreground/[0.05]"
                          : isHovered && available
                            ? "border-foreground/20 bg-foreground/[0.02]"
                            : "border-border"
                      }`}
                    >
                      <p className="text-[11px] font-medium tracking-[0.05em] text-foreground leading-tight">
                        {block.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {block.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
