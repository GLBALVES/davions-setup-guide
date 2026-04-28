/**
 * Pixieset-style color palette system.
 *
 * Each palette has 5 schemes: Light, Light Accent, Accent, Dark Accent, Dark.
 * Each scheme defines: background, headings, paragraphs, lines + secondary trio
 * + button colors. Users can override any value per (palette, scheme, key).
 */

export type SchemeId = "light" | "lightAccent" | "accent" | "darkAccent" | "dark";

export interface ColorScheme {
  /** Primary surface */
  background: string;
  headings: string;
  paragraphs: string;
  lines: string;
  /** Secondary surface (cards, sub-sections) */
  secondaryBackground: string;
  secondaryHeadings: string;
  secondaryParagraphs: string;
  secondaryLines: string;
  /** Buttons */
  buttonBackground: string;
  buttonText: string;
  buttonBackgroundHover: string;
  buttonTextHover: string;
}

export interface ColorPalette {
  id: string;
  label: string;
  /** 5 swatches displayed as the palette preview (light → dark). */
  swatches: [string, string, string, string, string];
  schemes: Record<SchemeId, ColorScheme>;
}

export const SCHEME_LABELS: Record<SchemeId, string> = {
  light: "Light",
  lightAccent: "Light Accent",
  accent: "Accent",
  darkAccent: "Dark Accent",
  dark: "Dark",
};

export const SCHEME_ORDER: SchemeId[] = [
  "light",
  "lightAccent",
  "accent",
  "darkAccent",
  "dark",
];

/** Swatches: [bg, lightAccent bg, accent bg, darkAccent bg, dark bg] */
function buildPalette(
  id: string,
  label: string,
  swatches: [string, string, string, string, string],
  schemes: Record<SchemeId, Partial<ColorScheme> & Pick<ColorScheme, "background">>,
): ColorPalette {
  // Fill in sensible per-scheme defaults derived from background.
  const completed = {} as Record<SchemeId, ColorScheme>;
  (Object.keys(schemes) as SchemeId[]).forEach((sk) => {
    const s = schemes[sk];
    const isDark = sk === "dark" || sk === "darkAccent";
    const ink = isDark ? "#ffffff" : swatches[4];
    const dim = isDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.62)";
    const line = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
    completed[sk] = {
      background: s.background,
      headings: s.headings ?? ink,
      paragraphs: s.paragraphs ?? dim,
      lines: s.lines ?? line,
      secondaryBackground: s.secondaryBackground ?? swatches[1],
      secondaryHeadings: s.secondaryHeadings ?? ink,
      secondaryParagraphs: s.secondaryParagraphs ?? dim,
      secondaryLines: s.secondaryLines ?? line,
      buttonBackground: s.buttonBackground ?? (isDark ? "#ffffff" : swatches[4]),
      buttonText: s.buttonText ?? (isDark ? swatches[4] : "#ffffff"),
      buttonBackgroundHover: s.buttonBackgroundHover ?? (isDark ? swatches[2] : swatches[3]),
      buttonTextHover: s.buttonTextHover ?? (isDark ? swatches[4] : "#ffffff"),
    };
  });
  return { id, label, swatches, schemes: completed };
}

export const COLOR_PALETTES: ColorPalette[] = [
  buildPalette(
    "comfort-gray",
    "Comfort Gray",
    ["#ffffff", "#f3f1ee", "#e3e1dd", "#6e6e6c", "#0e0e0e"],
    {
      light: { background: "#ffffff" },
      lightAccent: { background: "#f3f1ee" },
      accent: { background: "#e3e1dd" },
      darkAccent: { background: "#6e6e6c" },
      dark: { background: "#0e0e0e" },
    },
  ),
  buildPalette(
    "linen",
    "Linen",
    ["#fbf8f3", "#f0ebe1", "#d9cdb6", "#7a7363", "#1c1a16"],
    {
      light: { background: "#fbf8f3" },
      lightAccent: { background: "#f0ebe1" },
      accent: { background: "#d9cdb6" },
      darkAccent: { background: "#7a7363" },
      dark: { background: "#1c1a16" },
    },
  ),
  buildPalette(
    "sea",
    "Sea",
    ["#ffffff", "#e9eef2", "#cdd9e0", "#384a55", "#1a242b"],
    {
      light: { background: "#ffffff" },
      lightAccent: { background: "#e9eef2" },
      accent: { background: "#cdd9e0" },
      darkAccent: { background: "#384a55" },
      dark: { background: "#1a242b" },
    },
  ),
  buildPalette(
    "neutral",
    "Neutral",
    ["#ffffff", "#f5f3ee", "#ece7df", "#e0d4c6", "#1a1a1a"],
    {
      light: { background: "#ffffff" },
      lightAccent: { background: "#f5f3ee" },
      accent: { background: "#ece7df" },
      darkAccent: { background: "#5a4f44" },
      dark: { background: "#1a1a1a" },
    },
  ),
  buildPalette(
    "willow-tree",
    "Willow Tree",
    ["#ffffff", "#ebebe6", "#cccdc4", "#8b8d80", "#0a0a0a"],
    {
      light: { background: "#ffffff" },
      lightAccent: { background: "#ebebe6" },
      accent: { background: "#cccdc4" },
      darkAccent: { background: "#8b8d80" },
      dark: { background: "#0a0a0a" },
    },
  ),
  buildPalette(
    "sage",
    "Sage",
    ["#ffffff", "#eef0eb", "#dde2d6", "#5e6a55", "#1d2218"],
    {
      light: { background: "#ffffff" },
      lightAccent: { background: "#eef0eb" },
      accent: { background: "#dde2d6" },
      darkAccent: { background: "#5e6a55" },
      dark: { background: "#1d2218" },
    },
  ),
  buildPalette(
    "blush",
    "Blush",
    ["#ffffff", "#f8eded", "#ecd9da", "#a98787", "#0e0e0e"],
    {
      light: { background: "#ffffff" },
      lightAccent: { background: "#f8eded" },
      accent: { background: "#ecd9da" },
      darkAccent: { background: "#a98787" },
      dark: { background: "#0e0e0e" },
    },
  ),
  buildPalette(
    "ivory",
    "Ivory",
    ["#fdfaf3", "#f3ecde", "#e2d5b8", "#222015", "#0c0b07"],
    {
      light: { background: "#fdfaf3" },
      lightAccent: { background: "#f3ecde" },
      accent: { background: "#e2d5b8" },
      darkAccent: { background: "#3a3528" },
      dark: { background: "#0c0b07" },
    },
  ),
  buildPalette(
    "rose-gold",
    "Rose Gold",
    ["#fff8f5", "#f6e2d6", "#e6b89c", "#7a4e3d", "#1c0f0a"],
    {
      light: { background: "#fff8f5" },
      lightAccent: { background: "#f6e2d6" },
      accent: { background: "#e6b89c" },
      darkAccent: { background: "#7a4e3d" },
      dark: { background: "#1c0f0a" },
    },
  ),
  buildPalette(
    "midnight",
    "Midnight",
    ["#ffffff", "#e8eaf0", "#aab2c4", "#2a3147", "#080a14"],
    {
      light: { background: "#ffffff" },
      lightAccent: { background: "#e8eaf0" },
      accent: { background: "#aab2c4" },
      darkAccent: { background: "#2a3147" },
      dark: { background: "#080a14" },
    },
  ),
];

