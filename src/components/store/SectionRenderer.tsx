import { Camera, Images, Mail, MapPin, Clock, ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import EditableText from "@/components/website-editor/inline/EditableText";
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
}

// ─── Section Renderer (routes to block components) ──────────────────────────

export default function SectionRenderer({
  sections,
  accentColor = "#000000",
  editMode = false,
  edit,
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
}

type Ctx = { editMode: boolean; set: (path: string, value: any) => void; photographerId?: string | null };

// ─── Hero ───────────────────────────────────────────────────────────────────

function HeroBlock({ headline, subtitle, backgroundImage, ctaText, ctaLink, accentColor, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  const hasImage = !!backgroundImage;
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
        {(c.editMode || ctaText) && (
          <a
            href={c.editMode ? undefined : (ctaLink || "#")}
            onClick={(e) => c.editMode && e.preventDefault()}
            style={{ borderColor: hasImage ? "white" : accentColor, color: hasImage ? "white" : accentColor }}
            className="inline-block mt-8 px-8 py-3 border text-[10px] tracking-[0.3em] uppercase hover:opacity-70 transition-opacity"
          >
            <EditableText
              as="span"
              editMode={c.editMode}
              value={ctaText || ""}
              placeholder="Button text"
              onChange={(v) => c.set("ctaText", v)}
              className="inline-block"
            />
          </a>
        )}
      </div>
    </>
  );

  if (c.editMode) {
    return (
      <EditableImage
        value={backgroundImage}
        onChange={(url) => c.set("backgroundImage", url)}
        photographerId={c.photographerId}
        folder="hero"
      >
        <section
          className="relative w-full min-h-[70vh] flex items-center justify-center overflow-hidden"
          style={hasImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {heroInner}
        </section>
      </EditableImage>
    );
  }

  return (
    <section
      className="relative w-full min-h-[70vh] flex items-center justify-center overflow-hidden"
      style={hasImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {heroInner}
    </section>
  );
}

// ─── Text ───────────────────────────────────────────────────────────────────

function TextBlock({ body, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <EditableText
          as="div"
          editMode={c.editMode}
          value={body || ""}
          placeholder="Start writing here…"
          multiline
          onChange={(v) => c.set("body", v)}
          className="text-sm md:text-base font-light text-muted-foreground leading-relaxed whitespace-pre-line"
        />
      </div>
    </section>
  );
}

// ─── Image + Text ───────────────────────────────────────────────────────────

function ImageTextBlock({ image, title, body, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  return (
    <section className="py-16 px-6">
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
        </div>
      </div>
    </section>
  );
}

// ─── Text + Image ───────────────────────────────────────────────────────────

function TextImageBlock({ image, title, body, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  return (
    <section className="py-16 px-6">
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
        </div>
      </div>
    </section>
  );
}

// ─── Gallery Grid ───────────────────────────────────────────────────────────

function GalleryGridBlock({ columns = 3, images = [], label }: any) {
  const cols = Number(columns) || 3;
  const gridCls = cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3";

  if (!images || images.length === 0) {
    return (
      <section className="py-16 px-6">
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
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {label && <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">{label}</h2>}
        <div className={`grid ${gridCls} gap-3`}>
          {images.map((img: string, i: number) => (
            <div key={i} className="aspect-square overflow-hidden rounded">
              <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Gallery Masonry ────────────────────────────────────────────────────────

function GalleryMasonryBlock({ columns = 3, images = [], label }: any) {
  const cols = Number(columns) || 3;

  if (!images || images.length === 0) {
    return (
      <section className="py-16 px-6">
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

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {label && <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">{label}</h2>}
        <div className={`columns-${cols} gap-3 space-y-3`}>
          {images.map((img: string, i: number) => (
            <div key={i} className="overflow-hidden rounded break-inside-avoid">
              <img src={img} alt="" className="w-full object-cover hover:scale-105 transition-transform duration-500" />
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
  return (
    <section className="py-16 px-6" id="contact">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">Get in Touch</h2>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <input type="text" placeholder="Your name" className="w-full px-4 py-3 bg-transparent border border-border rounded text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" />
          <input type="email" placeholder="Your email" className="w-full px-4 py-3 bg-transparent border border-border rounded text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" />
          <textarea rows={4} placeholder="Your message" className="w-full px-4 py-3 bg-transparent border border-border rounded text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none" />
          <button
            type="button"
            style={{ borderColor: accentColor, color: accentColor }}
            className="w-full py-3 border text-[10px] tracking-[0.3em] uppercase hover:opacity-70 transition-opacity"
          >
            <EditableText
              as="span"
              editMode={c.editMode}
              value={submitLabel}
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

function CtaBlock({ headline, buttonText, buttonLink, accentColor, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  return (
    <section className="py-20 px-6 bg-muted/20">
      <div className="max-w-2xl mx-auto text-center">
        <EditableText
          as="h2"
          editMode={c.editMode}
          value={headline || ""}
          placeholder="Ready?"
          onChange={(v) => c.set("headline", v)}
          className="text-2xl md:text-3xl font-extralight tracking-wide mb-6 text-foreground block"
        />
        <a
          href={c.editMode ? undefined : (buttonLink || "#")}
          onClick={(e) => c.editMode && e.preventDefault()}
          style={{ borderColor: accentColor, color: accentColor }}
          className="inline-block px-8 py-3 border text-[10px] tracking-[0.3em] uppercase hover:opacity-70 transition-opacity"
        >
          <EditableText
            as="span"
            editMode={c.editMode}
            value={buttonText || ""}
            placeholder="Get Started"
            onChange={(v) => c.set("buttonText", v)}
          />
        </a>
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
    <section className="py-16 px-6">
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
    <section className="py-16 px-6">
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
    <section className="py-16 px-6">
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
    <section className="py-16 px-6 bg-muted/10">
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
    <section className="py-16 px-6 border-y border-border">
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
    <section className="py-16 px-6">
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
      <section className="py-16 px-6">
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
    <section className="py-16 px-6">
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

function DividerBlock() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <hr className="border-border" />
    </div>
  );
}

// ─── Columns 2 ──────────────────────────────────────────────────────────────

function Columns2Block({ left, right, ctx }: any) {
  const c: Ctx = ctx || { editMode: false, set: () => {} };
  return (
    <section className="py-16 px-6">
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
    <section className="py-16 px-6">
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

function SlideshowBlock({ images = [] }: any) {
  const [current, setCurrent] = useState(0);

  if (!images || images.length === 0) {
    return (
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto aspect-[16/7] bg-muted/20 rounded flex items-center justify-center">
          <Images className="h-8 w-8 text-muted-foreground/20" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto relative aspect-[16/7] overflow-hidden rounded">
        <img src={images[current]} alt="" className="w-full h-full object-cover" />
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_: any, i: number) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Carousel ───────────────────────────────────────────────────────────────

function CarouselBlock({ images = [], itemsVisible = 3 }: any) {
  if (!images || images.length === 0) {
    return (
      <section className="py-16 px-6">
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
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto flex gap-3 overflow-x-auto no-scrollbar">
        {images.map((img: string, i: number) => (
          <div key={i} className="flex-shrink-0 overflow-hidden rounded" style={{ width: `${100 / itemsVisible}%` }}>
            <img src={img} alt="" className="w-full aspect-square object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Instagram Feed (placeholder) ───────────────────────────────────────────

function InstagramFeedBlock({ count = 9, columns = 3 }: any) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extralight tracking-wide text-center mb-8 text-foreground">Instagram</h2>
        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted/20 rounded flex items-center justify-center">
              <Camera className="h-5 w-5 text-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Social Links ───────────────────────────────────────────────────────────

function SocialLinksBlock({ links = [] }: any) {
  return (
    <section className="py-12 px-6">
      <div className="max-w-xl mx-auto flex items-center justify-center gap-6">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground font-light">No social links configured</p>
        ) : (
          links.map((link: any, i: number) => (
            <a key={i} href={link.url || "#"} target="_blank" rel="noopener noreferrer" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">
              {link.label || link.url}
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
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto bg-muted/20 rounded flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted-foreground font-light">Custom embed — no code set</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto" style={{ height }} dangerouslySetInnerHTML={{ __html: code }} />
    </section>
  );
}

// ─── Logo Strip ─────────────────────────────────────────────────────────────

function LogoStripBlock({ title, logos = [] }: any) {
  return (
    <section className="py-12 px-6 border-y border-border">
      <div className="max-w-5xl mx-auto text-center">
        {title && <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-6">{title}</p>}
        {logos.length > 0 ? (
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {logos.map((logo: string, i: number) => (
              <img key={i} src={logo} alt="" className="h-8 grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all" />
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

function MapBlock({ address }: any) {
  if (!address) {
    return (
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto aspect-[16/9] bg-muted/20 rounded flex items-center justify-center">
          <MapPin className="h-8 w-8 text-muted-foreground/20" />
        </div>
      </section>
    );
  }

  const encodedAddress = encodeURIComponent(address);
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto aspect-[16/9] overflow-hidden rounded">
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
