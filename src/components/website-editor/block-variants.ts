// ── Block Variants ─────────────────────────────────────────────────────────
// Each SectionType can have multiple layout variants. The first variant is the default.

import type { SectionType } from "./page-templates";

export interface BlockVariant {
  id: string;
  label: string;
  /** Thumbnail hint for the picker (emoji or icon key) */
  icon: string;
}

export const BLOCK_VARIANTS: Partial<Record<SectionType, BlockVariant[]>> = {
  hero: [
    { id: "fullscreen", label: "Fullscreen", icon: "⬜" },
    { id: "split-left", label: "Split Left", icon: "◧" },
    { id: "split-right", label: "Split Right", icon: "◨" },
    { id: "minimal", label: "Minimal", icon: "▬" },
    { id: "video-bg", label: "Video Background", icon: "▶" },
  ],
  "image-text": [
    { id: "side-by-side", label: "Side by Side", icon: "◧" },
    { id: "overlap", label: "Overlap", icon: "⊞" },
    { id: "stacked", label: "Stacked", icon: "☰" },
    { id: "card", label: "Card", icon: "▭" },
  ],
  "text-image": [
    { id: "side-by-side", label: "Side by Side", icon: "◨" },
    { id: "overlap", label: "Overlap", icon: "⊞" },
    { id: "stacked", label: "Stacked", icon: "☰" },
    { id: "card", label: "Card", icon: "▭" },
  ],
  "gallery-grid": [
    { id: "2-col", label: "2 Columns", icon: "▥" },
    { id: "3-col", label: "3 Columns", icon: "⊞" },
    { id: "4-col", label: "4 Columns", icon: "⊡" },
    { id: "masonry", label: "Masonry", icon: "⧈" },
    { id: "justified", label: "Justified", icon: "☰" },
  ],
  "gallery-masonry": [
    { id: "2-col", label: "2 Columns", icon: "▥" },
    { id: "3-col", label: "3 Columns", icon: "⊞" },
    { id: "4-col", label: "4 Columns", icon: "⊡" },
  ],
  testimonials: [
    { id: "cards", label: "Cards", icon: "▭" },
    { id: "carousel", label: "Carousel", icon: "⟷" },
    { id: "minimal-quote", label: "Minimal Quote", icon: "❝" },
  ],
  cta: [
    { id: "banner", label: "Full Banner", icon: "▬" },
    { id: "centered", label: "Centered", icon: "◎" },
    { id: "split", label: "Split", icon: "◧" },
  ],
  "pricing-table": [
    { id: "cards", label: "Cards", icon: "▭" },
    { id: "comparison", label: "Comparison", icon: "☰" },
    { id: "minimal", label: "Minimal", icon: "▬" },
  ],
  "faq-accordion": [
    { id: "classic", label: "Classic", icon: "☰" },
    { id: "cards", label: "Cards", icon: "▭" },
    { id: "inline", label: "Inline", icon: "▬" },
  ],
  "contact-form": [
    { id: "centered", label: "Centered", icon: "◎" },
    { id: "split-with-info", label: "Split with Info", icon: "◧" },
    { id: "minimal", label: "Minimal", icon: "▬" },
  ],
  slideshow: [
    { id: "fullwidth", label: "Full Width", icon: "⬜" },
    { id: "contained", label: "Contained", icon: "▭" },
    { id: "fade", label: "Fade", icon: "◐" },
  ],
  carousel: [
    { id: "scroll", label: "Horizontal Scroll", icon: "⟷" },
    { id: "grid-3", label: "3 Items", icon: "⊞" },
    { id: "grid-4", label: "4 Items", icon: "⊡" },
  ],
  "instagram-feed": [
    { id: "grid-3x3", label: "3×3 Grid", icon: "⊞" },
    { id: "grid-4x4", label: "4×4 Grid", icon: "⊡" },
    { id: "carousel", label: "Carousel", icon: "⟷" },
  ],
};

/** Get the default variant for a section type */
export function getDefaultVariant(type: SectionType): string {
  const variants = BLOCK_VARIANTS[type];
  return variants?.[0]?.id ?? "default";
}
