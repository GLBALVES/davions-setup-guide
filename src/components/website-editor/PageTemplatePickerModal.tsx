import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Template categories & items ──────────────────────────────────────────────
interface PageTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
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
  // Blank
  { id: "blank", name: "Blank", category: "viewAll" },
  // About
  { id: "about-1", name: "About 1", category: "about" },
  { id: "about-2", name: "About 2", category: "about" },
  { id: "about-3", name: "About 3", category: "about" },
  // Contact
  { id: "contact-1", name: "Contact 1", category: "contact" },
  { id: "contact-2", name: "Contact 2", category: "contact" },
  // Gallery
  { id: "gallery-1", name: "Gallery 1", category: "gallery" },
  { id: "gallery-2", name: "Gallery 2", category: "gallery" },
  { id: "gallery-3", name: "Gallery 3", category: "gallery" },
  // Homepage
  { id: "homepage-1", name: "Homepage 1", category: "homepage" },
  { id: "homepage-2", name: "Homepage 2", category: "homepage" },
  // Portfolio
  { id: "portfolio-1", name: "Portfolio 1", category: "portfolio" },
  { id: "portfolio-2", name: "Portfolio 2", category: "portfolio" },
  // Story
  { id: "story-1", name: "Story 1", category: "story" },
  // Others
  { id: "other-1", name: "Pricing", category: "others" },
  { id: "other-2", name: "FAQ", category: "others" },
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
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 hover:border-emerald-600"
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
                    ? "font-medium text-foreground border-l-2 border-emerald-500"
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
  return (
    <button onClick={onSelect} className="text-center group">
      <div
        className={cn(
          "aspect-[4/3] rounded border-2 transition-all flex items-center justify-center bg-muted/30",
          selected
            ? "border-emerald-400 shadow-sm"
            : "border-border hover:border-muted-foreground/40"
        )}
      >
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <span className="text-muted-foreground/40 text-lg font-light">{template.name}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">{template.name}</p>
    </button>
  );
}
