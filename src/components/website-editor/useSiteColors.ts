import { useEffect } from "react";
import {
  buildColorCss,
  type ColorOverrides,
  type CustomColorPalette,
  type SchemeId,
} from "@/components/website-editor/color-palettes";

/**
 * Injects CSS variables (`--site-bg`, `--site-headings`, `--site-button-bg`, …)
 * for the active palette + scheme into <head>. Used by both the editor preview
 * and the public site so the user's color choices propagate everywhere a
 * component reads `var(--site-*)`.
 */
export function useSiteColors(
  paletteId: string | null | undefined,
  schemeId: SchemeId | null | undefined,
  overrides: ColorOverrides | null | undefined,
  customPalettes?: CustomColorPalette[] | null,
  siteColors?: string[] | null,
) {
  useEffect(() => {
    const css = buildColorCss(paletteId, schemeId, overrides, customPalettes);
    const id = "lov-site-colors";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }, [paletteId, schemeId, overrides, customPalettes]);

  // Expose user-defined site palette colors to color pickers across the editor
  // (read by SitePalettePicker via document.documentElement.dataset.siteColors).
  useEffect(() => {
    const arr = Array.isArray(siteColors) ? siteColors.filter(Boolean) : [];
    try {
      document.documentElement.dataset.siteColors = JSON.stringify(arr);
      // Notify any open pickers to refresh.
      window.dispatchEvent(new CustomEvent("site-colors-changed"));
    } catch {
      /* noop */
    }
  }, [siteColors]);
}

