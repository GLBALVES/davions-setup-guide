import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import {
  GripVertical,
  Home,
  Plus,
  Trash2,
  ChevronRight,
  FileText,
  Eye,
  EyeOff,
  MoreHorizontal,
  CornerDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SitePage {
  id: string;
  photographer_id?: string;
  title: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_home: boolean;
  is_visible: boolean;
  sections_order?: any[];
  page_content?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  pages: SitePage[];
  activePageId: string | null; // null = home page
  onSelectPage: (id: string | null) => void;
  onAddPage: (parentId?: string | null) => void;
  onDeletePage: (id: string) => void;
  onRenamePage: (id: string, title: string) => void;
  onToggleVisibility: (id: string) => void;
  onReorder: (pages: SitePage[]) => void;
}

// ── Sortable Page Item ───────────────────────────────────────────────────────

interface PageItemProps {
  page: SitePage;
  isActive: boolean;
  depth: number;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onToggleVisibility: () => void;
  onAddSubPage: () => void;
}

function SortablePageItem({
  page,
  isActive,
  depth,
  onSelect,
  onDelete,
  onRename,
  onToggleVisibility,
  onAddSubPage,
}: PageItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id, disabled: page.is_home });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Fix: remove duplicate style prop - merge into one


  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.title) {
      onRename(trimmed);
    } else {
      setDraft(page.title);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, paddingLeft: `${12 + depth * 16}px` }}
      className={`group flex items-center gap-1.5 py-2 rounded-sm transition-colors cursor-pointer ${
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
      } ${!page.is_visible && !page.is_home ? "opacity-50" : ""}`}
    >
      {/* Drag handle — disabled for home */}
      {page.is_home ? (
        <Home className="h-3 w-3 text-muted-foreground shrink-0" />
      ) : (
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3" />
        </button>
      )}

      {depth > 0 && <CornerDownRight className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0" />}

      {/* Title — click to select, double-click to rename */}
      <div
        className="flex-1 min-w-0"
        onClick={onSelect}
        onDoubleClick={() => !page.is_home && setEditing(true)}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditing(false); setDraft(page.title); }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-[11px] bg-transparent border-b border-primary outline-none font-light py-0.5"
          />
        ) : (
          <span className="text-[11px] font-light tracking-wide truncate block">
            {page.title}
            {page.is_home && <span className="ml-1 text-[9px] text-muted-foreground/60 tracking-widest uppercase">Home</span>}
          </span>
        )}
      </div>

      {/* Actions — shown on hover */}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!page.is_home && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title={page.is_visible ? "Hide page" : "Show page"}
            >
              {page.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
          )}
          {!page.is_home && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(page.title); }} className="gap-2">
                  <FileText className="h-3 w-3" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddSubPage(); }} className="gap-2">
                  <CornerDownRight className="h-3 w-3" /> Add Sub-page
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main PagesTab ────────────────────────────────────────────────────────────

export function PagesTab({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onToggleVisibility,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const homePage = pages.find((p) => p.is_home);
  const nonHomePages = pages.filter((p) => !p.is_home);

  // Build a flat ordered list: parent pages + their children interleaved
  const ordered: SitePage[] = [];
  const topLevel = nonHomePages.filter((p) => !p.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  for (const page of topLevel) {
    ordered.push(page);
    const children = nonHomePages.filter((p) => p.parent_id === page.id).sort((a, b) => a.sort_order - b.sort_order);
    ordered.push(...children);
  }
  // Add any orphaned pages (parent deleted)
  const orphans = nonHomePages.filter((p) => p.parent_id && !nonHomePages.find((pp) => pp.id === p.parent_id));
  ordered.push(...orphans.filter((o) => !ordered.find((op) => op.id === o.id)));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ordered.findIndex((p) => p.id === active.id);
    const newIdx = ordered.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(ordered, oldIdx, newIdx).map((p, i) => ({ ...p, sort_order: i }));
    onReorder([...(homePage ? [homePage] : []), ...reordered]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
        <p className="text-[10px] text-muted-foreground/60">Click to edit · double-click to rename</p>
        <button
          onClick={() => onAddPage(null)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title="Add new page"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Home page — always first, not sortable */}
        {homePage && (
          <SortablePageItem
            key={homePage.id}
            page={homePage}
            isActive={activePageId === null || activePageId === homePage.id}
            depth={0}
            onSelect={() => onSelectPage(null)}
            onDelete={() => {}}
            onRename={() => {}}
            onToggleVisibility={() => {}}
            onAddSubPage={() => onAddPage(homePage.id)}
          />
        )}

        {/* Divider */}
        {ordered.length > 0 && (
          <div className="my-1.5 mx-3 border-t border-border/40" />
        )}

        {/* Non-home pages */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {ordered.map((page) => (
              <SortablePageItem
                key={page.id}
                page={page}
                isActive={activePageId === page.id}
                depth={page.parent_id ? 1 : 0}
                onSelect={() => onSelectPage(page.id)}
                onDelete={() => onDeletePage(page.id)}
                onRename={(title) => onRenamePage(page.id, title)}
                onToggleVisibility={() => onToggleVisibility(page.id)}
                onAddSubPage={() => onAddPage(page.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {ordered.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed mb-3">
              Add pages like <strong>About</strong>, <strong>Investment</strong> or <strong>Contact</strong> to build your site menu.
            </p>
            <button
              onClick={() => onAddPage(null)}
              className="text-[10px] text-primary hover:underline"
            >
              + Add your first page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
