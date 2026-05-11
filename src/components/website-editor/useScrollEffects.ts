import { useEffect } from "react";

/**
 * Per-block "Scroll Effect" engine.
 *
 * Reads `data-scroll-effect="..."` from any element (we apply it on the block
 * wrapper in SectionRenderer) and animates it continuously based on its
 * scroll progress through the viewport.
 *
 * Progress is 0 when the element is just entering the bottom of the viewport
 * and 1 when it has just exited the top — so transforms are tied to the
 * user's scroll position (Wix-style scrub effects).
 *
 * Effects supported:
 *   parallax        — translates the inner image -20%..+20% of its height.
 *   reveal          — clip-path "curtain" opens as the element enters.
 *   zoom-on-scroll  — scales 1.0 → 1.15 across the section's pass.
 *   fade-on-scroll  — opacity 0 → 1 → 0 (peaks while centered).
 *   fly-in-left     — translateX -80px → 0 across the entrance window.
 *   fly-in-right    — translateX  80px → 0 across the entrance window.
 *   fly-in-up       — translateY  80px → 0 across the entrance window.
 *
 * One IntersectionObserver decides which elements are "active"; one
 * rAF-throttled scroll listener updates CSS variables on those active ones.
 */
export function useScrollEffects() {
  // 1. Inject CSS once.
  useEffect(() => {
    const id = "lov-scroll-effects-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      [data-scroll-effect] { --se-progress: 0; }
      [data-scroll-effect="parallax"] { overflow: hidden; }
      [data-scroll-effect="parallax"] img,
      [data-scroll-effect="parallax"] [data-bg-image] {
        transform: translate3d(0, calc((var(--se-progress) - 0.5) * -28%), 0) scale(1.2);
        will-change: transform;
        transition: transform 60ms linear;
      }
      [data-scroll-effect="reveal"] {
        clip-path: inset(0 0 calc((1 - min(var(--se-progress) * 1.6, 1)) * 100%) 0);
        will-change: clip-path;
      }
      [data-scroll-effect="zoom-on-scroll"] img,
      [data-scroll-effect="zoom-on-scroll"] [data-bg-image] {
        transform: scale(calc(1 + var(--se-progress) * 0.18));
        transform-origin: center;
        will-change: transform;
      }
      [data-scroll-effect="fade-on-scroll"] {
        opacity: calc(1 - abs(var(--se-progress) - 0.5) * 1.6);
        will-change: opacity;
      }
      /* Fallback for browsers without abs(): a simpler eased fade. */
      @supports not (opacity: calc(1 - abs(0.5))) {
        [data-scroll-effect="fade-on-scroll"] {
          opacity: min(var(--se-progress) * 2, max(0, 2 - var(--se-progress) * 2));
        }
      }
      [data-scroll-effect="fly-in-left"] {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2, 1)) * -80px), 0, 0);
        opacity: min(var(--se-progress) * 2, 1);
        will-change: transform, opacity;
      }
      [data-scroll-effect="fly-in-right"] {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2, 1)) * 80px), 0, 0);
        opacity: min(var(--se-progress) * 2, 1);
        will-change: transform, opacity;
      }
      [data-scroll-effect="fly-in-up"] {
        transform: translate3d(0, calc((1 - min(var(--se-progress) * 2, 1)) * 80px), 0);
        opacity: min(var(--se-progress) * 2, 1);
        will-change: transform, opacity;
      }

      @media (prefers-reduced-motion: reduce) {
        [data-scroll-effect] { --se-progress: 0.5 !important; }
        [data-scroll-effect="parallax"] img,
        [data-scroll-effect="zoom-on-scroll"] img,
        [data-scroll-effect="fly-in-left"],
        [data-scroll-effect="fly-in-right"],
        [data-scroll-effect="fly-in-up"],
        [data-scroll-effect="reveal"],
        [data-scroll-effect="fade-on-scroll"] {
          transform: none !important;
          opacity: 1 !important;
          clip-path: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // 2. Observe + scroll-update.
  useEffect(() => {
    const active = new Set<HTMLElement>();

    const collect = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("[data-scroll-effect]"),
      ).filter((el) => {
        const v = el.getAttribute("data-scroll-effect");
        return v && v !== "none";
      });

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      active.forEach((el) => {
        const r = el.getBoundingClientRect();
        // Window over which we measure progress: from "bottom of viewport"
        // (entering) to "top of viewport" (exiting).
        // Progress 0 at entry, 1 at exit.
        const total = vh + r.height;
        const passed = vh - r.top;
        let p = passed / total;
        if (p < 0) p = 0;
        else if (p > 1) p = 1;
        el.style.setProperty("--se-progress", p.toFixed(4));
      });
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) active.add(el);
          else active.delete(el);
        }
        onScroll();
      },
      { rootMargin: "100px 0px 100px 0px", threshold: 0 },
    );

    const wired = new WeakSet<HTMLElement>();
    const wire = (el: HTMLElement) => {
      if (wired.has(el)) return;
      wired.add(el);
      io.observe(el);
    };

    collect().forEach(wire);
    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const mo = new MutationObserver(() => {
      collect().forEach(wire);
      onScroll();
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-scroll-effect"],
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
