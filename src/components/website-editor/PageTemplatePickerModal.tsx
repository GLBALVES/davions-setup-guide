import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTemplateSections, type SectionType } from "./page-templates";

// ── Template categories & items ──────────────────────────────────────────────
interface PageTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
}

const CATEGORIES = [
  "viewAll",
  "about",
  "contact",
  "gallery",
  "homepage",
  "portfolio",
  "story",
  "others",
] as const;

type CategoryKey = typeof CATEGORIES[number];

const TEMPLATES: PageTemplate[] = [
  { id: "blank", name: "Blank", category: "viewAll", description: "Página vazia para começar do zero." },
  // About
  { id: "about-1", name: "About 1", category: "about", description: "Hero, história, números e depoimentos." },
  { id: "about-2", name: "About 2", category: "about", description: "Estúdio, jornada, equipe e CTA final." },
  { id: "about-3", name: "About 3", category: "about", description: "Perfil direto com trabalhos e contato." },
  // Contact
  { id: "contact-1", name: "Contact 1", category: "contact", description: "Contato com formulário, infos e mapa." },
  { id: "contact-2", name: "Contact 2", category: "contact", description: "Contato simples com horário e localização." },
  // Gallery
  { id: "gallery-1", name: "Gallery 1", category: "gallery", description: "Galeria em grid com CTA de conversão." },
  { id: "gallery-2", name: "Gallery 2", category: "gallery", description: "Masonry com depoimentos e CTA." },
  { id: "gallery-3", name: "Gallery 3", category: "gallery", description: "Vitrine editorial em blocos visuais." },
  // Homepage
  { id: "homepage-1", name: "Homepage 1", category: "homepage", description: "Hero, portfólio, sobre e prova social." },
  { id: "homepage-2", name: "Homepage 2", category: "homepage", description: "Home com vídeo, colunas e latest work." },
  // Portfolio
  { id: "portfolio-1", name: "Portfolio 1", category: "portfolio", description: "Seleção de projetos em masonry." },
  { id: "portfolio-2", name: "Portfolio 2", category: "portfolio", description: "Categorias separadas por blocos." },
  // Story
  { id: "story-1", name: "Story 1", category: "story", description: "Linha do tempo com narrativa de marca." },
  // Others
  { id: "other-1", name: "Pricing", category: "others", description: "Investimento, planos e perguntas comuns." },
  { id: "other-2", name: "FAQ", category: "others", description: "Perguntas frequentes com CTA final." },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (templateId: string, title: string) => void;
}

