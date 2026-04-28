import { useEffect } from "react";
import { SPACING_DEFAULTS } from "@/components/website-editor/settings/SpacingSubPanel";

/**
 * Exposes the studio's spacing preferences as CSS variables on :root so that
 * any block / section can read them:
 *   --site-max-w       max content width (px)
 *   --site-block-py    base vertical padding for blocks (px)
 *
 * A small helper rule is also injected so existing `max-w-7xl` / `max-w-6xl`
 * containers automatically respect the chosen width without touching every
 * block file.
 */
export function useSiteSpacing(
  maxPageWidth: number | null | undefined,
  baseBlockPadding: number | null | undefined,
) {
  useEffect(() => {
    const w = Math.max(640, Number(maxPageWidth) || SPACING_DEFAULTS.maxPageWidth);
    const p = Math.max(0, Number(baseBlockPadding ?? SPACING_DEFAULTS.baseBlockPadding));
    const root = document.documentElement;
    root.style.setProperty("--site-max-w", `${w}px`);
    root.style.setProperty("--site-block-py", `${p}px`);

    const id = "lov-site-spacing";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    // Constrain the standard tailwind container widths used across blocks and
    // give every section a consistent vertical rhythm. The `:where()` keeps
    // specificity at 0 so per-block overrides still win.
    el.textContent = `
      :where([data-block-key]) .max-w-7xl,
      :where([data-block-key]) .max-w-6xl,
      :where([data-block-key]) .max-w-5xl {
        max-width: min(100%, var(--site-max-w, ${w}px)) !important;
      }
      :where([data-block-key]):not([data-block-key="header"]):not([data-block-key="footer"]) {
        padding-top: var(--site-block-py, ${p}px);
        padding-bottom: var(--site-block-py, ${p}px);
      }
    `;
  }, [maxPageWidth, baseBlockPadding]);
}
