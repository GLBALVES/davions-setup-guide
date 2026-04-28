// ── Site typography presets ──────────────────────────────────────────────────
// Maps a short id to a Google-Fonts-friendly font stack. Used by the Style
// panel and applied at the top of the editor preview + the public site.

export interface FontPreset {
  id: string;
  label: string;
  /** CSS font-family value */
  stack: string;
  /** Google Fonts query fragment, e.g. "Playfair+Display:wght@300;400;600" */
  googleFont?: string;
  /** Family classification — used by the Fonts panel filter tabs. */
  category?: "serif" | "sans" | "display" | "mono";
}

export const FONT_PRESETS: FontPreset[] = [
  // Sans serif
  { id: "inter", label: "Inter", stack: "'Inter', system-ui, sans-serif", googleFont: "Inter:wght@300;400;500;600;700", category: "sans" },
  { id: "montserrat", label: "Montserrat", stack: "'Montserrat', system-ui, sans-serif", googleFont: "Montserrat:wght@300;400;500;600;700", category: "sans" },
  { id: "poppins", label: "Poppins", stack: "'Poppins', system-ui, sans-serif", googleFont: "Poppins:wght@300;400;500;600;700", category: "sans" },
  { id: "raleway", label: "Raleway", stack: "'Raleway', system-ui, sans-serif", googleFont: "Raleway:wght@300;400;500;600;700", category: "sans" },
  { id: "libre-franklin", label: "Libre Franklin", stack: "'Libre Franklin', system-ui, sans-serif", googleFont: "Libre+Franklin:wght@300;400;500;600;700", category: "sans" },
  { id: "work-sans", label: "Work Sans", stack: "'Work Sans', system-ui, sans-serif", googleFont: "Work+Sans:wght@300;400;500;600;700", category: "sans" },
  { id: "jost", label: "Jost", stack: "'Jost', system-ui, sans-serif", googleFont: "Jost:wght@300;400;500;600;700", category: "sans" },
  // Serif
  { id: "playfair", label: "Playfair Display", stack: "'Playfair Display', Georgia, serif", googleFont: "Playfair+Display:wght@300;400;600;700", category: "serif" },
  { id: "cormorant-garamond", label: "Cormorant Garamond", stack: "'Cormorant Garamond', Georgia, serif", googleFont: "Cormorant+Garamond:wght@300;400;500;600;700", category: "serif" },
  { id: "cormorant", label: "Cormorant", stack: "'Cormorant', Georgia, serif", googleFont: "Cormorant:wght@300;400;500;600;700", category: "serif" },
  { id: "lora", label: "Lora", stack: "'Lora', Georgia, serif", googleFont: "Lora:wght@400;500;600;700", category: "serif" },
  { id: "vollkorn", label: "Vollkorn", stack: "'Vollkorn', Georgia, serif", googleFont: "Vollkorn:wght@400;500;600;700", category: "serif" },
  { id: "crimson-pro", label: "Crimson Pro", stack: "'Crimson Pro', Georgia, serif", googleFont: "Crimson+Pro:wght@300;400;500;600;700", category: "serif" },
  { id: "crimson-text", label: "Crimson Text", stack: "'Crimson Text', Georgia, serif", googleFont: "Crimson+Text:wght@400;600;700", category: "serif" },
  { id: "dm-serif", label: "DM Serif Display", stack: "'DM Serif Display', Georgia, serif", googleFont: "DM+Serif+Display:wght@400", category: "display" },
  { id: "libre-caslon", label: "Libre Caslon Text", stack: "'Libre Caslon Text', Georgia, serif", googleFont: "Libre+Caslon+Text:wght@400;700", category: "serif" },
];

export function getFontStack(id?: string | null): string | undefined {
  if (!id) return undefined;
  return FONT_PRESETS.find((f) => f.id === id)?.stack;
}

/**
 * Builds a Google Fonts <link> URL for the chosen heading + body fonts so the
 * editor preview renders with the same typography as the public site.
 */
export function buildGoogleFontsHref(headingFontId?: string | null, bodyFontId?: string | null): string | null {
  const ids = Array.from(new Set([headingFontId, bodyFontId].filter(Boolean) as string[]));
  return buildGoogleFontsHrefFromIds(ids);
}

/** Build a Google Fonts URL from an arbitrary list of font ids. */
export function buildGoogleFontsHrefFromIds(ids: (string | null | undefined)[]): string | null {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return null;
  const families = unique
    .map((id) => FONT_PRESETS.find((f) => f.id === id)?.googleFont)
    .filter(Boolean) as string[];
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
}
