import { useEffect, useState } from "react";
import { ChevronLeft, FileText, Eye, EyeOff, ImageIcon, Type, AlignLeft, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "./ImageUploadField";
import type { SitePage } from "./PagesTab";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageContent {
  page_title?: string;
  page_headline?: string;
  page_subheadline?: string;
  page_body?: string;
  page_cover_url?: string;
  page_show_cover?: boolean;
  page_cta_text?: string;
  page_cta_link?: string;
  custom_sections?: CustomSection[];
}

export interface CustomSection {
  id: string;
  type: "text" | "image" | "text_image";
  heading?: string;
  body?: string;
  image_url?: string;
  image_side?: "left" | "right";
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{hint}</p>}
    </div>
  );
}

// ── Custom section block ──────────────────────────────────────────────────────

function CustomSectionBlock({
  section,
  onUpdate,
  onDelete,
}: {
  section: CustomSection;
  onUpdate: (patch: Partial<CustomSection>) => void;
  onDelete: () => void;
}) {
  const typeLabels: Record<string, string> = {
    text: "Text Block",
    image: "Image Block",
    text_image: "Text + Image",
  };

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
        <span className="text-[10px] font-medium tracking-[0.05em] text-foreground/70">
          {typeLabels[section.type] ?? "Block"}
        </span>
        <button
          onClick={onDelete}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove block"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Heading — shown for text and text_image */}
        {(section.type === "text" || section.type === "text_image") && (
          <Field label="Heading">
            <Input
              value={section.heading ?? ""}
              onChange={(e) => onUpdate({ heading: e.target.value })}
              className="h-7 text-xs"
              placeholder="Section heading..."
            />
          </Field>
        )}

        {/* Body — text / text_image */}
        {(section.type === "text" || section.type === "text_image") && (
          <Field label="Body">
            <Textarea
              value={section.body ?? ""}
              onChange={(e) => onUpdate({ body: e.target.value })}
              className="text-xs min-h-[70px] resize-none"
              placeholder="Write your content here..."
            />
          </Field>
        )}

        {/* Image — image / text_image */}
        {(section.type === "image" || section.type === "text_image") && (
          <div className="flex flex-col gap-0">
            <ImageUploadField
              label=""
              value={section.image_url ?? null}
              onChange={(url) => onUpdate({ image_url: url ?? undefined })}
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1 leading-relaxed">
              JPG or PNG · max 5 MB
            </p>
          </div>
        )}

        {/* Image side — text_image only */}
        {section.type === "text_image" && (
          <Field label="Image Position">
            <div className="flex gap-2">
              {(["left", "right"] as const).map((side) => (
                <button
                  key={side}
                  onClick={() => onUpdate({ image_side: side })}
                  className={`flex-1 py-1.5 text-[10px] border rounded-sm transition-colors capitalize ${
                    (section.image_side ?? "right") === side
                      ? "border-foreground bg-foreground/5 font-medium"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  page: SitePage;
  onBack: () => void;
  onChange: (id: string, content: PageContent) => void;
}

export function PageContentPanel({ page, onBack, onChange }: Props) {
  const [content, setContent] = useState<PageContent>(() => ({
    page_title: page.title,
    page_show_cover: true,
    ...((page.page_content ?? {}) as PageContent),
  }));

  // Sync when page changes
  useEffect(() => {
    setContent({
      page_title: page.title,
      page_show_cover: true,
      ...((page.page_content ?? {}) as PageContent),
    });
  }, [page.id]);

  const update = (patch: Partial<PageContent>) => {
    const next = { ...content, ...patch };
    setContent(next);
    onChange(page.id, next);
  };

  const addSection = (type: CustomSection["type"]) => {
    const newSection: CustomSection = {
      id: `section-${Date.now()}`,
      type,
      image_side: "right",
    };
    const sections = [...(content.custom_sections ?? []), newSection];
    update({ custom_sections: sections });
  };

  const updateSection = (id: string, patch: Partial<CustomSection>) => {
    const sections = (content.custom_sections ?? []).map((s) =>
      s.id === id ? { ...s, ...patch } : s
    );
    update({ custom_sections: sections });
  };

  const deleteSection = (id: string) => {
    const sections = (content.custom_sections ?? []).filter((s) => s.id !== id);
    update({ custom_sections: sections });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="p-1 hover:bg-muted rounded-sm transition-colors"
          title="Back to pages"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[11px] tracking-[0.2em] uppercase font-light truncate flex-1">
          {page.title}
        </span>
        {/* Visibility badge */}
        <span
          className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${
            page.is_visible
              ? "border-border text-muted-foreground"
              : "border-border/30 text-muted-foreground/40"
          }`}
        >
          {page.is_visible ? (
            <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5 inline" /> Visible</span>
          ) : (
            <span className="flex items-center gap-0.5"><EyeOff className="h-2.5 w-2.5 inline" /> Hidden</span>
          )}
        </span>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

        {/* ── Page identity ── */}
        <Field label="Page Title" hint="Shown in the browser tab and site navigation menu.">
          <Input
            value={content.page_title ?? ""}
            onChange={(e) => update({ page_title: e.target.value })}
            className="h-8 text-xs"
            placeholder="About, Investment, Contact..."
          />
        </Field>

        {/* ── Cover image ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground">
              Cover Image
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Show</span>
              <Switch
                checked={content.page_show_cover ?? true}
                onCheckedChange={(v) => update({ page_show_cover: v })}
              />
            </div>
          </div>

          {(content.page_show_cover ?? true) && (
            <>
              <ImageUploadField
                label=""
                value={content.page_cover_url ?? null}
                onChange={(url) => update({ page_cover_url: url ?? undefined })}
              />
              <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                📍 Full-width banner at the top of this page. JPG or WebP · 1920×600 px · max 5 MB
              </p>
            </>
          )}
        </div>

        {/* ── Page header content ── */}
        <div className="border-t border-border pt-4 flex flex-col gap-4">
          <p className="text-[10px] tracking-[0.15em] uppercase font-light text-muted-foreground">
            Page Header
          </p>
          <Field label="Headline">
            <Input
              value={content.page_headline ?? ""}
              onChange={(e) => update({ page_headline: e.target.value })}
              className="h-8 text-xs"
              placeholder="Welcome to my story..."
            />
          </Field>
          <Field label="Subheadline">
            <Input
              value={content.page_subheadline ?? ""}
              onChange={(e) => update({ page_subheadline: e.target.value })}
              className="h-8 text-xs"
              placeholder="A brief summary of this page"
            />
          </Field>
          <Field label="Body Text">
            <Textarea
              value={content.page_body ?? ""}
              onChange={(e) => update({ page_body: e.target.value })}
              className="text-xs min-h-[90px] resize-none"
              placeholder="Write the main content for this page..."
            />
          </Field>
        </div>

        {/* ── CTA ── */}
        <div className="border-t border-border pt-4 flex flex-col gap-4">
          <p className="text-[10px] tracking-[0.15em] uppercase font-light text-muted-foreground">
            Call to Action (optional)
          </p>
          <Field label="Button Text">
            <Input
              value={content.page_cta_text ?? ""}
              onChange={(e) => update({ page_cta_text: e.target.value })}
              className="h-8 text-xs"
              placeholder="Book Now"
            />
          </Field>
          <Field label="Button Link">
            <Input
              value={content.page_cta_link ?? ""}
              onChange={(e) => update({ page_cta_link: e.target.value })}
              className="h-8 text-xs"
              placeholder="https://... or #sessions"
            />
          </Field>
        </div>

        {/* ── Custom blocks ── */}
        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[0.15em] uppercase font-light text-muted-foreground">
              Content Blocks
            </p>
          </div>

          {/* Existing blocks */}
          {(content.custom_sections ?? []).map((section) => (
            <CustomSectionBlock
              key={section.id}
              section={section}
              onUpdate={(patch) => updateSection(section.id, patch)}
              onDelete={() => deleteSection(section.id)}
            />
          ))}

          {/* Add block buttons */}
          <div className="flex flex-col gap-1.5 mt-1">
            <p className="text-[10px] text-muted-foreground/50 mb-1">Add a content block:</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { type: "text" as const, icon: <Type className="h-3 w-3" />, label: "Text" },
                { type: "image" as const, icon: <ImageIcon className="h-3 w-3" />, label: "Image" },
                { type: "text_image" as const, icon: <AlignLeft className="h-3 w-3" />, label: "Text+Img" },
              ]).map(({ type, icon, label }) => (
                <button
                  key={type}
                  onClick={() => addSection(type)}
                  className="flex flex-col items-center gap-1 py-2 border border-dashed border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/30 transition-all"
                >
                  {icon}
                  <span className="text-[9px]">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
