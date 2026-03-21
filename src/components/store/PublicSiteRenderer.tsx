import { useEffect, useRef } from "react";
import { Camera, Clock, MapPin, Image as ImageIcon, Images, Instagram, Facebook, Youtube, Linkedin, Menu, X, Quote, ArrowRight, Phone } from "lucide-react";
import SEOHead from "@/components/SEOHead";

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
  extraNavLinks?: { label: string; href: string }[];
  /** Sub-page title (for non-home pages) */
  subPageTitle?: string;
  /** Sub-page content data */
  subPageData?: Record<string, any>;
  /** Sub-page sections order */
  subPageSections?: any[];
  /** When true (editor mode), text nodes become contentEditable */
  editMode?: boolean;
  /** Callback when an inline text field is edited */
  onFieldChange?: (fieldKey: string, value: string) => void;
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// ─── Shared Nav ─────────────────────────────────────────────────────────────

interface NavProps {
  scrolled: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  displayName: string;
  logoUrl: string | null;
  accentColor: string;
  navLinks: { label: string; href: string }[];
  showBooking: boolean;
  ctaText: string;
  onNavClick: (href: string) => void;
  site?: SiteConfig | null;
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

function SharedNav({ scrolled, mobileMenuOpen, setMobileMenuOpen, displayName, logoUrl, accentColor, navLinks, showBooking, ctaText, onNavClick, site }: NavProps) {
  const hasBg = !!site?.header_bg_color;
  const bgColor = site?.header_bg_color ?? undefined;
  const textColor = site?.header_text_color ?? undefined;
  const visibleSocials = site?.header_visible_socials ?? null;

  // When a custom bg color is set we always show as "scrolled" visually (opaque)
  const isOpaque = hasBg || scrolled;

  const headerStyle: React.CSSProperties = hasBg
    ? { backgroundColor: bgColor, borderBottom: "1px solid rgba(0,0,0,0.08)" }
    : undefined as any;

  const logoFilter = !hasBg && !scrolled ? "brightness-0 invert" : "";
  const textCls = isOpaque
    ? "text-muted-foreground hover:text-foreground"
    : "text-white/70 hover:text-white";

  return (
    <header
      data-block-key="header"
      style={headerStyle}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        !hasBg && scrolled ? "bg-background/95 backdrop-blur-sm border-b border-border shadow-sm" : ""
      } ${!hasBg && !scrolled ? "bg-transparent" : ""}`}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 grid grid-cols-3 items-center gap-4">
        {/* Left: logo / studio name */}
        <div className="flex items-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayName}
              className={`h-8 object-contain transition-all duration-300 ${logoFilter}`}
            />
          ) : (
            <span
              style={textColor ? { color: textColor } : undefined}
              className={`text-[10px] tracking-[0.4em] uppercase font-light transition-colors duration-300 ${isOpaque && !textColor ? "text-foreground" : ""} ${!isOpaque && !textColor ? "text-white/80" : ""}`}
            >
              {displayName}
            </span>
          )}
        </div>

        {/* Center: nav links */}
        {navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-6 justify-center">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => onNavClick(link.href)}
                style={textColor ? { color: textColor } : undefined}
                className={`text-[10px] tracking-[0.3em] uppercase font-light transition-colors duration-300 ${
                  textColor ? "hover:opacity-70" : textCls
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}
        {navLinks.length === 0 && <div />}

        {/* Right: social icons */}
        <div className="hidden md:flex items-center gap-3 justify-end shrink-0">
          <SocialIcons
            site={site}
            scrolled={isOpaque}
            size="xs"
            forceColor={textColor}
            filterKeys={visibleSocials}
          />
          {showBooking && (
            <button
              onClick={() => onNavClick("#sessions")}
              style={{
                borderColor: textColor ?? (isOpaque ? accentColor : "rgba(255,255,255,0.6)"),
                color: textColor ?? undefined,
              }}
              className={`px-4 py-1.5 border text-[9px] tracking-[0.3em] uppercase transition-colors duration-300 ${
                textColor ? "hover:opacity-70" : isOpaque ? "text-foreground hover:bg-foreground hover:text-background" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {ctaText}
            </button>
          )}
        </div>

        {navLinks.length > 0 && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={textColor ? { color: textColor } : undefined}
            className={`md:hidden col-start-3 justify-self-end transition-colors duration-300 ${!textColor ? (isOpaque ? "text-foreground" : "text-white") : ""}`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-background/98 backdrop-blur-sm border-b border-border">
          <nav className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => onNavClick(link.href)}
                className="text-left text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/50 last:border-0"
              >
                {link.label}
              </button>
            ))}
            {showBooking && (
              <button
                onClick={() => onNavClick("#sessions")}
                className="mt-2 text-left text-[11px] tracking-[0.3em] uppercase font-light text-foreground py-2.5"
              >
                {ctaText} →
              </button>
            )}
            {/* Mobile social icons */}
            {site && (
              <div className="pt-3 border-t border-border/50 mt-1">
                <SocialIcons site={site} scrolled={true} size="sm" filterKeys={visibleSocials} />
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// ─── Shared Footer ───────────────────────────────────────────────────────────

function SharedFooter({ site, showContact }: { site: SiteConfig | null; showContact: boolean }) {
  const hasSocials = site?.instagram_url || site?.facebook_url || site?.tiktok_url || site?.youtube_url || site?.linkedin_url || site?.pinterest_url || site?.whatsapp;

  return (
    <footer id="contact" data-block-key="footer" className="border-t border-border py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-6">
        {showContact && hasSocials && (
          <div className="flex items-center justify-center gap-5">
            {site?.instagram_url && (
              <a href={site.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {site?.facebook_url && (
              <a href={site.facebook_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {site?.youtube_url && (
              <a href={site.youtube_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            )}
            {site?.linkedin_url && (
              <a href={site.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {site?.tiktok_url && (
              <a href={site.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <TikTokIcon className="h-4 w-4" />
              </a>
            )}
            {site?.pinterest_url && (
              <a href={site.pinterest_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <PinterestIcon className="h-4 w-4" />
              </a>
            )}
            {site?.whatsapp && (
              <a href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
        {site?.footer_text && (
          <p className="text-[10px] font-light text-muted-foreground text-center">{site.footer_text}</p>
        )}
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40 text-center">Powered by Davions</p>
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
    <section id="about" className="border-t border-border">
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
      <section className="border-t border-border py-16 md:py-24 bg-muted/20">
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
    <section className="border-t border-border py-16 md:py-24">
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
    <section className="py-16 md:py-24 border-t border-border bg-muted/20">
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
    <section className="border-t border-border py-16 md:py-24">
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

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: EDITORIAL (default)
// Hero full-bleed 60vh · Quote · Alternating full-width session blocks · Experience · About · Footer
// ═══════════════════════════════════════════════════════════════════════════

function EditorialTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { photographer, site, sessions, galleries, scrolled, mobileMenuOpen, setMobileMenuOpen, sessionHref, galleryHref } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showStore, showBooking, showContact, navLinks, handleNavClick, editMode, ed, onFieldChange } = derived;

  return (
    <div className="min-h-screen bg-background">
      <SharedNav
        scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site}
      />
      {/* Hero */}
      {(site?.hero_layout ?? "full") === "split" ? (
        <div data-block-key="hero" className="relative w-full min-h-[65vh] flex flex-col md:flex-row overflow-hidden">
          {/* Image half */}
          <div className="w-full md:w-1/2 h-[40vh] md:h-auto relative bg-foreground">
            {site?.site_hero_image_url
              ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
              : <div className="absolute inset-0 bg-foreground" />
            }
          </div>
          {/* Text half */}
          <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-14 py-14 gap-5 bg-background">
            {!site?.logo_url && <p className="text-[9px] tracking-[0.5em] uppercase text-muted-foreground">Photography by</p>}
            <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.1em] uppercase leading-tight">{ed("site_headline", headline)}</h1>
            {(subheadline || editMode) && <p className="text-sm font-light text-muted-foreground leading-relaxed max-w-sm">{ed("site_subheadline", subheadline)}</p>}
            {showBooking && (site?.cta_link
              ? <a href={editMode ? undefined : site.cta_link} style={{ borderColor: accentColor, color: accentColor }} className="self-start mt-2 px-8 py-3 border text-[10px] tracking-[0.3em] uppercase hover:opacity-70 transition-opacity">{ed("cta_text", ctaText)}</a>
              : <button data-scroll-to="#sessions" onClick={() => handleNavClick("#sessions")} style={{ borderColor: accentColor, color: accentColor }} className="self-start mt-2 px-8 py-3 border text-[10px] tracking-[0.3em] uppercase hover:opacity-70 transition-opacity">{ed("cta_text", ctaText)}</button>
            )}
          </div>
        </div>
      ) : (
        <div data-block-key="hero" className="relative w-full h-[65vh] min-h-[420px] overflow-hidden">
          {site?.site_hero_image_url
            ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-foreground" />
          }
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/75" />
          <div className="relative z-10 h-full flex flex-col items-center justify-end pb-16 px-6 text-center">
            {!site?.logo_url && <p className="text-[9px] tracking-[0.5em] uppercase text-white/50 mb-3">Photography by</p>}
            <h1 className="text-4xl md:text-6xl font-extralight tracking-[0.12em] uppercase text-white mb-4" style={{ lineHeight: 1.1 }}>{ed("site_headline", headline)}</h1>
            {(subheadline || editMode) && <p className="text-sm font-light text-white/65 max-w-md leading-relaxed mb-7">{ed("site_subheadline", subheadline)}</p>}
            {showBooking && (site?.cta_link
              ? <a href={editMode ? undefined : site.cta_link} style={{ borderColor: accentColor }} className="mt-2 px-8 py-3 border text-[10px] tracking-[0.3em] uppercase bg-white/10 hover:bg-white/20 transition-colors text-white">{ed("cta_text", ctaText)}</a>
              : <button data-scroll-to="#sessions" onClick={() => handleNavClick("#sessions")} className="mt-2 px-8 py-3 border border-white/40 text-[10px] tracking-[0.3em] uppercase bg-white/10 hover:bg-white/20 transition-colors text-white">{ed("cta_text", ctaText)}</button>
            )}
          </div>
        </div>
      )}

      {/* Quote */}
      <div data-block-key="quote"><QuoteSection site={site} editMode={editMode} onFieldChange={onFieldChange} /></div>

      {/* Sessions — alternating full-width blocks */}
      {showStore && (
        <main data-block-key="sessions" id="sessions">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Camera className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-light text-muted-foreground">No sessions available yet.</p>
            </div>
          ) : (
            <>
              <div className="max-w-6xl mx-auto px-6 pt-16 pb-4">
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">Available Sessions</p>
              </div>
              {sessions.map((session, i) => {
                const isEven = i % 2 === 0;
                return (
                  <button
                    key={session.id}
                    onClick={() => window.location.assign(sessionHref(session))}
                    className="group w-full text-left border-t border-border hover:bg-muted/20 transition-colors duration-300"
                  >
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
                        {session.tagline && (
                          <p className="text-base font-light text-muted-foreground italic">{session.tagline}</p>
                        )}
                        {session.description && (
                          <p className="text-sm font-light text-muted-foreground leading-relaxed line-clamp-3">{session.description}</p>
                        )}
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
              })}
            </>
          )}
        </main>
      )}

      {/* Experience */}
      <div data-block-key="experience"><ExperienceSection site={site} accentColor={accentColor} editMode={editMode} onFieldChange={onFieldChange} /></div>

      {/* Portfolio */}
      {galleries.length > 0 && (
        <section data-block-key="portfolio" className="border-t border-border">
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
      )}

      <div data-block-key="about"><SharedAbout site={site} photographer={photographer} displayName={displayName} /></div>
      <div data-block-key="testimonials"><SharedTestimonials site={site} accentColor={accentColor} /></div>
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: GRID
// Compact hero 40vh · Dense image-dominant grid with overlay info on hover
// ═══════════════════════════════════════════════════════════════════════════

function GridTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { photographer, site, sessions, galleries, scrolled, mobileMenuOpen, setMobileMenuOpen, sessionHref, galleryHref } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showStore, showBooking, showContact, navLinks, handleNavClick, editMode, ed, onFieldChange } = derived;

  return (
    <div className="min-h-screen bg-background">
      <SharedNav
        scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site}
      />

      {/* Compact hero */}
      <div data-block-key="hero" className="relative w-full h-[40vh] min-h-[260px] overflow-hidden">
        {site?.site_hero_image_url
          ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-foreground" />
        }
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
        <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-light tracking-[0.1em] uppercase text-white mb-3 leading-tight">{ed("site_headline", headline)}</h1>
          {(subheadline || editMode) && <p className="text-sm font-light text-white/65 max-w-sm leading-relaxed mb-5">{ed("site_subheadline", subheadline)}</p>}
          {showBooking && (
            site?.cta_link
              ? <a href={editMode ? undefined : site.cta_link} style={{ backgroundColor: accentColor }} className="self-start px-6 py-2 text-[9px] tracking-[0.3em] uppercase text-white hover:opacity-90 transition-opacity">{ed("cta_text", ctaText)}</a>
              : <button data-scroll-to="#sessions" onClick={() => handleNavClick("#sessions")} style={{ backgroundColor: accentColor }} className="self-start px-6 py-2 text-[9px] tracking-[0.3em] uppercase text-white hover:opacity-90 transition-opacity">{ed("cta_text", ctaText)}</button>
          )}
        </div>
      </div>

      {/* Quote */}
      <div data-block-key="quote"><QuoteSection site={site} editMode={editMode} onFieldChange={onFieldChange} /></div>
      {/* Sessions dense grid */}
      {showStore && (
        <main data-block-key="sessions" id="sessions" className="max-w-7xl mx-auto px-4 py-12">
          {sessions.length > 0 && (
            <>
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-8 pl-2">Sessions</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sessions.map((session) => (
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
                ))}
              </div>
            </>
          )}

          {/* Galleries */}
          {galleries.length > 0 && (
            <div data-block-key="portfolio" className="mt-12">
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
          )}
        </main>
      )}

      <div data-block-key="experience"><ExperienceSection site={site} accentColor={accentColor} editMode={editMode} onFieldChange={onFieldChange} /></div>
      <div data-block-key="about"><SharedAbout site={site} photographer={photographer} displayName={displayName} /></div>
      <div data-block-key="testimonials"><SharedTestimonials site={site} accentColor={accentColor} /></div>
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: MAGAZINE
// Hero 50vh with headline left-aligned · Asymmetric sessions (1 featured + rest)
// ═══════════════════════════════════════════════════════════════════════════

function MagazineTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { photographer, site, sessions, galleries, scrolled, mobileMenuOpen, setMobileMenuOpen, sessionHref, galleryHref } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showStore, showBooking, showContact, navLinks, handleNavClick, editMode, ed, onFieldChange } = derived;

  const [featured, ...rest] = sessions;

  return (
    <div className="min-h-screen bg-background">
      <SharedNav
        scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site}
      />

      {/* Hero — left-aligned headline over image */}
      <div data-block-key="hero" className="relative w-full h-[55vh] min-h-[340px] overflow-hidden">
        {site?.site_hero_image_url
          ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-foreground" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-12 px-8 md:px-16">
          <div className="flex items-start gap-5 max-w-2xl">
            <div className="w-0.5 h-16 mt-1 shrink-0" style={{ backgroundColor: accentColor }} />
            <div>
              <p className="text-[9px] tracking-[0.5em] uppercase text-white/50 mb-2">Photography</p>
              <h1 className="text-3xl md:text-5xl font-light text-white leading-tight mb-3" style={{ letterSpacing: "0.05em" }}>{ed("site_headline", headline)}</h1>
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

      {/* Quote */}
      <div data-block-key="quote"><QuoteSection site={site} editMode={editMode} onFieldChange={onFieldChange} /></div>
      {showStore && sessions.length > 0 && (
        <main data-block-key="sessions" id="sessions" className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-6 h-px" style={{ backgroundColor: accentColor }} />
            <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">Sessions</p>
          </div>
          {featured && (
            <button
              onClick={() => window.location.assign(sessionHref(featured))}
              className="group w-full mb-6 grid grid-cols-1 md:grid-cols-2 border border-border hover:border-foreground/30 transition-all duration-300 overflow-hidden bg-card text-left"
            >
              <div className="aspect-[4/3] md:aspect-auto md:min-h-[320px] bg-muted relative overflow-hidden">
                {featured.cover_image_url
                  ? <img src={featured.cover_image_url} alt={featured.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-foreground/20" /></div>
                }
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground mb-3">Featured</p>
                  <h2 className="text-2xl font-light tracking-wide mb-2">{featured.title}</h2>
                  {(featured as any).tagline && <p className="text-sm font-light text-muted-foreground italic mb-3">{(featured as any).tagline}</p>}
                  {featured.description && <p className="text-sm text-muted-foreground leading-relaxed mb-6">{featured.description}</p>}
                </div>
                <div>
                  <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground mb-6">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{featured.duration_minutes}min</span>
                    <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{featured.num_photos} photos</span>
                    {featured.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{featured.location}</span>}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-2xl font-light">{formatPrice(featured.price)}</span>
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
                    {(session as any).tagline && <p className="text-[11px] text-muted-foreground italic">{(session as any).tagline}</p>}
                    <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                      <span className="text-base font-light">{formatPrice(session.price)}</span>
                      <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">View →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Galleries */}
      {galleries.length > 0 && (
        <section data-block-key="portfolio" className="border-t border-border">
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
      )}

      <div data-block-key="experience"><ExperienceSection site={site} accentColor={accentColor} editMode={editMode} onFieldChange={onFieldChange} /></div>
      <div data-block-key="about"><SharedAbout site={site} photographer={photographer} displayName={displayName} /></div>
      <div data-block-key="testimonials"><SharedTestimonials site={site} accentColor={accentColor} /></div>
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE: CLEAN
// Centered single-column · generous whitespace · large typography
// ═══════════════════════════════════════════════════════════════════════════

function CleanTemplate({ props, derived }: { props: Props; derived: ReturnType<typeof deriveCommon> }) {
  const { photographer, site, sessions, galleries, scrolled, mobileMenuOpen, setMobileMenuOpen, sessionHref, galleryHref } = props;
  const { displayName, headline, subheadline, ctaText, accentColor, showStore, showBooking, showContact, navLinks, handleNavClick, editMode, ed, onFieldChange } = derived;

  return (
    <div className="min-h-screen bg-background">
      <SharedNav
        scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
        displayName={displayName} logoUrl={site?.logo_url ?? null} accentColor={accentColor}
        navLinks={navLinks} showBooking={showBooking} ctaText={ctaText} onNavClick={handleNavClick} site={site}
      />

      {/* Hero — centered, image behind, big type */}
      <div data-block-key="hero" className="relative w-full h-[55vh] min-h-[360px] overflow-hidden">
        {site?.site_hero_image_url
          ? <img src={site.site_hero_image_url} alt={headline} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-foreground" />
        }
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-10 h-px bg-white/40 mb-2" />
          <h1 className="text-5xl md:text-7xl font-extralight text-white leading-none tracking-wide">{ed("site_headline", headline)}</h1>
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

      {/* Quote */}
      <div data-block-key="quote"><QuoteSection site={site} editMode={editMode} onFieldChange={onFieldChange} /></div>
      {showStore && sessions.length > 0 && (
        <main data-block-key="sessions" id="sessions" className="max-w-2xl mx-auto px-6 py-20">
          <p className="text-[9px] tracking-[0.6em] uppercase text-muted-foreground/70 text-center mb-16">Available Sessions</p>
          <div className="flex flex-col gap-0">
            {sessions.map((session, i) => (
              <button key={session.id} onClick={() => window.location.assign(sessionHref(session))}
                className={`group text-left py-8 flex flex-col gap-3 ${i > 0 ? "border-t border-border" : ""} hover:pl-2 transition-all duration-300`}>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-light tracking-wide">{session.title}</h2>
                  <span className="text-xl font-light shrink-0">{formatPrice(session.price)}</span>
                </div>
                {(session as any).tagline && (
                  <p className="text-sm font-light text-muted-foreground italic">{(session as any).tagline}</p>
                )}
                {session.description && <p className="text-sm text-muted-foreground leading-relaxed">{session.description}</p>}
                <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground/70">
                  <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{session.duration_minutes} minutes</span>
                  <span className="flex items-center gap-1.5"><Camera className="h-3 w-3" />{session.num_photos} photos</span>
                  {session.location && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{session.location}</span>}
                </div>
                <span className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground group-hover:text-foreground transition-colors mt-1">View details →</span>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* Portfolio */}
      {galleries.length > 0 && (
        <section data-block-key="portfolio" className="border-t border-border bg-muted/20">
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
      )}

      {/* About */}
      {(site?.show_about !== false) && (photographer?.bio || site?.about_image_url) && (
        <section data-block-key="about" id="about" className="border-t border-border">
          <div className="max-w-2xl mx-auto px-6 py-20 text-center">
            {site?.about_image_url && (
              <img src={site.about_image_url} alt={displayName} className="w-32 h-32 object-cover rounded-full mx-auto mb-8 grayscale" />
            )}
            <p className="text-[9px] tracking-[0.6em] uppercase text-muted-foreground/70 mb-6">{site?.about_title || "About"}</p>
            <h2 className="text-2xl font-light tracking-wide mb-6">{photographer?.full_name || photographer?.business_name || displayName}</h2>
            {photographer?.bio && <p className="text-sm font-light text-muted-foreground leading-relaxed">{photographer.bio}</p>}
          </div>
        </section>
      )}

      <div data-block-key="experience"><ExperienceSection site={site} accentColor={accentColor} editMode={editMode} onFieldChange={onFieldChange} /></div>
      <div data-block-key="testimonials"><SharedTestimonials site={site} accentColor={accentColor} /></div>
      <div data-block-key="footer"><SharedFooter site={site} showContact={showContact} /></div>
    </div>
  );
}

// ─── Common derived values ────────────────────────────────────────────────

function deriveCommon(props: Props) {
  const { photographer, site, scrolled: _scrolled, mobileMenuOpen: _m, setMobileMenuOpen, blogHref, extraNavLinks, editMode = false, onFieldChange } = props;

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

  const navLinks: { label: string; href: string }[] = extraNavLinks && extraNavLinks.length > 0
    ? extraNavLinks
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

  return { displayName, headline, subheadline, ctaText, accentColor, showStore, showAbout, showBooking, showBlog, showContact, hasSocials, navLinks, handleNavClick, editMode, onFieldChange: onFieldChange ?? (() => {}), ed };
}

// ─── Main Router ─────────────────────────────────────────────────────────

export default function PublicSiteRenderer(props: Props) {
  const { photographer, site, subPageTitle, subPageData } = props;

  const seoUrl = props.seoUrl;
  const displayName = site?.tagline || photographer?.business_name || photographer?.full_name || photographer?.email || "";
  const subheadline = site?.site_subheadline || photographer?.bio || "";
  const seoTitle = subPageTitle
    ? `${subPageTitle} — ${displayName}`
    : site?.seo_title || `${displayName} — Photography`;
  const seoDescription = site?.seo_description || subheadline || undefined;

  const derived = deriveCommon(props);
  const template = site?.site_template || "editorial";

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
          <div className="pt-24 max-w-4xl mx-auto px-6 pb-20">
            <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.1em] uppercase mb-10">{subPageTitle}</h1>
            {subPageData?.content ? (
              <div className="text-sm font-light text-muted-foreground leading-relaxed whitespace-pre-line">
                {subPageData.content}
              </div>
            ) : (
              <p className="text-sm font-light text-muted-foreground">
                This page has no content yet. Edit it in the site editor.
              </p>
            )}
          </div>
          <SharedFooter site={site} showContact={true} />
        </div>
      </>
    );
  }

  const templateEl = (() => {
    switch (template) {
      case "grid":     return <GridTemplate props={props} derived={derived} />;
      case "magazine": return <MagazineTemplate props={props} derived={derived} />;
      case "clean":    return <CleanTemplate props={props} derived={derived} />;
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


