import { Camera, Images, Mail, MapPin, Clock, ArrowRight, ChevronDown } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import EditableText from "@/components/website-editor/inline/EditableText";
import EditableRichText from "@/components/website-editor/inline/EditableRichText";
import EditableImage from "@/components/website-editor/inline/EditableImage";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PageSection {
  id: string;
  type: string;
  label: string;
  props: Record<string, any>;
}

export interface EditContext {
  /** Update a single prop path on the section (path = "headline" or "items.0.question") */
  onPropChange: (sectionId: string, path: string, value: any) => void;
  photographerId?: string | null;
}

interface SectionRendererProps {
  sections: PageSection[];
  accentColor?: string;
  /** When true, blocks render with inline editable handles. */
  editMode?: boolean;
  edit?: EditContext;
  /** Photographer id used by public-site blocks (e.g. contact form submissions). */
  photographerId?: string | null;
}

// ─── Site button variant helper ────────────────────────────────────────────
// Reads CSS vars set by WebsiteEditor (Style → Buttons → Variants) so blocks
// render buttons consistently across the site. Style mode (solid/outline/
// underline) is driven 100% by CSS vars + html[data-site-btn-*-style] rules
// in index.css — no per-element data-style is needed, so changes reflect
// instantly without React re-rendering each block.

export function siteButtonProps(variant: "primary" | "secondary" = "primary"): {
  style: React.CSSProperties;
  className: string;
} {
  const v = variant;
  const bgVar = `var(--site-btn-${v}-bg, ${v === "primary" ? "#000000" : "#ffffff"})`;
  const fgVar = `var(--site-btn-${v}-fg, ${v === "primary" ? "#ffffff" : "#000000"})`;
  const borderColorVar = `var(--site-btn-${v}-border-color, ${v === "primary" ? "#000000" : "#ffffff"})`;
  const borderWidthVar = `var(--site-btn-${v}-border-width, 1px)`;
  return {
    style: {
      backgroundColor: bgVar,
      color: fgVar,
      // Always render a border in the configured color so Outline mode is
      // visible (CSS rules override background to transparent for outline).
      borderStyle: "solid",
      borderWidth: borderWidthVar,
      borderColor: borderColorVar,
      // Per-variant shape wins; falls back to global default shape token.
      borderRadius: `var(--site-btn-${v}-radius, var(--site-btn-radius, 2px))`,
      // Global size tokens — sync from Style → Buttons → Size.
      height: "var(--site-btn-height, auto)",
      paddingLeft: "var(--site-btn-pad-x, 1.5rem)",
      paddingRight: "var(--site-btn-pad-x, 1.5rem)",
    },
    className: `site-btn site-btn-${v}`,
  };
}

// ─── Reusable site CTA link ────────────────────────────────────────────────
// Renders an <a> styled with the global Style → Buttons tokens (variant,
// shape, size, colors, border, hover). Use everywhere a CTA links out so
// hard-coded Tailwind buttons never diverge from the design system.
export function SiteCtaLink({
  href,
  variant = "primary",
  newTab,
  className,
  children,
  onClick,
}: {
  href?: string;
  variant?: "primary" | "secondary";
  newTab?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const btn = siteButtonProps(variant);
  return (
    <a
      href={href || "#"}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      onClick={onClick}
      style={btn.style}
      className={className ? `${btn.className} ${className}` : btn.className}
    >
      {children}
    </a>
  );
}

// ─── Block Button schema ────────────────────────────────────────────────────
// Multi-button per item with backwards-compatible fallback to legacy fields
// (ctaText/ctaLink for Hero/Image+Text/Text+Image; buttonText/buttonLink for CTA).
export type BlockButton = {
  id?: string;
  text: string;
  link?: string;
  variant?: "primary" | "secondary";
  newTab?: boolean;
};

/** Normalize legacy single-button fields into a `buttons[]` array.
 *  Order of precedence: explicit `buttons[]` > `ctaText`/`ctaLink` > `buttonText`/`buttonLink`.
 *  Returns [] when nothing is configured (caller decides placeholder behavior). */
export function resolveBlockButtons(props: any): BlockButton[] {
  if (Array.isArray(props?.buttons) && props.buttons.length > 0) {
    return props.buttons
      .filter((b: any) => b && (b.text || b.link))
      .map((b: any) => ({
        id: b.id,
        text: b.text || "",
        link: b.link || "",
        variant: b.variant === "secondary" ? "secondary" : "primary",
        newTab: !!b.newTab,
      }));
  }
  // Legacy single-button fallback.
  const legacyText = props?.ctaText || props?.buttonText;
  const legacyLink = props?.ctaLink || props?.buttonLink;
  if (legacyText || legacyLink) {
    return [{
      text: legacyText || "",
      link: legacyLink || "",
      variant: props?.buttonVariant === "secondary" ? "secondary" : "primary",
      newTab: false,
    }];
  }
  return [];
}

/** Renders the configured button list. In edit mode, always shows at least one
 *  placeholder so the editor can interact with it. */
function BlockButtons({
  buttons,
  editMode,
  onChange,
  marginTop = "1.5rem",
  align = "start",
}: {
  buttons: BlockButton[];
  editMode: boolean;
  onChange: (next: BlockButton[]) => void;
  marginTop?: string | number;
  align?: "start" | "center" | "end";
}) {
  const list = buttons.length > 0 ? buttons : (editMode ? [{ text: "", link: "", variant: "primary" as const }] : []);
  if (list.length === 0) return null;
  const justify = align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start";
  return (
    <div
      className="flex flex-wrap gap-3"
      style={{ marginTop, justifyContent: justify }}
    >
      {list.map((b, i) => {
        const variant: "primary" | "secondary" = b.variant === "secondary" ? "secondary" : "primary";
        const btn = siteButtonProps(variant);
        return (
          <a
            key={b.id || i}
            href={editMode ? undefined : (b.link || "#")}
            target={!editMode && b.newTab ? "_blank" : undefined}
            rel={!editMode && b.newTab ? "noopener noreferrer" : undefined}
            onClick={(e) => editMode && e.preventDefault()}
            {...btn}
          >
            <EditableText
              as="span"
              editMode={editMode}
              value={b.text || ""}
              placeholder="Button text"
              onChange={(v) => {
                const next = [...list];
                next[i] = { ...next[i], text: v };
                onChange(next);
              }}
            />
          </a>
        );
      })}
    </div>
  );
}


export default function SectionRenderer({
  sections,
  accentColor = "#000000",
  editMode = false,
  edit,
  photographerId,
}: SectionRendererProps) {
  return (
    <>
      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          accentColor={accentColor}
          editMode={editMode}
          edit={edit}
          photographerId={photographerId ?? edit?.photographerId ?? null}
        />
      ))}
    </>
  );
}

