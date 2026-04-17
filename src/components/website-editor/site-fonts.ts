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
}

export const FONT_PRESETS: FontPreset[] = [
  { id: "inter", label: "Inter (Default)", stack: "'Inter', system-ui, sans-serif", googleFont: "Inter:wght@300;400;500;600;700" },
  { id: "playfair", label: "Playfair Display", stack: "'Playfair Display', Georgia, serif", googleFont: "Playfair+Display:wght@300;400;600;700" },
  { id: "cormorant", label: "Cormorant Garamond", stack: "'Cormorant Garamond', Georgia, serif", googleFont: "Cormorant+Garamond:wght@300;400;500;600" },
  { id: "montserrat", label: "Montserrat", stack: "'Montserrat', system-ui, sans-serif", googleFont: "Montserrat:wght@300;400;500;600;700" },
  { id: "poppins", label: "Poppins", stack: "'Poppins', system-ui, sans-serif", googleFont: "Poppins:wght@300;400;500;600;700" },
  { id: "lora", label: "Lora", stack: "'Lora', Georgia, serif", googleFont: "Lora:wght@400;500;600;700" },
  { id: "dm-serif", label: "DM Serif Display", stack: "'DM Serif Display', Georgia, serif", googleFont: "DM+Serif+Display:wght@400" },
  { id: "raleway", label: "Raleway", stack: "'Raleway', system-ui, sans-serif", googleFont: "Raleway:wght@300;400;500;600;700" },
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
  if (ids.length === 0) return null;
  const families = ids
    .map((id) => FONT_PRESETS.find((f) => f.id === id)?.googleFont)
    .filter(Boolean) as string[];
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
}