export const DEFAULT_PALETTE_ID = "comfort-gray";
export const DEFAULT_SCHEME_ID: SchemeId = "light";

export type ColorOverrides = {
  /** key: `${paletteId}::${schemeId}` → partial scheme overrides. */
  [paletteSchemeKey: string]: Partial<ColorScheme>;
};

/** A user-defined palette stored on the site. Same shape as a preset. */
export type CustomColorPalette = ColorPalette;

export function getPalette(
  paletteId: string | null | undefined,
  customPalettes?: CustomColorPalette[] | null,
): ColorPalette {
  const id = paletteId || DEFAULT_PALETTE_ID;
  return (
    COLOR_PALETTES.find((p) => p.id === id) ||
    (customPalettes ?? []).find((p) => p.id === id) ||
    COLOR_PALETTES[0]
  );
}

export function resolveScheme(
  paletteId: string | null | undefined,
  schemeId: SchemeId | null | undefined,
  overrides: ColorOverrides | null | undefined,
  customPalettes?: CustomColorPalette[] | null,
): ColorScheme {
  const palette = getPalette(paletteId, customPalettes);
  const sk = (schemeId || DEFAULT_SCHEME_ID) as SchemeId;
  const base = palette.schemes[sk] ?? palette.schemes.light;
  const ov = (overrides ?? {})[`${palette.id}::${sk}`] ?? {};
  return { ...base, ...ov };
}

/**
 * Build CSS variables that downstream components can hook into.
 * These cascade from <html>; sections can override on their own scope.
 */
export function buildColorCss(
  paletteId: string | null | undefined,
  schemeId: SchemeId | null | undefined,
  overrides: ColorOverrides | null | undefined,
  customPalettes?: CustomColorPalette[] | null,
): string {
  const s = resolveScheme(paletteId, schemeId, overrides, customPalettes);
  return `:root{
  --site-bg:${s.background};
  --site-headings:${s.headings};
  --site-paragraphs:${s.paragraphs};
  --site-lines:${s.lines};
  --site-secondary-bg:${s.secondaryBackground};
  --site-secondary-headings:${s.secondaryHeadings};
  --site-secondary-paragraphs:${s.secondaryParagraphs};
  --site-secondary-lines:${s.secondaryLines};
  --site-button-bg:${s.buttonBackground};
  --site-button-text:${s.buttonText};
  --site-button-bg-hover:${s.buttonBackgroundHover};
  --site-button-text-hover:${s.buttonTextHover};
}`;
}

export const SCHEME_FIELD_GROUPS: {
  group: string;
  fields: { key: keyof ColorScheme; label: string }[];
}[] = [
  {
    group: "Primary",
    fields: [
      { key: "background", label: "Background" },
      { key: "headings", label: "Headings" },
      { key: "paragraphs", label: "Paragraphs" },
      { key: "lines", label: "Lines" },
    ],
  },
  {
    group: "Secondary",
    fields: [
      { key: "secondaryBackground", label: "Secondary Background" },
      { key: "secondaryHeadings", label: "Secondary Headings" },
      { key: "secondaryParagraphs", label: "Secondary Paragraphs" },
      { key: "secondaryLines", label: "Secondary Lines" },
    ],
  },
  {
    group: "Button",
    fields: [
      { key: "buttonBackground", label: "Button Background" },
      { key: "buttonText", label: "Button Text" },
      { key: "buttonBackgroundHover", label: "Button Background Hover" },
      { key: "buttonTextHover", label: "Button Text Hover" },
    ],
  },
];