function SectionBlock({
  section,
  accentColor,
  editMode,
  edit,
}: {
  section: PageSection;
  accentColor: string;
  editMode: boolean;
  edit?: EditContext;
}) {
  const p = section.props || {};
  // bound setter for this section
  const set = (path: string, value: any) => edit?.onPropChange(section.id, path, value);
  const ctx = { editMode, set, photographerId: edit?.photographerId };

  const inner = (() => {
    switch (section.type) {
      case "hero":
        return <HeroBlock {...p} accentColor={accentColor} ctx={ctx} />;
      case "text":
        return <TextBlock {...p} ctx={ctx} />;
      case "image-text":
        return <ImageTextBlock {...p} ctx={ctx} />;
      case "text-image":
        return <TextImageBlock {...p} ctx={ctx} />;
      case "gallery-grid":
        return <GalleryGridBlock {...p} label={section.label} />;
      case "gallery-masonry":
        return <GalleryMasonryBlock {...p} label={section.label} />;
      case "contact-form":
        return <ContactFormBlock {...p} accentColor={accentColor} ctx={ctx} />;
      case "cta":
        return <CtaBlock {...p} accentColor={accentColor} ctx={ctx} />;
      case "faq-accordion":
        return <FaqBlock {...p} ctx={ctx} />;
      case "pricing-table":
        return <PricingBlock {...p} accentColor={accentColor} ctx={ctx} />;
      case "timeline":
        return <TimelineBlock {...p} accentColor={accentColor} ctx={ctx} />;
      case "testimonials":
        return <TestimonialsBlock {...p} ctx={ctx} />;
      case "stats":
        return <StatsBlock {...p} accentColor={accentColor} ctx={ctx} />;
      case "team":
        return <TeamBlock {...p} ctx={ctx} />;
      case "video":
        return <VideoBlock {...p} />;
      case "spacer":
        return <SpacerBlock height={p.height} />;
      case "divider":
        return <DividerBlock />;
      case "columns-2":
        return <Columns2Block {...p} ctx={ctx} />;
      case "columns-3":
        return <Columns3Block {...p} ctx={ctx} />;
      case "slideshow":
        return <SlideshowBlock {...p} />;
      case "carousel":
        return <CarouselBlock {...p} />;
      case "instagram-feed":
        return <InstagramFeedBlock {...p} />;
      case "social-links":
        return <SocialLinksBlock {...p} />;
      case "embed":
        return <EmbedBlock {...p} />;
      case "logo-strip":
        return <LogoStripBlock {...p} />;
      case "map":
        return <MapBlock {...p} />;
      default:
        return (
          <section className="py-12 px-6">
            <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
              Unknown block: <strong>{section.type}</strong>
            </div>
          </section>
        );
    }
  })();

  // ─── Apply BlockSettings (background, padding, animation, color scheme) ───
  const bs = (p.blockSettings ?? {}) as {
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundOpacity?: number;
    paddingTop?: number;
    paddingBottom?: number;
    colorScheme?: "light" | "dark" | "auto";
    animation?: "none" | "fade-up" | "fade-in" | "slide-left";
  };

  const hasAny =
    bs.backgroundColor ||
    bs.backgroundImage ||
    bs.paddingTop !== undefined ||
    bs.paddingBottom !== undefined ||
    (bs.colorScheme && bs.colorScheme !== "auto") ||
    (bs.animation && bs.animation !== "none");

  if (!hasAny) return inner;

  const wrapperStyle: React.CSSProperties = {
    backgroundColor: bs.backgroundColor || undefined,
    paddingTop: bs.paddingTop !== undefined ? `${bs.paddingTop}px` : undefined,
    paddingBottom: bs.paddingBottom !== undefined ? `${bs.paddingBottom}px` : undefined,
    position: "relative",
  };

  const schemeClass =
    bs.colorScheme === "dark"
      ? "text-white [&_*]:!text-inherit"
      : bs.colorScheme === "light"
        ? "text-foreground"
        : "";

  const animClass =
    bs.animation === "fade-up" ? "block-anim-fade-up"
    : bs.animation === "fade-in" ? "block-anim-fade-in"
    : bs.animation === "slide-left" ? "block-anim-slide-left"
    : "";

  return (
    <div style={wrapperStyle} className={[schemeClass, animClass].filter(Boolean).join(" ")}>
      {bs.backgroundImage && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${bs.backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: (bs.backgroundOpacity ?? 100) / 100,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{inner}</div>
    </div>
  );
}


type Ctx = { editMode: boolean; set: (path: string, value: any) => void; photographerId?: string | null };

// ─── Hero ───────────────────────────────────────────────────────────────────

function HeroBlock(props: any) {
  const { headline, subtitle, backgroundImage, accentColor, ctx } = props;
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const hasImage = !!backgroundImage;
  const buttons = resolveBlockButtons(props);
  const heroInner = (
    <>
      {hasImage && <div className="absolute inset-0 bg-black/40" />}
      {!hasImage && <div className="absolute inset-0 bg-foreground/5" />}
      <div className="relative z-10 text-center px-5 sm:px-6 py-14 sm:py-20 max-w-3xl mx-auto">
        <EditableText
          as="h1"
          editMode={c.editMode}
          value={headline || ""}
          placeholder="Headline"
          onChange={(v) => c.set("headline", v)}
          className={`text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.08em] md:tracking-[0.1em] uppercase leading-tight ${hasImage ? "text-white" : "text-foreground"}`}
        />
        {(c.editMode || subtitle) && (
          <EditableText
            as="p"
            editMode={c.editMode}
            value={subtitle || ""}
            placeholder="Add a subtitle"
            multiline
            onChange={(v) => c.set("subtitle", v)}
            className={`mt-4 text-sm md:text-base font-light leading-relaxed max-w-xl mx-auto block ${hasImage ? "text-white/80" : "text-muted-foreground"}`}
          />
        )}
        <div className="flex justify-center">
          <BlockButtons
            buttons={buttons}
            editMode={c.editMode}
            onChange={(next) => c.set("buttons", next)}
            marginTop="2rem"
            align="center"
          />
        </div>
      </div>
    </>
  );

  // Only enforce a tall min-height when there's a background image to showcase.
  // Without an image, let the inner padding define a natural, compact height
  // so the hero doesn't create a large empty gap below a slider header.
  const sectionClass = hasImage
    ? "relative w-full min-h-[70vh] flex items-center justify-center overflow-hidden"
    : "relative w-full flex items-center justify-center overflow-hidden";

  if (c.editMode) {
    return (
      <EditableImage
        value={backgroundImage}
        onChange={(url) => c.set("backgroundImage", url)}
        photographerId={c.photographerId}
        folder="hero"
      >
        <section
          className={sectionClass}
          style={hasImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {heroInner}
        </section>
      </EditableImage>
    );
  }

  return (
    <section
      className={sectionClass}
      style={hasImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {heroInner}
    </section>
  );
}

// ─── Text ───────────────────────────────────────────────────────────────────

function TextBlock({ title, subtitle, body, align = "center", ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  // Detect plain text (legacy) vs HTML — if it has no tags, wrap line breaks
  const html = /<[a-z][\s\S]*>/i.test(body || "")
    ? body || ""
    : (body || "").replace(/\n/g, "<br />");
  const alignClass =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  const showTitle = c.editMode || !!title;
  const showSubtitle = c.editMode || !!subtitle;
  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className={`max-w-3xl mx-auto ${alignClass}`}>
        {showTitle && (
          <EditableText
            editMode={c.editMode}
            value={title || ""}
            placeholder="Title (optional)"
            onChange={(v) => c.set("title", v)}
            as="h2"
            className="font-serif italic text-2xl sm:text-3xl md:text-4xl text-foreground mb-4 leading-tight"
          />
        )}
        {showSubtitle && (
          <EditableText
            editMode={c.editMode}
            value={subtitle || ""}
            placeholder="Subtitle (optional)"
            onChange={(v) => c.set("subtitle", v)}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6"
          />
        )}
        <EditableRichText
          editMode={c.editMode}
          value={html}
          placeholder="Start writing here…"
          onChange={(v) => c.set("body", v)}
          className="text-sm md:text-base font-light text-muted-foreground leading-relaxed"
        />
      </div>
    </section>
  );
}

// ─── Image + Text ───────────────────────────────────────────────────────────

function ImageTextBlock(props: any) {
  const { image, title, body, ctx } = props;
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const buttons = resolveBlockButtons(props);
  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10 items-center">
        <div className="w-full md:w-1/2">
          <EditableImage
            value={image}
            onChange={(url) => c.set("image", url)}
            photographerId={c.photographerId}
            folder="image-text"
            editMode={c.editMode}
          >
            <div className="aspect-[4/3] bg-muted/30 overflow-hidden rounded">
              {image ? (
                <img src={image} alt={title || ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </EditableImage>
        </div>
        <div className="w-full md:w-1/2">
          {(c.editMode || title) && (
            <EditableText
              as="h2"
              editMode={c.editMode}
              value={title || ""}
              placeholder="Add a title"
              onChange={(v) => c.set("title", v)}
              className="text-2xl md:text-3xl font-extralight tracking-wide mb-4 text-foreground block"
            />
          )}
          <EditableText
            as="p"
            editMode={c.editMode}
            value={body || ""}
            placeholder="Add body text"
            multiline
            onChange={(v) => c.set("body", v)}
            className="text-sm font-light text-muted-foreground leading-relaxed whitespace-pre-line block"
          />
          <BlockButtons
            buttons={buttons}
            editMode={c.editMode}
            onChange={(next) => c.set("buttons", next)}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Text + Image ───────────────────────────────────────────────────────────

function TextImageBlock(props: any) {
  const { image, title, body, ctx } = props;
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const buttons = resolveBlockButtons(props);
  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row-reverse gap-10 items-center">
        <div className="w-full md:w-1/2">
          <EditableImage
            value={image}
            onChange={(url) => c.set("image", url)}
            photographerId={c.photographerId}
            folder="text-image"
            editMode={c.editMode}
          >
            <div className="aspect-[4/3] bg-muted/30 overflow-hidden rounded">
              {image ? (
                <img src={image} alt={title || ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </EditableImage>
        </div>
        <div className="w-full md:w-1/2">
          {(c.editMode || title) && (
            <EditableText
              as="h2"
              editMode={c.editMode}
              value={title || ""}
              placeholder="Add a title"
              onChange={(v) => c.set("title", v)}
              className="text-2xl md:text-3xl font-extralight tracking-wide mb-4 text-foreground block"
            />
          )}
          <EditableText
            as="p"
            editMode={c.editMode}
            value={body || ""}
            placeholder="Add body text"
            multiline
            onChange={(v) => c.set("body", v)}
            className="text-sm font-light text-muted-foreground leading-relaxed whitespace-pre-line block"
          />
          <BlockButtons
            buttons={buttons}
            editMode={c.editMode}
            onChange={(next) => c.set("buttons", next)}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Gallery Grid ───────────────────────────────────────────────────────────

type GalleryItem = { image: string; title?: string; caption?: string; link?: string };

function normalizeGalleryItems(raw: any[]): GalleryItem[] {
  return (raw || []).map((s) =>
    typeof s === "string" ? { image: s } : { image: s?.image ?? "", title: s?.title, caption: s?.caption, link: s?.link }
  );
}

function GalleryItemFigure({ item, aspect }: { item: GalleryItem; aspect?: string }) {
  const hasOverlay = !!(item.title || item.caption);
  const inner = (
    <>
      <img src={item.image} alt={item.title || ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
      {hasOverlay && (
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-white pointer-events-none">
          {item.title && <div className="text-sm font-medium leading-tight">{item.title}</div>}
          {item.caption && <div className="text-xs opacity-90 mt-0.5 leading-snug">{item.caption}</div>}
        </div>
      )}
    </>
  );
  const cls = `relative ${aspect || ""} overflow-hidden rounded group`;
  if (item.link) {
    return (
      <a href={item.link} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return <div className={cls}>{inner}</div>;
}

function GalleryGridBlock({ columns = 3, images = [], label }: any) {
  const cols = Number(columns) || 3;
  const items = normalizeGalleryItems(images);
  const gridCls = cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3";

  if (!items || items.length === 0) {
    return (
      <section className="py-12 sm:py-16 px-5 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {label && <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">{label}</h2>}
          <div className={`grid ${gridCls} gap-3`}>
            {Array.from({ length: cols * 2 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted/20 rounded flex items-center justify-center">
                <Images className="h-6 w-6 text-muted-foreground/20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {label && <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">{label}</h2>}
        <div className={`grid ${gridCls} gap-3`}>
          {items.map((it, i) => (
            <GalleryItemFigure key={i} item={it} aspect="aspect-square" />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Gallery Masonry ────────────────────────────────────────────────────────

function GalleryMasonryBlock({ columns = 3, images = [], label }: any) {
  const cols = Number(columns) || 3;
  const items = normalizeGalleryItems(images);

  if (!items || items.length === 0) {
    return (
      <section className="py-12 sm:py-16 px-5 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {label && <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">{label}</h2>}
          <div className="columns-2 md:columns-3 gap-3 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted/20 rounded flex items-center justify-center break-inside-avoid" style={{ height: `${150 + (i % 3) * 60}px` }}>
                <Images className="h-6 w-6 text-muted-foreground/20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const colsCls = cols === 2 ? "columns-1 sm:columns-2" : cols === 4 ? "columns-2 md:columns-4" : "columns-2 md:columns-3";

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {label && <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">{label}</h2>}
        <div className={`${colsCls} gap-3 space-y-3`}>
          {items.map((it, i) => (
            <div key={i} className="break-inside-avoid mb-3">
              <GalleryItemFigure item={it} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact Form ───────────────────────────────────────────────────────────

function ContactFormBlock({ submitLabel = "Send", accentColor, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const photographerId = c.photographerId;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (c.editMode) return;
    if (!photographerId) {
      setStatus("error");
      setErrorMsg("Form not configured");
      return;
    }
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("error");
      setErrorMsg("Please fill in all fields");
      return;
    }
    setStatus("sending");
    setErrorMsg(null);
    try {
      const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/submit-contact-form`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photographerId,
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          sourceUrl: typeof window !== "undefined" ? window.location.href : null,
          formLabel: "Contact Form",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to send");
      }
      setStatus("sent");
      setName(""); setEmail(""); setMessage("");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Failed to send");
    }
  };

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6" id="contact">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">Get in Touch</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={c.editMode || status === "sending"}
            className="w-full px-4 py-3 bg-transparent border border-border rounded text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
          />
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={c.editMode || status === "sending"}
            className="w-full px-4 py-3 bg-transparent border border-border rounded text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
          />
          <textarea
            rows={4}
            placeholder="Your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={c.editMode || status === "sending"}
            className="w-full px-4 py-3 bg-transparent border border-border rounded text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
          />
          {status === "sent" && (
            <p className="text-xs text-center text-muted-foreground">Thanks — we received your message and sent you a copy.</p>
          )}
          {status === "error" && errorMsg && (
            <p className="text-xs text-center text-destructive">{errorMsg}</p>
          )}
          <button
            type="submit"
            disabled={c.editMode || status === "sending"}
            style={{ borderColor: accentColor, color: accentColor }}
            className="w-full py-3 border text-[10px] tracking-[0.3em] uppercase hover:opacity-70 transition-opacity disabled:opacity-50"
          >
            <EditableText
              as="span"
              editMode={c.editMode}
              value={status === "sending" ? "Sending..." : submitLabel}
              placeholder="Send"
              onChange={(v) => c.set("submitLabel", v)}
            />
          </button>
        </form>
      </div>
    </section>
  );
}

// ─── CTA ────────────────────────────────────────────────────────────────────

function CtaBlock(props: any) {
  const { headline, accentColor, ctx } = props;
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const buttons = resolveBlockButtons(props);
  return (
    <section className="py-14 sm:py-20 px-5 sm:px-6 bg-muted/20">
      <div className="max-w-2xl mx-auto text-center">
        <EditableText
          as="h2"
          editMode={c.editMode}
          value={headline || ""}
          placeholder="Ready?"
          onChange={(v) => c.set("headline", v)}
          className="text-2xl md:text-3xl font-extralight tracking-wide mb-6 text-foreground block"
        />
        <BlockButtons
          buttons={buttons}
          editMode={c.editMode}
          onChange={(next) => c.set("buttons", next)}
          marginTop={0}
          align="center"
        />
      </div>
    </section>
  );
}

// ─── FAQ Accordion ──────────────────────────────────────────────────────────

function FaqBlock({ items = [], ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqItems = items.length > 0 ? items : [
    { question: "What is included?", answer: "Details about what's included…" },
    { question: "How do I book?", answer: "Booking information…" },
  ];

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">FAQ</h2>
        <div className="divide-y divide-border">
          {faqItems.map((item: any, i: number) => (
            <div key={i}>
              <div className="w-full flex items-center justify-between py-4 text-left">
                <EditableText
                  as="span"
                  editMode={c.editMode}
                  value={item.question || ""}
                  placeholder="Question"
                  onChange={(v) => c.set(`items.${i}.question`, v)}
                  className="text-sm font-light text-foreground flex-1 cursor-pointer"
                />
                {!c.editMode && (
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="ml-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${openIndex === i ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
              {(c.editMode || openIndex === i) && (
                <EditableText
                  as="p"
                  editMode={c.editMode}
                  value={item.answer || ""}
                  placeholder="Answer"
                  multiline
                  onChange={(v) => c.set(`items.${i}.answer`, v)}
                  className="pb-4 text-sm font-light text-muted-foreground leading-relaxed block"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Table ──────────────────────────────────────────────────────────

function PricingBlock({ plans = [], accentColor, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const displayPlans = plans.length > 0 ? plans : [
    { name: "Basic", price: "$199", features: ["1 hour", "10 photos"] },
    { name: "Standard", price: "$399", features: ["2 hours", "25 photos"] },
    { name: "Premium", price: "$699", features: ["4 hours", "50 photos"] },
  ];

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-extralight tracking-wide text-center mb-10 text-foreground">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayPlans.map((plan: any, i: number) => (
            <div key={i} className="border border-border rounded-lg p-6 text-center hover:shadow-md transition-shadow">
              <EditableText
                as="h3"
                editMode={c.editMode}
                value={plan.name || ""}
                placeholder="Plan"
                onChange={(v) => c.set(`plans.${i}.name`, v)}
                className="text-lg font-light tracking-wide mb-2 text-foreground block"
              />
              <EditableText
                as="p"
                editMode={c.editMode}
                value={plan.price || ""}
                placeholder="$0"
                onChange={(v) => c.set(`plans.${i}.price`, v)}
                className="text-2xl font-extralight mb-4 block"
                style={{ color: accentColor }}
              />
              <ul className="space-y-2 text-sm font-light text-muted-foreground">
                {(plan.features || []).map((f: string, fi: number) => (
                  <li key={fi}>
                    <EditableText
                      as="span"
                      editMode={c.editMode}
                      value={f}
                      placeholder="Feature"
                      onChange={(v) => c.set(`plans.${i}.features.${fi}`, v)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Timeline ───────────────────────────────────────────────────────────────

function TimelineBlock({ events = [], accentColor, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const displayEvents = events.length > 0 ? events : [
    { year: "2020", title: "Started", description: "The journey began" },
    { year: "2022", title: "Grew", description: "Expanded the studio" },
    { year: "2024", title: "Today", description: "Serving clients worldwide" },
  ];

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="relative border-l-2 border-border pl-8 space-y-10">
          {displayEvents.map((event: any, i: number) => (
            <div key={i} className="relative">
              <div className="absolute -left-[41px] w-4 h-4 rounded-full border-2 bg-background" style={{ borderColor: accentColor }} />
              <EditableText
                as="p"
                editMode={c.editMode}
                value={event.year || ""}
                onChange={(v) => c.set(`events.${i}.year`, v)}
                className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1 block"
              />
              <EditableText
                as="h3"
                editMode={c.editMode}
                value={event.title || ""}
                onChange={(v) => c.set(`events.${i}.title`, v)}
                className="text-lg font-light text-foreground mb-1 block"
              />
              <EditableText
                as="p"
                editMode={c.editMode}
                value={event.description || ""}
                multiline
                onChange={(v) => c.set(`events.${i}.description`, v)}
                className="text-sm font-light text-muted-foreground block"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ───────────────────────────────────────────────────────────

function TestimonialsBlock({ items = [], ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const displayItems = items.length > 0 ? items : [
    { quote: "An incredible experience from start to finish.", author: "Client", role: "" },
    { quote: "The photos exceeded all our expectations.", author: "Client", role: "" },
  ];

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6 bg-muted/10">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-extralight tracking-wide text-center mb-10 text-foreground">Testimonials</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {displayItems.map((item: any, i: number) => (
            <blockquote key={i} className="border-l-2 border-border pl-6">
              <EditableText
                as="p"
                editMode={c.editMode}
                value={item.quote || ""}
                multiline
                onChange={(v) => c.set(`items.${i}.quote`, v)}
                className="text-sm font-light text-muted-foreground leading-relaxed italic mb-3 block"
              />
              <footer className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                — <EditableText as="span" editMode={c.editMode} value={item.author || ""} onChange={(v) => c.set(`items.${i}.author`, v)} />
                {(c.editMode || item.role) && (
                  <>
                    , <EditableText as="span" editMode={c.editMode} value={item.role || ""} placeholder="role" onChange={(v) => c.set(`items.${i}.role`, v)} />
                  </>
                )}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats ──────────────────────────────────────────────────────────────────

function StatsBlock({ items = [], accentColor, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const displayItems = items.length > 0 ? items : [
    { value: "500+", label: "Sessions" },
    { value: "10+", label: "Years" },
    { value: "100%", label: "Satisfaction" },
  ];

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6 border-y border-border">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
        {displayItems.map((item: any, i: number) => (
          <div key={i}>
            <EditableText
              as="p"
              editMode={c.editMode}
              value={item.value || ""}
              onChange={(v) => c.set(`items.${i}.value`, v)}
              className="text-3xl md:text-4xl font-extralight mb-1 block"
              style={{ color: accentColor }}
            />
            <EditableText
              as="p"
              editMode={c.editMode}
              value={item.label || ""}
              onChange={(v) => c.set(`items.${i}.label`, v)}
              className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Team ───────────────────────────────────────────────────────────────────

function TeamBlock({ members = [], ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const displayMembers = members.length > 0 ? members : [
    { name: "Team Member", role: "Photographer", photo: "" },
  ];

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-extralight tracking-wide text-center mb-10 text-foreground">Our Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {displayMembers.map((m: any, i: number) => (
            <div key={i} className="text-center">
              <EditableImage
                value={m.photo}
                onChange={(url) => c.set(`members.${i}.photo`, url)}
                photographerId={c.photographerId}
                folder="team"
                editMode={c.editMode}
                className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden"
              >
                <div className="w-28 h-28 rounded-full bg-muted/30 overflow-hidden">
                  {m.photo ? (
                    <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </EditableImage>
              <EditableText
                as="h3"
                editMode={c.editMode}
                value={m.name || ""}
                placeholder="Name"
                onChange={(v) => c.set(`members.${i}.name`, v)}
                className="text-sm font-light text-foreground block"
              />
              {(c.editMode || m.role) && (
                <EditableText
                  as="p"
                  editMode={c.editMode}
                  value={m.role || ""}
                  placeholder="Role"
                  onChange={(v) => c.set(`members.${i}.role`, v)}
                  className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1 block"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Video ──────────────────────────────────────────────────────────────────

function VideoBlock({ url }: any) {
  if (!url) {
    return (
      <section className="py-12 sm:py-16 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto aspect-video bg-muted/20 rounded flex items-center justify-center">
          <p className="text-sm text-muted-foreground font-light">Video URL not set</p>
        </div>
      </section>
    );
  }

  // Convert YouTube/Vimeo URLs to embed
  let embedUrl = url;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-4xl mx-auto aspect-video overflow-hidden rounded">
        <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen allow="autoplay; encrypted-media" />
      </div>
    </section>
  );
}

// ─── Spacer ─────────────────────────────────────────────────────────────────

function SpacerBlock({ height = 60 }: any) {
  return <div style={{ height: `${height}px` }} />;
}

// ─── Divider ────────────────────────────────────────────────────────────────

function DividerBlock({ style = "line" }: { style?: string } = {}) {
  const cls =
    style === "dashed" ? "border-border border-dashed"
    : style === "dotted" ? "border-border border-dotted"
    : style === "thick" ? "border-foreground/40 border-t-2"
    : "border-border";
  return (
    <div className="max-w-6xl mx-auto px-6">
      <hr className={cls} />
    </div>
  );
}

// ─── Columns 2 ──────────────────────────────────────────────────────────────

function Columns2Block({ left, right, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <EditableText
          as="div"
          editMode={c.editMode}
          value={left || ""}
          placeholder="Left column"
          multiline
          onChange={(v) => c.set("left", v)}
          className="text-sm font-light text-muted-foreground leading-relaxed whitespace-pre-line"
        />
        <EditableText
          as="div"
          editMode={c.editMode}
          value={right || ""}
          placeholder="Right column"
          multiline
          onChange={(v) => c.set("right", v)}
          className="text-sm font-light text-muted-foreground leading-relaxed whitespace-pre-line"
        />
      </div>
    </section>
  );
}

// ─── Columns 3 ──────────────────────────────────────────────────────────────

function Columns3Block({ col1, col2, col3, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {(["col1", "col2", "col3"] as const).map((key, i) => (
          <EditableText
            key={key}
            as="div"
            editMode={c.editMode}
            value={(({ col1, col2, col3 }: any) => ({ col1, col2, col3 } as any))({ col1, col2, col3 })[key] || ""}
            placeholder={`Column ${i + 1}`}
            multiline
            onChange={(v) => c.set(key, v)}
            className="text-sm font-light text-muted-foreground leading-relaxed whitespace-pre-line"
          />
        ))}
      </div>
    </section>
  );
}

// ─── Slideshow ──────────────────────────────────────────────────────────────

type SlideItemNorm = { image: string; title?: string; caption?: string; link?: string };
function normalizeSlideItems(raw: any[]): SlideItemNorm[] {
  return (raw || []).map((s) =>
    typeof s === "string"
      ? { image: s }
      : { image: s?.image ?? "", title: s?.title, caption: s?.caption, link: s?.link }
  );
}

function SlideshowBlock({ images = [], autoplay = true, interval = 5000 }: any) {
  const slides = normalizeSlideItems(images);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!autoplay || paused || slides.length <= 1) return;
    const t = window.setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, Math.max(1500, Number(interval) || 5000));
    return () => window.clearInterval(t);
  }, [autoplay, paused, interval, slides.length]);

  if (slides.length === 0) {
    return (
      <section className="py-12 sm:py-16 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto aspect-[16/7] bg-muted/20 rounded flex items-center justify-center">
          <Images className="h-8 w-8 text-muted-foreground/20" />
        </div>
      </section>
    );
  }

  const slide = slides[current];
  const hasOverlay = !!(slide.title || slide.caption);

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div
        className="max-w-4xl mx-auto relative aspect-[16/7] overflow-hidden rounded"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slide.link ? (
          <a href={slide.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            <img src={slide.image} alt={slide.title || ""} className="w-full h-full object-cover" />
          </a>
        ) : (
          <img src={slide.image} alt={slide.title || ""} className="w-full h-full object-cover" />
        )}
        {hasOverlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 sm:p-10 pointer-events-none">
            {slide.title && <h3 className="text-white text-xl sm:text-2xl font-light tracking-wide">{slide.title}</h3>}
            {slide.caption && <p className="text-white/80 text-sm mt-2 max-w-xl">{slide.caption}</p>}
          </div>
        )}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Carousel ───────────────────────────────────────────────────────────────

function CarouselBlock({ images = [], itemsVisible = 3, autoplay = false, interval = 5000 }: any) {
  const slides = normalizeSlideItems(images);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!autoplay || paused || slides.length <= itemsVisible) return;
    const el = scrollerRef.current;
    if (!el) return;
    const t = window.setInterval(() => {
      const itemWidth = el.scrollWidth / Math.max(1, slides.length);
      const maxScroll = el.scrollWidth - el.clientWidth - 1;
      const next = el.scrollLeft + itemWidth;
      if (next >= maxScroll) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: itemWidth, behavior: "smooth" });
      }
    }, Math.max(1500, Number(interval) || 5000));
    return () => window.clearInterval(t);
  }, [autoplay, paused, interval, slides.length, itemsVisible]);

  if (slides.length === 0) {
    return (
      <section className="py-12 sm:py-16 px-5 sm:px-6">
        <div className="max-w-6xl mx-auto flex gap-3 overflow-hidden">
          {Array.from({ length: itemsVisible }).map((_, i) => (
            <div key={i} className="flex-shrink-0 aspect-square bg-muted/20 rounded" style={{ width: `${100 / itemsVisible}%` }}>
              <div className="w-full h-full flex items-center justify-center"><Images className="h-6 w-6 text-muted-foreground/20" /></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div
        ref={scrollerRef}
        className="max-w-6xl mx-auto flex gap-3 overflow-x-auto no-scrollbar scroll-smooth"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((slide, i) => {
          const inner = (
            <div className="relative w-full aspect-square overflow-hidden rounded group">
              <img src={slide.image} alt={slide.title || ""} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {(slide.title || slide.caption) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col justify-end p-3 sm:p-4">
                  {slide.title && <p className="text-white text-sm font-medium tracking-wide truncate">{slide.title}</p>}
                  {slide.caption && <p className="text-white/80 text-xs mt-1 line-clamp-2">{slide.caption}</p>}
                </div>
              )}
            </div>
          );
          return (
            <div key={i} className="flex-shrink-0" style={{ width: `${100 / itemsVisible}%` }}>
              {slide.link ? (
                <a href={slide.link} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
              ) : inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Instagram Feed (placeholder) ───────────────────────────────────────────

function InstagramFeedBlock({ count = 9, columns = 3, username, posts = [] }: any) {
  const cols = Number(columns) || 3;
  const gridCls =
    cols === 6 ? "grid-cols-3 sm:grid-cols-6"
    : cols === 4 ? "grid-cols-2 sm:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-3";

  const list: { image?: string; link?: string; caption?: string }[] = Array.isArray(posts) ? posts : [];
  const fallbackHref = username ? `https://instagram.com/${username}` : undefined;
  const slots = list.length > 0 ? list.slice(0, count) : Array.from({ length: count }).map(() => ({} as any));

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extralight tracking-wide text-center mb-2 text-foreground">Instagram</h2>
        {username && (
          <p className="text-center text-xs text-muted-foreground mb-6">@{username}</p>
        )}
        <div className={`grid ${gridCls} gap-2`}>
          {slots.map((item, i) => {
            const href = item?.link || fallbackHref;
            const inner = item?.image ? (
              <img
                src={item.image}
                alt={item.caption || `Instagram post ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                <Camera className="h-5 w-5 text-muted-foreground/20" />
              </div>
            );
            const wrapperCls = "aspect-square rounded overflow-hidden block";
            return href ? (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${wrapperCls} group relative`}
              >
                {inner}
              </a>
            ) : (
              <div key={i} className={wrapperCls}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Social Links ───────────────────────────────────────────────────────────

function SocialLinksBlock({ links = [] }: any) {
  const labelFor = (l: any) =>
    l.platform
      ? l.platform.charAt(0).toUpperCase() + l.platform.slice(1)
      : l.label || l.url;
  return (
    <section className="py-12 px-6">
      <div className="max-w-xl mx-auto flex items-center justify-center gap-6 flex-wrap">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground font-light">No social links configured</p>
        ) : (
          links.map((link: any, i: number) => (
            <a
              key={i}
              href={link.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors capitalize"
            >
              {labelFor(link)}
            </a>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Embed ──────────────────────────────────────────────────────────────────

function EmbedBlock({ code, height = 400 }: any) {
  if (!code) {
    return (
      <section className="py-12 sm:py-16 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto bg-muted/20 rounded flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted-foreground font-light">Custom embed — no code set</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-4xl mx-auto" style={{ height }} dangerouslySetInnerHTML={{ __html: code }} />
    </section>
  );
}

// ─── Logo Strip ─────────────────────────────────────────────────────────────

function LogoStripBlock({ title, logos = [] }: any) {
  const normalize = (l: any) =>
    typeof l === "string" ? { url: l, alt: "" } : { url: l?.url ?? "", alt: l?.alt ?? "" };
  const items = (logos || []).map(normalize).filter((l: any) => l.url);
  return (
    <section className="py-12 px-6 border-y border-border">
      <div className="max-w-5xl mx-auto text-center">
        {title && <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-6">{title}</p>}
        {items.length > 0 ? (
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {items.map((logo: any, i: number) => (
              <img
                key={i}
                src={logo.url}
                alt={logo.alt || ""}
                className="h-8 grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all"
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground font-light">No logos added</p>
        )}
      </div>
    </section>
  );
}

// ─── Map ────────────────────────────────────────────────────────────────────

function MapBlock({ address, height = 400 }: any) {
  if (!address) {
    return (
      <section className="py-12 sm:py-16 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto bg-muted/20 rounded flex items-center justify-center" style={{ height }}>
          <MapPin className="h-8 w-8 text-muted-foreground/20" />
        </div>
      </section>
    );
  }

  const encodedAddress = encodeURIComponent(address);
  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6">
      <div className="max-w-4xl mx-auto overflow-hidden rounded" style={{ height }}>
        <iframe
          src={`https://maps.google.com/maps?q=${encodedAddress}&output=embed`}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </section>
  );
}
