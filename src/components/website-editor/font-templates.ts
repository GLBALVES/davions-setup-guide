// ── Pixieset-style typography templates ─────────────────────────────────────
// Each template defines a complete typographic system: a heading font + a body
// font, plus per-element defaults (h1–h6, banner, paragraphs, navigation,
// buttons, form labels, pullquote). The user can pick a template (one click)
// then override individual elements via the Fonts panel "Edit Font Template"
// editor. Effective typography = merge(template.elements, font_overrides).

import { FONT_PRESETS } from "./site-fonts";

export type ElementKey =
  | "banner_heading"
  | "banner_subtitle"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "paragraph_1"
  | "paragraph_2"
  | "paragraph_3"
  | "logo_text"
  | "navigation"
  | "sub_navigation"
  | "overlay_navigation"
  | "overlay_sub_navigation"
  | "button"
  | "form_label"
  | "pullquote";

export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type FontStyle = "normal" | "italic";

export interface ElementTypography {
  fontFamily: string; // FONT_PRESETS id
  weight: number; // 300-800
  style: FontStyle;
  fontSize: number; // px
  lineHeight: number; // em (unitless multiplier)
  letterSpacing: number; // em
  textTransform: TextTransform;
}

export type ElementOverrides = Partial<ElementTypography>;
export type FontOverrides = Partial<Record<ElementKey, ElementOverrides>> & {
  /** Reserved meta key — not an element. Stores the global font-size scale. */
  _meta?: { fontSize?: FontSizeScale };
};

export interface FontTemplate {
  id: string;
  label: string;
  category: "serif" | "sans" | "combo";
  /** Convenience: "headline" font id (used for the Heading-font column for back-compat). */
  heading: string;
  /** Convenience: body font id (used for the Body-font column for back-compat). */
  body: string;
  elements: Record<ElementKey, ElementTypography>;
}

// ── Helpers to keep template definitions short ─────────────────────────────
const t = (
  fontFamily: string,
  weight: number,
  fontSize: number,
  opts: Partial<Omit<ElementTypography, "fontFamily" | "weight" | "fontSize">> = {},
): ElementTypography => ({
  fontFamily,
  weight,
  style: opts.style ?? "normal",
  fontSize,
  lineHeight: opts.lineHeight ?? 1.3,
  letterSpacing: opts.letterSpacing ?? 0,
  textTransform: opts.textTransform ?? "none",
});

// Build a default element map given a heading font + body font + overall vibe.
function defaultElements(headingId: string, bodyId: string, vibe: "elegant" | "modern" | "minimal"): Record<ElementKey, ElementTypography> {
  const isElegant = vibe === "elegant";
  const isMinimal = vibe === "minimal";
  return {
    banner_heading: t(headingId, isElegant ? 400 : 300, 72, { lineHeight: 1.05, letterSpacing: isMinimal ? 0.04 : 0, textTransform: isMinimal ? "uppercase" : "none" }),
    banner_subtitle: t(bodyId, 300, 14, { letterSpacing: 0.25, textTransform: "uppercase" }),
    h1: t(headingId, isElegant ? 400 : 300, 56, { lineHeight: 1.1, letterSpacing: isMinimal ? 0.04 : 0 }),
    h2: t(headingId, isElegant ? 400 : 300, 40, { lineHeight: 1.2 }),
    h3: t(headingId, isElegant ? 500 : 400, 28, { lineHeight: 1.3 }),
    h4: t(headingId, isElegant ? 500 : 500, 22, { lineHeight: 1.35 }),
    h5: t(bodyId, 500, 16, { letterSpacing: 0.18, textTransform: "uppercase" }),
    h6: t(bodyId, 500, 13, { letterSpacing: 0.25, textTransform: "uppercase" }),
    paragraph_1: t(bodyId, 400, 17, { lineHeight: 1.7 }),
    paragraph_2: t(bodyId, 400, 15, { lineHeight: 1.65 }),
    paragraph_3: t(bodyId, 400, 13, { lineHeight: 1.6 }),
    logo_text: t(headingId, isElegant ? 400 : 300, 18, { letterSpacing: 0.4, textTransform: "uppercase" }),
    navigation: t(bodyId, 400, 11, { letterSpacing: 0.3, textTransform: "uppercase" }),
    sub_navigation: t(bodyId, 400, 11, { letterSpacing: 0.2, textTransform: "uppercase" }),
    overlay_navigation: t(headingId, isElegant ? 400 : 300, 32, { lineHeight: 1.2 }),
    overlay_sub_navigation: t(bodyId, 400, 12, { letterSpacing: 0.3, textTransform: "uppercase" }),
    button: t(bodyId, 500, 12, { letterSpacing: 0.25, textTransform: "uppercase" }),
    form_label: t(bodyId, 500, 11, { letterSpacing: 0.25, textTransform: "uppercase" }),
    pullquote: t(headingId, isElegant ? 400 : 300, 28, { style: "italic", lineHeight: 1.4 }),
  };
}

