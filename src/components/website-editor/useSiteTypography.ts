import { useEffect } from "react";
import { buildGoogleFontsHrefFromIds } from "@/components/website-editor/site-fonts";
import {
  buildTypographyCss,
  collectFontIds,
  FONT_SIZE_SCALES,
  type FontOverrides,
  type FontSizeScale,
} from "@/components/website-editor/font-templates";

/**
 * Injects the chosen Google Fonts and a global typography stylesheet into <head>.
 *
 * Used by both the dashboard preview (WebsiteEditor) and the public site
 * renderer so that whatever the user selects in the Fonts panel is reflected
 * everywhere — and any element marked with `.site-h1`, `.site-paragraph-1`,
 * `.site-button`, etc. (or `data-site-typo="..."`) gets the matching family,
 * size, line-height, letter-spacing and transform.
 */
export function useSiteTypography(
  templateId: string | null | undefined,
  overrides: FontOverrides | null | undefined,
  fontSize: FontSizeScale | null | undefined = "regular",
) {
  // Inject <link> for all font families used by the active template + overrides.
  useEffect(() => {
    const ids = collectFontIds(templateId, overrides);
    const href = buildGoogleFontsHrefFromIds(ids);
    if (!href) return;
    const id = "lov-site-fonts-typography";
    let el = document.getElementById(id) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement("link");
      el.id = id;
      el.rel = "stylesheet";
      document.head.appendChild(el);
    }
    if (el.href !== href) el.href = href;
  }, [templateId, overrides]);

  // Inject the per-element CSS rules.
  useEffect(() => {
    const scale = FONT_SIZE_SCALES[fontSize ?? "regular"] ?? 1;
    const css = buildTypographyCss(templateId, overrides, scale);
    const id = "lov-site-typography";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }, [templateId, overrides, fontSize]);
}
