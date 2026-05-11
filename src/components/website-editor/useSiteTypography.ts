import { useEffect } from "react";
import { buildGoogleFontsHrefFromIds } from "@/components/website-editor/site-fonts";
import {
  buildTypographyCss,
  collectFontIds,
  FONT_SIZE_SCALES,
  type FontOverrides,
  type FontSizeScale,
} from "@/components/website-editor/font-templates";

export interface CustomFont {
  id: string; // e.g. "custom-my-font"
  label: string;
  url: string;
  format?: string; // woff2 | woff | ttf | otf
}

/**
 * Injects the chosen Google Fonts, any uploaded custom @font-face declarations,
 * and a global typography stylesheet into <head>.
 */
export function useSiteTypography(
  templateId: string | null | undefined,
  overrides: FontOverrides | null | undefined,
  fontSize: FontSizeScale | null | undefined = "regular",
  customFonts: CustomFont[] | null | undefined = [],
  customFontCss: string | null | undefined = "",
) {
  // Inject <link> for Google Font families used by the active template + overrides.
  useEffect(() => {
    const ids = collectFontIds(templateId, overrides);
    const href = buildGoogleFontsHrefFromIds(ids);
    const id = "lov-site-fonts-typography";
    let el = document.getElementById(id) as HTMLLinkElement | null;
    if (!href) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("link");
      el.id = id;
      el.rel = "stylesheet";
      document.head.appendChild(el);
    }
    if (el.href !== href) el.href = href;
  }, [templateId, overrides]);

  // Inject @font-face for any uploaded custom fonts.
  useEffect(() => {
    const list = customFonts ?? [];
    const css = list
      .filter((f) => f && f.id && f.url)
      .map(
        (f) =>
          `@font-face {\n  font-family: '${f.id}';\n  src: url('${f.url}')${f.format ? ` format('${f.format}')` : ""};\n  font-display: swap;\n}`,
      )
      .join("\n");
    const id = "lov-site-custom-fontfaces";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!css) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }, [customFonts]);

  // Inject the per-element CSS rules.
  useEffect(() => {
    const scale = FONT_SIZE_SCALES[fontSize ?? "regular"] ?? 1;
    const css = buildTypographyCss(templateId, overrides, scale, customFonts ?? []);
    const id = "lov-site-typography";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }, [templateId, overrides, fontSize, customFonts]);
}
