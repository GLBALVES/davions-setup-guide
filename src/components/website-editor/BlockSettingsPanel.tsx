import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUploadField } from "./ImageUploadField";
import { ItemListEditor } from "./ItemListEditor";
import type { PageSection } from "./page-templates";

// ── Block Settings ────────────────────────────────────────────────────────────

export interface BlockSettings {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  paddingTop?: number;
  paddingBottom?: number;
  colorScheme?: "light" | "dark" | "auto";
  animation?: "none" | "fade-up" | "fade-in" | "slide-left";
}

const PRESET_COLORS = [
  { label: "None", value: "" },
  { label: "White", value: "hsl(0, 0%, 100%)" },
  { label: "Light Gray", value: "hsl(0, 0%, 96%)" },
  { label: "Dark", value: "hsl(0, 0%, 8%)" },
  { label: "Black", value: "hsl(0, 0%, 0%)" },
  { label: "Primary", value: "hsl(var(--primary))" },
];

const PADDING_PRESETS = [
  { label: "Compact", top: 24, bottom: 24 },
  { label: "Normal", top: 48, bottom: 48 },
  { label: "Spacious", top: 80, bottom: 80 },
  { label: "Extra", top: 120, bottom: 120 },
];

const ANIMATIONS = [
  { id: "none", label: "None" },
  { id: "fade-up", label: "Fade Up" },
  { id: "fade-in", label: "Fade In" },
  { id: "slide-left", label: "Slide Left" },
];

interface BlockSettingsPanelProps {
  section: PageSection;
  settings: BlockSettings;
  onUpdate: (settings: BlockSettings) => void;
  onUpdateProps: (props: Record<string, any>) => void;
  onBack: () => void;
}

// ── Per-type content editors ──────────────────────────────────────────────────

function HeroContentEditor({ props, onChange, photographerId }: { props: any; onChange: (p: any) => void; photographerId?: string | null }) {
  return (
    <div className="space-y-3">
      <Field label="Headline">
        <Input value={props.headline || ""} onChange={(e) => onChange({ ...props, headline: e.target.value })} className="h-9 text-sm" placeholder="Your headline" />
      </Field>
      <Field label="Subtitle">
        <Input value={props.subtitle || ""} onChange={(e) => onChange({ ...props, subtitle: e.target.value })} className="h-9 text-sm" placeholder="A short subtitle" />
      </Field>
      <Field label="Background Image">
        <ImageUploadField
          value={props.backgroundImage}
          onChange={(url) => onChange({ ...props, backgroundImage: url })}
          photographerId={photographerId}
          folder="hero"
        />
      </Field>
      <Field label="CTA Text">
        <Input value={props.ctaText || ""} onChange={(e) => onChange({ ...props, ctaText: e.target.value })} className="h-9 text-sm" placeholder="Book Now" />
      </Field>
      <Field label="CTA Link">
        <Input value={props.ctaLink || ""} onChange={(e) => onChange({ ...props, ctaLink: e.target.value })} className="h-9 text-sm" placeholder="#contact" />
      </Field>
    </div>
  );
}

function TextContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <Field label="Body">
      <Textarea value={props.body || ""} onChange={(e) => onChange({ ...props, body: e.target.value })} className="text-sm min-h-[120px]" placeholder="Write your content here..." />
    </Field>
  );
}

function ImageTextContentEditor({ props, onChange, photographerId }: { props: any; onChange: (p: any) => void; photographerId?: string | null }) {
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input value={props.title || ""} onChange={(e) => onChange({ ...props, title: e.target.value })} className="h-9 text-sm" />
      </Field>
      <Field label="Body">
        <Textarea value={props.body || ""} onChange={(e) => onChange({ ...props, body: e.target.value })} className="text-sm min-h-[80px]" />
      </Field>
      <Field label="Image">
        <ImageUploadField
          value={props.image}
          onChange={(url) => onChange({ ...props, image: url })}
          photographerId={photographerId}
          folder="image-text"
        />
      </Field>
    </div>
  );
}

function CtaContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Headline">
        <Input value={props.headline || ""} onChange={(e) => onChange({ ...props, headline: e.target.value })} className="h-9 text-sm" />
      </Field>
      <Field label="Button Text">
        <Input value={props.buttonText || ""} onChange={(e) => onChange({ ...props, buttonText: e.target.value })} className="h-9 text-sm" />
      </Field>
      <Field label="Button Link">
        <Input value={props.buttonLink || ""} onChange={(e) => onChange({ ...props, buttonLink: e.target.value })} className="h-9 text-sm" placeholder="#contact" />
      </Field>
    </div>
  );
}

function ContactFormContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <Field label="Submit Label">
      <Input value={props.submitLabel || "Send"} onChange={(e) => onChange({ ...props, submitLabel: e.target.value })} className="h-9 text-sm" />
    </Field>
  );
}

function VideoContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <Field label="Video URL (YouTube / Vimeo)">
      <Input value={props.url || ""} onChange={(e) => onChange({ ...props, url: e.target.value })} className="h-9 text-sm" placeholder="https://youtube.com/watch?v=..." />
    </Field>
  );
}

function GalleryContentEditor({ props, onChange, photographerId }: { props: any; onChange: (p: any) => void; photographerId?: string | null }) {
  const images: string[] = props.images || [];
  return (
    <div className="space-y-3">
      <Field label="Columns">
        <Select value={String(props.columns || 3)} onValueChange={(v) => onChange({ ...props, columns: Number(v) })}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Images">
        <ItemListEditor
          items={images}
          onChange={(next) => onChange({ ...props, images: next })}
          itemLabel="Image"
          addLabel="Add Image"
          newItem={() => ""}
          renderLabel={(it) => (it ? it.split("/").pop() || it : "Empty image")}
          renderDetail={(item, _u) => (
            <ImageUploadField
              value={item as string}
              onChange={(url) => {
                const next = [...images];
                const idx = images.indexOf(item as string);
                if (idx >= 0) {
                  next[idx] = url ?? "";
                  onChange({ ...props, images: next });
                }
              }}
              photographerId={photographerId}
              folder="gallery"
            />
          )}
        />
      </Field>
    </div>
  );
}

type SlideItem = { image: string; title?: string; caption?: string; link?: string };

function normalizeSlides(raw: any[]): SlideItem[] {
  return (raw || []).map((s) =>
    typeof s === "string" ? { image: s } : { image: s?.image ?? "", title: s?.title, caption: s?.caption, link: s?.link }
  );
}

function SlideshowContentEditor({ props, onChange, photographerId, isCarousel }: { props: any; onChange: (p: any) => void; photographerId?: string | null; isCarousel?: boolean }) {
  const slides: SlideItem[] = normalizeSlides(props.images || []);
  return (
    <div className="space-y-3">
      {isCarousel ? (
        <Field label={`Visible items: ${props.itemsVisible ?? 3}`}>
          <Slider value={[props.itemsVisible ?? 3]} min={1} max={6} step={1} onValueChange={([v]) => onChange({ ...props, itemsVisible: v })} />
        </Field>
      ) : (
        <Field label={`Interval: ${(props.interval ?? 5000) / 1000}s`}>
          <Slider value={[props.interval ?? 5000]} min={2000} max={15000} step={500} onValueChange={([v]) => onChange({ ...props, interval: v })} />
        </Field>
      )}
      <Field label="Slides">
        <ItemListEditor
          items={slides}
          onChange={(next) => onChange({ ...props, images: next })}
          itemLabel={isCarousel ? "Item" : "Slide"}
          addLabel={isCarousel ? "Add Item" : "Add Slide"}
          newItem={() => ({ image: "", title: "", caption: "", link: "" })}
          renderLabel={(it) => it.title || (it.image ? it.image.split("/").pop() || it.image : isCarousel ? "Empty item" : "Empty slide")}
          renderDetail={(item, update) => (
            <div className="space-y-3">
              <Field label="Image">
                <ImageUploadField
                  value={item.image}
                  onChange={(url) => update({ image: url ?? "" })}
                  photographerId={photographerId}
                  folder={isCarousel ? "carousel" : "slideshow"}
                />
              </Field>
              <Field label="Title">
                <Input value={item.title || ""} onChange={(e) => update({ title: e.target.value })} className="h-9 text-sm" placeholder="Slide title" />
              </Field>
              <Field label="Caption">
                <Textarea value={item.caption || ""} onChange={(e) => update({ caption: e.target.value })} className="text-sm min-h-[60px]" placeholder="Short description shown on the slide" />
              </Field>
              <Field label="Link URL (optional)">
                <Input value={item.link || ""} onChange={(e) => update({ link: e.target.value })} className="h-9 text-sm" placeholder="https://… or #section" />
              </Field>
            </div>
          )}
        />
      </Field>
    </div>
  );
}

function SocialLinksContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const links: { platform: string; url: string }[] = props.links || [];
  return (
    <ItemListEditor
      items={links}
      onChange={(next) => onChange({ ...props, links: next })}
      itemLabel="Link"
      addLabel="Add Link"
      newItem={() => ({ platform: "instagram", url: "" })}
      renderLabel={(it) => `${it.platform || "?"} — ${it.url || ""}`}
      renderDetail={(item, update) => (
        <div className="space-y-2">
          <Field label="Platform">
            <Select value={item.platform || "instagram"} onValueChange={(v) => update({ platform: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="twitter">X / Twitter</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="pinterest">Pinterest</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="URL">
            <Input value={item.url} onChange={(e) => update({ url: e.target.value })} className="h-9 text-sm" placeholder="https://…" />
          </Field>
        </div>
      )}
    />
  );
}

function LogoStripContentEditor({ props, onChange, photographerId }: { props: any; onChange: (p: any) => void; photographerId?: string | null }) {
  const logos: { url: string; alt?: string }[] = props.logos || [];
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input value={props.title || ""} onChange={(e) => onChange({ ...props, title: e.target.value })} className="h-9 text-sm" placeholder="As Seen On" />
      </Field>
      <Field label="Logos">
        <ItemListEditor
          items={logos}
          onChange={(next) => onChange({ ...props, logos: next })}
          itemLabel="Logo"
          addLabel="Add Logo"
          newItem={() => ({ url: "", alt: "" })}
          renderLabel={(it) => it.alt || (it.url ? it.url.split("/").pop() || it.url : "Empty")}
          renderDetail={(item, update) => (
            <div className="space-y-2">
              <Field label="Image">
                <ImageUploadField
                  value={item.url}
                  onChange={(url) => update({ url: url ?? "" })}
                  photographerId={photographerId}
                  folder="logos"
                  aspectClass="aspect-[3/1]"
                />
              </Field>
              <Field label="Alt text">
                <Input value={item.alt || ""} onChange={(e) => update({ alt: e.target.value })} className="h-9 text-sm" placeholder="Brand name" />
              </Field>
            </div>
          )}
        />
      </Field>
    </div>
  );
}

function FaqContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const items: { question: string; answer: string }[] = props.items || [];
  return (
    <ItemListEditor
      items={items}
      onChange={(next) => onChange({ ...props, items: next })}
      itemLabel="Question"
      addLabel="Add Question"
      newItem={() => ({ question: "", answer: "" })}
      renderLabel={(it) => it.question || ""}
      renderDetail={(item, update) => (
        <div className="space-y-2">
          <Field label="Question">
            <Input value={item.question} onChange={(e) => update({ question: e.target.value })} className="h-9 text-sm" placeholder="Question" />
          </Field>
          <Field label="Answer">
            <Textarea value={item.answer} onChange={(e) => update({ answer: e.target.value })} className="text-sm min-h-[100px]" placeholder="Answer" />
          </Field>
        </div>
      )}
    />
  );
}

function StatsContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const items: { value: string; label: string }[] = props.items || [];
  return (
    <ItemListEditor
      items={items}
      onChange={(next) => onChange({ ...props, items: next })}
      itemLabel="Stat"
      addLabel="Add Stat"
      newItem={() => ({ value: "", label: "" })}
      renderLabel={(it) => [it.value, it.label].filter(Boolean).join(" — ")}
      renderDetail={(item, update) => (
        <div className="space-y-2">
          <Field label="Value">
            <Input value={item.value} onChange={(e) => update({ value: e.target.value })} className="h-9 text-sm" placeholder="500+" />
          </Field>
          <Field label="Label">
            <Input value={item.label} onChange={(e) => update({ label: e.target.value })} className="h-9 text-sm" placeholder="Sessions" />
          </Field>
        </div>
      )}
    />
  );
}

function TestimonialsContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const items: { quote: string; author: string; role: string }[] = props.items || [];
  return (
    <ItemListEditor
      items={items}
      onChange={(next) => onChange({ ...props, items: next })}
      itemLabel="Testimonial"
      addLabel="Add Testimonial"
      newItem={() => ({ quote: "", author: "", role: "" })}
      renderLabel={(it) => it.author || it.quote.slice(0, 40)}
      renderDetail={(item, update) => (
        <div className="space-y-2">
          <Field label="Quote">
            <Textarea value={item.quote} onChange={(e) => update({ quote: e.target.value })} className="text-sm min-h-[100px]" placeholder="Testimonial quote..." />
          </Field>
          <Field label="Author">
            <Input value={item.author} onChange={(e) => update({ author: e.target.value })} className="h-9 text-sm" placeholder="Name" />
          </Field>
          <Field label="Role">
            <Input value={item.role} onChange={(e) => update({ role: e.target.value })} className="h-9 text-sm" placeholder="Role / Company" />
          </Field>
        </div>
      )}
    />
  );
}

function SpacerContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <Field label={`Height: ${props.height || 60}px`}>
      <Slider value={[props.height || 60]} min={16} max={200} step={8} onValueChange={([v]) => onChange({ ...props, height: v })} />
    </Field>
  );
}

function PricingContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const plans: { name: string; price: string; features: string[] }[] = props.plans || [];
  return (
    <ItemListEditor
      items={plans}
      onChange={(next) => onChange({ ...props, plans: next })}
      itemLabel="Plan"
      addLabel="Add Plan"
      newItem={() => ({ name: "", price: "", features: [""] })}
      renderLabel={(it) => [it.name, it.price].filter(Boolean).join(" — ")}
      renderDetail={(item, update) => (
        <div className="space-y-2">
          <Field label="Plan Name">
            <Input value={item.name} onChange={(e) => update({ name: e.target.value })} className="h-9 text-sm" placeholder="Standard" />
          </Field>
          <Field label="Price">
            <Input value={item.price} onChange={(e) => update({ price: e.target.value })} className="h-9 text-sm" placeholder="$199" />
          </Field>
          <Field label="Features (one per line)">
            <Textarea
              value={(item.features || []).join("\n")}
              onChange={(e) => update({ features: e.target.value.split("\n") })}
              className="text-sm min-h-[100px]"
              placeholder="Feature 1&#10;Feature 2"
            />
          </Field>
        </div>
      )}
    />
  );
}

function TeamContentEditor({ props, onChange, photographerId }: { props: any; onChange: (p: any) => void; photographerId?: string | null }) {
  const members: { name: string; role: string; photo: string }[] = props.members || [];
  return (
    <ItemListEditor
      items={members}
      onChange={(next) => onChange({ ...props, members: next })}
      itemLabel="Member"
      addLabel="Add Member"
      newItem={() => ({ name: "", role: "", photo: "" })}
      renderLabel={(it) => [it.name, it.role].filter(Boolean).join(" — ")}
      renderDetail={(item, update) => (
        <div className="space-y-2">
          <Field label="Name">
            <Input value={item.name} onChange={(e) => update({ name: e.target.value })} className="h-9 text-sm" placeholder="Full name" />
          </Field>
          <Field label="Role">
            <Input value={item.role} onChange={(e) => update({ role: e.target.value })} className="h-9 text-sm" placeholder="Photographer" />
          </Field>
          <Field label="Photo">
            <ImageUploadField
              value={item.photo}
              onChange={(url) => update({ photo: url })}
              photographerId={photographerId}
              folder="team"
              aspectClass="aspect-square"
            />
          </Field>
        </div>
      )}
    />
  );
}

function TimelineContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const events: { year: string; title: string; description: string }[] = props.events || [];
  return (
    <ItemListEditor
      items={events}
      onChange={(next) => onChange({ ...props, events: next })}
      itemLabel="Event"
      addLabel="Add Event"
      newItem={() => ({ year: "", title: "", description: "" })}
      renderLabel={(it) => [it.year, it.title].filter(Boolean).join(" — ")}
      renderDetail={(item, update) => (
        <div className="space-y-2">
          <Field label="Year">
            <Input value={item.year} onChange={(e) => update({ year: e.target.value })} className="h-9 text-sm" placeholder="2024" />
          </Field>
          <Field label="Title">
            <Input value={item.title} onChange={(e) => update({ title: e.target.value })} className="h-9 text-sm" placeholder="Milestone" />
          </Field>
          <Field label="Description">
            <Textarea value={item.description} onChange={(e) => update({ description: e.target.value })} className="text-sm min-h-[80px]" placeholder="What happened…" />
          </Field>
        </div>
      )}
    />
  );
}

function EmbedContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Custom HTML/Embed Code">
        <Textarea value={props.code || ""} onChange={(e) => onChange({ ...props, code: e.target.value })} className="text-xs min-h-[80px] font-mono" placeholder="<iframe ...>" />
      </Field>
      <Field label={`Height: ${props.height || 400}px`}>
        <Slider value={[props.height || 400]} min={100} max={800} step={50} onValueChange={([v]) => onChange({ ...props, height: v })} />
      </Field>
    </div>
  );
}

function Columns2ContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Left Column">
        <Textarea value={props.left || ""} onChange={(e) => onChange({ ...props, left: e.target.value })} className="text-sm min-h-[60px]" />
      </Field>
      <Field label="Right Column">
        <Textarea value={props.right || ""} onChange={(e) => onChange({ ...props, right: e.target.value })} className="text-sm min-h-[60px]" />
      </Field>
    </div>
  );
}

function Columns3ContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Column 1">
        <Textarea value={props.col1 || ""} onChange={(e) => onChange({ ...props, col1: e.target.value })} className="text-sm min-h-[50px]" />
      </Field>
      <Field label="Column 2">
        <Textarea value={props.col2 || ""} onChange={(e) => onChange({ ...props, col2: e.target.value })} className="text-sm min-h-[50px]" />
      </Field>
      <Field label="Column 3">
        <Textarea value={props.col3 || ""} onChange={(e) => onChange({ ...props, col3: e.target.value })} className="text-sm min-h-[50px]" />
      </Field>
    </div>
  );
}

// ── Helper component ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

// ── Content editor router ──
function getContentEditor(type: string, props: any, onChange: (p: any) => void, photographerId?: string | null) {
  switch (type) {
    case "hero": return <HeroContentEditor props={props} onChange={onChange} photographerId={photographerId} />;
    case "text": return <TextContentEditor props={props} onChange={onChange} />;
    case "image-text":
    case "text-image": return <ImageTextContentEditor props={props} onChange={onChange} photographerId={photographerId} />;
    case "cta": return <CtaContentEditor props={props} onChange={onChange} />;
    case "contact-form": return <ContactFormContentEditor props={props} onChange={onChange} />;
    case "video": return <VideoContentEditor props={props} onChange={onChange} />;
    case "gallery-grid":
    case "gallery-masonry": return <GalleryContentEditor props={props} onChange={onChange} photographerId={photographerId} />;
    case "slideshow": return <SlideshowContentEditor props={props} onChange={onChange} photographerId={photographerId} />;
    case "carousel": return <SlideshowContentEditor props={props} onChange={onChange} photographerId={photographerId} isCarousel />;
    case "social-links": return <SocialLinksContentEditor props={props} onChange={onChange} />;
    case "logo-strip": return <LogoStripContentEditor props={props} onChange={onChange} photographerId={photographerId} />;
    case "faq-accordion": return <FaqContentEditor props={props} onChange={onChange} />;
    case "stats": return <StatsContentEditor props={props} onChange={onChange} />;
    case "testimonials": return <TestimonialsContentEditor props={props} onChange={onChange} />;
    case "spacer": return <SpacerContentEditor props={props} onChange={onChange} />;
    case "pricing-table": return <PricingContentEditor props={props} onChange={onChange} />;
    case "team": return <TeamContentEditor props={props} onChange={onChange} photographerId={photographerId} />;
    case "timeline": return <TimelineContentEditor props={props} onChange={onChange} />;
    case "embed": return <EmbedContentEditor props={props} onChange={onChange} />;
    case "columns-2": return <Columns2ContentEditor props={props} onChange={onChange} />;
    case "columns-3": return <Columns3ContentEditor props={props} onChange={onChange} />;
    default: return null;
  }
}

