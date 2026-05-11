import { useEffect } from "react";
import { buildGoogleFontsHrefFromIds, type ExternalFontEntry } from "@/components/website-editor/site-fonts";
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
  externalFonts: ExternalFontEntry[] | null | undefined = [],
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
    const css = buildTypographyCss(templateId, overrides, scale, customFonts ?? [], externalFonts ?? []);
    const id = "lov-site-typography";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }, [templateId, overrides, fontSize, customFonts, externalFonts]);

  // Inject user-provided font CSS (e.g. Typekit/Adobe Fonts <link> tags or
  // raw @import / @font-face blocks pasted in the Fonts panel).
  useEffect(() => {
    const raw = (customFontCss ?? "").trim();
    const containerId = "lov-site-custom-font-css";
    document.querySelectorAll(`[data-lov-cfc="${containerId}"]`).forEach((n) => n.remove());
    if (!raw) return;

    // Extract <link ...> tags and inject them as real <link> elements so the
    // browser fetches the stylesheet (Typekit, Google Fonts URL, etc.).
    const linkRegex = /<link\b[^>]*>/gi;
    const links = raw.match(linkRegex) ?? [];
    let leftover = raw.replace(linkRegex, "");

    // Strip <style>…</style> wrappers but keep their content as raw CSS.
    leftover = leftover.replace(/<\/?style\b[^>]*>/gi, "");

    const tmp = document.createElement("div");
    tmp.innerHTML = links.join("\n");
    Array.from(tmp.querySelectorAll("link")).forEach((linkEl) => {
      const fresh = document.createElement("link");
      Array.from(linkEl.attributes).forEach((a) => fresh.setAttribute(a.name, a.value));
      if (!fresh.rel) fresh.rel = "stylesheet";
      fresh.setAttribute("data-lov-cfc", containerId);
      document.head.appendChild(fresh);
    });

    const css = leftover.trim();
    if (css) {
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-lov-cfc", containerId);
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }
  }, [customFontCss]);
}