export default function PageTemplatePickerModal({ open, onOpenChange, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("viewAll");
  const [title, setTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
  const { t } = useLanguage();
  const pt = t.websiteEditor.pageTemplatePicker;

  const categoryLabels: Record<CategoryKey, string> = {
    viewAll: pt.viewAll,
    about: pt.about,
    contact: pt.contact,
    gallery: pt.gallery,
    homepage: pt.homepage,
    portfolio: pt.portfolio,
    story: pt.story,
    others: pt.others,
  };

  const filtered = activeCategory === "viewAll"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory || t.id === "blank");

  const handleCreate = () => {
    const pageName = title.trim() || "New Page";
    onSelect(selectedTemplate, pageName);
    setTitle("");
    setSelectedTemplate("blank");
    setActiveCategory("viewAll");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[95vw] h-[80vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Top bar — title input + Create button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex-1" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={pt.enterTitle}
            className="max-w-xs text-center border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-foreground text-sm placeholder:text-muted-foreground"
          />
          <div className="flex-1 flex justify-end">
            <Button
              onClick={handleCreate}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
            >
              {pt.createPage}
            </Button>
          </div>
        </div>

        {/* Body — sidebar + grid */}
        <div className="flex flex-1 overflow-hidden">
          {/* Category sidebar */}
          <aside className="w-48 shrink-0 border-r border-border py-4 px-2 overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm rounded transition-colors",
                  activeCategory === cat
                    ? "font-medium text-foreground border-l-2 border-primary bg-muted/40"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </aside>

          {/* Template grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* If viewAll, show Blank first then by category */}
            {activeCategory === "viewAll" ? (
              <>
                {/* Blank card */}
                <div className="grid grid-cols-3 gap-5 mb-8">
                  <TemplateCard
                    template={TEMPLATES[0]}
                    selected={selectedTemplate === "blank"}
                    onSelect={() => setSelectedTemplate("blank")}
                  />
                </div>
                {/* Category sections */}
                {CATEGORIES.filter((c) => c !== "viewAll").map((cat) => {
                  const items = TEMPLATES.filter((t) => t.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="mb-8">
                      <h3 className="text-sm font-medium text-foreground mb-3">{categoryLabels[cat]}</h3>
                      <hr className="border-border mb-4" />
                      <div className="grid grid-cols-3 gap-5">
                        {items.map((tpl) => (
                          <TemplateCard
                            key={tpl.id}
                            template={tpl}
                            selected={selectedTemplate === tpl.id}
                            onSelect={() => setSelectedTemplate(tpl.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="grid grid-cols-3 gap-5">
                {filtered.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    selected={selectedTemplate === tpl.id}
                    onSelect={() => setSelectedTemplate(tpl.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: PageTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const sections = getTemplateSections(template.id);

  return (
    <button onClick={onSelect} className="text-left group">
      <div
        className={cn(
          "aspect-[4/3] rounded-xl border p-3 transition-all bg-card overflow-hidden",
          selected
            ? "border-primary shadow-sm"
            : "border-border hover:border-muted-foreground/40 hover:bg-muted/20"
        )}
      >
        <TemplatePreview templateId={template.id} sections={sections} />
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-xs text-foreground uppercase tracking-[0.24em]">{template.name}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{template.description}</p>
      </div>
    </button>
  );
}

function TemplatePreview({
  templateId,
  sections,
}: {
  templateId: string;
  sections: Array<{ type: SectionType }>;
}) {
  if (templateId === "blank") {
    return (
      <div className="h-full w-full rounded-lg border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2">
        <div className="h-8 w-8 rounded-full border border-border bg-background" />
        <div className="h-2 w-20 rounded-full bg-muted-foreground/20" />
        <div className="h-2 w-12 rounded-full bg-muted-foreground/15" />
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-lg bg-background border border-border p-2 flex flex-col gap-1.5">
      {sections.slice(0, 5).map((section, index) => (
        <PreviewBlock key={`${templateId}-${index}`} type={section.type} index={index} />
      ))}
    </div>
  );
}

function PreviewBlock({ type, index }: { type: SectionType; index: number }) {
  switch (type) {
    case "hero":
      return (
        <div className="h-16 rounded-md bg-gradient-to-br from-muted via-muted/70 to-background border border-border p-2 flex flex-col justify-end gap-1">
          <div className="h-2.5 w-2/3 rounded-full bg-foreground/80" />
          <div className="h-2 w-1/2 rounded-full bg-muted-foreground/35" />
        </div>
      );
    case "gallery-grid":
    case "gallery-masonry":
    case "carousel":
    case "slideshow":
    case "instagram-feed":
      return (
        <div className="grid grid-cols-3 gap-1 h-12">
          {Array.from({ length: 6 }).map((_, itemIndex) => (
            <div
              key={itemIndex}
              className={cn(
                "rounded-sm border border-border bg-muted/50",
                type === "gallery-masonry" && itemIndex % 3 === 1 ? "row-span-2" : "h-full"
              )}
            />
          ))}
        </div>
      );
    case "image-text":
    case "text-image":
    case "columns-2":
      return (
        <div className="grid grid-cols-2 gap-1.5 h-11">
          <div className={cn("rounded-sm border border-border bg-muted/50", type === "text-image" ? "order-2" : "")} />
          <div className={cn("rounded-sm border border-border bg-background p-1.5 flex flex-col gap-1", type === "text-image" ? "order-1" : "") }>
            <div className="h-2 w-3/4 rounded-full bg-foreground/70" />
            <div className="h-1.5 w-full rounded-full bg-muted-foreground/25" />
            <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/20" />
          </div>
        </div>
      );
    case "contact-form":
    case "pricing-table":
    case "faq-accordion":
    case "timeline":
    case "testimonials":
    case "stats":
    case "team":
    case "logo-strip":
    case "map":
    case "video":
    case "social-links":
    case "embed":
    case "cta":
    case "text":
    case "columns-3":
    case "spacer":
    case "divider":
    default:
      return (
        <div
          className={cn(
            "rounded-md border border-border bg-muted/30 p-1.5 flex items-center gap-1.5",
            type === "cta" ? "bg-primary/10 border-primary/20" : "",
            type === "divider" ? "h-2 p-0 bg-transparent border-0" : "",
            type === "spacer" ? "h-3 bg-transparent border-dashed" : "",
            type === "columns-3" ? "grid grid-cols-3" : "",
            type === "map" ? "h-10" : "",
            type === "video" ? "h-10" : "",
            type === "timeline" ? "h-10" : "",
            type === "pricing-table" ? "h-12" : "",
            type === "faq-accordion" ? "h-10" : "",
            type === "testimonials" ? "h-10" : "",
            type === "team" ? "h-10" : "",
            type === "stats" ? "h-8" : "",
            type === "logo-strip" ? "h-8" : "",
            type === "social-links" ? "h-8" : "",
            index === 4 ? "mt-auto" : ""
          )}
        >
          {type === "divider" ? (
            <div className="h-px w-full bg-border" />
          ) : type === "columns-3" ? (
            <>
              <div className="h-full rounded-sm bg-background border border-border" />
              <div className="h-full rounded-sm bg-background border border-border" />
              <div className="h-full rounded-sm bg-background border border-border" />
            </>
          ) : type === "stats" ? (
            <>
              <div className="h-full flex-1 rounded-sm bg-background border border-border" />
              <div className="h-full flex-1 rounded-sm bg-background border border-border" />
              <div className="h-full flex-1 rounded-sm bg-background border border-border" />
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-primary/70 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-2/3 rounded-full bg-foreground/70" />
                <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/25" />
              </div>
            </>
          )}
        </div>
      );
  }
}
