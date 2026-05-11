import { useEffect } from "react";
import type { AnimationStyle } from "@/components/website-editor/settings/AnimationsSubPanel";

/**
 * Injects a global stylesheet + a single IntersectionObserver that animates
 * every section (`[data-block-key]`) with the chosen style as it enters the
 * viewport. Used by both the editor preview and the public site renderer.
 *
 * Supports:
 *  - One-shot entrance presets: fade-in, slide-up, scale-up, scale-down,
 *    reveal, fly-in-left, fly-in-right, zoom-in
 *  - Continuous scroll-tied preset: parallax-soft (translates each section
 *    a few pixels relative to its scroll progress)
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
      [data-anim-pending="true"][data-anim-style="zoom-in"] { transform: scale(0.85); }
      [data-anim-pending="true"][data-anim-style="fly-in-left"] { transform: translateX(-48px); }
      [data-anim-pending="true"][data-anim-style="fly-in-right"] { transform: translateX(48px); }
      [data-anim-pending="true"][data-anim-style="reveal"] { clip-path: inset(0 0 100% 0); opacity: 1; }

      [data-anim-play="true"] {
        opacity: 1 !important;
        transform: none !important;
        clip-path: inset(0 0 0 0) !important;
        transition:
          opacity 800ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 800ms cubic-bezier(0.22, 1, 0.36, 1),
          clip-path 900ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      /* Continuous parallax-soft: gently lifts each section as it crosses the viewport. */
      [data-parallax-soft="true"] {
        transform: translate3d(0, var(--parallax-soft-y, 0px), 0);
        will-change: transform;
      }

      @media (prefers-reduced-motion: reduce) {
        [data-anim-pending="true"] { opacity: 1 !important; transform: none !important; clip-path: none !important; }
        [data-parallax-soft="true"] { transform: none !important; }
      }
    `;
    document.head.appendChild(el);
  }, []);

  // 2. (Re)wire blocks whenever the style — or the rendered DOM — changes.
  useEffect(() => {
    const active = style && style !== "none" ? style : null;

    // Clear previous markers so switching styles works cleanly.
    document.querySelectorAll<HTMLElement>(
      "[data-anim-pending], [data-anim-play], [data-parallax-soft]",
    ).forEach((el) => {
      el.removeAttribute("data-anim-pending");
      el.removeAttribute("data-anim-play");
      el.removeAttribute("data-anim-style");
      el.removeAttribute("data-parallax-soft");
      el.style.removeProperty("--parallax-soft-y");
    });

    if (!active) return;

    const isParallax = active === "parallax-soft";

    const collect = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-block-key]"))
        .filter((el) => el.getAttribute("data-block-key") !== "header");

    // ── Continuous parallax mode ────────────────────────────────────────────
    if (isParallax) {
      const targets = new Set<HTMLElement>();
      const wire = (el: HTMLElement) => {
        if (targets.has(el)) return;
        el.setAttribute("data-parallax-soft", "true");
        targets.add(el);
      };
      collect().forEach(wire);

      let raf = 0;
      const update = () => {
        raf = 0;
        const vh = window.innerHeight || 1;
        targets.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          // Progress: -1 (below viewport) → 0 (center) → +1 (above viewport)
          const center = r.top + r.height / 2;
          const p = (center - vh / 2) / (vh / 2 + r.height / 2);
          const y = -p * 18; // ±18px translation
          el.style.setProperty("--parallax-soft-y", `${y.toFixed(2)}px`);
        });
      };
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(update);
      };
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);

      const mo = new MutationObserver(() => {
        collect().forEach(wire);
        onScroll();
      });
      mo.observe(document.body, { childList: true, subtree: true });

      return () => {
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        mo.disconnect();
      };
    }

    // ── One-shot entrance presets ───────────────────────────────────────────
    const targets = collect();
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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((el) => {
      el.setAttribute("data-anim-style", active);
      el.setAttribute("data-anim-pending", "true");
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        requestAnimationFrame(() => el.setAttribute("data-anim-play", "true"));
      } else {
        observer.observe(el);
      }
    });

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
