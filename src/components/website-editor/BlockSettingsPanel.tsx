import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUploadField } from "./ImageUploadField";
import { ItemListEditor } from "./ItemListEditor";
import { ButtonsList, ButtonsListEditor, type BlockBtn } from "./ButtonsListEditor";
import { RichTextField } from "./RichTextField";
import { FocalPointPicker } from "./FocalPointPicker";
import type { PageSection } from "./page-templates";

// ── Block Settings ────────────────────────────────────────────────────────────

export interface BlockSettings {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  backgroundFocalX?: number;
  backgroundFocalY?: number;
  overlayColor?: string;
  overlayOpacity?: number;
  paddingTop?: number;
  paddingBottom?: number;
  colorScheme?: "light" | "dark" | "auto";
  animation?: "none" | "fade-up" | "fade-in" | "slide-left";
}

// Reusable overlay controls (color + opacity slider) for background images
function OverlayControls({
  color,
  opacity,
  onChange,
}: {
  color?: string;
  opacity?: number;
  onChange: (patch: { overlayColor?: string; overlayOpacity?: number }) => void;
}) {
  const effectiveColor = color || "#000000";
  const effectiveOpacity = typeof opacity === "number" ? opacity : 40;
  return (
    <div className="space-y-2 rounded-md border border-border/60 p-3">
      <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
        Image Overlay
      </p>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Overlay Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={effectiveColor}
            onChange={(e) => onChange({ overlayColor: e.target.value })}
            className="h-9 w-10 rounded cursor-pointer border border-border bg-background"
          />
          <Input
            value={effectiveColor}
            onChange={(e) => onChange({ overlayColor: e.target.value })}
            placeholder="#000000"
            className="h-9 text-sm font-mono flex-1"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Overlay Opacity: {Math.round(effectiveOpacity)}%
        </label>
        <Slider
          value={[effectiveOpacity]}
          min={0}
          max={100}
          step={5}
          onValueChange={([v]) => onChange({ overlayOpacity: v })}
          className="w-full"
        />
      </div>
    </div>
  );
}

const PRESET_COLORS = [
  { label: "None", value: "" },
  { label: "White", value: "#ffffff" },
  { label: "Off White", value: "#fafaf9" },
  { label: "Light Gray", value: "#f5f5f4" },
  { label: "Gray", value: "#d6d3d1" },
  { label: "Slate", value: "#64748b" },
  { label: "Dark", value: "#171717" },
  { label: "Black", value: "#000000" },
  { label: "Primary", value: "hsl(var(--primary))" },
  { label: "Cream", value: "#f5efe6" },
  { label: "Sand", value: "#e7dcc8" },
  { label: "Beige", value: "#d4c5a9" },
  { label: "Blush", value: "#f5d6d0" },
  { label: "Rose", value: "#e8b4b8" },
  { label: "Mauve", value: "#a78a8a" },
  { label: "Sage", value: "#b8c5b0" },
  { label: "Olive", value: "#7d8a5c" },
  { label: "Forest", value: "#3a5a40" },
  { label: "Mint", value: "#c8e0d4" },
  { label: "Sky", value: "#bfd9e8" },
  { label: "Ocean", value: "#4a7a96" },
  { label: "Navy", value: "#1e3a5f" },
  { label: "Lavender", value: "#d4c5e2" },
  { label: "Purple", value: "#6b4e8a" },
  { label: "Plum", value: "#3d2645" },
  { label: "Terracotta", value: "#c97b63" },
  { label: "Rust", value: "#8b4513" },
  { label: "Mustard", value: "#d4a574" },
  { label: "Gold", value: "#b89968" },
  { label: "Brown", value: "#5c4033" },
  { label: "Espresso", value: "#3e2723" },
];

function isHexColor(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

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
        <RichTextField value={props.headline || ""} onChange={(v) => onChange({ ...props, headline: v })} placeholder="Your headline" />
      </Field>
      <Field label="Subtitle">
        <RichTextField value={props.subtitle || ""} onChange={(v) => onChange({ ...props, subtitle: v })} placeholder="A short subtitle" />
      </Field>
      <Field label="Background Image">
        <ImageUploadField
          value={props.backgroundImage}
          onChange={(url) => onChange({ ...props, backgroundImage: url })}
          photographerId={photographerId}
          folder="hero"
        />
      </Field>
      {props.backgroundImage && (
        <FocalPointPicker
          imageUrl={props.backgroundImage}
          focalX={props.bgFocalX}
          focalY={props.bgFocalY}
          onChange={(x, y) => onChange({ ...props, bgFocalX: x, bgFocalY: y })}
          onReset={() => onChange({ ...props, bgFocalX: 50, bgFocalY: 50 })}
        />
      )}
      {props.backgroundImage && (
        <OverlayControls
          color={props.bgOverlayColor}
          opacity={props.bgOverlayOpacity}
          onChange={(patch) =>
            onChange({
              ...props,
              ...(patch.overlayColor !== undefined ? { bgOverlayColor: patch.overlayColor } : {}),
              ...(patch.overlayOpacity !== undefined ? { bgOverlayOpacity: patch.overlayOpacity } : {}),
            })
          }
        />
      )}
      <ButtonsListEditor props={props} onChange={onChange} />
    </div>
  );
}

function TextContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const align = props.align || "center";
  return (
    <div className="space-y-3">
      <Field label="Title (optional)">
        <RichTextField
          value={props.title || ""}
          onChange={(v) => onChange({ ...props, title: v })}
          placeholder="e.g. Timeless & Minimalist Maternity..."
        />
      </Field>
      <Field label="Subtitle (optional)">
        <RichTextField
          value={props.subtitle || ""}
          onChange={(v) => onChange({ ...props, subtitle: v })}
          placeholder="e.g. Serving Houston, Sugar Land..."
        />
      </Field>
      <Field label="Body">
        <RichTextField multiline value={props.body || ""} onChange={(v) => onChange({ ...props, body: v })} placeholder="Write your content here..." />
      </Field>
      <Field label="Alignment">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ ...props, align: a })}
              className={`flex-1 h-8 text-xs rounded border capitalize ${align === a ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:bg-muted"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function ImageTextContentEditor({ props, onChange, photographerId }: { props: any; onChange: (p: any) => void; photographerId?: string | null }) {
  return (
    <div className="space-y-3">
      <Field label="Title">
        <RichTextField value={props.title || ""} onChange={(v) => onChange({ ...props, title: v })} />
      </Field>
      <Field label="Body">
        <RichTextField multiline value={props.body || ""} onChange={(v) => onChange({ ...props, body: v })} />
      </Field>
      <Field label="Image">
        <ImageUploadField
          value={props.image}
          onChange={(url) => onChange({ ...props, image: url })}
          photographerId={photographerId}
          folder="image-text"
        />
      </Field>
      <ButtonsListEditor props={props} onChange={onChange} />
    </div>
  );
}

function CtaContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Headline">
        <RichTextField value={props.headline || ""} onChange={(v) => onChange({ ...props, headline: v })} />
      </Field>
      <ButtonsListEditor props={props} onChange={onChange} />
    </div>
  );
}

function ContactFormContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <Field label="Submit Label">
      <RichTextField value={props.submitLabel || "Send"} onChange={(v) => onChange({ ...props, submitLabel: v })} />
    </Field>
  );
}

function VideoContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setError(null);
    if (file.size > 100 * 1024 * 1024) {
      setError("File too large (max 100MB).");
      return;
    }
    setUploading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("site-videos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("site-videos").getPublicUrl(path);
      onChange({ ...props, url: data.publicUrl });
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Video URL (YouTube, Vimeo or .mp4/.webm)">
        <Input
          value={props.url || ""}
          onChange={(e) => onChange({ ...props, url: e.target.value })}
          className="h-9 text-sm"
          placeholder="https://youtube.com/... or https://your-cdn.com/video.mp4"
        />
      </Field>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or upload</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Field label="Upload video file (max 100MB)">
        <label
          className={cn(
            "flex h-9 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-background px-3 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/ogg"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading ? "Uploading…" : "Choose video file (.mp4, .webm, .mov)"}
        </label>
      </Field>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {props.url && /supabase.*site-videos/i.test(props.url) && (
        <p className="text-[11px] text-primary leading-relaxed">
          ✓ Uploaded video in use. Edit the URL above to switch to YouTube/Vimeo.
        </p>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Tip: uploading a file (or pasting a direct .mp4/.webm link) uses a clean native player with only play & volume — no titles, branding or related videos.
      </p>
    </div>
  );
}

type GalleryItem = { image: string; title?: string; caption?: string; link?: string };

function normalizeGalleryItems(raw: any[]): GalleryItem[] {
  return (raw || []).map((s) =>
    typeof s === "string" ? { image: s } : { image: s?.image ?? "", title: s?.title, caption: s?.caption, link: s?.link }
  );
}

function GalleryContentEditor({ props, onChange, photographerId }: { props: any; onChange: (p: any) => void; photographerId?: string | null }) {
  const items: GalleryItem[] = normalizeGalleryItems(props.images || []);
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
          items={items}
          onChange={(next) => onChange({ ...props, images: next })}
          itemLabel="Image"
          addLabel="Add Image"
          newItem={() => ({ image: "", title: "", caption: "", link: "" })}
          renderLabel={(it) => it.title || (it.image ? it.image.split("/").pop() || it.image : "Empty image")}
          renderDetail={(item, update) => (
            <div className="space-y-3">
              <ImageUploadField
                value={item.image}
                onChange={(url) => update({ image: url ?? "" })}
                photographerId={photographerId}
                folder="gallery"
              />
              <Field label="Title (optional)">
                <RichTextField value={item.title || ""} onChange={(v) => update({ title: v })} placeholder="Image title" />
              </Field>
              <Field label="Caption (optional)">
                <RichTextField multiline value={item.caption || ""} onChange={(v) => update({ caption: v })} placeholder="Short description" />
              </Field>
              <Field label="Link URL (optional)">
                <Input value={item.link || ""} onChange={(e) => update({ link: e.target.value })} className="h-9 text-sm" placeholder="https://..." />
              </Field>
            </div>
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
  const autoplay = props.autoplay ?? !isCarousel; // slideshow defaults on, carousel off
  const interval = props.interval ?? 5000;
  return (
    <div className="space-y-3">
      {isCarousel && (
        <Field label={`Visible items: ${props.itemsVisible ?? 3}`}>
          <Slider value={[props.itemsVisible ?? 3]} min={1} max={6} step={1} onValueChange={([v]) => onChange({ ...props, itemsVisible: v })} />
        </Field>
      )}
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground">Autoplay</p>
          <p className="text-[10px] text-muted-foreground">Advance slides automatically</p>
        </div>
        <Switch checked={autoplay} onCheckedChange={(v) => onChange({ ...props, autoplay: v })} />
      </div>
      {autoplay && (
        <Field label={`Interval: ${interval / 1000}s`}>
          <Slider value={[interval]} min={2000} max={15000} step={500} onValueChange={([v]) => onChange({ ...props, interval: v })} />
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
                <RichTextField value={item.title || ""} onChange={(v) => update({ title: v })} placeholder="Slide title" />
              </Field>
              <Field label="Caption">
                <RichTextField multiline value={item.caption || ""} onChange={(v) => update({ caption: v })} placeholder="Short description shown on the slide" />
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
        <RichTextField value={props.title || ""} onChange={(v) => onChange({ ...props, title: v })} placeholder="As Seen On" />
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
            <RichTextField value={item.question} onChange={(v) => update({ question: v })} placeholder="Question" />
          </Field>
          <Field label="Answer">
            <RichTextField multiline value={item.answer} onChange={(v) => update({ answer: v })} placeholder="Answer" />
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
            <RichTextField value={item.value} onChange={(v) => update({ value: v })} placeholder="500+" />
          </Field>
          <Field label="Label">
            <RichTextField value={item.label} onChange={(v) => update({ label: v })} placeholder="Sessions" />
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
            <RichTextField multiline value={item.quote} onChange={(v) => update({ quote: v })} placeholder="Testimonial quote..." />
          </Field>
          <Field label="Author">
            <RichTextField value={item.author} onChange={(v) => update({ author: v })} placeholder="Name" />
          </Field>
          <Field label="Role">
            <RichTextField value={item.role} onChange={(v) => update({ role: v })} placeholder="Role / Company" />
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
            <RichTextField value={item.name} onChange={(v) => update({ name: v })} placeholder="Standard" />
          </Field>
          <Field label="Price">
            <RichTextField value={item.price} onChange={(v) => update({ price: v })} placeholder="$199" />
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
            <RichTextField value={item.name} onChange={(v) => update({ name: v })} placeholder="Full name" />
          </Field>
          <Field label="Role">
            <RichTextField value={item.role} onChange={(v) => update({ role: v })} placeholder="Photographer" />
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
            <RichTextField value={item.year} onChange={(v) => update({ year: v })} placeholder="2024" />
          </Field>
          <Field label="Title">
            <RichTextField value={item.title} onChange={(v) => update({ title: v })} placeholder="Milestone" />
          </Field>
          <Field label="Description">
            <RichTextField multiline value={item.description} onChange={(v) => update({ description: v })} placeholder="What happened…" />
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
        <RichTextField multiline value={props.left || ""} onChange={(v) => onChange({ ...props, left: v })} />
      </Field>
      <Field label="Right Column">
        <RichTextField multiline value={props.right || ""} onChange={(v) => onChange({ ...props, right: v })} />
      </Field>
    </div>
  );
}

function Columns3ContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Column 1">
        <RichTextField multiline value={props.col1 || ""} onChange={(v) => onChange({ ...props, col1: v })} />
      </Field>
      <Field label="Column 2">
        <RichTextField multiline value={props.col2 || ""} onChange={(v) => onChange({ ...props, col2: v })} />
      </Field>
      <Field label="Column 3">
        <RichTextField multiline value={props.col3 || ""} onChange={(v) => onChange({ ...props, col3: v })} />
      </Field>
    </div>
  );
}

function MapContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Address">
        <Input value={props.address || ""} onChange={(e) => onChange({ ...props, address: e.target.value })} className="h-9 text-sm" placeholder="123 Main St, City" />
      </Field>
      <Field label={`Height: ${props.height || 400}px`}>
        <Slider value={[props.height || 400]} min={200} max={800} step={20} onValueChange={([v]) => onChange({ ...props, height: v })} />
      </Field>
    </div>
  );
}

function DividerContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <Field label="Style">
      <Select value={props.style || "line"} onValueChange={(v) => onChange({ ...props, style: v })}>
        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="line">Line</SelectItem>
          <SelectItem value="dashed">Dashed</SelectItem>
          <SelectItem value="dotted">Dotted</SelectItem>
          <SelectItem value="thick">Thick</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

function InstagramFeedContentEditor({ props, onChange, photographerId }: { props: any; onChange: (p: any) => void; photographerId?: string | null }) {
  const posts: { image: string; link: string; caption?: string }[] = props.posts || [];
  return (
    <div className="space-y-3">
      <Field label="Username (without @)">
        <Input value={props.username || ""} onChange={(e) => onChange({ ...props, username: e.target.value })} className="h-9 text-sm" placeholder="yourstudio" />
      </Field>
      <Field label="Columns">
        <Select value={String(props.columns || 3)} onValueChange={(v) => onChange({ ...props, columns: Number(v) })}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="6">6</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Posts">
        <ItemListEditor
          items={posts}
          onChange={(next) => onChange({ ...props, posts: next })}
          itemLabel="Post"
          addLabel="Add Post"
          newItem={() => ({ image: "", link: "", caption: "" })}
          renderLabel={(it) => it.caption || (it.link ? it.link.replace(/^https?:\/\//, "").slice(0, 30) : "Empty")}
          renderDetail={(item, update) => (
            <div className="space-y-2">
              <Field label="Image">
                <ImageUploadField
                  value={item.image}
                  onChange={(url) => update({ image: url ?? "" })}
                  photographerId={photographerId}
                  folder="instagram"
                  aspectClass="aspect-square"
                />
              </Field>
              <Field label="Post link (optional)">
                <Input value={item.link || ""} onChange={(e) => update({ link: e.target.value })} className="h-9 text-sm" placeholder="https://instagram.com/p/..." />
              </Field>
              <Field label="Caption (optional)">
                <RichTextField value={item.caption || ""} onChange={(v) => update({ caption: v })} placeholder="Short description" />
              </Field>
            </div>
          )}
        />
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
    case "map": return <MapContentEditor props={props} onChange={onChange} />;
    case "divider": return <DividerContentEditor props={props} onChange={onChange} />;
    case "instagram-feed": return <InstagramFeedContentEditor props={props} onChange={onChange} photographerId={photographerId} />;
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
            <div className="grid grid-cols-8 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value || "none"}
                  type="button"
                  onClick={() => update({ backgroundColor: c.value })}
                  className={cn(
                    "w-7 h-7 rounded-md border transition-all relative",
                    s.backgroundColor === c.value
                      ? "ring-2 ring-primary ring-offset-1"
                      : "border-border hover:border-foreground/30",
                    !c.value && "bg-[conic-gradient(from_0deg,#fff,#eee,#fff)]"
                  )}
                  style={c.value ? { backgroundColor: c.value } : undefined}
                  title={c.label}
                >
                  {!c.value && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-muted-foreground">∅</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Custom (HEX)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={isHexColor(s.backgroundColor || "") ? s.backgroundColor : "#ffffff"}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="h-9 w-10 rounded-md border border-border cursor-pointer bg-background p-0.5"
              />
              <Input
                value={s.backgroundColor || ""}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                placeholder="#000000"
                className="h-9 text-sm font-mono flex-1"
              />
              {s.backgroundColor && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs"
                  onClick={() => update({ backgroundColor: "" })}
                >
                  Clear
                </Button>
              )}
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
            <FocalPointPicker
              imageUrl={s.backgroundImage}
              focalX={s.backgroundFocalX}
              focalY={s.backgroundFocalY}
              onChange={(x, y) => update({ backgroundFocalX: x, backgroundFocalY: y })}
              onReset={() => update({ backgroundFocalX: 50, backgroundFocalY: 50 })}
            />
          )}

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

          {s.backgroundImage && (
            <OverlayControls
              color={s.overlayColor}
              opacity={s.overlayOpacity}
              onChange={(patch) => update(patch)}
            />
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
