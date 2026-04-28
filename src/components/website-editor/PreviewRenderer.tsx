import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import SectionRenderer, { type PageSection, type EditContext } from "@/components/store/SectionRenderer";
import { Monitor, Tablet, Smartphone, ArrowUp, ArrowDown, Copy, Trash2, Settings2, Plus, GripVertical, Eye, EyeOff, Link as LinkIcon, Instagram, Facebook, Youtube, Linkedin, Loader2, LayoutGrid } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BLOCK_VARIANTS } from "@/components/website-editor/block-variants";
import type { SectionType } from "@/components/website-editor/page-templates";
import { toast } from "sonner";
import CanvasAddSection from "@/components/website-editor/CanvasAddSection";
import QuickAddPopover from "@/components/website-editor/QuickAddPopover";
import PreviewHeader, { type HeaderConfig } from "@/components/website-editor/PreviewHeader";

import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, DragOverlay, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type { HeaderConfig, HeaderSlide } from "@/components/website-editor/PreviewHeader";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export interface PreviewSiteConfig {
  logoUrl?: string | null;
  logoAltUrl?: string | null;
  faviconUrl?: string | null;
  logoText?: string | null;
  /** "small" | "medium" | "large" — controls logo size in the navbar */
  logoSize?: string | null;
  /** When true, hides the "Made with Davions" badge on the public site */
  hideBranding?: boolean | null;
  displayName?: string;
  accentColor?: string;
  headerBg?: string | null;
  headerTextColor?: string | null;
  footerBg?: string | null;
  footerTextColor?: string | null;
  footerText?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  /** Button design tokens (Style → Buttons) */
  buttonStyle?: "solid" | "outline" | "underline" | null;
  buttonShape?: "square" | "rounded" | "pill" | null;
  buttonSize?: "small" | "medium" | "large" | "custom" | null;
  buttonHeight?: number | null;
  buttonWidth?: number | null;
  /** Per-variant overrides (Primary / Secondary) configured in Style → Buttons */
  buttonVariants?: {
    primary?: { style?: "solid" | "outline" | "underline"; shape?: "square" | "rounded" | "pill"; bg?: string; fg?: string };
    secondary?: { style?: "solid" | "outline" | "underline"; shape?: "square" | "rounded" | "pill"; bg?: string; fg?: string };
  } | null;
}

export interface PreviewNavLink {
  id: string;
  label: string;
  isHome?: boolean;
  type?: "page" | "folder" | "link";
  url?: string;
  /** When type === "link", whether to open the URL in a new tab. Defaults to true. */
  openInNewTab?: boolean;
  children?: PreviewNavLink[];
}

interface PreviewRendererProps {
  sections: PageSection[];
  selectedBlockIndex: number | null;
  onSelectBlock: (index: number) => void;
  onMoveBlock?: (from: number, to: number) => void;
  onDuplicateBlock?: (index: number) => void;
  onDeleteBlock?: (index: number) => void;
  /** Called when the user clicks a "+ Add Section" divider in the canvas. When `type` is provided, insert that block directly (quick-add); otherwise open the full picker. */
  onAddBlockAt?: (index: number, type?: import("./page-templates").SectionType) => void;
  /** Called with the new full ordered list when the user drags a block to a new position. */
  onReorderBlocks?: (next: PageSection[]) => void;
  accentColor?: string;
  site?: PreviewSiteConfig | null;
  navLinks?: PreviewNavLink[];
  activePageId?: string | null;
  onNavigatePage?: (pageId: string) => void;
  showHeaderFooter?: boolean;
  /** Enables inline editing handles inside each block */
  editMode?: boolean;
  /** Called when an inline editor changes a prop on a section */
  onPropChange?: (sectionId: string, path: string, value: any) => void;
  photographerId?: string | null;
  /** Per-page header (slider) configuration */
  headerConfig?: HeaderConfig | null;
  /** When set (in edit mode), pin the header slider to this slide and pause autoplay. */
  pinnedSlideId?: string | null;
  /** Open the header settings panel in the sidebar */
  onEditHeader?: () => void;
  /** Open the footer settings panel in the sidebar */
  onEditFooter?: () => void;
  /** Browser-tab indicator: favicon shown next to the viewport switcher */
  browserFaviconUrl?: string | null;
  /** Browser-tab indicator: site title shown next to the viewport switcher */
  browserTitle?: string | null;
  /** Auto-save status pill rendered next to the browser-tab indicator */
  saveStatus?: "idle" | "saving" | "saved" | "error";
}

