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

/**
 * A font family loaded externally (e.g. via Typekit/Adobe Fonts, Google Fonts
 * @import, or a user-provided <link>/@font-face block in the "Custom Font CSS"
 * field). It is NOT loaded by us — it just exposes a name so the user can
 * select it in the per-element Font Family dropdown.
 */
export interface ExternalFontEntry {
  /** Stable id (uuid). The select value uses `external:<id>`. */
  id: string;
  /** Display label shown in the dropdown (e.g. "Ivy Presto Display"). */
  label: string;
  /** Literal CSS font-family value (e.g. "ivypresto-display"). */
  family: string;
}

/** Wrap a family name in quotes if it contains whitespace or special chars. */
function quoteFamily(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (/^['"].*['"]$/.test(trimmed)) return trimmed;
  if (/[\s,'"]/.test(trimmed)) return `'${trimmed.replace(/'/g, "\\'")}'`;
  return trimmed;
}

export function buildExternalStack(entry: ExternalFontEntry): string {
  return `${quoteFamily(entry.family)}, system-ui, sans-serif`;
}

export function getFontStack(
  id?: string | null,
  externalFonts: ExternalFontEntry[] = [],
): string | undefined {
  if (!id) return undefined;
  if (id.startsWith("external:")) {
    const ext = externalFonts.find((e) => `external:${e.id}` === id);
    return ext ? buildExternalStack(ext) : undefined;
  }
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
