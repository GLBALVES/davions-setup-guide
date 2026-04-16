import { useState } from "react";
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

function HeroContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Headline">
        <Input value={props.headline || ""} onChange={(e) => onChange({ ...props, headline: e.target.value })} className="h-9 text-sm" placeholder="Your headline" />
      </Field>
      <Field label="Subtitle">
        <Input value={props.subtitle || ""} onChange={(e) => onChange({ ...props, subtitle: e.target.value })} className="h-9 text-sm" placeholder="A short subtitle" />
      </Field>
      <Field label="Background Image URL">
        <Input value={props.backgroundImage || ""} onChange={(e) => onChange({ ...props, backgroundImage: e.target.value })} className="h-9 text-sm" placeholder="https://..." />
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

function ImageTextContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input value={props.title || ""} onChange={(e) => onChange({ ...props, title: e.target.value })} className="h-9 text-sm" />
      </Field>
      <Field label="Body">
        <Textarea value={props.body || ""} onChange={(e) => onChange({ ...props, body: e.target.value })} className="text-sm min-h-[80px]" />
      </Field>
      <Field label="Image URL">
        <Input value={props.image || ""} onChange={(e) => onChange({ ...props, image: e.target.value })} className="h-9 text-sm" placeholder="https://..." />
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

function GalleryContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
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
      <Field label="Images (one URL per line)">
        <Textarea
          value={(props.images || []).join("\n")}
          onChange={(e) => onChange({ ...props, images: e.target.value.split("\n").filter(Boolean) })}
          className="text-sm min-h-[80px]"
          placeholder="https://image1.jpg&#10;https://image2.jpg"
        />
      </Field>
    </div>
  );
}

function FaqContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const items: { question: string; answer: string }[] = props.items || [];
  const updateItem = (idx: number, field: string, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ ...props, items: next });
  };
  const addItem = () => onChange({ ...props, items: [...items, { question: "", answer: "" }] });
  const removeItem = (idx: number) => onChange({ ...props, items: items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1.5 p-2 border border-border rounded-md bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">Q{idx + 1}</span>
            <button onClick={() => removeItem(idx)} className="p-0.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3" /></button>
          </div>
          <Input value={item.question} onChange={(e) => updateItem(idx, "question", e.target.value)} className="h-8 text-xs" placeholder="Question" />
          <Textarea value={item.answer} onChange={(e) => updateItem(idx, "answer", e.target.value)} className="text-xs min-h-[50px]" placeholder="Answer" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={addItem}><Plus className="h-3 w-3" /> Add Question</Button>
    </div>
  );
}

function StatsContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const items: { value: string; label: string }[] = props.items || [];
  const updateItem = (idx: number, field: string, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ ...props, items: next });
  };
  const addItem = () => onChange({ ...props, items: [...items, { value: "", label: "" }] });
  const removeItem = (idx: number) => onChange({ ...props, items: items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <Input value={item.value} onChange={(e) => updateItem(idx, "value", e.target.value)} className="h-8 text-xs flex-1" placeholder="500+" />
          <Input value={item.label} onChange={(e) => updateItem(idx, "label", e.target.value)} className="h-8 text-xs flex-1" placeholder="Sessions" />
          <button onClick={() => removeItem(idx)} className="p-1 text-destructive hover:bg-destructive/10 rounded shrink-0"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={addItem}><Plus className="h-3 w-3" /> Add Stat</Button>
    </div>
  );
}

function TestimonialsContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const items: { quote: string; author: string; role: string }[] = props.items || [];
  const updateItem = (idx: number, field: string, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ ...props, items: next });
  };
  const addItem = () => onChange({ ...props, items: [...items, { quote: "", author: "", role: "" }] });
  const removeItem = (idx: number) => onChange({ ...props, items: items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1.5 p-2 border border-border rounded-md bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">#{idx + 1}</span>
            <button onClick={() => removeItem(idx)} className="p-0.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3" /></button>
          </div>
          <Textarea value={item.quote} onChange={(e) => updateItem(idx, "quote", e.target.value)} className="text-xs min-h-[50px]" placeholder="Testimonial quote..." />
          <div className="flex gap-2">
            <Input value={item.author} onChange={(e) => updateItem(idx, "author", e.target.value)} className="h-8 text-xs" placeholder="Name" />
            <Input value={item.role} onChange={(e) => updateItem(idx, "role", e.target.value)} className="h-8 text-xs" placeholder="Role" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={addItem}><Plus className="h-3 w-3" /> Add Testimonial</Button>
    </div>
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
  const updatePlan = (idx: number, field: string, value: any) => {
    const next = [...plans];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ ...props, plans: next });
  };
  const addPlan = () => onChange({ ...props, plans: [...plans, { name: "", price: "", features: [""] }] });
  const removePlan = (idx: number) => onChange({ ...props, plans: plans.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {plans.map((plan, idx) => (
        <div key={idx} className="space-y-1.5 p-2 border border-border rounded-md bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">Plan {idx + 1}</span>
            <button onClick={() => removePlan(idx)} className="p-0.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3" /></button>
          </div>
          <Input value={plan.name} onChange={(e) => updatePlan(idx, "name", e.target.value)} className="h-8 text-xs" placeholder="Plan name" />
          <Input value={plan.price} onChange={(e) => updatePlan(idx, "price", e.target.value)} className="h-8 text-xs" placeholder="$199" />
          <Textarea
            value={(plan.features || []).join("\n")}
            onChange={(e) => updatePlan(idx, "features", e.target.value.split("\n"))}
            className="text-xs min-h-[50px]"
            placeholder="Feature 1&#10;Feature 2"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={addPlan}><Plus className="h-3 w-3" /> Add Plan</Button>
    </div>
  );
}

function TeamContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const members: { name: string; role: string; photo: string }[] = props.members || [];
  const updateMember = (idx: number, field: string, value: string) => {
    const next = [...members];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ ...props, members: next });
  };
  const addMember = () => onChange({ ...props, members: [...members, { name: "", role: "", photo: "" }] });
  const removeMember = (idx: number) => onChange({ ...props, members: members.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {members.map((m, idx) => (
        <div key={idx} className="space-y-1.5 p-2 border border-border rounded-md bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">Member {idx + 1}</span>
            <button onClick={() => removeMember(idx)} className="p-0.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3" /></button>
          </div>
          <Input value={m.name} onChange={(e) => updateMember(idx, "name", e.target.value)} className="h-8 text-xs" placeholder="Name" />
          <Input value={m.role} onChange={(e) => updateMember(idx, "role", e.target.value)} className="h-8 text-xs" placeholder="Role" />
          <Input value={m.photo} onChange={(e) => updateMember(idx, "photo", e.target.value)} className="h-8 text-xs" placeholder="Photo URL" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={addMember}><Plus className="h-3 w-3" /> Add Member</Button>
    </div>
  );
}

function TimelineContentEditor({ props, onChange }: { props: any; onChange: (p: any) => void }) {
  const events: { year: string; title: string; description: string }[] = props.events || [];
  const updateEvent = (idx: number, field: string, value: string) => {
    const next = [...events];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ ...props, events: next });
  };
  const addEvent = () => onChange({ ...props, events: [...events, { year: "", title: "", description: "" }] });
  const removeEvent = (idx: number) => onChange({ ...props, events: events.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {events.map((ev, idx) => (
        <div key={idx} className="space-y-1.5 p-2 border border-border rounded-md bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">Event {idx + 1}</span>
            <button onClick={() => removeEvent(idx)} className="p-0.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3" /></button>
          </div>
          <Input value={ev.year} onChange={(e) => updateEvent(idx, "year", e.target.value)} className="h-8 text-xs" placeholder="2024" />
          <Input value={ev.title} onChange={(e) => updateEvent(idx, "title", e.target.value)} className="h-8 text-xs" placeholder="Title" />
          <Textarea value={ev.description} onChange={(e) => updateEvent(idx, "description", e.target.value)} className="text-xs min-h-[40px]" placeholder="Description" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={addEvent}><Plus className="h-3 w-3" /> Add Event</Button>
    </div>
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
function getContentEditor(type: string, props: any, onChange: (p: any) => void) {
  switch (type) {
    case "hero": return <HeroContentEditor props={props} onChange={onChange} />;
    case "text": return <TextContentEditor props={props} onChange={onChange} />;
    case "image-text":
    case "text-image": return <ImageTextContentEditor props={props} onChange={onChange} />;
    case "cta": return <CtaContentEditor props={props} onChange={onChange} />;
    case "contact-form": return <ContactFormContentEditor props={props} onChange={onChange} />;
    case "video": return <VideoContentEditor props={props} onChange={onChange} />;
    case "gallery-grid":
    case "gallery-masonry": return <GalleryContentEditor props={props} onChange={onChange} />;
    case "faq-accordion": return <FaqContentEditor props={props} onChange={onChange} />;
    case "stats": return <StatsContentEditor props={props} onChange={onChange} />;
    case "testimonials": return <TestimonialsContentEditor props={props} onChange={onChange} />;
    case "spacer": return <SpacerContentEditor props={props} onChange={onChange} />;
    case "pricing-table": return <PricingContentEditor props={props} onChange={onChange} />;
    case "team": return <TeamContentEditor props={props} onChange={onChange} />;
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
  const s = settings;
  const update = (patch: Partial<BlockSettings>) => onUpdate({ ...s, ...patch });

  const contentEditor = getContentEditor(section.type, section.props, onUpdateProps);

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
            <div className="border border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer">
              <Upload className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">Upload Image</span>
            </div>
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
