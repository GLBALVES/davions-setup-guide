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
      [data-scroll-effect] {
        --se-progress: 0;
        --se-intensity: 1;
        --se-speed: 1;
      }
      [data-scroll-effect="parallax"] { overflow: hidden; }
      [data-scroll-effect="parallax"] img,
      [data-scroll-effect="parallax"] [data-bg-image] {
        transform: translate3d(0, calc((var(--se-progress) - 0.5) * -28% * var(--se-intensity)), 0) scale(calc(1 + 0.2 * var(--se-intensity)));
        will-change: transform;
        transition: transform 60ms linear;
      }
      [data-scroll-effect="reveal"] {
        clip-path: inset(0 0 calc((1 - min(var(--se-progress) * 1.6 * var(--se-speed), 1)) * 100%) 0);
        will-change: clip-path;
      }
      [data-scroll-effect="split-reveal"] {
        clip-path: inset(0 calc((1 - min(var(--se-progress) * 1.6 * var(--se-speed), 1)) * 50%) 0 calc((1 - min(var(--se-progress) * 1.6 * var(--se-speed), 1)) * 50%));
        will-change: clip-path;
      }
      [data-scroll-effect="zoom-on-scroll"] img,
      [data-scroll-effect="zoom-on-scroll"] [data-bg-image] {
        transform: scale(calc(1 + var(--se-progress) * 0.18 * var(--se-intensity)));
        transform-origin: center;
        will-change: transform;
      }
      [data-scroll-effect="fade-on-scroll"] {
        opacity: min(calc(var(--se-progress) * 2.5 * var(--se-speed)), calc((1 - var(--se-progress)) * 2.5 * var(--se-speed)));
        will-change: opacity;
      }
      [data-scroll-effect="fly-in-left"] {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * -80px * var(--se-intensity)), 0, 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
        will-change: transform, opacity;
      }
      [data-scroll-effect="fly-in-right"] {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 80px * var(--se-intensity)), 0, 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
        will-change: transform, opacity;
      }
      [data-scroll-effect="fly-in-up"] {
        transform: translate3d(0, calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 80px * var(--se-intensity)), 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
        will-change: transform, opacity;
      }

      /* Ken Burns: continuous slow zoom + pan, independent of scroll progress */
      [data-scroll-effect="ken-burns"] { overflow: hidden; }
      [data-scroll-effect="ken-burns"] [data-bg-image],
      [data-scroll-effect="ken-burns"] img {
        animation: lov-ken-burns calc(20s / var(--se-speed)) ease-in-out infinite alternate;
        transform-origin: center;
        will-change: transform;
      }
      @keyframes lov-ken-burns {
        0%   { transform: scale(1.05) translate3d(-1.5%, -1%, 0); }
        100% { transform: scale(calc(1.05 + 0.13 * var(--se-intensity))) translate3d(calc(2% * var(--se-intensity)), calc(1.5% * var(--se-intensity)), 0); }
      }

      /* BG Zoom Out: starts zoomed in, eases to natural scale as section centers */
      [data-scroll-effect="bg-zoom-out"] { overflow: hidden; }
      [data-scroll-effect="bg-zoom-out"] [data-bg-image],
      [data-scroll-effect="bg-zoom-out"] img {
        transform: scale(calc(1 + (0.4 - var(--se-progress) * 0.4) * var(--se-intensity)));
        transform-origin: center;
        will-change: transform;
      }

      /* BG Blur on Scroll: blurry at edges, sharp at center */
      [data-scroll-effect="bg-blur-scroll"] [data-bg-image],
      [data-scroll-effect="bg-blur-scroll"] img {
        filter: blur(calc((0.5 - min(var(--se-progress), 1 - var(--se-progress))) * 16px * var(--se-intensity)));
        will-change: filter;
      }

      /* Blur In (whole wrapper) */
      [data-scroll-effect="blur-in"] {
        filter: blur(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 18px * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
        will-change: filter, opacity;
      }

      /* Rotate In */
      [data-scroll-effect="rotate-in"] {
        transform: rotate(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * -8deg * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
        transform-origin: center;
        will-change: transform, opacity;
      }

      /* Skew In */
      [data-scroll-effect="skew-in"] {
        transform: skewY(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 6deg * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
        will-change: transform, opacity;
      }

      /* 3D Tilt: perspective tilt that shifts as you scroll past */
      [data-scroll-effect="tilt-3d"] {
        perspective: 1200px;
      }
      [data-scroll-effect="tilt-3d"] > * {
        transform: rotateX(calc((var(--se-progress) - 0.5) * -14deg * var(--se-intensity)));
        transform-origin: center;
        will-change: transform;
      }

      /* ── Per-element effects ──
         Wrappers carrying data-text-effect / data-image-effect / data-buttons-effect
         get their own --se-progress from the same engine. The CSS below targets
         common semantic descendants so the chosen effect plays just on that subset.
      */
      :where([data-text-effect], [data-image-effect], [data-buttons-effect]) {
        --se-intensity: 1;
        --se-speed: 1;
      }

      /* TEXT targets */
      :where(
        [data-text-effect] h1, [data-text-effect] h2, [data-text-effect] h3,
        [data-text-effect] h4, [data-text-effect] p,
        [data-text-effect] .site-banner-heading, [data-text-effect] .site-banner-subtitle,
        [data-text-effect] [data-editable-text]
      ) { will-change: transform, opacity, filter; }

      [data-text-effect="fade-on-scroll"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle) {
        opacity: min(var(--se-progress) * 2.5 * var(--se-speed), 1);
      }
      [data-text-effect="fly-in-left"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle) {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * -60px * var(--se-intensity)), 0, 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-text-effect="fly-in-right"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle) {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 60px * var(--se-intensity)), 0, 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-text-effect="fly-in-up"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle) {
        transform: translate3d(0, calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 50px * var(--se-intensity)), 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-text-effect="blur-in"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle) {
        filter: blur(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 14px * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-text-effect="rotate-in"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle) {
        transform: rotate(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * -6deg * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
        transform-origin: left center;
      }
      [data-text-effect="zoom-on-scroll"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle) {
        transform: scale(calc(1 + var(--se-progress) * 0.12 * var(--se-intensity)));
      }
      [data-text-effect="reveal"] :where(h1,h2,h3,h4,p,.site-banner-heading,.site-banner-subtitle) {
        clip-path: inset(0 0 calc((1 - min(var(--se-progress) * 1.6 * var(--se-speed), 1)) * 100%) 0);
      }

      /* IMAGE targets (in-content images, not background images) */
      [data-image-effect="fade-on-scroll"] :where(img:not([data-bg-image])) {
        opacity: min(var(--se-progress) * 2.5 * var(--se-speed), 1);
      }
      [data-image-effect="fly-in-left"] :where(img:not([data-bg-image])) {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * -80px * var(--se-intensity)), 0, 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-image-effect="fly-in-right"] :where(img:not([data-bg-image])) {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 80px * var(--se-intensity)), 0, 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-image-effect="fly-in-up"] :where(img:not([data-bg-image])) {
        transform: translate3d(0, calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 70px * var(--se-intensity)), 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-image-effect="zoom-on-scroll"] :where(img:not([data-bg-image])) {
        transform: scale(calc(1 + var(--se-progress) * 0.18 * var(--se-intensity)));
        transform-origin: center;
      }
      [data-image-effect="blur-in"] :where(img:not([data-bg-image])) {
        filter: blur(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 18px * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-image-effect="rotate-in"] :where(img:not([data-bg-image])) {
        transform: rotate(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * -8deg * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-image-effect="reveal"] :where(img:not([data-bg-image])) {
        clip-path: inset(0 0 calc((1 - min(var(--se-progress) * 1.6 * var(--se-speed), 1)) * 100%) 0);
      }

      /* BUTTONS targets */
      [data-buttons-effect="fade-on-scroll"] :where(.site-btn, .site-button) {
        opacity: min(var(--se-progress) * 2.5 * var(--se-speed), 1);
      }
      [data-buttons-effect="fly-in-left"] :where(.site-btn, .site-button) {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * -50px * var(--se-intensity)), 0, 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-buttons-effect="fly-in-right"] :where(.site-btn, .site-button) {
        transform: translate3d(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 50px * var(--se-intensity)), 0, 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-buttons-effect="fly-in-up"] :where(.site-btn, .site-button) {
        transform: translate3d(0, calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 40px * var(--se-intensity)), 0);
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-buttons-effect="zoom-on-scroll"] :where(.site-btn, .site-button) {
        transform: scale(calc(0.85 + min(var(--se-progress) * 2 * var(--se-speed), 1) * 0.15 * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-buttons-effect="blur-in"] :where(.site-btn, .site-button) {
        filter: blur(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * 10px * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-buttons-effect="rotate-in"] :where(.site-btn, .site-button) {
        transform: rotate(calc((1 - min(var(--se-progress) * 2 * var(--se-speed), 1)) * -10deg * var(--se-intensity)));
        opacity: min(var(--se-progress) * 2 * var(--se-speed), 1);
      }
      [data-buttons-effect="reveal"] :where(.site-btn, .site-button) {
        clip-path: inset(0 0 calc((1 - min(var(--se-progress) * 1.6 * var(--se-speed), 1)) * 100%) 0);
      }

      @media (prefers-reduced-motion: reduce) {
        [data-scroll-effect],
        [data-text-effect],
        [data-image-effect],
        [data-buttons-effect] { --se-progress: 0.5 !important; }
        [data-scroll-effect] *,
        [data-text-effect] *,
        [data-image-effect] *,
        [data-buttons-effect] * {
          transform: none !important;
          opacity: 1 !important;
          clip-path: none !important;
          filter: none !important;
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // 2. Observe + scroll-update.
  useEffect(() => {
    const active = new Set<HTMLElement>();

    const SELECTOR =
      "[data-scroll-effect],[data-text-effect],[data-image-effect],[data-buttons-effect]";

    const collect = () =>
      Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
        const any =
          el.getAttribute("data-scroll-effect") ||
          el.getAttribute("data-text-effect") ||
          el.getAttribute("data-image-effect") ||
          el.getAttribute("data-buttons-effect");
        return any && any !== "none";
      });

    let raf = 0;
    const update = () => {
      raf = 0;
      const w = window as any;
      // Editor "scrub" mode: force every tracked element to a fixed progress.
      if (w.__lovScrubActive) {
        const sp = typeof w.__lovScrubProgress === "number" ? w.__lovScrubProgress : 0.5;
        const fixed = Math.max(0, Math.min(1, sp)).toFixed(4);
        document
          .querySelectorAll<HTMLElement>(SELECTOR)
          .forEach((el) => el.style.setProperty("--se-progress", fixed));
        return;
      }
      const vh = window.innerHeight || 1;
      active.forEach((el) => {
        const r = el.getBoundingClientRect();
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
    const onScrub = () => onScroll();
    window.addEventListener("lov-scrub-change", onScrub);

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
      attributeFilter: [
        "data-scroll-effect",
        "data-text-effect",
        "data-image-effect",
        "data-buttons-effect",
      ],
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("lov-scrub-change", onScrub);
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