export const FONT_TEMPLATES: FontTemplate[] = [
  {
    id: "made-mirage",
    label: "Made Mirage",
    category: "combo",
    heading: "cormorant-garamond",
    body: "inter",
    elements: defaultElements("cormorant-garamond", "inter", "elegant"),
  },
  {
    id: "vollkorn",
    label: "Vollkorn",
    category: "serif",
    heading: "vollkorn",
    body: "vollkorn",
    elements: defaultElements("vollkorn", "vollkorn", "elegant"),
  },
  {
    id: "montserrat",
    label: "Montserrat",
    category: "sans",
    heading: "montserrat",
    body: "montserrat",
    elements: defaultElements("montserrat", "montserrat", "modern"),
  },
  {
    id: "crimson-text",
    label: "Crimson Text",
    category: "serif",
    heading: "crimson-text",
    body: "inter",
    elements: defaultElements("crimson-text", "inter", "elegant"),
  },
  {
    id: "editorial-pair",
    label: "Editorial",
    category: "combo",
    heading: "playfair",
    body: "lora",
    elements: defaultElements("playfair", "lora", "elegant"),
  },
  {
    id: "modern-minimal",
    label: "Modern Minimal",
    category: "combo",
    heading: "dm-serif",
    body: "raleway",
    elements: defaultElements("dm-serif", "raleway", "minimal"),
  },
  {
    id: "classic-sans",
    label: "Classic Sans",
    category: "sans",
    heading: "poppins",
    body: "poppins",
    elements: defaultElements("poppins", "poppins", "modern"),
  },
  {
    id: "boutique",
    label: "Boutique",
    category: "combo",
    heading: "cormorant",
    body: "montserrat",
    elements: defaultElements("cormorant", "montserrat", "elegant"),
  },
  {
    id: "franklin",
    label: "Franklin",
    category: "sans",
    heading: "libre-franklin",
    body: "libre-franklin",
    elements: defaultElements("libre-franklin", "libre-franklin", "minimal"),
  },
  {
    id: "lora-sans",
    label: "Lora & Work",
    category: "combo",
    heading: "lora",
    body: "work-sans",
    elements: defaultElements("lora", "work-sans", "modern"),
  },
  {
    id: "jost-pure",
    label: "Jost",
    category: "sans",
    heading: "jost",
    body: "jost",
    elements: defaultElements("jost", "jost", "minimal"),
  },
  {
    id: "caslon",
    label: "Libre Caslon",
    category: "serif",
    heading: "libre-caslon",
    body: "libre-caslon",
    elements: defaultElements("libre-caslon", "libre-caslon", "elegant"),
  },
];

export const DEFAULT_FONT_TEMPLATE_ID = "made-mirage";

export function getFontTemplate(id?: string | null): FontTemplate {
  return FONT_TEMPLATES.find((t) => t.id === id) ?? FONT_TEMPLATES[0];
}

export const ELEMENT_GROUPS: { key: "headings" | "paragraphs" | "navigation" | "buttons" | "other"; label: string; items: { key: ElementKey; label: string }[] }[] = [
  {
    key: "headings",
    label: "Headings",
    items: [
      { key: "banner_heading", label: "Banner Heading" },
      { key: "banner_subtitle", label: "Banner Subtitle" },
      { key: "h1", label: "Heading 1" },
      { key: "h2", label: "Heading 2" },
      { key: "h3", label: "Heading 3" },
      { key: "h4", label: "Heading 4" },
      { key: "h5", label: "Heading 5" },
      { key: "h6", label: "Heading 6" },
    ],
  },
  {
    key: "paragraphs",
    label: "Paragraphs",
    items: [
      { key: "paragraph_1", label: "Paragraph 1" },
      { key: "paragraph_2", label: "Paragraph 2" },
      { key: "paragraph_3", label: "Paragraph 3" },
    ],
  },
  {
    key: "navigation",
    label: "Navigation",
    items: [
      { key: "logo_text", label: "Logo Text" },
      { key: "navigation", label: "Navigation" },
      { key: "sub_navigation", label: "Sub Navigation" },
      { key: "overlay_navigation", label: "Overlay Navigation" },
      { key: "overlay_sub_navigation", label: "Overlay Sub Navigation" },
    ],
  },
  {
    key: "buttons",
    label: "Buttons",
    items: [{ key: "button", label: "Button Text" }],
  },
  {
    key: "other",
    label: "Other",
    items: [
      { key: "form_label", label: "Form Label" },
      { key: "pullquote", label: "Pullquote" },
    ],
  },
];

