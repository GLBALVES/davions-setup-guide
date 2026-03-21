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
import { Eye, EyeOff, GripVertical, Settings2 } from "lucide-react";
import type { BlockKey } from "./BlockPanel";
import type { SiteConfig } from "@/components/store/PublicSiteRenderer";

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

function deriveVisibility(data: Partial<SiteConfig>): Record<string, boolean> {
  return {
    hero:       true,
    sessions:   data.show_store ?? true,
    portfolio:  data.show_store ?? true,
    about:      data.show_about ?? true,
    quote:      !!(data.quote_text),
    experience: !!(data.experience_text),
    contact:    data.show_contact ?? true,
    footer:     true,
  };
}

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
      }`}
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

interface Props {
  data: Partial<SiteConfig>;
  sections: SectionDef[];
  activeBlock: BlockKey | null;
  onSelectBlock: (key: BlockKey) => void;
  onReorder: (sections: SectionDef[]) => void;
  onToggleVisibility: (key: BlockKey) => void;
}

export function EditorSidebar({ data, sections, activeBlock, onSelectBlock, onReorder, onToggleVisibility }: Props) {
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
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">Sections</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Drag to reorder · click to edit</p>
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
    </div>
  );
}

export { DEFAULT_SECTIONS };