// ── Inline preview Nav (mimics public site SharedNav lightly) ────────────────
function PreviewNav({
  site,
  navLinks,
  activePageId,
  onNavigatePage,
}: {
  site?: PreviewSiteConfig | null;
  navLinks: PreviewNavLink[];
  activePageId?: string | null;
  onNavigatePage?: (id: string) => void;
}) {
  const bg = site?.headerBg ?? undefined;
  const fg = site?.headerTextColor ?? undefined;
  const logoText = site?.logoText || site?.displayName || "Studio";
  const logoSize = site?.logoSize || "medium";
  const logoImgClass =
    logoSize === "small" ? "h-6 w-auto object-contain"
    : logoSize === "large" ? "h-12 w-auto object-contain"
    : "h-8 w-auto object-contain";
  const logoTextClass =
    logoSize === "small" ? "text-xs font-light tracking-[0.25em] uppercase"
    : logoSize === "large" ? "text-base font-light tracking-[0.25em] uppercase"
    : "text-sm font-light tracking-[0.25em] uppercase";

  return (
    <header
      className="border-b border-border/50 sticky top-0 z-10"
      style={{ backgroundColor: bg ?? "hsl(var(--background))", color: fg ?? undefined }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {site?.logoUrl ? (
            <img src={site.logoUrl} alt={logoText} className={logoImgClass} />
          ) : (
            <span className={logoTextClass} style={{ color: fg ?? undefined }}>
              {logoText}
            </span>
          )}
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            if (link.type === "link") {
              const newTab = link.openInNewTab !== false;
              return (
                <a
                  key={link.id}
                  href={link.url || "#"}
                  target={newTab ? "_blank" : "_self"}
                  rel={newTab ? "noopener noreferrer" : undefined}
                  className="text-[11px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-70"
                  style={{ color: fg ?? undefined }}
                >
                  {link.label}
                </a>
              );
            }
            if (link.type === "folder" && link.children && link.children.length > 0) {
              return (
                <div key={link.id} className="relative group">
                  <button
                    className="text-[11px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-70 inline-flex items-center gap-1"
                    style={{ color: fg ?? undefined }}
                  >
                    {link.label}
                    <span className="text-[8px] opacity-60">▼</span>
                  </button>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[180px] z-20"
                  >
                    <div
                      className="border border-border/40 shadow-lg py-2"
                      style={{ backgroundColor: bg ?? "hsl(var(--background))" }}
                    >
                      {link.children.map((child) => {
                        if (child.type === "link") {
                          const newTab = child.openInNewTab !== false;
                          return (
                            <a
                              key={child.id}
                              href={child.url || "#"}
                              target={newTab ? "_blank" : "_self"}
                              rel={newTab ? "noopener noreferrer" : undefined}
                              className="block px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-light hover:opacity-70 text-left"
                              style={{ color: fg ?? undefined }}
                            >
                              {child.label}
                            </a>
                          );
                        }
                        return (
                          <button
                            key={child.id}
                            onClick={() => onNavigatePage?.(child.id)}
                            className={cn(
                              "block w-full px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-light hover:opacity-70 text-left",
                              activePageId === child.id && "underline underline-offset-4"
                            )}
                            style={{ color: fg ?? undefined }}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
            // Default: page
            return (
              <button
                key={link.id}
                onClick={() => onNavigatePage?.(link.id)}
                className={cn(
                  "text-[11px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-70",
                  activePageId === link.id && "underline underline-offset-4"
                )}
                style={{ color: fg ?? undefined }}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

// ── Inline preview Footer ────────────────────────────────────────────────────
function PreviewFooter({
  site,
  editMode = false,
  onEdit,
}: {
  site?: PreviewSiteConfig | null;
  editMode?: boolean;
  onEdit?: () => void;
}) {
  const s = site as any;
  const bg = s?.footerBg ?? s?.footer_bg_color ?? "hsl(var(--foreground))";
  const fg = s?.footerTextColor ?? s?.footer_text_color ?? "hsl(var(--background))";
  const text = s?.footerText || s?.footer_text || `© ${new Date().getFullYear()} ${s?.displayName || "Studio"}`;
  const showLogo: boolean = s?.footer_show_logo ?? false;
  const showSocials: boolean = s?.footer_show_socials ?? true;
  const visibleSocials: string[] = Array.isArray(s?.footer_visible_socials)
    ? s.footer_visible_socials
    : [];
  const isFiltering = visibleSocials.length > 0;

  const layout: string = s?.footer_layout || "minimal";
  const logoPosition: string = s?.footer_logo_position || "center";
  const alignment: string = s?.footer_alignment || "center";
  const showNav: boolean = s?.footer_show_nav ?? false;
  const showSitemap: boolean = s?.footer_show_sitemap ?? false;
  const showContactInfo: boolean = s?.footer_show_contact_info ?? false;
  const showTagline: boolean = s?.footer_show_tagline ?? false;
  const tagline: string = s?.footer_tagline ?? "";
  const columns: Array<{ heading: string; links: Array<{ label: string; href: string }> }> =
    Array.isArray(s?.footer_columns) ? s.footer_columns : [];

  const TikTokIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
  const PinterestIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
    </svg>
  );
  const WhatsAppIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );

  const SOCIAL_ENTRIES: { key: string; href: string | null | undefined; icon: React.ReactNode }[] = [
    { key: "instagram", href: s?.instagram_url, icon: <Instagram className="h-4 w-4" /> },
    { key: "facebook", href: s?.facebook_url, icon: <Facebook className="h-4 w-4" /> },
    { key: "youtube", href: s?.youtube_url, icon: <Youtube className="h-4 w-4" /> },
    { key: "linkedin", href: s?.linkedin_url, icon: <Linkedin className="h-4 w-4" /> },
    { key: "tiktok", href: s?.tiktok_url, icon: TikTokIcon },
    { key: "pinterest", href: s?.pinterest_url, icon: PinterestIcon },
    { key: "whatsapp", href: s?.whatsapp ? `https://wa.me/${String(s.whatsapp).replace(/\D/g, "")}` : null, icon: WhatsAppIcon },
  ];
  const visible = SOCIAL_ENTRIES.filter((e) => {
    if (!e.href) return false;
    if (isFiltering) return visibleSocials.includes(e.key);
    return true;
  });

  const alignCls =
    alignment === "left" ? "text-left items-start" :
    alignment === "right" ? "text-right items-end" :
    "text-center items-center";
  const logoPosCls =
    logoPosition === "left" ? "justify-start" :
    logoPosition === "right" ? "justify-end" :
    "justify-center";

  const footerLogoSize = (s?.logoSize as string) || (s?.logo_size as string) || "medium";
  const footerLogoImgClass =
    footerLogoSize === "small" ? "h-12 sm:h-16 w-auto object-contain"
    : footerLogoSize === "large" ? "h-24 sm:h-32 w-auto object-contain"
    : "h-16 sm:h-24 w-auto object-contain";
  const footerLogoTextClass =
    footerLogoSize === "small" ? "text-[10px] sm:text-xs font-light tracking-[0.25em] sm:tracking-[0.35em] uppercase whitespace-nowrap"
    : footerLogoSize === "large" ? "text-sm sm:text-lg font-light tracking-[0.25em] sm:tracking-[0.35em] uppercase whitespace-nowrap"
    : "text-xs sm:text-sm font-light tracking-[0.25em] sm:tracking-[0.35em] uppercase whitespace-nowrap";

  const logoBlock = showLogo ? (
    <div className={`flex ${logoPosCls}`}>
      {s?.logoUrl ? (
        <img src={s.logoUrl} alt={s?.displayName || "Studio"} className={footerLogoImgClass} />
      ) : (
        <span className={footerLogoTextClass} style={{ color: fg }}>
          {s?.displayName || "Studio"}
        </span>
      )}
    </div>
  ) : null;

  const taglineBlock = showTagline && tagline ? (
    <p className="text-[11px] font-light leading-relaxed max-w-xs opacity-80" style={{ color: fg }}>
      {tagline}
    </p>
  ) : null;

  const socialBlock = showSocials && visible.length > 0 ? (
    <div className={`flex items-center gap-5 ${logoPosCls}`}>
      {visible.map((e) => (
        <span key={e.key} style={{ color: fg }} className="opacity-80">
          {e.icon}
        </span>
      ))}
    </div>
  ) : null;

  const navBlock = showNav ? (
    <div className={`flex flex-col gap-2 ${alignCls}`}>
      <h4 className="text-[10px] tracking-[0.25em] uppercase font-medium opacity-90" style={{ color: fg }}>Menu</h4>
      <span className="text-[11px] font-light opacity-70" style={{ color: fg }}>Home</span>
      <span className="text-[11px] font-light opacity-70" style={{ color: fg }}>Sessions</span>
      <span className="text-[11px] font-light opacity-70" style={{ color: fg }}>Contact</span>
    </div>
  ) : null;

  const sitemapBlock = showSitemap ? (
    <div className={`flex flex-col gap-2 ${alignCls}`}>
      <h4 className="text-[10px] tracking-[0.25em] uppercase font-medium opacity-90" style={{ color: fg }}>Sitemap</h4>
      <span className="text-[11px] font-light opacity-70" style={{ color: fg }}>All pages</span>
    </div>
  ) : null;

  const contactBlock = showContactInfo ? (
    <div className={`flex flex-col gap-2 ${alignCls}`}>
      <h4 className="text-[10px] tracking-[0.25em] uppercase font-medium opacity-90" style={{ color: fg }}>Contact</h4>
      <span className="text-[11px] font-light opacity-70" style={{ color: fg }}>email@studio.com</span>
      {s?.whatsapp && <span className="text-[11px] font-light opacity-70" style={{ color: fg }}>{s.whatsapp}</span>}
    </div>
  ) : null;

  const columnsBlocks = columns.map((col, ci) => (
    <div key={ci} className={`flex flex-col gap-2 ${alignCls}`}>
      <h4 className="text-[10px] tracking-[0.25em] uppercase font-medium opacity-90" style={{ color: fg }}>{col.heading}</h4>
      {(col.links ?? []).map((l, li) => (
        <span key={li} className="text-[11px] font-light opacity-70" style={{ color: fg }}>{l.label}</span>
      ))}
    </div>
  ));

  const allColBlocks = [navBlock, sitemapBlock, contactBlock, ...columnsBlocks].filter(Boolean);

  const legalBlock = (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 ${alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center"}`}>
      <span className="text-[10px] font-light opacity-70" style={{ color: fg }}>Terms of Service</span>
      <span className="text-[10px] opacity-40" style={{ color: fg }}>·</span>
      <span className="text-[10px] font-light opacity-70" style={{ color: fg }}>Privacy Policy</span>
    </div>
  );

  const renderBody = () => {
    if (layout === "split") {
      return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="flex flex-col gap-4 max-w-sm">
              {logoBlock}{taglineBlock}{socialBlock}
            </div>
            <div className="flex flex-wrap gap-10">{allColBlocks}</div>
          </div>
          <div className="border-t border-current/10 pt-4 flex flex-col items-center gap-2">
            <p className="text-[10px] tracking-[0.3em] uppercase font-light opacity-80" style={{ color: fg }}>{text}</p>
            {legalBlock}
          </div>
        </div>
      );
    }
    if (layout === "columns") {
      return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <div className="flex flex-col gap-4 col-span-2 md:col-span-1">
              {logoBlock}{taglineBlock}{socialBlock}
            </div>
            {allColBlocks}
          </div>
          <div className="border-t border-current/10 pt-4 flex flex-col items-center gap-2">
            <p className="text-[10px] tracking-[0.3em] uppercase font-light opacity-80" style={{ color: fg }}>{text}</p>
            {legalBlock}
          </div>
        </div>
      );
    }
    if (layout === "stacked") {
      return (
        <div className={`max-w-7xl mx-auto flex flex-col gap-6 ${alignCls}`}>
          {logoBlock}{taglineBlock}
          <div className="flex flex-wrap justify-center gap-10">{allColBlocks}</div>
          {socialBlock}
          <p className="text-[10px] tracking-[0.3em] uppercase font-light opacity-80" style={{ color: fg }}>{text}</p>
          {legalBlock}
        </div>
      );
    }
    // minimal
    return (
      <div className={`max-w-7xl mx-auto flex flex-col gap-5 ${alignCls}`}>
        {logoBlock}{taglineBlock}{socialBlock}
        {allColBlocks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-10 pt-2">{allColBlocks}</div>
        )}
        <p className="text-[10px] tracking-[0.3em] uppercase font-light opacity-80" style={{ color: fg }}>{text}</p>
        {legalBlock}
      </div>
    );
  };

  return (
    <footer
      style={{ backgroundColor: bg, color: fg }}
      className={cn(
        "py-12 px-6 relative group/footer",
        editMode && "cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all",
      )}
      onClick={editMode && onEdit ? (e) => { e.stopPropagation(); onEdit(); } : undefined}
    >
      {renderBody()}

      {editMode && (
        <div className="absolute top-2 right-3 opacity-0 group-hover/footer:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[10px] tracking-widest uppercase bg-primary text-primary-foreground px-2 py-1 rounded">
            Edit footer
          </span>
        </div>
      )}
    </footer>
  );
}

// ── Floating block toolbar (Pixieset style) ──────────────────────────────────
function FloatingBlockToolbar({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onSettings,
  onDelete,
  onToggleVisibility,
  onCopyAnchor,
  hidden,
  sectionType,
  currentVariant,
  onVariantChange,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onSettings: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onCopyAnchor: () => void;
  hidden?: boolean;
  sectionType: SectionType;
  currentVariant?: string;
  onVariantChange?: (variant: string) => void;
}) {
  const [variantOpen, setVariantOpen] = useState(false);
  const variants = BLOCK_VARIANTS[sectionType];

  const Btn = ({ onClick, disabled, title, children, danger, ...rest }: any) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      disabled={disabled}
      title={title}
      {...rest}
      className={cn(
        "p-1.5 rounded text-background/80 hover:text-background hover:bg-background/15 transition-colors",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent",
        danger && "hover:!text-red-400"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-foreground/95 backdrop-blur-sm rounded-md px-1 py-0.5 shadow-lg pointer-events-auto">
      <Btn onClick={onMoveUp} disabled={isFirst} title="Move up"><ArrowUp className="h-3.5 w-3.5" /></Btn>
      <Btn onClick={onMoveDown} disabled={isLast} title="Move down"><ArrowDown className="h-3.5 w-3.5" /></Btn>
      <div className="w-px h-4 bg-background/20 mx-0.5" />
      {variants && variants.length > 1 && onVariantChange && (
        <Popover open={variantOpen} onOpenChange={setVariantOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              title="Change layout"
              className="p-1.5 rounded text-background/80 hover:text-background hover:bg-background/15 transition-colors"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" sideOffset={8} className="w-60 p-2 z-[60]" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-1">
              Layout
            </p>
            <div className="grid grid-cols-3 gap-1">
              {variants.map((v) => {
                const active = (currentVariant ?? variants[0].id) === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={(e) => { e.stopPropagation(); onVariantChange(v.id); setVariantOpen(false); }}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors border",
                      active
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "hover:bg-muted/60 text-muted-foreground border-transparent"
                    )}
                    title={v.label}
                  >
                    <span className="text-base leading-none">{v.icon}</span>
                    <span className="text-[10px] leading-tight truncate w-full text-center">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}
      <Btn onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Btn>
      <Btn onClick={onSettings} title="Settings"><Settings2 className="h-3.5 w-3.5" /></Btn>
      <Btn onClick={onToggleVisibility} title={hidden ? "Show on site" : "Hide on site"}>
        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Btn>
      <Btn onClick={onCopyAnchor} title="Copy section link"><LinkIcon className="h-3.5 w-3.5" /></Btn>
      <div className="w-px h-4 bg-background/20 mx-0.5" />
      <Btn onClick={onDelete} title="Delete" danger><Trash2 className="h-3.5 w-3.5" /></Btn>
    </div>
  );
}

// ── Sortable wrapper for a block in the canvas ───────────────────────────────
function SortableBlock({
  section,
  idx,
  isSelected,
  isLast,
  editMode,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggleVisibility,
  onCopyAnchor,
  hidden,
  onVariantChange,
  children,
}: {
  section: PageSection;
  idx: number;
  isSelected: boolean;
  isLast: boolean;
  editMode: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onCopyAnchor: () => void;
  hidden?: boolean;
  onVariantChange?: (variant: string) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: !editMode,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 40 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={cn(
        "relative group/block transition-all",
        isDragging
          ? "outline outline-2 outline-dashed outline-primary/60 outline-offset-[-2px] bg-primary/5"
          : isSelected
            ? "outline outline-[3px] outline-primary outline-offset-[-3px] shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_24px_-8px_hsl(var(--primary)/0.35)] bg-primary/[0.02]"
            : "outline outline-2 outline-transparent outline-offset-[-2px] hover:outline-primary/50 hover:bg-primary/[0.015]"
      )}
    >
      {/* Block label badge */}
      <div className={cn(
        "absolute top-0 left-0 z-20 text-[10px] px-2 py-0.5 rounded-br font-medium tracking-wide transition-all pointer-events-none",
        isSelected || isDragging
          ? "opacity-100 bg-primary text-primary-foreground shadow-md"
          : "opacity-0 group-hover/block:opacity-100 bg-foreground/85 text-background"
      )}>
        {section.label}{isDragging && " — moving…"}
      </div>

      {/* Drag handle (left side, edit mode only) */}
      {editMode && (
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -left-3 z-30 w-6 h-10 rounded bg-foreground/90 text-background flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing touch-none transition-opacity",
            isSelected || isDragging ? "opacity-100" : "opacity-0 group-hover/block:opacity-100"
          )}
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Floating toolbar (selected or hover) — hidden during drag */}
      {!isDragging && (
        <div className={cn(
          "transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100"
        )}>
          <FloatingBlockToolbar
            isFirst={idx === 0}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onSettings={onSelect}
            onDelete={onDelete}
            onToggleVisibility={onToggleVisibility}
            onCopyAnchor={onCopyAnchor}
            hidden={hidden}
            sectionType={section.type as SectionType}
            currentVariant={(section.props as any)?.variant}
            onVariantChange={onVariantChange}
          />
        </div>
      )}

      <div className={cn(
        isDragging && "opacity-30 pointer-events-none",
        hidden && !isDragging && "opacity-40"
      )}>
        {children}
      </div>
    </div>
  );
}

export default function PreviewRenderer({
  sections,
  selectedBlockIndex,
  onSelectBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onAddBlockAt,
  onReorderBlocks,
  accentColor = "#000000",
  site,
  navLinks = [],
  activePageId,
  onNavigatePage,
  showHeaderFooter = true,
  editMode = false,
  onPropChange,
  photographerId,
  headerConfig,
  pinnedSlideId = null,
  onEditHeader,
  onEditFooter,
  browserFaviconUrl = null,
  browserTitle = null,
  saveStatus = "idle",
}: PreviewRendererProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop");

  const editCtx: EditContext | undefined = editMode && onPropChange
    ? { onPropChange, photographerId }
    : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragSection = activeDragId ? sections.find((s) => s.id === activeDragId) : null;

  // Track which block is closest to the viewport center to use as the
  // insertion target for the floating "Add section" button.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [nearestBlockIdx, setNearestBlockIdx] = useState<number | null>(null);

  const recomputeNearest = useCallback(() => {
    const container = scrollRef.current;
    if (!container || sections.length === 0) {
      setNearestBlockIdx(null);
      return;
    }
    const centerY = container.getBoundingClientRect().top + container.clientHeight / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    blockRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const blockCenter = r.top + r.height / 2;
      const d = Math.abs(blockCenter - centerY);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    setNearestBlockIdx(bestIdx);
  }, [sections.length]);

  useEffect(() => {
    recomputeNearest();
  }, [sections, recomputeNearest]);

  // Insertion index for the floating button: just after the nearest block.
  const fabInsertIndex = nearestBlockIdx !== null
    ? Math.min(nearestBlockIdx + 1, sections.length)
    : sections.length;

  const handleDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));
  const handleDragCancel = () => setActiveDragId(null);
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(sections, from, to);
    if (onReorderBlocks) {
      onReorderBlocks(next);
    } else if (onMoveBlock) {
      onMoveBlock(from, to);
    }
  };

  const hideBranding: boolean = (site as any)?.hideBranding ?? (site as any)?.hide_branding ?? false;

  return (
    <div className="relative flex flex-col h-full">
      {/* Viewport toolbar — also hosts the simulated browser tab + save status */}
      <div className="h-10 border-b border-border bg-card flex items-center px-3 shrink-0 gap-2">
        {/* Left: simulated browser tab */}
        <div className="flex-1 min-w-0 flex items-center">
          {(browserTitle || browserFaviconUrl) && (
            <div className="flex items-center gap-2 max-w-[260px] h-7 px-3 rounded-md bg-muted/40 border border-border">
              {browserFaviconUrl ? (
                <img
                  src={browserFaviconUrl}
                  alt=""
                  className="h-3.5 w-3.5 rounded-sm object-cover shrink-0"
                />
              ) : (
                <div className="h-3.5 w-3.5 rounded-sm bg-muted-foreground/30 shrink-0" />
              )}
              <span className="text-[11px] text-foreground truncate">{browserTitle}</span>
            </div>
          )}
        </div>

        {/* Center: viewport switcher */}
        <div className="flex items-center gap-1">
          {([
            { id: "desktop" as Viewport, Icon: Monitor, label: "Desktop" },
            { id: "tablet" as Viewport, Icon: Tablet, label: "Tablet" },
            { id: "mobile" as Viewport, Icon: Smartphone, label: "Mobile" },
          ]).map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewport(id)}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewport === id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Right: auto-save indicator */}
        <div className="flex-1 min-w-0 flex items-center justify-end">
          {saveStatus !== "idle" && (
            <div
              className={cn(
                "flex items-center gap-1.5 h-5 px-2 rounded-full text-[10px] font-medium transition-opacity",
                saveStatus === "saving" && "bg-muted text-muted-foreground",
                saveStatus === "saved" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                saveStatus === "error" && "bg-destructive/10 text-destructive"
              )}
            >
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Saving…
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Saved
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  Save failed
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview container */}
      <div
        ref={scrollRef}
        onScroll={recomputeNearest}
        className="flex-1 overflow-y-auto bg-muted/20 flex justify-center py-4 relative"
      >
        {/* Floating Add Section button — always visible while editing.
            Inserts after the block currently nearest to the viewport center. */}

        {editMode && onAddBlockAt && (
          <QuickAddPopover
            side="top"
            align="end"
            onPick={(type) => onAddBlockAt(fabInsertIndex, type)}
            onMore={() => onAddBlockAt(fabInsertIndex)}
          >
            <button
              type="button"
              data-onboarding-target="add-section-fab"
              className="fixed bottom-6 right-8 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground text-xs font-medium tracking-wide shadow-xl hover:bg-primary/90 hover:shadow-2xl transition-all"
              title={
                sections.length === 0
                  ? "Add section"
                  : nearestBlockIdx !== null
                    ? `Insert after "${sections[nearestBlockIdx]?.label ?? "section"}"`
                    : "Add section at end"
              }
            >
              <Plus className="h-4 w-4" />
              Add section
            </button>
          </QuickAddPopover>
        )}
        <div
          className={cn(
            "bg-background transition-all duration-300 shadow-lg self-start",
            "border border-border"
          )}
          style={{
            width: VIEWPORT_WIDTHS[viewport],
            maxWidth: "100%",
            // Apply site typography live in the preview
            ["--site-heading-font" as any]: site?.headingFont
              ? `'${site.headingFont}'`
              : undefined,
            fontFamily: site?.bodyFont || undefined,
          }}
        >
          {/* Header */}
          {showHeaderFooter && (
            <PreviewHeader
              site={site}
              navLinks={navLinks}
              activePageId={activePageId}
              onNavigatePage={onNavigatePage}
              config={headerConfig}
              editMode={editMode}
              onEditHeader={onEditHeader}
              pinnedSlideId={pinnedSlideId}
            />
          )}

          {/* Blocks */}
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-5 px-6 text-center">
              <div className="space-y-1.5 max-w-md">
                <p className="text-base font-medium text-foreground">This page is empty</p>
                <p className="text-xs text-muted-foreground/80">
                  Click <span className="font-medium text-foreground">Add section</span> to open the quick picker.
                  Choose a template like <span className="text-foreground">Header</span>, <span className="text-foreground">Text</span>,
                  {" "}<span className="text-foreground">Gallery</span>, <span className="text-foreground">Image</span>,
                  {" "}<span className="text-foreground">CTA</span> or <span className="text-foreground">Contact</span> —
                  or hit <span className="font-medium text-foreground">More blocks…</span> for the full catalog.
                </p>
              </div>
              {editMode && onAddBlockAt && (
                <QuickAddPopover
                  onPick={(type) => onAddBlockAt(0, type)}
                  onMore={() => onAddBlockAt(0)}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add your first section
                  </button>
                </QuickAddPopover>
              )}
              <p className="text-[10px] text-muted-foreground/70 tracking-wide">
                Tip: hover between blocks later to insert a new section anywhere.
              </p>
            </div>
          ) : (
            <>
              {/* + above the very first block */}
              {editMode && onAddBlockAt && (
                <CanvasAddSection onClick={() => onAddBlockAt(0)} />
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map((section, idx) => {
                    const isSelected = selectedBlockIndex === idx;
                    return (
                      <div key={section.id} ref={(el) => { blockRefs.current[idx] = el; }}>
                        <SortableBlock
                          section={section}
                          idx={idx}
                          isSelected={isSelected}
                          isLast={idx === sections.length - 1}
                          editMode={editMode}
                          onSelect={() => onSelectBlock(idx)}
                          onMoveUp={() => onMoveBlock?.(idx, idx - 1)}
                          onMoveDown={() => onMoveBlock?.(idx, idx + 1)}
                          onDuplicate={() => onDuplicateBlock?.(idx)}
                          onDelete={() => onDeleteBlock?.(idx)}
                          hidden={!!(section.props as any)?.hidden}
                          onToggleVisibility={() => {
                            const next = !(section.props as any)?.hidden;
                            onPropChange?.(section.id, "hidden", next);
                            toast.success(next ? "Section hidden on public site" : "Section visible on public site");
                          }}
                          onCopyAnchor={async () => {
                            const anchor = `#${section.id}`;
                            try {
                              await navigator.clipboard.writeText(anchor);
                              toast.success(`Copied ${anchor}`);
                            } catch {
                              toast.error("Could not copy link");
                            }
                          }}
                        >
                          <SectionRenderer
                            sections={[section]}
                            accentColor={accentColor}
                            editMode={editMode}
                            edit={editCtx}
                          />
                        </SortableBlock>

                        {editMode && onAddBlockAt && (
                          <CanvasAddSection onClick={() => onAddBlockAt(idx + 1)} />
                        )}
                      </div>
                    );
                  })}
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeDragSection ? (
                    <div className="px-3 py-2 rounded-md bg-foreground text-background shadow-2xl border border-primary text-xs font-medium tracking-wide uppercase flex items-center gap-2 cursor-grabbing">
                      <GripVertical className="h-3.5 w-3.5" />
                      {activeDragSection.label}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

            </>
          )}

          {/* Footer */}
          {showHeaderFooter && <PreviewFooter site={site} editMode={editMode} onEdit={onEditFooter} />}
        </div>
      </div>

      {/* Floating Davions badge — overlays the entire preview viewport */}
      {!hideBranding && (
        <a
          href="https://davions.com?ref=badge"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 z-50 inline-flex items-center gap-1.5 rounded-full bg-foreground/90 text-background backdrop-blur-md px-3 py-1.5 text-[10px] font-medium tracking-wide shadow-lg hover:bg-foreground transition-colors"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          <img src="/favicon.png" alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />
          <span>Made with <span className="font-semibold">Davions</span></span>
        </a>
      )}
    </div>
  );
}
