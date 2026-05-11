import { useEffect } from "react";

/**
 * Performance Mode
 * ────────────────
 * Sets `data-perf-mode="lite" | "full"` on <html>. CSS rules in this hook
 * disable heavy effects (blur, 3D tilt, ken-burns, parallax-heavy filters,
 * skew/rotate animations) when in lite mode, keeping cheaper transforms
 * (fade, simple translate) so the site still feels alive.
 *
 * Resolution order for the active mode:
 *   1. User override (localStorage `lov-perf-mode` = "lite" | "full" | "auto")
 *   2. Auto: starts in "full", flips to "lite" if:
 *        • prefers-reduced-motion             → lite
 *        • navigator.connection.saveData      → lite
 *        • hardwareConcurrency <= 4 AND mobile UA → lite
 *        • deviceMemory <= 4                  → lite
 *        • Live FPS sampling drops below 35   → lite
 *
 * The mode can be read/changed via `window.__lovPerfMode` and the
 * `lov-perf-mode-change` event.
 */
export function usePerformanceMode() {
  // 1) Inject CSS once.
  useEffect(() => {
    const id = "lov-perf-mode-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      /* Lite mode: kill the expensive bits, keep cheap transforms. */
      html[data-perf-mode="lite"] [data-scroll-effect="ken-burns"] [data-bg-image],
      html[data-perf-mode="lite"] [data-scroll-effect="ken-burns"] img {
        animation: none !important;
        transform: scale(1.05) !important;
      }
      html[data-perf-mode="lite"] [data-scroll-effect="bg-blur-scroll"] [data-bg-image],
      html[data-perf-mode="lite"] [data-scroll-effect="bg-blur-scroll"] img,
      html[data-perf-mode="lite"] [data-scroll-effect="blur-in"],
      html[data-perf-mode="lite"] [data-text-effect="blur-in"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle),
      html[data-perf-mode="lite"] [data-image-effect="blur-in"] :where(img:not([data-bg-image])),
      html[data-perf-mode="lite"] [data-buttons-effect="blur-in"] :where(.site-btn, .site-button) {
        filter: none !important;
      }
      html[data-perf-mode="lite"] [data-scroll-effect="tilt-3d"] {
        perspective: none !important;
      }
      html[data-perf-mode="lite"] [data-scroll-effect="tilt-3d"] > *,
      html[data-perf-mode="lite"] [data-scroll-effect="skew-in"],
      html[data-perf-mode="lite"] [data-scroll-effect="rotate-in"],
      html[data-perf-mode="lite"] [data-text-effect="rotate-in"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle),
      html[data-perf-mode="lite"] [data-image-effect="rotate-in"] :where(img:not([data-bg-image])),
      html[data-perf-mode="lite"] [data-buttons-effect="rotate-in"] :where(.site-btn, .site-button) {
        transform: none !important;
      }
      /* Reduce parallax displacement to a gentle fade so heavy reflow stops. */
      html[data-perf-mode="lite"] [data-scroll-effect="parallax"] img,
      html[data-perf-mode="lite"] [data-scroll-effect="parallax"] [data-bg-image] {
        transform: none !important;
        will-change: auto !important;
        transition: none !important;
      }
      /* Backdrop filters are a common perf killer. */
      html[data-perf-mode="lite"] * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // 2) Resolve & monitor the active mode.
  useEffect(() => {
    const root = document.documentElement;
    const w = window as any;

    const apply = (mode: "lite" | "full") => {
      if (root.getAttribute("data-perf-mode") === mode) return;
      root.setAttribute("data-perf-mode", mode);
      w.__lovPerfMode = mode;
      window.dispatchEvent(new CustomEvent("lov-perf-mode-change", { detail: mode }));
    };

    const getOverride = (): "lite" | "full" | "auto" => {
      try {
        const v = localStorage.getItem("lov-perf-mode");
        if (v === "lite" || v === "full" || v === "auto") return v;
      } catch {
        /* ignore */
      }
      return "auto";
    };

    const autoDetect = (): "lite" | "full" => {
      try {
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return "lite";
        const c = (navigator as any).connection;
        if (c?.saveData) return "lite";
        if (typeof c?.effectiveType === "string" && /(^|-)2g$/.test(c.effectiveType)) return "lite";
        const cores = navigator.hardwareConcurrency ?? 8;
        const mem = (navigator as any).deviceMemory ?? 8;
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (mem <= 4) return "lite";
        if (cores <= 4 && isMobile) return "lite";
      } catch {
        /* ignore */
      }
      return "full";
    };

    const resolve = () => {
      const ov = getOverride();
      if (ov === "lite" || ov === "full") {
        apply(ov);
        return ov;
      }
      apply(autoDetect());
      return "auto" as const;
    };

    let active = resolve();

    // FPS monitor — only when "auto" and currently "full".
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let lowSamples = 0;
    let stopped = false;

    const tick = (t: number) => {
      if (stopped) return;
      frames++;
      const elapsed = t - last;
      if (elapsed >= 1000) {
        const fps = (frames * 1000) / elapsed;
        frames = 0;
        last = t;
        // Only auto-downgrade; never auto-upgrade (avoid flapping).
        if (active === "auto" && root.getAttribute("data-perf-mode") === "full") {
          if (fps < 35) lowSamples++;
          else lowSamples = 0;
          if (lowSamples >= 3) {
            apply("lite");
            stopped = true;
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    // Wait a beat so initial render doesn't poison the sample.
    const startId = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 1500);

    const onOverrideChange = () => {
      active = resolve();
      if (active !== "auto") {
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
      }
    };
    window.addEventListener("lov-perf-mode-override", onOverrideChange);
    window.addEventListener("storage", onOverrideChange);

    return () => {
      stopped = true;
      window.clearTimeout(startId);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("lov-perf-mode-override", onOverrideChange);
      window.removeEventListener("storage", onOverrideChange);
    };
  }, []);
}

/** Set the user's perf-mode override (used by the toggle UI). */
export function setPerfModeOverride(mode: "lite" | "full" | "auto") {
  try {
    localStorage.setItem("lov-perf-mode", mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("lov-perf-mode-override", { detail: mode }));
}

export function getPerfModeOverride(): "lite" | "full" | "auto" {
  try {
    const v = localStorage.getItem("lov-perf-mode");
    if (v === "lite" || v === "full" || v === "auto") return v;
  } catch {
    /* ignore */
  }
  return "auto";
}