/** Resolve effective typography for a given element by merging template + overrides. */
export function resolveElement(
  templateId: string | null | undefined,
  overrides: FontOverrides | null | undefined,
  key: ElementKey,
  scale: number = 1,
): ElementTypography {
  const tpl = getFontTemplate(templateId);
  const base = tpl.elements[key];
  const ov = (overrides ?? {})[key] ?? {};
  const merged: ElementTypography = { ...base, ...ov };
  return { ...merged, fontSize: Math.round(merged.fontSize * scale) };
}

/** All font ids referenced by a template + its overrides — used to lazy-load fonts. */
export function collectFontIds(templateId: string | null | undefined, overrides: FontOverrides | null | undefined): string[] {
  const tpl = getFontTemplate(templateId);
  const ids = new Set<string>();
  Object.values(tpl.elements).forEach((e) => ids.add(e.fontFamily));
  Object.entries(overrides ?? {}).forEach(([k, ov]) => {
    if (k === "_meta" || !ov) return;
    const fam = (ov as ElementOverrides).fontFamily;
    if (fam) ids.add(fam);
  });
  // Filter to known presets only
  return Array.from(ids).filter((id) => FONT_PRESETS.some((f) => f.id === id));
}

const ELEMENT_TO_SELECTORS: Record<ElementKey, string> = {
  banner_heading: ".site-banner-heading, [data-site-typo='banner_heading']",
  banner_subtitle: ".site-banner-subtitle, [data-site-typo='banner_subtitle']",
  h1: ".site-h1, [data-site-typo='h1']",
  h2: ".site-h2, [data-site-typo='h2']",
  h3: ".site-h3, [data-site-typo='h3']",
  h4: ".site-h4, [data-site-typo='h4']",
  h5: ".site-h5, [data-site-typo='h5']",
  h6: ".site-h6, [data-site-typo='h6']",
  paragraph_1: ".site-paragraph-1, [data-site-typo='paragraph_1']",
  paragraph_2: ".site-paragraph-2, [data-site-typo='paragraph_2']",
  paragraph_3: ".site-paragraph-3, [data-site-typo='paragraph_3']",
  logo_text: ".site-logo-text, [data-site-typo='logo_text']",
  navigation: ".site-nav, [data-site-typo='navigation']",
  sub_navigation: ".site-subnav, [data-site-typo='sub_navigation']",
  overlay_navigation: ".site-overlay-nav, [data-site-typo='overlay_navigation']",
  overlay_sub_navigation: ".site-overlay-subnav, [data-site-typo='overlay_sub_navigation']",
  button: ".site-button, [data-site-typo='button']",
  form_label: ".site-form-label, [data-site-typo='form_label']",
  pullquote: ".site-pullquote, [data-site-typo='pullquote']",
};

/** Build a CSS string targeting all element classes/data-attrs. */
export function buildTypographyCss(templateId: string | null | undefined, overrides: FontOverrides | null | undefined, scale: number = 1): string {
  const tpl = getFontTemplate(templateId);
  const lines: string[] = [];
  (Object.keys(tpl.elements) as ElementKey[]).forEach((key) => {
    const el = resolveElement(templateId, overrides, key, scale);
    const stack = FONT_PRESETS.find((f) => f.id === el.fontFamily)?.stack ?? "inherit";
    const selector = ELEMENT_TO_SELECTORS[key];
    lines.push(`${selector} {`);
    lines.push(`  font-family: ${stack};`);
    lines.push(`  font-weight: ${el.weight};`);
    lines.push(`  font-style: ${el.style};`);
    lines.push(`  font-size: ${el.fontSize}px;`);
    lines.push(`  line-height: ${el.lineHeight};`);
    lines.push(`  letter-spacing: ${el.letterSpacing}em;`);
    lines.push(`  text-transform: ${el.textTransform};`);
    lines.push(`}`);
  });
  return lines.join("\n");
}

export const FONT_SIZE_SCALES = {
  compact: 0.9,
  regular: 1,
  comfortable: 1.1,
} as const;
export type FontSizeScale = keyof typeof FONT_SIZE_SCALES;
