import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTemplateSections, type PageSection } from "./page-templates";
import SectionRenderer from "@/components/store/SectionRenderer";

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
    const tpl = TEMPLATES.find((t) => t.id === selectedTemplate);
    const fallbackName = tpl && tpl.id !== "blank" ? tpl.name : "New Page";
    const pageName = title.trim() || fallbackName;
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
    <button onClick={onSelect} className="text-left group w-full">
      <div
        className={cn(
          "relative aspect-[4/5] rounded-lg border bg-background overflow-hidden transition-all",
          selected
            ? "border-primary shadow-md ring-2 ring-primary/30"
            : "border-border hover:border-foreground/40 hover:shadow-sm"
        )}
      >
        <RealisticTemplatePreview templateId={template.id} sections={sections} />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors pointer-events-none" />
      </div>
      <div className="mt-3 space-y-1 px-1">
        <p className="text-[11px] text-foreground uppercase tracking-[0.22em]">{template.name}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{template.description}</p>
      </div>
    </button>
  );
}

// ── Realistic, scaled-down preview (Pixieset-style) ───────────────────────────
// Renders the actual SectionRenderer output at desktop width, then scales it
// down into the card via CSS transform so users see a true miniature site.
function RealisticTemplatePreview({
  templateId,
  sections,
}: {
  templateId: string;
  sections: PageSection[];
}) {
  if (templateId === "blank" || sections.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-muted/20">
        <div className="h-10 w-10 rounded-full border border-border bg-background flex items-center justify-center">
          <span className="text-muted-foreground text-lg leading-none">+</span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Blank</p>
      </div>
    );
  }

  // Inject demo content so the preview looks alive (no empty hero etc.)
  const populated = sections.map((s) => withDemoProps(s));

  // Render at "desktop" width (1280) and scale down to fit the card.
  const SOURCE_WIDTH = 1280;

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {/* Mock browser top-bar */}
      <div className="h-4 bg-muted/60 border-b border-border flex items-center gap-1 px-2">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="absolute inset-x-0 top-4 bottom-0 overflow-hidden">
        <div
          style={{
            width: SOURCE_WIDTH,
            transformOrigin: "top left",
            // Scale so 1280px source fits the card width. Card is responsive,
            // so we use a CSS calc on a wrapper instead.
          }}
          className="origin-top-left scale-[0.18] sm:scale-[0.2] pointer-events-none select-none"
        >
          <SectionRenderer sections={populated} accentColor="#000000" />
        </div>
      </div>
    </div>
  );
}

// ── Demo props injection ──────────────────────────────────────────────────────
const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=70",
  "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=70",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=70",
  "https://images.unsplash.com/photo-1525258946800-98cfd641d0de?w=1200&q=70",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=70",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=70",
];

export function withDemoProps(section: PageSection): PageSection {
  const p: Record<string, any> = { ...(section.props as Record<string, any>) };
  switch (section.type) {
    case "hero":
      p.headline = p.headline || "Capturing Timeless Stories";
      p.subtitle = p.subtitle || "Wedding & Portrait Photography";
      p.backgroundImage = p.backgroundImage || DEMO_IMAGES[0];
      p.ctaText = p.ctaText || "Book a Session";
      break;
    case "image-text":
    case "text-image":
      p.image = p.image || DEMO_IMAGES[1];
      p.title = p.title || "About the Studio";
      p.body = p.body || "Crafted moments, honest emotions, and timeless imagery for every story we tell.";
      break;
    case "gallery-grid":
    case "gallery-masonry":
    case "carousel":
    case "slideshow":
    case "instagram-feed":
      if (!Array.isArray(p.images) || p.images.length === 0) p.images = DEMO_IMAGES;
      break;
    case "cta":
      p.headline = p.headline || "Let's create something beautiful.";
      p.buttonText = p.buttonText || "Get in touch";
      break;
    case "text":
      p.body = p.body || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.";
      break;
    case "testimonials":
      if (!Array.isArray(p.items) || p.items.length === 0) {
        p.items = [
          { quote: "Working with them was an unforgettable experience.", author: "Sarah & Tom" },
          { quote: "Beautiful, honest and timeless photographs.", author: "Emma & Luke" },
        ];
      }
      break;
    case "stats":
      if (!Array.isArray(p.items) || p.items.length === 0) {
        p.items = [
          { value: "150+", label: "Weddings" },
          { value: "8", label: "Years" },
          { value: "30+", label: "Awards" },
        ];
      }
      break;
    case "faq-accordion":
      if (!Array.isArray(p.items) || p.items.length === 0) {
        p.items = [
          { question: "How do we book a session?", answer: "Reach out via the contact form." },
          { question: "Do you travel?", answer: "Yes, worldwide." },
        ];
      }
      break;
    case "pricing-table":
      if (!Array.isArray(p.plans) || p.plans.length === 0) {
        p.plans = [
          { name: "Essential", price: "$1,800", features: ["4h coverage", "Online gallery"] },
          { name: "Signature", price: "$2,800", features: ["8h coverage", "Album"] },
          { name: "Heirloom", price: "$4,200", features: ["Full day", "Premium album"] },
        ];
      }
      break;
  }
  return { ...section, props: p };
}