// ── Main panel ────────────────────────────────────────────────────────────────

export const BlockSettingsPanel = ({
  section,
  settings,
  onUpdate,
  onUpdateProps,
  onBack,
}: BlockSettingsPanelProps) => {
  const { user } = useAuth();
  const photographerId = user?.id ?? null;
  const s = settings;
  const update = (patch: Partial<BlockSettings>) => onUpdate({ ...s, ...patch });

  const contentEditor = getContentEditor(section.type, section.props, onUpdateProps, photographerId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button onClick={onBack} className="p-1 rounded hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-medium text-foreground">Block Settings</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{section.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Content Fields ── */}
        {contentEditor && (
          <>
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Content</p>
            </div>
            <div className="px-4 pb-4">
              {contentEditor}
            </div>
            <div className="border-t border-border" />
          </>
        )}

        {/* ── Background Color ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Background</p>
        </div>
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value || "none"}
                  onClick={() => update({ backgroundColor: c.value })}
                  className={cn(
                    "w-7 h-7 rounded-md border transition-all",
                    s.backgroundColor === c.value
                      ? "ring-2 ring-primary ring-offset-1"
                      : "border-border hover:border-foreground/30"
                  )}
                  style={{ backgroundColor: c.value || "transparent" }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Background Image</label>
            <ImageUploadField
              value={s.backgroundImage}
              onChange={(url) => update({ backgroundImage: url })}
              photographerId={photographerId}
              folder="block-bg"
            />
          </div>

          {s.backgroundImage && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Image Opacity: {Math.round(s.backgroundOpacity ?? 100)}%
              </label>
              <Slider
                value={[s.backgroundOpacity ?? 100]}
                min={10}
                max={100}
                step={5}
                onValueChange={([v]) => update({ backgroundOpacity: v })}
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* ── Padding ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Spacing</p>
        </div>
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-1.5">
            {PADDING_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => update({ paddingTop: p.top, paddingBottom: p.bottom })}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium border transition-colors",
                  s.paddingTop === p.top && s.paddingBottom === p.bottom
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Top: {s.paddingTop ?? 48}px</label>
            <Slider value={[s.paddingTop ?? 48]} min={0} max={200} step={8} onValueChange={([v]) => update({ paddingTop: v })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Bottom: {s.paddingBottom ?? 48}px</label>
            <Slider value={[s.paddingBottom ?? 48]} min={0} max={200} step={8} onValueChange={([v]) => update({ paddingBottom: v })} />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* ── Color Scheme ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Color Scheme</p>
        </div>
        <div className="px-4 pb-4">
          <Select value={s.colorScheme ?? "auto"} onValueChange={(v) => update({ colorScheme: v as BlockSettings["colorScheme"] })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (inherit)</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border" />

        {/* ── Animation ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Animation</p>
        </div>
        <div className="px-4 pb-4">
          <div className="flex gap-1.5 flex-wrap">
            {ANIMATIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => update({ animation: a.id as BlockSettings["animation"] })}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-medium border transition-colors",
                  (s.animation ?? "none") === a.id
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockSettingsPanel;
