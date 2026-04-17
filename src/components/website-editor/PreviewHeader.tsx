import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Settings2, LayoutTemplate } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PreviewSiteConfig, PreviewNavLink } from "./PreviewRenderer";

export interface HeaderSlide {
  id: string;
  title?: string;
  imageUrl: string | null;
}

export type HeaderLayout = "logo-center" | "logo-left" | "logo-right";

export interface HeaderConfig {
  layout?: HeaderLayout;
  slides?: HeaderSlide[];
  autoplay?: boolean;
  /** ms */
  speed?: number;
  transition?: "fade" | "slide";
  /** e.g. "60vh" */
  height?: string;
  /** 0–1 */
  overlayOpacity?: number;
}

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  layout: "logo-center",
  slides: [],
  autoplay: true,
  speed: 5000,
  transition: "fade",
  height: "60vh",
  overlayOpacity: 0.3,
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1920&q=80&auto=format&fit=crop";

interface PreviewHeaderProps {
  site?: PreviewSiteConfig | null;
  navLinks: PreviewNavLink[];
  activePageId?: string | null;
  onNavigatePage?: (id: string) => void;
  config?: HeaderConfig | null;
  /** Edit mode — show hover handles and accept clicks to open settings */
  editMode?: boolean;
  onEditHeader?: () => void;
}

export default function PreviewHeader({
  site,
  navLinks,
  activePageId,
  onNavigatePage,
  config,
  editMode = false,
  onEditHeader,
}: PreviewHeaderProps) {
  const { t } = useLanguage();
  const we = t.websiteEditor;

  const cfg: HeaderConfig = { ...DEFAULT_HEADER_CONFIG, ...(config || {}) };
  const validSlides = (cfg.slides || []).filter((s) => !!s.imageUrl);
  const usingPlaceholder = validSlides.length === 0;
  const slides: HeaderSlide[] = usingPlaceholder
    ? [{ id: "placeholder", imageUrl: PLACEHOLDER_IMAGE }]
    : validSlides;

  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);

  // Reset index when slide count changes
  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  // Autoplay
  useEffect(() => {
    if (!cfg.autoplay || slides.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, Math.max(1500, cfg.speed || 5000));
    return () => clearInterval(t);
  }, [cfg.autoplay, cfg.speed, slides.length]);

  // Split nav links roughly in half for left/right of central logo
  const half = Math.ceil(navLinks.length / 2);
  const leftLinks = navLinks.slice(0, half);
  const rightLinks = navLinks.slice(half);
  const displayName = site?.displayName || "Studio";
  const fg = "#ffffff";

  const renderLink = (link: PreviewNavLink) => {
    if (link.type === "link") {
      return (
        <a
          key={link.id}
          href={link.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-70"
          style={{ color: fg }}
        >
          {link.label}
        </a>
      );
    }
    return (
      <button
        key={link.id}
        onClick={() => onNavigatePage?.(link.id)}
        className={cn(
          "text-[11px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-70",
          activePageId === link.id && "underline underline-offset-4"
        )}
        style={{ color: fg }}
      >
        {link.label}
      </button>
    );
  };

  return (
    <header
      className="relative w-full overflow-hidden"
      style={{ height: cfg.height || "60vh" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => editMode && onEditHeader?.()}
    >
      {/* Slides */}
      <div className="absolute inset-0">
        {slides.map((slide, i) => {
          const active = i === index;
          if (cfg.transition === "slide") {
            return (
              <div
                key={slide.id}
                className="absolute inset-0 transition-transform duration-700 ease-in-out"
                style={{
                  transform: `translateX(${(i - index) * 100}%)`,
                }}
              >
                <img
                  src={slide.imageUrl || PLACEHOLDER_IMAGE}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            );
          }
          return (
            <div
              key={slide.id}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: active ? 1 : 0 }}
            >
              <img
                src={slide.imageUrl || PLACEHOLDER_IMAGE}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black pointer-events-none"
        style={{ opacity: cfg.overlayOpacity ?? 0.3 }}
      />

      {/* Demo badge */}
      {usingPlaceholder && (
        <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
          <span className="text-[10px] tracking-[0.15em] uppercase text-white/90 font-light">
            {we.demoImage}
          </span>
        </div>
      )}

      {/* Edit handles (only in edit mode) */}
      {editMode && (
        <div
          className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 transition-opacity pointer-events-auto",
            hovering ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditHeader?.(); }}
            className="px-2.5 py-1.5 rounded-md text-[11px] bg-background/95 text-foreground hover:bg-background transition-colors flex items-center gap-1.5 shadow-md"
          >
            <LayoutTemplate className="h-3 w-3" />
            {we.changeLayout}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditHeader?.(); }}
            className="px-2.5 py-1.5 rounded-md text-[11px] bg-background/95 text-foreground hover:bg-background transition-colors flex items-center gap-1.5 shadow-md"
          >
            <Settings2 className="h-3 w-3" />
            {we.headerSettings}
          </button>
        </div>
      )}

      {/* Nav with central logo */}
      <div className="absolute inset-x-0 top-0 z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-3 items-center gap-4">
          {/* Left links */}
          <nav className="hidden md:flex items-center justify-end gap-6">
            {leftLinks.map(renderLink)}
          </nav>

          {/* Center logo */}
          <div className="flex items-center justify-center">
            {site?.logoUrl ? (
              <img
                src={site.logoUrl}
                alt={displayName}
                className="h-10 w-auto object-contain"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
              />
            ) : (
              <span
                className="text-sm font-light tracking-[0.35em] uppercase whitespace-nowrap"
                style={{ color: fg, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
              >
                {displayName}
              </span>
            )}
          </div>

          {/* Right links */}
          <nav className="hidden md:flex items-center justify-start gap-6">
            {rightLinks.map(renderLink)}
          </nav>
        </div>
      </div>

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              className={cn(
                "h-1 rounded-full transition-all",
                i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </header>
  );
}
