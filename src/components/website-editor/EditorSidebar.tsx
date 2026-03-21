import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Settings2, Layers, Palette } from "lucide-react";
import type { BlockKey } from "./BlockPanel";
import type { SiteConfig } from "@/components/store/PublicSiteRenderer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "./ImageUploadField";

export interface SectionDef {
  key: BlockKey;
  label: string;
  icon: string;
  visible: boolean;
}

const DEFAULT_SECTIONS: SectionDef[] = [
  { key: "hero",       label: "Hero",        icon: "🖼️",  visible: true },
  { key: "sessions",   label: "Sessions",    icon: "📅",  visible: true },
  { key: "portfolio",  label: "Portfolio",   icon: "🖼️",  visible: true },
  { key: "about",      label: "About",       icon: "👤",  visible: true },
  { key: "quote",      label: "Quote",       icon: "💬",  visible: true },
  { key: "experience", label: "Experience",  icon: "✨",  visible: true },
  { key: "contact",    label: "Contact",     icon: "📱",  visible: true },
  { key: "footer",     label: "Footer",      icon: "📄",  visible: true },
];

interface SortableItemProps {
  section: SectionDef;
  isActive: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

function SortableItem({ section, isActive, onSelect, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-sm transition-colors cursor-pointer group ${
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
      } ${!section.visible ? "opacity-40" : ""}`}
    >
      <button {...attributes} {...listeners} className="p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button onClick={onSelect} className="flex items-center gap-2 flex-1 min-w-0 text-left">
        <span className="text-sm">{section.icon}</span>
        <span className="text-[11px] font-light tracking-wide truncate">{section.label}</span>
      </button>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onToggle}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          title={section.visible ? "Hide section" : "Show section"}
        >
          {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
        <button onClick={onSelect} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Styles Tab ──────────────────────────────────────────────────────────────

interface StylesTabProps {
  data: Partial<SiteConfig>;
  onChange: (patch: Partial<SiteConfig>) => void;
}

function StylesTab({ data, onChange }: StylesTabProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
      {/* Accent Color */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground">Accent Color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={data.accent_color ?? "#000000"}
            onChange={(e) => onChange({ accent_color: e.target.value })}
            className="h-8 w-10 rounded-sm border border-border cursor-pointer bg-transparent shrink-0"
          />
          <Input
            value={data.accent_color ?? "#000000"}
            onChange={(e) => onChange({ accent_color: e.target.value })}
            className="h-8 text-xs flex-1"
          />
        </div>
      </div>

      {/* Logo */}
      <div className="flex flex-col gap-0">
        <ImageUploadField
          label="Logo"
          value={data.logo_url ?? null}
          onChange={(url) => onChange({ logo_url: url })}
        />
        <div className="mt-1.5 flex flex-col gap-0.5">
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            📍 Appears in the <strong>navigation bar</strong> at the top of every page.
          </p>
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
            Recommended: PNG or SVG with transparent background · 200×60 px minimum · max 2 MB
          </p>
        </div>
      </div>

      {/* Tagline / Studio Name */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground">Studio Name / Tagline</Label>
        <Input
          value={data.tagline ?? ""}
          onChange={(e) => onChange({ tagline: e.target.value })}
          className="h-8 text-xs"
          placeholder="Your Studio Name"
        />
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">Shown in the nav bar when no logo is set.</p>
      </div>

      {/* Favicon */}
      <div className="flex flex-col gap-0">
        <ImageUploadField
          label="Favicon"
          value={data.favicon_url ?? null}
          onChange={(url) => onChange({ favicon_url: url })}
        />
        <div className="mt-1.5 flex flex-col gap-0.5">
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            📍 Appears in the <strong>browser tab</strong> and bookmarks.
          </p>
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
            Recommended: PNG or ICO · exactly <strong>32×32 px</strong> or 64×64 px · square format required
          </p>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground mb-3">SEO</p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-light text-muted-foreground">Page Title</Label>
            <Input
              value={data.seo_title ?? ""}
              onChange={(e) => onChange({ seo_title: e.target.value })}
              className="h-8 text-xs"
              placeholder="Studio Name — Photography"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-light text-muted-foreground">Meta Description</Label>
            <textarea
              value={data.seo_description ?? ""}
              onChange={(e) => onChange({ seo_description: e.target.value })}
              className="text-xs min-h-[70px] resize-none rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="A short description of your studio..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────────────────

interface Props {
  data: Partial<SiteConfig>;
  sections: SectionDef[];
  activeBlock: BlockKey | null;
  onSelectBlock: (key: BlockKey) => void;
  onReorder: (sections: SectionDef[]) => void;
  onToggleVisibility: (key: BlockKey) => void;
  onStyleChange: (patch: Partial<SiteConfig>) => void;
}

type Tab = "sections" | "styles";

export function EditorSidebar({ data, sections, activeBlock, onSelectBlock, onReorder, onToggleVisibility, onStyleChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("sections");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.key === active.id);
      const newIndex = sections.findIndex((s) => s.key === over.id);
      onReorder(arrayMove(sections, oldIndex, newIndex));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab("sections")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] tracking-[0.2em] uppercase font-light transition-colors ${
            activeTab === "sections"
              ? "text-foreground border-b-2 border-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3 w-3" />
          Sections
        </button>
        <button
          onClick={() => setActiveTab("styles")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] tracking-[0.2em] uppercase font-light transition-colors ${
            activeTab === "styles"
              ? "text-foreground border-b-2 border-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Palette className="h-3 w-3" />
          Styles
        </button>
      </div>

      {activeTab === "sections" && (
        <>
          <div className="px-4 py-2.5 shrink-0">
            <p className="text-[10px] text-muted-foreground/60">Drag to reorder · click to edit</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <SortableItem
                    key={section.key}
                    section={section}
                    isActive={activeBlock === section.key}
                    onSelect={() => onSelectBlock(section.key)}
                    onToggle={() => onToggleVisibility(section.key)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </>
      )}

      {activeTab === "styles" && (
        <StylesTab data={data} onChange={onStyleChange} />
      )}
    </div>
  );
}

export { DEFAULT_SECTIONS };
