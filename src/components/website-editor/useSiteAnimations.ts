import { useEffect } from "react";
import type { AnimationStyle } from "@/components/website-editor/settings/AnimationsSubPanel";

/**
 * Injects a global stylesheet + a single IntersectionObserver that animates
 * every section (`[data-block-key]`) with the chosen style as it enters the
 * viewport. Used by both the editor preview and the public site renderer.
 *
 * The header block is intentionally skipped so the navigation never animates.
 */
export function useSiteAnimations(style: AnimationStyle | string | null | undefined) {
  // 1. Inject the keyframe + base CSS once.
  useEffect(() => {
    const id = "lov-site-animations-css";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      [data-anim-pending="true"] { opacity: 0; will-change: opacity, transform; }
      [data-anim-pending="true"][data-anim-style="fade-in"] { transform: none; }
      [data-anim-pending="true"][data-anim-style="slide-up"] { transform: translateY(28px); }
      [data-anim-pending="true"][data-anim-style="scale-up"] { transform: scale(0.96); }
      [data-anim-pending="true"][data-anim-style="scale-down"] { transform: scale(1.04); }
      [data-anim-pending="true"][data-anim-style="reveal"] { clip-path: inset(0 0 100% 0); opacity: 1; }

      [data-anim-play="true"] {
        opacity: 1 !important;
        transform: none !important;
        clip-path: inset(0 0 0 0) !important;
        transition:
          opacity 700ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 700ms cubic-bezier(0.22, 1, 0.36, 1),
          clip-path 900ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      @media (prefers-reduced-motion: reduce) {
        [data-anim-pending="true"] { opacity: 1 !important; transform: none !important; clip-path: none !important; }
      }
    `;
    document.head.appendChild(el);
  }, []);

  // 2. (Re)wire blocks whenever the style — or the rendered DOM — changes.
  useEffect(() => {
    const active = style && style !== "none" ? style : null;

    // Clear previous markers so switching styles works cleanly.
    document.querySelectorAll<HTMLElement>("[data-anim-pending], [data-anim-play]")
      .forEach((el) => {
        el.removeAttribute("data-anim-pending");
        el.removeAttribute("data-anim-play");
        el.removeAttribute("data-anim-style");
      });

    if (!active) return;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-block-key]")
    ).filter((el) => el.getAttribute("data-block-key") !== "header");

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.setAttribute("data-anim-play", "true");
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach((el) => {
      el.setAttribute("data-anim-style", active);
      el.setAttribute("data-anim-pending", "true");
      // Sections already on screen at mount → play immediately.
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        // Defer to next frame so the initial transform is visible first.
        requestAnimationFrame(() => el.setAttribute("data-anim-play", "true"));
      } else {
        observer.observe(el);
      }
    });

    // Re-scan when DOM mutates (sections added/removed, page changed).
    const mo = new MutationObserver(() => {
      document.querySelectorAll<HTMLElement>("[data-block-key]").forEach((el) => {
        if (el.getAttribute("data-block-key") === "header") return;
        if (el.hasAttribute("data-anim-pending") || el.hasAttribute("data-anim-play")) return;
        el.setAttribute("data-anim-style", active);
        el.setAttribute("data-anim-pending", "true");
        observer.observe(el);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, [style]);
}
