import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "./ImageUploadField";
import type { SiteConfig } from "@/components/store/PublicSiteRenderer";

export type BlockKey = "hero" | "sessions" | "portfolio" | "about" | "quote" | "experience" | "contact" | "footer" | "testimonials";

interface Props {
  blockKey: BlockKey;
  data: Partial<SiteConfig> & { bio?: string };
  onChange: (patch: Partial<SiteConfig> & { bio?: string }) => void;
  onBack: () => void;
  /** When true, suppress the built-in header (used when the panel is hosted in LivePreview) */
  hideHeader?: boolean;
}

const BLOCK_LABELS: Record<BlockKey, string> = {
  hero: "Hero",
  sessions: "Sessions",
  portfolio: "Portfolio",
  about: "About",
  quote: "Quote",
  experience: "Experience",
  contact: "Contact",
  footer: "Footer",
  testimonials: "Testimonials",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-foreground font-light">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function BlockPanel({ blockKey, data, onChange, onBack, hideHeader }: Props) {
  const p = (patch: Parameters<typeof onChange>[0]) => onChange(patch);

  return (
    <div className="flex flex-col h-full">
      {/* Header — hidden when embedded in LivePreview float panel */}
      {!hideHeader && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <button onClick={onBack} className="p-1 hover:bg-muted rounded-sm transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] tracking-[0.25em] uppercase font-light">{BLOCK_LABELS[blockKey]}</span>
        </div>
      )}

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {blockKey === "hero" && (
          <>
            {/* Layout selector */}
            <Field label="Layout">
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "full", label: "Full Bleed", desc: "Image fills background" },
                  { value: "split", label: "Split", desc: "Image + text side-by-side" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => p({ hero_layout: opt.value } as any)}
                    className={`p-2.5 border rounded-sm text-left transition-colors ${
                      ((data as any).hero_layout ?? "full") === opt.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <span className="text-[10px] font-medium block mb-0.5">{opt.label}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </Field>
            <ImageUploadField label="Hero Image" value={data.site_hero_image_url ?? null} onChange={(url) => p({ site_hero_image_url: url })} />
            <div className="flex flex-col gap-0.5 -mt-2">
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">📍 Full-screen background of the <strong>hero section</strong> at the top of your site.</p>
              <p className="text-[10px] text-muted-foreground/50 leading-relaxed">Recommended: JPG or WebP · 1920×1080 px (16:9) · max 5 MB · horizontal/landscape</p>
            </div>
            <Field label="Headline">
              <Input value={data.site_headline ?? ""} onChange={(e) => p({ site_headline: e.target.value })} className="h-8 text-xs" placeholder="Your studio name" />
            </Field>
            <Field label="Subheadline">
              <Input value={data.site_subheadline ?? ""} onChange={(e) => p({ site_subheadline: e.target.value })} className="h-8 text-xs" placeholder="A short tagline" />
            </Field>
            <Field label="CTA Button Text">
              <Input value={data.cta_text ?? ""} onChange={(e) => p({ cta_text: e.target.value })} className="h-8 text-xs" placeholder="Book a Session" />
            </Field>
            <Field label="CTA Link (optional)">
              <Input value={data.cta_link ?? ""} onChange={(e) => p({ cta_link: e.target.value })} className="h-8 text-xs" placeholder="https://..." />
            </Field>
          </>
        )}

        {blockKey === "sessions" && (
          <>
            <ToggleField label="Show Sessions section" checked={data.show_store ?? true} onChange={(v) => p({ show_store: v })} />
            <ToggleField label="Show booking CTA" checked={data.show_booking ?? true} onChange={(v) => p({ show_booking: v })} />
            <p className="text-[10px] text-muted-foreground leading-relaxed">Sessions are managed in the Sessions section of the dashboard. Toggle visibility to show/hide this section on your public site.</p>
          </>
        )}

        {blockKey === "portfolio" && (
          <>
            <ToggleField label="Show Portfolio section" checked={data.show_store ?? true} onChange={(v) => p({ show_store: v })} />
            <p className="text-[10px] text-muted-foreground leading-relaxed">Portfolio galleries are managed in the Galleries section of the dashboard.</p>
          </>
        )}

        {blockKey === "about" && (
          <>
            <ToggleField label="Show About section" checked={data.show_about ?? true} onChange={(v) => p({ show_about: v })} />
            {/* Layout selector */}
            <Field label="Image Layout">
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: "image-right", label: "Right" },
                  { value: "image-left", label: "Left" },
                  { value: "text-only", label: "Text Only" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => p({ about_layout: opt.value } as any)}
                    className={`py-2 px-1 border rounded-sm text-[10px] transition-colors ${
                      ((data as any).about_layout ?? "image-right") === opt.value
                        ? "border-foreground bg-foreground/5 font-medium"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Section Title">
              <Input value={data.about_title ?? "About"} onChange={(e) => p({ about_title: e.target.value })} className="h-8 text-xs" />
            </Field>
            <ImageUploadField label="About Image" value={data.about_image_url ?? null} onChange={(url) => p({ about_image_url: url })} />
            <div className="flex flex-col gap-0.5 -mt-2">
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">📍 Portrait photo shown next to your bio in the <strong>About section</strong>.</p>
              <p className="text-[10px] text-muted-foreground/50 leading-relaxed">Recommended: JPG or PNG · 600×800 px (3:4 portrait) · max 3 MB</p>
            </div>
            <Field label="Bio">
              <Textarea value={data.bio ?? ""} onChange={(e) => p({ bio: e.target.value })} className="text-xs min-h-[100px] resize-none" placeholder="Tell clients about yourself..." />
            </Field>
          </>
        )}

        {blockKey === "quote" && (
          <>
            <Field label="Quote Text">
              <Textarea value={data.quote_text ?? ""} onChange={(e) => p({ quote_text: e.target.value })} className="text-xs min-h-[80px] resize-none" placeholder="An inspiring quote..." />
            </Field>
            <Field label="Quote Author">
              <Input value={data.quote_author ?? ""} onChange={(e) => p({ quote_author: e.target.value })} className="h-8 text-xs" placeholder="— Your Name" />
            </Field>
          </>
        )}

        {blockKey === "experience" && (
          <>
            <Field label="Section Title">
              <Input value={data.experience_title ?? ""} onChange={(e) => p({ experience_title: e.target.value })} className="h-8 text-xs" placeholder="The Experience" />
            </Field>
            <Field label="Description">
              <Textarea value={data.experience_text ?? ""} onChange={(e) => p({ experience_text: e.target.value })} className="text-xs min-h-[100px] resize-none" placeholder="Describe what clients can expect..." />
            </Field>
          </>
        )}

        {blockKey === "contact" && (
          <>
            <ToggleField label="Show Contact / Social links" checked={data.show_contact ?? true} onChange={(v) => p({ show_contact: v })} />
            <Field label="Instagram">
              <Input value={data.instagram_url ?? ""} onChange={(e) => p({ instagram_url: e.target.value })} className="h-8 text-xs" placeholder="https://instagram.com/yourstudio" />
            </Field>
            <Field label="Facebook">
              <Input value={data.facebook_url ?? ""} onChange={(e) => p({ facebook_url: e.target.value })} className="h-8 text-xs" placeholder="https://facebook.com/yourstudio" />
            </Field>
            <Field label="YouTube">
              <Input value={data.youtube_url ?? ""} onChange={(e) => p({ youtube_url: e.target.value })} className="h-8 text-xs" placeholder="https://youtube.com/..." />
            </Field>
            <Field label="TikTok">
              <Input value={data.tiktok_url ?? ""} onChange={(e) => p({ tiktok_url: e.target.value })} className="h-8 text-xs" placeholder="https://tiktok.com/@yourstudio" />
            </Field>
            <Field label="Pinterest">
              <Input value={data.pinterest_url ?? ""} onChange={(e) => p({ pinterest_url: e.target.value })} className="h-8 text-xs" placeholder="https://pinterest.com/..." />
            </Field>
            <Field label="LinkedIn">
              <Input value={data.linkedin_url ?? ""} onChange={(e) => p({ linkedin_url: e.target.value })} className="h-8 text-xs" placeholder="https://linkedin.com/in/..." />
            </Field>
            <Field label="WhatsApp (number only)">
              <Input value={data.whatsapp ?? ""} onChange={(e) => p({ whatsapp: e.target.value })} className="h-8 text-xs" placeholder="5511999999999" />
            </Field>
          </>
        )}

        {blockKey === "footer" && (
          <>
            <Field label="Footer Text">
              <Input value={data.footer_text ?? ""} onChange={(e) => p({ footer_text: e.target.value })} className="h-8 text-xs" placeholder="© 2025 Your Studio" />
            </Field>
            <ToggleField label="Show Blog link in nav" checked={data.show_blog ?? false} onChange={(v) => p({ show_blog: v })} />
          </>
        )}

        {blockKey === "testimonials" && (() => {
          const testimonials: import("@/components/store/PublicSiteRenderer").Testimonial[] = (data as any).testimonials ?? [];
          const update = (items: typeof testimonials) => (onChange as any)({ testimonials: items });
          const add = () => update([...testimonials, { id: crypto.randomUUID(), name: "", text: "", role: "", rating: 5 }]);
          const remove = (id: string) => update(testimonials.filter((t) => t.id !== id));
          const edit = (id: string, patch: Partial<typeof testimonials[0]>) =>
            update(testimonials.map((t) => t.id === id ? { ...t, ...patch } : t));

          return (
            <>
              {/* Layout selector */}
              <Field label="Layout">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "cards", label: "Cards", desc: "Grid of review cards" },
                    { value: "quotes", label: "Quotes", desc: "Centered pull quotes" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => (onChange as any)({ testimonials_layout: opt.value })}
                      className={`p-2.5 border rounded-sm text-left transition-colors ${
                        ((data as any).testimonials_layout ?? "cards") === opt.value
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      <span className="text-[10px] font-medium block mb-0.5">{opt.label}</span>
                      <span className="text-[9px] text-muted-foreground leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Section Title">
                <Input
                  value={(data as any).testimonials_title ?? ""}
                  onChange={(e) => (onChange as any)({ testimonials_title: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="What Clients Say"
                />
              </Field>

              {/* Testimonial list */}
              <div className="flex flex-col gap-4">
                {testimonials.map((t, idx) => (
                  <div key={t.id} className="border border-border rounded-sm p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-light">#{idx + 1}</span>
                      <button onClick={() => remove(t.id)} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Field label="Name">
                      <Input value={t.name} onChange={(e) => edit(t.id, { name: e.target.value })} className="h-7 text-xs" placeholder="Client Name" />
                    </Field>
                    <Field label="Role / Location (optional)">
                      <Input value={t.role ?? ""} onChange={(e) => edit(t.id, { role: e.target.value })} className="h-7 text-xs" placeholder="Wedding Client · São Paulo" />
                    </Field>
                    <Field label="Review">
                      <Textarea value={t.text} onChange={(e) => edit(t.id, { text: e.target.value })} className="text-xs min-h-[70px] resize-none" placeholder="Write what this client said..." />
                    </Field>
                    {/* Star rating */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground">Rating</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => edit(t.id, { rating: star })}
                            className={`transition-colors ${star <= (t.rating ?? 5) ? "text-foreground" : "text-muted-foreground/30"}`}
                          >
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={add}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-border hover:border-foreground/50 text-[10px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors rounded-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Testimonial
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );
}
