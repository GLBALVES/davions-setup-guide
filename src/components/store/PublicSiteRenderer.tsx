import { useEffect, useRef, useState as useReactState } from "react";
import { Camera, Clock, MapPin, Image as ImageIcon, Images, Instagram, Facebook, Youtube, Linkedin, Menu, X, Quote, ArrowRight, Phone } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import SectionRenderer, { type PageSection } from "@/components/store/SectionRenderer";

// ─── Inline editable text ────────────────────────────────────────────────────
interface EditableTextProps {
  value: string;
  fieldKey: string;
  editMode: boolean;
  onSave: (fieldKey: string, value: string) => void;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  placeholder?: string;
}

function EditableText({ value, fieldKey, editMode, onSave, className = "", as: Tag = "span", placeholder }: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current && !editMode) {
      ref.current.textContent = value;
    }
  }, [value, editMode]);

  if (!editMode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-editable-field={fieldKey}
      className={`${className} outline-none cursor-text`}
      style={{ boxShadow: "0 0 0 1.5px hsl(214 100% 55% / 0.6)", borderRadius: "2px", minWidth: "2ch" }}
      onBlur={(e) => {
        const text = e.currentTarget.textContent ?? "";
        if (text !== value) onSave(fieldKey, text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    >
      {value}
    </span>
  );
}

// ─── Inline SVG icons for networks not in lucide ────────────────────────────
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}
function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
    </svg>
  );
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

export interface Testimonial {
  id: string;
  name: string;
  role?: string;
  text: string;
  avatar_url?: string;
  rating?: number;
}

export interface SiteConfig {
  site_hero_image_url: string | null;
  site_headline: string | null;
  site_subheadline: string | null;
  cta_text: string | null;
  cta_link: string | null;
  logo_url: string | null;
  tagline: string | null;
  accent_color: string | null;
  about_title: string | null;
  about_image_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  pinterest_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  whatsapp: string | null;
  linkedin_url: string | null;
  footer_text: string | null;
  show_about: boolean | null;
  show_store: boolean | null;
  show_booking: boolean | null;
  show_blog: boolean | null;
  show_contact: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  site_template: string | null;
  favicon_url: string | null;
  quote_text?: string | null;
  quote_author?: string | null;
  experience_title?: string | null;
  experience_text?: string | null;
  /** Hero layout: "full" (default full-bleed) | "split" (image left, text right) */
  hero_layout?: "full" | "split" | null;
  /** About layout: "image-right" (default) | "image-left" | "text-only" */
  about_layout?: "image-right" | "image-left" | "text-only" | null;
  /** Testimonials / client reviews */
  testimonials?: Testimonial[] | null;
  /** Testimonials section title */
  testimonials_title?: string | null;
  /** Testimonials layout: "cards" | "quotes" */
  testimonials_layout?: "cards" | "quotes" | null;
  /** Header background color (null = transparent/scroll-aware) */
  header_bg_color?: string | null;
  /** Header menu font color (null = auto based on scroll state) */
  header_text_color?: string | null;
  /** Which social icons to show in the header (null/empty = show all that have URLs) */
  header_visible_socials?: string[] | null;
  /** Footer background color */
  footer_bg_color?: string | null;
  /** Footer text / icon color */
  footer_text_color?: string | null;
  /** Show logo/studio name in footer */
  footer_show_logo?: boolean | null;
  /** Show social icons in footer */
  footer_show_socials?: boolean | null;
  /** Which social icons to show in footer */
  footer_visible_socials?: string[] | null;
  /** Footer preset template id */
  footer_preset?: string | null;
  /** Per-section background & text colors */
  hero_bg_color?: string | null;
  hero_text_color?: string | null;
  sessions_bg_color?: string | null;
  sessions_text_color?: string | null;
  portfolio_bg_color?: string | null;
  portfolio_text_color?: string | null;
  about_bg_color?: string | null;
  about_text_color?: string | null;
  quote_bg_color?: string | null;
  quote_text_color?: string | null;
  experience_bg_color?: string | null;
  experience_text_color?: string | null;
  contact_bg_color?: string | null;
  contact_text_color?: string | null;
  testimonials_bg_color?: string | null;
  testimonials_text_color?: string | null;
}

/** Helper: returns inline style for a section's custom bg/text colors */
function getSectionStyle(site: SiteConfig | null, section: string): React.CSSProperties {
  if (!site) return {};
  const bg = (site as any)[`${section}_bg_color`] as string | null | undefined;
  const fg = (site as any)[`${section}_text_color`] as string | null | undefined;
  const s: React.CSSProperties = {};
  if (bg) s.backgroundColor = bg;
  if (fg) s.color = fg;
  return s;
}

export interface Session {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  tagline?: string | null;
  price: number;
  duration_minutes: number;
  num_photos: number;
  location: string | null;
  cover_image_url: string | null;
  /** Session type name, e.g. "Newborn", "Wedding" — null means uncategorized */
  category?: string | null;
}

export interface Gallery {
  id: string;
  slug: string | null;
  title: string;
  category: string;
  cover_image_url: string | null;
}

export interface Photographer {
  id: string;
  full_name: string | null;
  email: string;
  store_slug: string | null;
  bio: string | null;
  business_name: string | null;
}

interface Props {
  photographer: Photographer;
  site: SiteConfig | null;
  sessions: Session[];
  galleries: Gallery[];
  emptyState?: {
    title: string;
    description: string;
  } | null;
  scrolled: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  seoUrl: string;
  /** For store pages: navigate to session detail */
  sessionHref: (session: Session) => string;
  /** For store pages: navigate to gallery detail */
  galleryHref: (gallery: Gallery) => string;
  /** For blog nav link */
  blogHref: string;
  /** Extra nav links injected from site_pages (multi-page) */
  extraNavLinks?: NavLinkItem[];
  /** Sub-page title (for non-home pages) */
  subPageTitle?: string;
  /** Sub-page content data */
  subPageData?: Record<string, any>;
  /** Sub-page sections order */
  subPageSections?: any[];
  /** Full page sections data from site_pages.page_content.sections */
  pageSections?: PageSection[];
  /** Override the saved site_template for live preview (from ?preview= URL param) */
  previewTemplate?: string | null;
  /** When true (editor mode), text nodes become contentEditable */
  editMode?: boolean;
  /** Callback when an inline text field is edited */
  onFieldChange?: (fieldKey: string, value: string) => void;
  /**
   * When provided (editor mode for a specific page), only render the blocks
   * whose key is in this array, in the order they appear in the array.
   * null / undefined = render everything in default order.
   */
  visibleSections?: string[] | null;
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// ─── Shared Nav ─────────────────────────────────────────────────────────────

export interface NavLinkItem {
  label: string;
  href: string;
  children?: NavLinkItem[];
}

interface NavProps {
  scrolled: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  displayName: string;
  logoUrl: string | null;
  accentColor: string;
  navLinks: NavLinkItem[];
  showBooking: boolean;
  ctaText: string;
  onNavClick: (href: string) => void;
  site?: SiteConfig | null;
  /** Force the header to render in its opaque (light bg) state regardless of scroll. */
  forceOpaque?: boolean;
}

const ALL_SOCIALS = ["instagram", "facebook", "youtube", "tiktok", "pinterest", "linkedin", "whatsapp"] as const;

function SocialIcons({
  site,
  scrolled,
  size = "sm",
  forceColor,
  filterKeys,
}: {
  site?: SiteConfig | null;
  scrolled: boolean;
  size?: "sm" | "xs";
  forceColor?: string;
  filterKeys?: string[] | null;
}) {
  if (!site) return null;
  const iconCls = size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4";

  const entries: { key: string; href: string; icon: React.ReactNode }[] = [
    site.instagram_url ? { key: "instagram", href: site.instagram_url, icon: <Instagram className={iconCls} /> } : null,
    site.facebook_url  ? { key: "facebook",  href: site.facebook_url,  icon: <Facebook className={iconCls} />  } : null,
    site.youtube_url   ? { key: "youtube",   href: site.youtube_url,   icon: <Youtube className={iconCls} />   } : null,
    site.tiktok_url    ? { key: "tiktok",    href: site.tiktok_url,    icon: <TikTokIcon className={iconCls} />} : null,
    site.pinterest_url ? { key: "pinterest", href: site.pinterest_url, icon: <PinterestIcon className={iconCls} />} : null,
    site.linkedin_url  ? { key: "linkedin",  href: site.linkedin_url,  icon: <Linkedin className={iconCls} />  } : null,
    site.whatsapp      ? { key: "whatsapp",  href: `https://wa.me/${site.whatsapp.replace(/\D/g, "")}`, icon: <WhatsAppIcon className={iconCls} />} : null,
  ].filter(Boolean) as { key: string; href: string; icon: React.ReactNode }[];

  // Filter by visible list if provided (non-empty array = explicit selection)
  const visible = filterKeys && filterKeys.length > 0
    ? entries.filter((e) => filterKeys.includes(e.key))
    : entries;

  if (visible.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {visible.map((e) => (
        <a
          key={e.key}
          href={e.href}
          target="_blank"
          rel="noopener noreferrer"
          style={forceColor ? { color: forceColor } : undefined}
          className={forceColor ? "transition-opacity hover:opacity-70" : `transition-colors duration-300 ${scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/60 hover:text-white"}`}
        >
          {e.icon}
        </a>
      ))}
    </div>
  );
}

function NavItem({ link, textColor, textCls, onNavClick, isOpaque }: { link: NavLinkItem; textColor?: string; textCls: string; onNavClick: (href: string) => void; isOpaque: boolean }) {
  const [open, setOpen] = useReactState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChildren = link.children && link.children.length > 0;

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  if (!hasChildren) {
    return (
      <button
        onClick={() => onNavClick(link.href)}
        style={textColor ? { color: textColor } : undefined}
        className={`text-[10px] tracking-[0.3em] uppercase font-light transition-colors duration-300 whitespace-nowrap ${
          textColor ? "hover:opacity-70" : textCls
        }`}
      >
        {link.label}
      </button>
    );
  }

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        style={textColor ? { color: textColor } : undefined}
        className={`text-[10px] tracking-[0.3em] uppercase font-light transition-colors duration-300 whitespace-nowrap ${
          textColor ? "hover:opacity-70" : textCls
        }`}
      >
        {link.label}
      </button>
      {open && (
        <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50`}>
          <div className={`min-w-[160px] py-1.5 rounded-md shadow-lg border border-border ${isOpaque ? "bg-background" : "bg-background/95 backdrop-blur-sm"}`}>
            {link.children!.map((child) => (
              <button
                key={child.label}
                onClick={() => { onNavClick(child.href); setOpen(false); }}
                className="block w-full text-left px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {child.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SharedNav({ scrolled, mobileMenuOpen, setMobileMenuOpen, displayName, logoUrl, accentColor, navLinks, showBooking, ctaText, onNavClick, site, forceOpaque }: NavProps) {
  const hasBg = !!site?.header_bg_color;
  const bgColor = site?.header_bg_color ?? undefined;
  const textColor = site?.header_text_color ?? undefined;
  const visibleSocials = site?.header_visible_socials ?? null;

  // When a custom bg color is set we always show as "scrolled" visually (opaque).
  // forceOpaque is used when the page's first section is light (no dark hero behind the header).
  const isOpaque = hasBg || scrolled || !!forceOpaque;

  const headerStyle: React.CSSProperties = hasBg
    ? { backgroundColor: bgColor, borderBottom: "1px solid rgba(0,0,0,0.08)" }
    : undefined as any;

  const logoFilter = !hasBg && !scrolled && !forceOpaque ? "brightness-0 invert" : "";
  const textCls = isOpaque
    ? "text-muted-foreground hover:text-foreground"
    : "text-white/70 hover:text-white";

  // Split nav links into left and right halves for centered-logo layout (Pixieset style)
  const leftLinks = navLinks.slice(0, Math.ceil(navLinks.length / 2));
  const rightLinks = navLinks.slice(Math.ceil(navLinks.length / 2));

  return (
    <header
      data-block-key="header"
      style={headerStyle}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        !hasBg && (scrolled || forceOpaque) ? "bg-background/95 backdrop-blur-sm border-b border-border shadow-sm" : ""
      } ${!hasBg && !scrolled && !forceOpaque ? "bg-transparent" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center gap-4">
        {/* Left nav links */}
        <nav className="hidden md:flex items-center gap-8 flex-1 justify-end">
          {leftLinks.map((link) => (
            <NavItem key={link.label} link={link} textColor={textColor} textCls={textCls} onNavClick={onNavClick} isOpaque={isOpaque} />
          ))}
        </nav>

        {/* Center: logo / studio name */}
        <div className="flex items-center justify-center shrink-0 px-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayName}
              className={`h-12 object-contain transition-all duration-300 ${logoFilter}`}
            />
          ) : (
            <span
              style={textColor ? { color: textColor } : undefined}
              className={`text-sm tracking-[0.4em] uppercase font-light transition-colors duration-300 whitespace-nowrap ${isOpaque && !textColor ? "text-foreground" : ""} ${!isOpaque && !textColor ? "text-white/90" : ""}`}
            >
              {displayName}
            </span>
          )}
        </div>

        {/* Right nav links */}
        <nav className="hidden md:flex items-center gap-8 flex-1 justify-start">
          {rightLinks.map((link) => (
            <NavItem key={link.label} link={link} textColor={textColor} textCls={textCls} onNavClick={onNavClick} isOpaque={isOpaque} />
          ))}
        </nav>

        {/* Mobile toggle */}
        {navLinks.length > 0 && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={textColor ? { color: textColor } : undefined}
            className={`md:hidden absolute right-6 transition-colors duration-300 ${!textColor ? (isOpaque ? "text-foreground" : "text-white") : ""}`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background/98 backdrop-blur-sm border-b border-border">
          <nav className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <div key={link.label}>
                <button
                  onClick={() => {
                    if (!link.children?.length) { onNavClick(link.href); setMobileMenuOpen(false); }
                  }}
                  className="text-left text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/50 w-full"
                >
                  {link.label}
                </button>
                {link.children?.map((child) => (
                  <button
                    key={child.label}
                    onClick={() => { onNavClick(child.href); setMobileMenuOpen(false); }}
                    className="text-left text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground/70 hover:text-foreground transition-colors py-2 pl-4 border-b border-border/30 w-full"
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            ))}
            {showBooking && (
              <button
                onClick={() => {
                  onNavClick("#sessions");
                  setMobileMenuOpen(false);
                }}
                className="mt-2 text-left text-[11px] tracking-[0.3em] uppercase font-light text-foreground py-2.5"
              >
                {ctaText} →
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// ─── Shared Footer ───────────────────────────────────────────────────────────

function SharedFooter({ site, showContact, displayName, logoUrl }: { site: SiteConfig | null; showContact: boolean; displayName?: string; logoUrl?: string | null }) {
  const showSocials = site?.footer_show_socials ?? true;
  const showLogo = site?.footer_show_logo ?? false;
  const bgColor = site?.footer_bg_color ?? null;
  const textColor = site?.footer_text_color ?? null;
  const filterKeys = site?.footer_visible_socials ?? null;

  const ALL_SOCIAL_ENTRIES: { key: string; href: string | null | undefined; icon: React.ReactNode }[] = [
    { key: "instagram", href: site?.instagram_url, icon: <Instagram className="h-4 w-4" /> },
    { key: "facebook",  href: site?.facebook_url,  icon: <Facebook className="h-4 w-4" /> },
    { key: "youtube",   href: site?.youtube_url,   icon: <Youtube className="h-4 w-4" /> },
    { key: "linkedin",  href: site?.linkedin_url,  icon: <Linkedin className="h-4 w-4" /> },
    { key: "tiktok",    href: site?.tiktok_url,    icon: <TikTokIcon className="h-4 w-4" /> },
    { key: "pinterest", href: site?.pinterest_url, icon: <PinterestIcon className="h-4 w-4" /> },
    { key: "whatsapp",  href: site?.whatsapp ? `https://wa.me/${site.whatsapp.replace(/\D/g, "")}` : null, icon: <WhatsAppIcon className="h-4 w-4" /> },
  ];

  const visibleSocialEntries = ALL_SOCIAL_ENTRIES.filter(e => {
    if (!e.href) return false;
    if (filterKeys && filterKeys.length > 0) return filterKeys.includes(e.key);
    return true;
  });

  const footerStyle: React.CSSProperties = bgColor ? { backgroundColor: bgColor } : {};
  const iconColorCls = textColor ? "" : "text-muted-foreground hover:text-foreground";

  return (
    <footer
      id="contact"
      data-block-key="footer"
      className="border-t border-border py-12"
      style={footerStyle}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-6">
        {/* Logo / Studio Name */}
        {showLogo && (
          <div className="flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt={displayName} className="h-8 object-contain" style={textColor ? { filter: "none" } : undefined} />
            ) : (
              <span
                className="text-[10px] tracking-[0.4em] uppercase font-light"
                style={{ color: textColor ?? undefined }}
              >
                {displayName}
              </span>
            )}
          </div>
        )}

        {/* Social icons */}
        {showContact && showSocials && visibleSocialEntries.length > 0 && (
          <div className="flex items-center justify-center gap-5">
            {visibleSocialEntries.map(e => (
              <a
                key={e.key}
                href={e.href!}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors ${iconColorCls}`}
                style={textColor ? { color: textColor } : undefined}
              >
                {e.icon}
              </a>
            ))}
          </div>
        )}

        {/* Footer text */}
        {site?.footer_text && (
          <p
            className="text-[10px] font-light text-center"
            style={{ color: textColor ?? undefined }}
          >
            {site.footer_text}
          </p>
        )}

        <p className="text-[9px] tracking-widest uppercase text-center" style={{ color: textColor ? textColor + "66" : undefined, opacity: textColor ? undefined : 0.4 }}>Powered by Davions</p>
      </div>
    </footer>
  );
}

// ─── Shared About ────────────────────────────────────────────────────────────

function SharedAbout({ site, photographer, displayName }: { site: SiteConfig | null; photographer: Photographer; displayName: string }) {
  if (!site?.show_about && site?.show_about !== null) return null;
  if (!photographer?.bio && !site?.about_image_url) return null;

  const layout = site?.about_layout ?? "image-right";

  return (
    <section id="about" className="border-t border-border" style={getSectionStyle(site, "about")}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-10">
          {site?.about_title || "About"}
        </p>
        <div className={`flex flex-col gap-10 items-center max-w-4xl mx-auto ${
          layout === "text-only"
            ? "md:flex-col"
            : layout === "image-left"
            ? "md:flex-row"
            : "md:flex-row-reverse"
        }`}>
          {layout !== "text-only" && site?.about_image_url && (
            <div className="w-full md:w-64 shrink-0">
              <img src={site.about_image_url} alt={displayName} className="w-full aspect-[3/4] object-cover" />
            </div>
          )}
          <div className={`flex-1 ${layout === "text-only" ? "text-center max-w-2xl mx-auto" : ""}`}>
            <h2 className="text-2xl font-light tracking-[0.1em] uppercase mb-4">
              {photographer?.full_name || photographer?.business_name || displayName}
            </h2>
            {photographer?.bio && (
              <p className="text-sm font-light text-muted-foreground leading-relaxed">{photographer.bio}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials Section ────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "text-foreground" : "text-muted-foreground/20"} style={{ fontSize: "10px" }}>★</span>
      ))}
    </div>
  );
}

function SharedTestimonials({ site, accentColor }: { site: SiteConfig | null; accentColor: string }) {
  const items = site?.testimonials ?? [];
  if (items.length === 0) return null;
  const layout = site?.testimonials_layout ?? "cards";
  const title = site?.testimonials_title || "What Clients Say";

  if (layout === "quotes") {
    return (
      <section className="border-t border-border py-16 md:py-24 bg-muted/20" style={getSectionStyle(site, "testimonials")}>
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-12">{title}</p>
          <div className="flex flex-col gap-12">
            {items.map((t) => (
              <div key={t.id} className="flex flex-col items-center text-center gap-4">
                <Quote className="h-5 w-5 text-muted-foreground/30" />
                <blockquote className="text-lg md:text-xl font-light leading-relaxed italic text-foreground">
                  "{t.text}"
                </blockquote>
                {t.rating && t.rating > 0 && <StarRating rating={t.rating} />}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[11px] tracking-[0.15em] uppercase font-medium">{t.name}</span>
                  {t.role && <span className="text-[10px] text-muted-foreground">{t.role}</span>}
                </div>
                <div className="w-8 h-px" style={{ backgroundColor: accentColor }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // cards layout
  return (
    <section className="border-t border-border py-16 md:py-24" style={getSectionStyle(site, "testimonials")}>
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-12">{title}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((t) => (
            <div key={t.id} className="border border-border p-6 flex flex-col gap-4 bg-card">
              {t.rating && t.rating > 0 && <StarRating rating={t.rating} />}
              <blockquote className="text-sm font-light text-muted-foreground leading-relaxed flex-1">
                "{t.text}"
              </blockquote>
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt={t.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium text-background" style={{ backgroundColor: accentColor }}>
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium tracking-wide">{t.name}</p>
                  {t.role && <p className="text-[10px] text-muted-foreground">{t.role}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Quote Section ────────────────────────────────────────────────────────────

function QuoteSection({ site, editMode, onFieldChange }: { site: SiteConfig | null; editMode?: boolean; onFieldChange?: (k: string, v: string) => void }) {
  if (!site?.quote_text && !editMode) return null;
  const save = (k: string, v: string) => onFieldChange?.(k, v);
  return (
    <section className="py-16 md:py-24 border-t border-border bg-muted/20" style={getSectionStyle(site, "quote")}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Quote className="h-5 w-5 text-muted-foreground/30 mx-auto mb-6" />
        <blockquote className="text-xl md:text-2xl font-light leading-relaxed text-foreground tracking-wide italic mb-6">
          "<EditableText value={site?.quote_text ?? "Your quote here"} fieldKey="quote_text" editMode={!!editMode} onSave={save} />"
        </blockquote>
        {(site?.quote_author || editMode) && (
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">— <EditableText value={site?.quote_author ?? "Author"} fieldKey="quote_author" editMode={!!editMode} onSave={save} /></p>
        )}
      </div>
    </section>
  );
}

// ─── Experience Section ────────────────────────────────────────────────────────

function ExperienceSection({ site, accentColor, editMode, onFieldChange }: { site: SiteConfig | null; accentColor: string; editMode?: boolean; onFieldChange?: (k: string, v: string) => void }) {
  if (!site?.experience_text && !editMode) return null;
  const save = (k: string, v: string) => onFieldChange?.(k, v);
  return (
    <section className="border-t border-border py-16 md:py-24" style={getSectionStyle(site, "experience")}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-12 items-start max-w-5xl mx-auto">
          <div className="md:w-1/3 shrink-0">
            <div className="w-8 h-px mb-6" style={{ backgroundColor: accentColor }} />
            <h2 className="text-2xl md:text-3xl font-light tracking-wide leading-snug">
              <EditableText value={site?.experience_title || "The Experience"} fieldKey="experience_title" editMode={!!editMode} onSave={save} />
            </h2>
          </div>
          <div className="flex-1">
            <p className="text-sm md:text-base font-light text-muted-foreground leading-relaxed whitespace-pre-line">
              <EditableText value={site?.experience_text ?? ""} fieldKey="experience_text" editMode={!!editMode} onSave={save} />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Common derived values ────────────────────────────────────────────────

function deriveCommon(props: Props) {
  const { photographer, site, scrolled: _scrolled, mobileMenuOpen: _m, setMobileMenuOpen, blogHref, extraNavLinks, editMode = false, onFieldChange, visibleSections } = props;

  const displayName = site?.tagline || photographer?.business_name || photographer?.full_name || photographer?.email || "";
  const headline = site?.site_headline || displayName;
  const subheadline = site?.site_subheadline || photographer?.bio || "";
  const ctaText = site?.cta_text || "Book a session";
  const accentColor = site?.accent_color || "#000000";

  const showStore = site?.show_store !== false;
  const showAbout = site?.show_about !== false;
  const showBooking = site?.show_booking !== false;
  const showBlog = site?.show_blog === true;
  const showContact = site?.show_contact !== false;

  const hasSocials = site?.instagram_url || site?.facebook_url || site?.tiktok_url || site?.youtube_url || site?.linkedin_url || site?.pinterest_url || site?.whatsapp;

  // When site_pages drives the site, extraNavLinks is the only source of nav items.
  // The legacy show_* fallback links are only used when visibleSections is NOT provided
  // (i.e. the site_pages system is not active yet for this photographer).
  const navLinks: NavLinkItem[] = extraNavLinks && extraNavLinks.length > 0
    ? extraNavLinks
    : visibleSections !== undefined && visibleSections !== null
      ? [] // site_pages is active but no visible nav pages exist — empty nav
      : [
          ...(showStore ? [{ label: "Sessions", href: "#sessions" }] : []),
          ...(showAbout ? [{ label: "About", href: "#about" }] : []),
          ...(showBlog ? [{ label: "Blog", href: blogHref }] : []),
          ...((showContact && hasSocials) ? [{ label: "Contact", href: "#contact" }] : []),
        ];

  const handleNavClick = (href: string) => {
    if (editMode) return; // block navigation in edit mode
    setMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const el = document.getElementById(href.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.assign(href);
    }
  };

  const ed = (fieldKey: string, value: string | null | undefined) => (
    <EditableText
      value={value ?? ""}
      fieldKey={fieldKey}
      editMode={editMode}
      onSave={(k, v) => onFieldChange?.(k, v)}
    />
  );

  /**
   * Returns true if the given block key should be rendered.
   * When visibleSections is null/undefined, everything renders.
   * When it's an array, only keys present in the array render.
   */
  const showBlock = (key: string): boolean =>
    !visibleSections || visibleSections.includes(key);

  return { displayName, headline, subheadline, ctaText, accentColor, showStore, showAbout, showBooking, showBlog, showContact, hasSocials, navLinks, handleNavClick, editMode, onFieldChange: onFieldChange ?? (() => {}), ed, showBlock };
}

// ─── Block builders (template-agnostic) ─────────────────────────────────────

/** Build the blockMap for a given template variant. Each key returns a React node or null. */
function buildBlockMap(
  variant: "editorial" | "grid" | "magazine" | "clean" | "sierra" | "canvas" | "avery" | "seville" | "milo",
  props: Props,
  derived: ReturnType<typeof deriveCommon>
): Record<string, React.ReactNode> {
  const { photographer, site, sessions, galleries, sessionHref, galleryHref } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showStore, showBooking, showContact, navLinks: _navLinks, handleNavClick, editMode, ed, onFieldChange, showBlock } = derived;

  // ── Hero ──────────────────────────────────────────────────────────────────
  let hero: React.ReactNode = null;
  if (showBlock("hero")) {
    if (variant === "editorial") {
      if ((site?.hero_layout ?? "full") === "split") {
        hero = (
          <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="relative w-full min-h-[65vh] flex flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-1/2 h-[40vh] md:h-auto relative bg-foreground">
              {site?.site_hero_image_url
                ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 bg-foreground" />
              }
            </div>
            <div className="w-full md:w-1/2 flex flex-col justify-center px-5 sm:px-8 md:px-14 py-10 md:py-14 gap-4 md:gap-5 bg-background">
              {!site?.logo_url && <p className="text-[9px] tracking-[0.5em] uppercase text-muted-foreground">Photography by</p>}
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.08em] md:tracking-[0.1em] uppercase leading-tight">{ed("site_headline", headline)}</h1>
              {(subheadline || editMode) && <p className="text-sm font-light text-muted-foreground leading-relaxed max-w-sm">{ed("site_subheadline", subheadline)}</p>}
              {showBooking && (site?.cta_link
                ? <a href={editMode ? undefined : site.cta_link} style={{ borderColor: accentColor, color: accentColor }} className="self-start mt-2 px-8 py-3 border text-[10px] tracking-[0.3em] uppercase hover:opacity-70 transition-opacity">{ed("cta_text", ctaText)}</a>
                : <button data-scroll-to="#sessions" onClick={() => handleNavClick("#sessions")} style={{ borderColor: accentColor, color: accentColor }} className="self-start mt-2 px-8 py-3 border text-[10px] tracking-[0.3em] uppercase hover:opacity-70 transition-opacity">{ed("cta_text", ctaText)}</button>
              )}
            </div>
          </div>
        );
      } else {
        hero = (
          <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="relative w-full h-[65vh] min-h-[420px] overflow-hidden">
            {site?.site_hero_image_url
              ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
              : <div className="absolute inset-0 bg-foreground" />
            }
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/75" />
          <div className="relative z-10 h-full flex flex-col items-center justify-end pb-10 md:pb-16 px-5 sm:px-6 text-center">
              {!site?.logo_url && <p className="text-[9px] tracking-[0.5em] uppercase text-white/50 mb-3">Photography by</p>}
              <h1 className="text-2xl sm:text-3xl md:text-6xl font-extralight tracking-[0.08em] md:tracking-[0.12em] uppercase text-white mb-3 md:mb-4" style={{ lineHeight: 1.1 }}>{ed("site_headline", headline)}</h1>
              {(subheadline || editMode) && <p className="text-sm font-light text-white/65 max-w-md leading-relaxed mb-7">{ed("site_subheadline", subheadline)}</p>}
              {showBooking && (site?.cta_link
                ? <a href={editMode ? undefined : site.cta_link} style={{ borderColor: accentColor }} className="mt-2 px-8 py-3 border text-[10px] tracking-[0.3em] uppercase bg-white/10 hover:bg-white/20 transition-colors text-white">{ed("cta_text", ctaText)}</a>
                : <button data-scroll-to="#sessions" onClick={() => handleNavClick("#sessions")} className="mt-2 px-8 py-3 border border-white/40 text-[10px] tracking-[0.3em] uppercase bg-white/10 hover:bg-white/20 transition-colors text-white">{ed("cta_text", ctaText)}</button>
              )}
            </div>
          </div>
        );
      }
    } else if (variant === "grid") {
      hero = (
        <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="relative w-full h-[40vh] min-h-[260px] overflow-hidden">
          {site?.site_hero_image_url
            ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-foreground" />
          }
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
          <div className="relative z-10 h-full flex flex-col justify-center px-5 sm:px-8 md:px-16 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.08em] md:tracking-[0.1em] uppercase text-white mb-3 leading-tight">{ed("site_headline", headline)}</h1>
            {(subheadline || editMode) && <p className="text-sm font-light text-white/65 max-w-sm leading-relaxed mb-5">{ed("site_subheadline", subheadline)}</p>}
            {showBooking && (
              site?.cta_link
                ? <a href={editMode ? undefined : site.cta_link} style={{ backgroundColor: accentColor }} className="self-start px-6 py-2 text-[9px] tracking-[0.3em] uppercase text-white hover:opacity-90 transition-opacity">{ed("cta_text", ctaText)}</a>
                : <button data-scroll-to="#sessions" onClick={() => handleNavClick("#sessions")} style={{ backgroundColor: accentColor }} className="self-start px-6 py-2 text-[9px] tracking-[0.3em] uppercase text-white hover:opacity-90 transition-opacity">{ed("cta_text", ctaText)}</button>
            )}
          </div>
        </div>
      );
    } else if (variant === "magazine") {
      hero = (
        <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="relative w-full h-[55vh] min-h-[340px] overflow-hidden">
          {site?.site_hero_image_url
            ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-foreground" />
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-end pb-10 md:pb-12 px-5 sm:px-8 md:px-16">
            <div className="flex items-start gap-4 md:gap-5 max-w-2xl">
              <div className="w-0.5 h-12 md:h-16 mt-1 shrink-0" style={{ backgroundColor: accentColor }} />
              <div>
                <p className="text-[9px] tracking-[0.5em] uppercase text-white/50 mb-2">Photography</p>
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-light text-white leading-tight mb-3" style={{ letterSpacing: "0.05em" }}>{ed("site_headline", headline)}</h1>
                {(subheadline || editMode) && <p className="text-sm font-light text-white/65 leading-relaxed max-w-md">{ed("site_subheadline", subheadline)}</p>}
                {showBooking && (
                  <div className="mt-5">
                    {site?.cta_link
                      ? <a href={editMode ? undefined : site.cta_link} style={{ color: accentColor, borderColor: accentColor }} className="inline-block px-6 py-2 border text-[9px] tracking-[0.3em] uppercase hover:bg-white/10 transition-colors text-white">{ed("cta_text", ctaText)}</a>
                      : <button data-scroll-to="#sessions" onClick={() => handleNavClick("#sessions")} style={{ color: accentColor, borderColor: accentColor }} className="px-6 py-2 border text-[9px] tracking-[0.3em] uppercase hover:bg-white/10 transition-colors text-white">{ed("cta_text", ctaText)}</button>
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // clean
      hero = (
        <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="relative w-full h-[55vh] min-h-[360px] overflow-hidden">
          {site?.site_hero_image_url
            ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-foreground" />
          }
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-5 sm:px-6 text-center gap-3 md:gap-4">
            <div className="w-10 h-px bg-white/40 mb-2" />
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-extralight text-white leading-none tracking-wide">{ed("site_headline", headline)}</h1>
            {(subheadline || editMode) && <p className="text-base font-light text-white/60 max-w-lg leading-relaxed mt-2">{ed("site_subheadline", subheadline)}</p>}
            {showBooking && (
              <div className="mt-4">
                {site?.cta_link
                  ? <a href={editMode ? undefined : site.cta_link} className="inline-block px-8 py-3 bg-white text-background text-[10px] tracking-[0.4em] uppercase hover:bg-white/90 transition-colors">{ed("cta_text", ctaText)}</a>
                  : <button data-scroll-to="#sessions" onClick={() => handleNavClick("#sessions")} className="px-8 py-3 bg-white text-background text-[10px] tracking-[0.4em] uppercase hover:bg-white/90 transition-colors">{ed("cta_text", ctaText)}</button>
                }
              </div>
            )}
            <div className="w-10 h-px bg-white/40 mt-2" />
          </div>
        </div>
      );
    }
  }

  // ── Quote ─────────────────────────────────────────────────────────────────
  const quote: React.ReactNode = showBlock("quote")
    ? <div key="quote" data-block-key="quote"><QuoteSection site={site} editMode={editMode} onFieldChange={onFieldChange} /></div>
    : null;

  // ── Sessions ──────────────────────────────────────────────────────────────
  // Group sessions by category when more than one category is present
  const sessionCategories = Array.from(new Set(sessions.map((s) => s.category ?? "").filter(Boolean)));
  const hasCategoryGroups = sessionCategories.length > 1;

  // Returns session cards as JSX for the given list + variant
  const renderSessionCards = (list: Session[], variant: string) => {
    if (variant === "editorial") {
      return list.map((session, i) => {
        const isEven = i % 2 === 0;
        return (
          <button key={session.id} onClick={() => window.location.assign(sessionHref(session))}
            className="group w-full text-left border-t border-border hover:bg-muted/20 transition-colors duration-300">
            <div className={`max-w-6xl mx-auto flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} items-stretch`}>
              <div className="w-full md:w-1/2 aspect-[16/9] md:aspect-auto md:min-h-[380px] relative overflow-hidden bg-muted">
                {session.cover_image_url
                  ? <img src={session.cover_image_url} alt={session.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-foreground/20" /></div>
                }
              </div>
              <div className={`w-full md:w-1/2 flex flex-col justify-center p-8 md:p-12 lg:p-16 gap-4 ${isEven ? "md:pl-14" : "md:pr-14"}`}>
                <div className="w-8 h-px" style={{ backgroundColor: accentColor }} />
                <h2 className="text-2xl md:text-3xl font-light tracking-wide">{session.title}</h2>
                {session.tagline && <p className="text-base font-light text-muted-foreground italic">{session.tagline}</p>}
                {session.description && <p className="text-sm font-light text-muted-foreground leading-relaxed line-clamp-3">{session.description}</p>}
                <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{session.duration_minutes} min</span>
                  <span className="flex items-center gap-1.5"><Camera className="h-3 w-3" />{session.num_photos} photos</span>
                  {session.location && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{session.location}</span>}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                  <span className="text-2xl font-light">{formatPrice(session.price)}</span>
                  <span className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                    View details <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      });
    } else if (variant === "grid") {
      return list.map((session) => (
        <button key={session.id} onClick={() => window.location.assign(sessionHref(session))}
          className="group relative aspect-square overflow-hidden bg-muted">
          {session.cover_image_url
            ? <img src={session.cover_image_url} alt={session.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            : <div className="absolute inset-0 flex items-center justify-center bg-muted"><ImageIcon className="h-10 w-10 text-muted-foreground/20" /></div>
          }
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100">
            <h2 className="text-white text-sm font-light tracking-wide mb-1">{session.title}</h2>
            {session.tagline && <p className="text-white/60 text-[10px] mb-1 italic line-clamp-1">{session.tagline}</p>}
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-[10px]">{formatPrice(session.price)}</span>
              <span className="text-[9px] tracking-widest uppercase text-white/60">{session.duration_minutes}min</span>
            </div>
          </div>
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 text-white text-[9px] tracking-wider">
            {formatPrice(session.price)}
          </div>
        </button>
      ));
    } else if (variant === "magazine") {
      const [feat, ...rest] = list;
      return (
        <>
          {feat && (
            <button onClick={() => window.location.assign(sessionHref(feat))}
              className="group w-full mb-6 grid grid-cols-1 md:grid-cols-2 border border-border hover:border-foreground/30 transition-all duration-300 overflow-hidden bg-card text-left">
              <div className="aspect-[4/3] md:aspect-auto md:min-h-[320px] bg-muted relative overflow-hidden">
                {feat.cover_image_url
                  ? <img src={feat.cover_image_url} alt={feat.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-foreground/20" /></div>
                }
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground mb-3">Featured</p>
                  <h2 className="text-2xl font-light tracking-wide mb-2">{feat.title}</h2>
                  {feat.tagline && <p className="text-sm font-light text-muted-foreground italic mb-3">{feat.tagline}</p>}
                  {feat.description && <p className="text-sm text-muted-foreground leading-relaxed mb-6">{feat.description}</p>}
                </div>
                <div>
                  <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground mb-6">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{feat.duration_minutes}min</span>
                    <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{feat.num_photos} photos</span>
                    {feat.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{feat.location}</span>}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-2xl font-light">{formatPrice(feat.price)}</span>
                    <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">View details →</span>
                  </div>
                </div>
              </div>
            </button>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((session) => (
                <button key={session.id} onClick={() => window.location.assign(sessionHref(session))}
                  className="group text-left border border-border hover:border-foreground/30 transition-all duration-300 overflow-hidden flex flex-col bg-card">
                  <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                    {session.cover_image_url
                      ? <img src={session.cover_image_url} alt={session.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground/20" /></div>
                    }
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h2 className="text-sm font-light tracking-wide">{session.title}</h2>
                    {session.tagline && <p className="text-[11px] text-muted-foreground italic">{session.tagline}</p>}
                    <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                      <span className="text-base font-light">{formatPrice(session.price)}</span>
                      <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">View →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      );
    } else {
      // clean
      return list.map((session, i) => (
        <button key={session.id} onClick={() => window.location.assign(sessionHref(session))}
          className={`group text-left py-8 flex flex-col gap-3 ${i > 0 ? "border-t border-border" : ""} hover:pl-2 transition-all duration-300`}>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-light tracking-wide">{session.title}</h2>
            <span className="text-xl font-light shrink-0">{formatPrice(session.price)}</span>
          </div>
          {session.tagline && <p className="text-sm font-light text-muted-foreground italic">{session.tagline}</p>}
          {session.description && <p className="text-sm text-muted-foreground leading-relaxed">{session.description}</p>}
          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground/70">
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{session.duration_minutes} minutes</span>
            <span className="flex items-center gap-1.5"><Camera className="h-3 w-3" />{session.num_photos} photos</span>
            {session.location && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{session.location}</span>}
          </div>
          <span className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground group-hover:text-foreground transition-colors mt-1">View details →</span>
        </button>
      ));
    }
  };

  // Builds the full sessions block, with optional category grouping
  const buildSessionsBlock = (sessionsForBlock: Session[], blockVariant: string, wrapperClass: string, labelText: string): React.ReactNode => {
    if (!hasCategoryGroups) {
      // No grouping needed — render as before
      if (blockVariant === "editorial") {
        return (
          <>
            <div className="max-w-6xl mx-auto px-6 pt-16 pb-4">
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">{labelText}</p>
            </div>
            {renderSessionCards(sessionsForBlock, blockVariant)}
          </>
        );
      } else if (blockVariant === "grid") {
        return (
          <div className={wrapperClass}>
            <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-8 pl-2">{labelText}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {renderSessionCards(sessionsForBlock, blockVariant)}
            </div>
          </div>
        );
      } else if (blockVariant === "magazine") {
        return (
          <div className={wrapperClass}>
            <div className="flex items-center gap-4 mb-10">
              <div className="w-6 h-px" style={{ backgroundColor: accentColor }} />
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">{labelText}</p>
            </div>
            {renderSessionCards(sessionsForBlock, blockVariant)}
          </div>
        );
      } else {
        return (
          <div className={wrapperClass}>
            <p className="text-[9px] tracking-[0.6em] uppercase text-muted-foreground/70 text-center mb-16">{labelText}</p>
            <div className="flex flex-col gap-0">
              {renderSessionCards(sessionsForBlock, blockVariant)}
            </div>
          </div>
        );
      }
    }

    // ── Category groups ──────────────────────────────────────────────────────
    // All categories present in the filtered set
    const cats = Array.from(new Set(sessionsForBlock.map((s) => s.category ?? "").filter(Boolean)));
    const uncategorized = sessionsForBlock.filter((s) => !s.category);

    const renderGroup = (cat: string, list: Session[]) => {
      const catLabel = cat;
      if (blockVariant === "editorial") {
        return (
          <div key={cat} className="mb-4">
            <div className="max-w-6xl mx-auto px-6 pt-10 pb-3 flex items-center gap-4">
              <div className="w-6 h-px" style={{ backgroundColor: accentColor }} />
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">{catLabel}</p>
            </div>
            {renderSessionCards(list, blockVariant)}
          </div>
        );
      } else if (blockVariant === "grid") {
        return (
          <div key={cat} className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-5 h-px" style={{ backgroundColor: accentColor }} />
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">{catLabel}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {renderSessionCards(list, blockVariant)}
            </div>
          </div>
        );
      } else if (blockVariant === "magazine") {
        return (
          <div key={cat} className="mb-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-6 h-px" style={{ backgroundColor: accentColor }} />
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">{catLabel}</p>
            </div>
            {renderSessionCards(list, blockVariant)}
          </div>
        );
      } else {
        return (
          <div key={cat} className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-5 h-px" style={{ backgroundColor: accentColor }} />
              <p className="text-[9px] tracking-[0.5em] uppercase text-muted-foreground/70">{catLabel}</p>
            </div>
            <div className="flex flex-col gap-0">
              {renderSessionCards(list, blockVariant)}
            </div>
          </div>
        );
      }
    };

    const groupContent = (
      <>
        {cats.map((cat) => renderGroup(cat, sessionsForBlock.filter((s) => s.category === cat)))}
        {uncategorized.length > 0 && renderGroup("Other", uncategorized)}
      </>
    );

    if (blockVariant === "editorial") {
      return (
        <>
          <div className="max-w-6xl mx-auto px-6 pt-16 pb-4">
            <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">{labelText}</p>
          </div>
          {groupContent}
        </>
      );
    } else if (blockVariant === "grid") {
      return (
        <div className={wrapperClass}>
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-10 pl-2">{labelText}</p>
          {groupContent}
        </div>
      );
    } else if (blockVariant === "magazine") {
      return (
        <div className={wrapperClass}>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-6 h-px" style={{ backgroundColor: accentColor }} />
            <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">{labelText}</p>
          </div>
          {groupContent}
        </div>
      );
    } else {
      return (
        <div className={wrapperClass}>
          <p className="text-[9px] tracking-[0.6em] uppercase text-muted-foreground/70 text-center mb-16">{labelText}</p>
          {groupContent}
        </div>
      );
    }
  };

  let sessionsBlock: React.ReactNode = null;
  if (showBlock("sessions") && showStore) {
    if (variant === "editorial") {
      sessionsBlock = (
        <main key="sessions" data-block-key="sessions" style={getSectionStyle(site, "sessions")} id="sessions">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Camera className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-light text-muted-foreground">No sessions available yet.</p>
            </div>
          ) : buildSessionsBlock(sessions, "editorial", "", "Available Sessions")}
        </main>
      );
    } else if (variant === "grid") {
      sessionsBlock = sessions.length > 0 ? (
        <main key="sessions" data-block-key="sessions" style={getSectionStyle(site, "sessions")} id="sessions" className="max-w-7xl mx-auto px-4 py-12">
          {buildSessionsBlock(sessions, "grid", "max-w-7xl mx-auto px-4 py-12", "Sessions")}
        </main>
      ) : null;
    } else if (variant === "magazine") {
      sessionsBlock = sessions.length > 0 ? (
        <main key="sessions" data-block-key="sessions" style={getSectionStyle(site, "sessions")} id="sessions" className="max-w-6xl mx-auto px-6 py-16">
          {buildSessionsBlock(sessions, "magazine", "max-w-6xl mx-auto px-6 py-16", "Sessions")}
        </main>
      ) : null;
    } else {
      // clean
      sessionsBlock = sessions.length > 0 ? (
        <main key="sessions" data-block-key="sessions" style={getSectionStyle(site, "sessions")} id="sessions" className="max-w-2xl mx-auto px-6 py-20">
          {buildSessionsBlock(sessions, "clean", "max-w-2xl mx-auto px-6 py-20", "Available Sessions")}
        </main>
      ) : null;
    }
  }

  // ── Portfolio ─────────────────────────────────────────────────────────────
  let portfolio: React.ReactNode = null;
  if (showBlock("portfolio") && galleries.length > 0) {
    if (variant === "editorial") {
      portfolio = (
        <section key="portfolio" data-block-key="portfolio" style={getSectionStyle(site, "portfolio")} className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-10">Portfolio</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleries.map((gallery) => (
                <button key={gallery.id} onClick={() => window.location.assign(galleryHref(gallery))}
                  className="group text-left border border-border hover:border-foreground/30 transition-all duration-300 overflow-hidden flex flex-col bg-card">
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {gallery.cover_image_url
                      ? <img src={gallery.cover_image_url} alt={gallery.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      : <div className="w-full h-full flex items-center justify-center"><Images className="h-8 w-8 text-muted-foreground/20" /></div>
                    }
                    <span className="absolute top-3 left-3 text-[9px] tracking-[0.3em] uppercase bg-black/50 text-white/70 px-2 py-1 backdrop-blur-sm">{gallery.category}</span>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <h2 className="text-sm font-light tracking-wide">{gallery.title}</h2>
                    <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-3">View →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    } else if (variant === "grid") {
      portfolio = (
        <div key="portfolio" data-block-key="portfolio" style={getSectionStyle(site, "portfolio")} className="max-w-7xl mx-auto px-4 py-12">
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-8 pl-2">Portfolio</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {galleries.map((gallery) => (
              <button key={gallery.id} onClick={() => window.location.assign(galleryHref(gallery))}
                className="group relative aspect-square overflow-hidden bg-muted">
                {gallery.cover_image_url
                  ? <img src={gallery.cover_image_url} alt={gallery.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  : <div className="absolute inset-0 flex items-center justify-center"><Images className="h-10 w-10 text-muted-foreground/20" /></div>
                }
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100">
                  <h2 className="text-white text-sm font-light tracking-wide">{gallery.title}</h2>
                  <span className="text-white/60 text-[9px] tracking-wider uppercase">{gallery.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    } else if (variant === "magazine") {
      portfolio = (
        <section key="portfolio" data-block-key="portfolio" style={getSectionStyle(site, "portfolio")} className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-6 h-px" style={{ backgroundColor: accentColor }} />
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">Portfolio</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {galleries.map((gallery, i) => (
                <button key={gallery.id} onClick={() => window.location.assign(galleryHref(gallery))}
                  className={`group relative overflow-hidden bg-muted ${i === 0 ? "col-span-2 md:col-span-1 row-span-2" : ""}`}
                  style={{ aspectRatio: i === 0 ? "1/1.6" : "4/3" }}>
                  {gallery.cover_image_url
                    ? <img src={gallery.cover_image_url} alt={gallery.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    : <div className="absolute inset-0 flex items-center justify-center"><Images className="h-8 w-8 text-muted-foreground/20" /></div>
                  }
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <h2 className="text-white text-sm font-light tracking-wide">{gallery.title}</h2>
                  </div>
                  <span className="absolute top-3 left-3 text-[9px] tracking-[0.3em] uppercase bg-black/50 text-white/70 px-2 py-1 backdrop-blur-sm">{gallery.category}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    } else {
      // clean
      portfolio = (
        <section key="portfolio" data-block-key="portfolio" style={getSectionStyle(site, "portfolio")} className="border-t border-border bg-muted/20">
          <div className="max-w-4xl mx-auto px-6 py-20">
            <p className="text-[9px] tracking-[0.6em] uppercase text-muted-foreground/70 text-center mb-16">Portfolio</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {galleries.map((gallery) => (
                <button key={gallery.id} onClick={() => window.location.assign(galleryHref(gallery))}
                  className="group text-left">
                  <div className="aspect-[4/3] overflow-hidden mb-4 bg-muted">
                    {gallery.cover_image_url
                      ? <img src={gallery.cover_image_url} alt={gallery.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      : <div className="w-full h-full flex items-center justify-center"><Images className="h-8 w-8 text-muted-foreground/20" /></div>
                    }
                  </div>
                  <h2 className="text-sm font-light tracking-widest uppercase text-center group-hover:text-muted-foreground transition-colors">{gallery.title}</h2>
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    }
  }

  // ── Experience ────────────────────────────────────────────────────────────
  const experience: React.ReactNode = showBlock("experience")
    ? <div key="experience" data-block-key="experience"><ExperienceSection site={site} accentColor={accentColor} editMode={editMode} onFieldChange={onFieldChange} /></div>
    : null;

  // ── About ─────────────────────────────────────────────────────────────────
  let about: React.ReactNode = null;
  if (showBlock("about")) {
    if (variant === "clean") {
      if ((site?.show_about !== false) && (photographer?.bio || site?.about_image_url)) {
        about = (
          <section key="about" data-block-key="about" style={getSectionStyle(site, "about")} id="about" className="border-t border-border">
            <div className="max-w-2xl mx-auto px-6 py-20 text-center">
              {site?.about_image_url && (
                <img src={site.about_image_url} alt={displayName} className="w-32 h-32 object-cover rounded-full mx-auto mb-8 grayscale" />
              )}
              <p className="text-[9px] tracking-[0.6em] uppercase text-muted-foreground/70 mb-6">{site?.about_title || "About"}</p>
              <h2 className="text-2xl font-light tracking-wide mb-6">{photographer?.full_name || photographer?.business_name || displayName}</h2>
              {photographer?.bio && <p className="text-sm font-light text-muted-foreground leading-relaxed">{photographer.bio}</p>}
            </div>
          </section>
        );
      }
    } else {
      about = <div key="about" data-block-key="about" style={getSectionStyle(site, "about")}><SharedAbout site={site} photographer={photographer} displayName={displayName} /></div>;
    }
  }

  // ── Testimonials ──────────────────────────────────────────────────────────
  const testimonials: React.ReactNode = showBlock("testimonials")
    ? <div key="testimonials" data-block-key="testimonials"><SharedTestimonials site={site} accentColor={accentColor} /></div>
    : null;

  // ── Footer ────────────────────────────────────────────────────────────────
  // Footer is always rendered (like the nav) — outside orderedKeys so it never disappears
  // in editor mode where visibleSections doesn't include "footer"
  const logoUrl = site?.logo_url ?? null;
  const footer: React.ReactNode = (
    <div key="footer" data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={logoUrl} /></div>
  );

  return { hero, quote, sessions: sessionsBlock, experience, portfolio, about, testimonials, footer };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: EDITORIAL (default)
// ═══════════════════════════════════════════════════════════════════════════

const EDITORIAL_DEFAULT_ORDER = ["hero", "quote", "sessions", "experience", "portfolio", "about", "testimonials"];

function EditorialTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { site, sessions: _s, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, accentColor, showBooking, navLinks, handleNavClick, ctaText, showContact } = derived;

  const blocks = buildBlockMap("editorial", props, derived);
  const orderedKeys = (props.visibleSections ?? EDITORIAL_DEFAULT_ORDER).filter((k) => k !== "footer");

  return (
    <div className="min-h-screen bg-background">
      <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: GRID
// ═══════════════════════════════════════════════════════════════════════════

const GRID_DEFAULT_ORDER = ["hero", "quote", "sessions", "portfolio", "experience", "about", "testimonials"];

function GridTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { site, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, accentColor, showBooking, navLinks, handleNavClick, ctaText, showContact } = derived;

  const blocks = buildBlockMap("grid", props, derived);
  const orderedKeys = (props.visibleSections ?? GRID_DEFAULT_ORDER).filter((k) => k !== "footer");

  return (
    <div className="min-h-screen bg-background">
      <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: MAGAZINE
// ═══════════════════════════════════════════════════════════════════════════

const MAGAZINE_DEFAULT_ORDER = ["hero", "quote", "sessions", "portfolio", "experience", "about", "testimonials"];

function MagazineTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { site, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, accentColor, showBooking, navLinks, handleNavClick, ctaText, showContact } = derived;

  const blocks = buildBlockMap("magazine", props, derived);
  const orderedKeys = (props.visibleSections ?? MAGAZINE_DEFAULT_ORDER).filter((k) => k !== "footer");

  return (
    <div className="min-h-screen bg-background">
      <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: CLEAN
// ═══════════════════════════════════════════════════════════════════════════

const CLEAN_DEFAULT_ORDER = ["hero", "quote", "sessions", "portfolio", "about", "experience", "testimonials"];

function CleanTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { site, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, accentColor, showBooking, navLinks, handleNavClick, ctaText, showContact } = derived;

  const blocks = buildBlockMap("clean", props, derived);
  const orderedKeys = (props.visibleSections ?? CLEAN_DEFAULT_ORDER).filter((k) => k !== "footer");

  return (
    <div className="min-h-screen bg-background">
      <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: SIERRA — Dark editorial, large serif hero, bottom nav, slide counter
// ═══════════════════════════════════════════════════════════════════════════

const SIERRA_DEFAULT_ORDER = ["hero", "quote", "sessions", "experience", "portfolio", "about", "testimonials"];

function SierraTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { photographer, site, sessions, galleries, sessionHref, galleryHref, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showStore, showBooking, showContact, navLinks, handleNavClick, editMode, ed, onFieldChange, showBlock } = derived;

  // Sierra reuses editorial blocks but with a unique hero
  const blocks = buildBlockMap("editorial", props, derived);

  // Override hero with Sierra-specific design
  if (showBlock("hero")) {
    blocks.hero = (
      <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="relative w-full h-[85vh] min-h-[500px] overflow-hidden">
        {site?.site_hero_image_url
          ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-foreground" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        {/* Slide counter */}
        <div className="absolute top-8 right-8 z-10 flex flex-col items-end gap-1 text-white/50 text-[10px] tracking-widest font-light">
          <span className="text-white/90">01</span>
          <div className="w-4 h-px bg-white/30" />
          <span>03</span>
        </div>
        {/* Center: large serif title */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-5 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-7xl font-extralight tracking-[0.1em] md:tracking-[0.15em] uppercase text-white leading-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {ed("site_headline", headline)}
          </h1>
          {(subheadline || editMode) && (
            <p className="mt-4 text-[11px] tracking-[0.5em] uppercase text-white/50 font-light">{ed("site_subheadline", subheadline)}</p>
          )}
        </div>
        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-8 py-5 bg-black/30 backdrop-blur-sm">
          {navLinks.map(link => (
            <button key={link.label} onClick={() => handleNavClick(link.href)} className="text-[10px] tracking-[0.4em] uppercase text-white/60 hover:text-white transition-colors font-light">
              {link.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const orderedKeys = (props.visibleSections ?? SIERRA_DEFAULT_ORDER).filter((k) => k !== "footer");

  return (
    <div className="min-h-screen bg-background">
      <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: CANVAS — Poetic serif italic, centered nav, elegant
// ═══════════════════════════════════════════════════════════════════════════

const CANVAS_DEFAULT_ORDER = ["hero", "quote", "sessions", "portfolio", "experience", "about", "testimonials"];

function CanvasTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { site, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showBooking, showContact, navLinks, handleNavClick, editMode, ed, showBlock } = derived;

  const blocks = buildBlockMap("editorial", props, derived);

  // Override hero with Canvas-specific design
  if (showBlock("hero")) {
    blocks.hero = (
      <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="relative w-full h-[75vh] min-h-[450px] overflow-hidden">
        {site?.site_hero_image_url
          ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-foreground" />
        }
        <div className="absolute inset-0 bg-black/40" />
        {/* Centered nav with name in middle */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center py-5">
          <div className="flex items-center gap-6">
            {navLinks.slice(0, 2).map(link => (
              <button key={link.label} onClick={() => handleNavClick(link.href)} className="text-[10px] tracking-[0.3em] uppercase text-white/50 hover:text-white transition-colors font-light">
                {link.label}
              </button>
            ))}
            <span className="text-[11px] tracking-[0.4em] uppercase text-white/90 font-light px-4">{displayName}</span>
            {navLinks.slice(2).map(link => (
              <button key={link.label} onClick={() => handleNavClick(link.href)} className="text-[10px] tracking-[0.3em] uppercase text-white/50 hover:text-white transition-colors font-light">
                {link.label}
              </button>
            ))}
          </div>
        </div>
        {/* Center italic title */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-5 sm:px-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-6xl font-extralight tracking-wide text-white italic leading-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {ed("site_headline", headline)}
          </h1>
          {(subheadline || editMode) && (
            <p className="mt-4 text-sm text-white/50 font-light italic">{ed("site_subheadline", subheadline)}</p>
          )}
        </div>
        {/* Arrows */}
        <button className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors">
          <ArrowRight className="h-5 w-5 rotate-180" />
        </button>
        <button className="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors">
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const orderedKeys = (props.visibleSections ?? CANVAS_DEFAULT_ORDER).filter((k) => k !== "footer");

  return (
    <div className="min-h-screen bg-background">
      <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: AVERY — Vertical sidebar + masonry content
// ═══════════════════════════════════════════════════════════════════════════

const AVERY_DEFAULT_ORDER = ["sessions", "portfolio", "about", "experience", "testimonials"];

function AveryTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { site, sessions, galleries, sessionHref, galleryHref, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, accentColor, showBooking, showStore, showContact, navLinks, handleNavClick, ctaText, showBlock } = derived;

  const blocks = buildBlockMap("grid", props, derived);

  // Override hero with masonry grid (no traditional hero)
  if (showBlock("hero")) {
    blocks.hero = null; // Avery has no hero — portfolio IS the hero
  }

  const orderedKeys = (props.visibleSections ?? AVERY_DEFAULT_ORDER).filter((k) => k !== "footer");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Fixed sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 border-r border-border flex-col justify-between py-8 px-6 fixed top-0 left-0 h-full bg-background z-40">
        <div>
          {site?.logo_url ? (
            <img src={site.logo_url} alt={displayName} className="h-8 object-contain mb-8" />
          ) : (
            <p className="text-[10px] tracking-[0.4em] uppercase font-light mb-8">{displayName}</p>
          )}
          <nav className="flex flex-col gap-4">
            {navLinks.map(link => (
              <button key={link.label} onClick={() => handleNavClick(link.href)} className="text-left text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground transition-colors font-light">
                {link.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-3">
          {showBooking && (
            <button onClick={() => handleNavClick("#sessions")} style={{ borderColor: accentColor }} className="text-[9px] tracking-[0.3em] uppercase border px-3 py-2 text-foreground hover:bg-foreground hover:text-background transition-colors font-light">
              {ctaText}
            </button>
          )}
          <SocialIcons site={site} scrolled={true} size="xs" />
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden">
        <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
          displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
          navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0">
        {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
        <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: SEVILLE — Contained hero, airy, luxurious
// ═══════════════════════════════════════════════════════════════════════════

const SEVILLE_DEFAULT_ORDER = ["hero", "quote", "sessions", "portfolio", "about", "experience", "testimonials"];

function SevilleTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { site, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showBooking, showContact, navLinks, handleNavClick, editMode, ed, showBlock } = derived;

  const blocks = buildBlockMap("clean", props, derived);

  // Override hero with Seville contained design
  if (showBlock("hero")) {
    blocks.hero = (
      <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="pt-20 px-4 sm:px-6 md:px-12">
        <div className="relative w-full max-w-6xl mx-auto overflow-hidden min-h-[280px] sm:min-h-0" style={{ aspectRatio: "16/7" }}>
          {site?.site_hero_image_url
            ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-muted" />
          }
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-5 sm:px-6 text-center">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.08em] md:tracking-[0.1em] text-white leading-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {ed("site_headline", headline)}
            </h1>
            {(subheadline || editMode) && (
              <p className="mt-3 text-[11px] tracking-[0.3em] uppercase text-white/60 font-light">{ed("site_subheadline", subheadline)}</p>
            )}
            {showBooking && (
              <button onClick={() => handleNavClick("#sessions")} className="mt-6 px-8 py-2.5 border border-white/60 text-[10px] tracking-[0.3em] uppercase text-white font-light hover:bg-white hover:text-black transition-colors">
                {ed("cta_text", ctaText)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const orderedKeys = (props.visibleSections ?? SEVILLE_DEFAULT_ORDER).filter((k) => k !== "footer");

  return (
    <div className="min-h-screen bg-background">
      <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: MILO — Typography hero, warm, asymmetric photos
// ═══════════════════════════════════════════════════════════════════════════

const MILO_DEFAULT_ORDER = ["hero", "quote", "sessions", "portfolio", "about", "experience", "testimonials"];

function MiloTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { site, sessions, galleries, galleryHref, scrolled, mobileMenuOpen, setMobileMenuOpen } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showBooking, showContact, navLinks, handleNavClick, editMode, ed, showBlock } = derived;

  const blocks = buildBlockMap("editorial", props, derived);

  // Override hero with Milo text-only + asymmetric photos
  if (showBlock("hero")) {
    // Gather cover images from sessions/galleries for asymmetric display
    const coverImages = [
      ...sessions.filter(s => s.cover_image_url).map(s => s.cover_image_url!),
      ...galleries.filter(g => g.cover_image_url).map(g => g.cover_image_url!),
    ].slice(0, 3);

    blocks.hero = (
      <div key="hero" data-block-key="hero" style={getSectionStyle(site, "hero")} className="pt-20">
        {/* Text hero */}
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-12 sm:py-16 md:py-24 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-7xl font-extralight tracking-[0.06em] md:tracking-[0.08em] leading-tight text-foreground" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {ed("site_headline", headline)}
          </h1>
          {(subheadline || editMode) && (
            <p className="mt-5 text-sm font-light text-muted-foreground leading-relaxed max-w-xl mx-auto">{ed("site_subheadline", subheadline)}</p>
          )}
          {showBooking && (
            <button onClick={() => handleNavClick("#sessions")} style={{ borderColor: accentColor }} className="mt-8 px-8 py-3 border text-[10px] tracking-[0.3em] uppercase text-foreground hover:bg-foreground hover:text-background transition-colors font-light">
              {ed("cta_text", ctaText)}
            </button>
          )}
        </div>
        {/* Asymmetric photos */}
        {coverImages.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12 flex gap-2 sm:gap-4 items-stretch" style={{ height: "32vh", minHeight: 220 }}>
            {coverImages[0] && <div className="w-[28%] overflow-hidden"><img src={coverImages[0]} alt="" className="w-full h-full object-cover" /></div>}
            {coverImages[1] && <div className="flex-1 overflow-hidden"><img src={coverImages[1]} alt="" className="w-full h-full object-cover" /></div>}
            {coverImages[2] && <div className="w-[28%] overflow-hidden"><img src={coverImages[2]} alt="" className="w-full h-full object-cover" /></div>}
          </div>
        )}
      </div>
    );
  }

  const orderedKeys = (props.visibleSections ?? MILO_DEFAULT_ORDER).filter((k) => k !== "footer");

  // Milo uses a centered nav with CTA
  return (
    <div className="min-h-screen bg-background">
      <SharedNav scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site} />
      {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} displayName={displayName} logoUrl={site?.logo_url ?? null} /></div>
    </div>
  );
}

// ─── Main Router ─────────────────────────────────────────────────────────

export default function PublicSiteRenderer(props: Props) {
  const { photographer, site, subPageTitle, subPageData, emptyState } = props;

  const seoUrl = props.seoUrl;
  const displayName = site?.tagline || photographer?.business_name || photographer?.full_name || photographer?.email || "";
  const subheadline = site?.site_subheadline || photographer?.bio || "";
  const seoTitle = subPageTitle
    ? `${subPageTitle} — ${displayName}`
    : site?.seo_title || `${displayName} — Photography`;
  const seoDescription = site?.seo_description || subheadline || undefined;

  const derived = deriveCommon(props);
  const template = props.previewTemplate || site?.site_template || "editorial";

  // Inject photographer's custom favicon into <head>
  useEffect(() => {
    const faviconUrl = site?.favicon_url;
    if (!faviconUrl) return;
    const setLink = (rel: string, type: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.type = type;
      el.href = faviconUrl;
    };
    setLink("icon", "image/png");
    setLink("apple-touch-icon", "image/png");
    return () => {
      const el = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (el) el.href = "/favicon.png";
    };
  }, [site?.favicon_url]);

  // Sub-page rendering (non-home pages from site_pages)
  if (subPageTitle) {
    const accentColor = site?.accent_color || "#000000";
    const { navLinks, handleNavClick } = derived;
    const subSections = (props.subPageSections as PageSection[] | undefined) ?? [];
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          ogImage={site?.og_image_url || undefined}
          ogUrl={seoUrl}
          canonical={seoUrl}
        />
        <div className="min-h-screen bg-background">
          <SharedNav
            scrolled={props.scrolled}
            mobileMenuOpen={props.mobileMenuOpen}
            setMobileMenuOpen={props.setMobileMenuOpen}
            displayName={displayName}
            logoUrl={site?.logo_url ?? null}
            accentColor={accentColor}
            navLinks={navLinks}
            showBooking={false}
            ctaText=""
            onNavClick={handleNavClick}
          />
          <div className="pt-20">
            {subSections.length > 0 ? (
              <SectionRenderer sections={subSections} accentColor={accentColor} />
            ) : subPageData?.content ? (
              <div className="max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.1em] uppercase mb-10">{subPageTitle}</h1>
                <div className="text-sm font-light text-muted-foreground leading-relaxed whitespace-pre-line">
                  {subPageData.content}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.1em] uppercase mb-10">{subPageTitle}</h1>
                <p className="text-sm font-light text-muted-foreground">
                  This page has no content yet. Edit it in the site editor.
                </p>
              </div>
            )}
          </div>
          <SharedFooter site={site} showContact={true} displayName={derived.displayName} logoUrl={site?.logo_url ?? null} />
        </div>
      </>
    );
  }

  if (emptyState) {
    const accentColor = site?.accent_color || "#000000";
    const { navLinks, handleNavClick } = derived;
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          ogImage={site?.og_image_url || undefined}
          ogUrl={seoUrl}
          canonical={seoUrl}
        />
        <div className="min-h-screen bg-background">
          <SharedNav
            scrolled={props.scrolled}
            mobileMenuOpen={props.mobileMenuOpen}
            setMobileMenuOpen={props.setMobileMenuOpen}
            displayName={displayName}
            logoUrl={site?.logo_url ?? null}
            accentColor={accentColor}
            navLinks={navLinks}
            showBooking={false}
            ctaText=""
            onNavClick={handleNavClick}
            site={site}
          />
          <main className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
            <section className="max-w-2xl text-center">
              <div className="mx-auto mb-6 h-px w-12 bg-border" />
              <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.1em] uppercase text-foreground mb-4">
                {emptyState.title}
              </h1>
              <p className="text-sm md:text-base font-light text-muted-foreground leading-relaxed">
                {emptyState.description}
              </p>
            </section>
          </main>
          <SharedFooter site={site} showContact={true} displayName={derived.displayName} logoUrl={site?.logo_url ?? null} />
        </div>
      </>
    );
  }

  // ── Page sections rendering (site_pages system) ──
  if (props.pageSections && props.pageSections.length > 0) {
    const accentColor = site?.accent_color || "#000000";
    const { navLinks, handleNavClick } = derived;
    // If the first section isn't a full-bleed hero/image, the header would sit
    // on a light background and become invisible. Force its opaque state.
    const firstType = (props.pageSections[0] as any)?.type as string | undefined;
    const HERO_TYPES = new Set(["hero", "hero-image", "hero-split", "image", "cover", "banner", "slideshow"]);
    const headerOnDarkHero = !!firstType && HERO_TYPES.has(firstType);
    const forceOpaque = !headerOnDarkHero;
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          ogImage={site?.og_image_url || site?.site_hero_image_url || undefined}
          ogUrl={seoUrl}
          canonical={seoUrl}
        />
        <div className="min-h-screen bg-background">
          <SharedNav
            scrolled={props.scrolled}
            mobileMenuOpen={props.mobileMenuOpen}
            setMobileMenuOpen={props.setMobileMenuOpen}
            displayName={displayName}
            logoUrl={site?.logo_url ?? null}
            accentColor={accentColor}
            navLinks={navLinks}
            showBooking={false}
            ctaText=""
            onNavClick={handleNavClick}
            site={site}
            forceOpaque={forceOpaque}
          />
          <div className={forceOpaque ? "pt-16" : ""}>
            <SectionRenderer sections={props.pageSections} accentColor={accentColor} />
          </div>
          <SharedFooter site={site} showContact={true} displayName={derived.displayName} logoUrl={site?.logo_url ?? null} />
        </div>
      </>
    );
  }

  const templateEl = (() => {
    switch (template) {
      case "grid":     return <GridTemplate props={props} derived={derived} />;
      case "magazine": return <MagazineTemplate props={props} derived={derived} />;
      case "clean":    return <CleanTemplate props={props} derived={derived} />;
      case "sierra":   return <SierraTemplate props={props} derived={derived} />;
      case "canvas":   return <CanvasTemplate props={props} derived={derived} />;
      case "avery":    return <AveryTemplate props={props} derived={derived} />;
      case "seville":  return <SevilleTemplate props={props} derived={derived} />;
      case "milo":     return <MiloTemplate props={props} derived={derived} />;
      default:         return <EditorialTemplate props={props} derived={derived} />;
    }
  })();

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage={site?.og_image_url || site?.site_hero_image_url || undefined}
        ogUrl={seoUrl}
        canonical={seoUrl}
      />
      {templateEl}
    </>
  );
}
