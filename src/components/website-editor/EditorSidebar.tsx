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
import {
  Eye, EyeOff, GripVertical, Settings2, Palette, LayoutList,
  ChevronDown, ChevronRight, Home, Plus, Trash2, CornerDownRight,
  MoreHorizontal, FileText,
} from "lucide-react";
import type { BlockKey } from "./BlockPanel";
import type { SiteConfig } from "@/components/store/PublicSiteRenderer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "./ImageUploadField";
import { type SitePage } from "./PagesTab";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRef, useEffect } from "react";

export interface SectionDef {
  key: BlockKey;
  label: string;
  icon: string;
  visible: boolean;
}

const DEFAULT_SECTIONS: SectionDef[] = [
  { key: "hero",         label: "Hero",          icon: "🖼️",  visible: true },
  { key: "sessions",     label: "Sessions",      icon: "📅",  visible: true },
  { key: "portfolio",    label: "Portfolio",     icon: "🖼️",  visible: true },
  { key: "about",        label: "About",         icon: "👤",  visible: true },
  { key: "testimonials", label: "Testimonials",  icon: "⭐",  visible: true },
  { key: "quote",        label: "Quote",         icon: "💬",  visible: true },
  { key: "experience",   label: "Experience",    icon: "✨",  visible: true },
  { key: "contact",      label: "Contact",       icon: "📱",  visible: true },
];

// Header and Footer are fixed structural elements rendered separately in PagesTree

// ── Sortable Section subitem ─────────────────────────────────────────────────

interface SortableItemProps {
  section: SectionDef;
  isActive: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRename: (label: string) => void;
  onRemove: () => void;
}

function SortableItem({ section, isActive, onSelect, onToggle, onRename, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(section.label); }, [section.label]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== section.label) onRename(trimmed);
    else setDraft(section.label);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 pl-7 pr-2 py-1.5 rounded-sm transition-colors cursor-pointer group ${
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      } ${!section.visible ? "opacity-40" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground transition-colors shrink-0"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <CornerDownRight className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
      <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={onSelect}>
        <span className="text-xs shrink-0">{section.icon}</span>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditing(false); setDraft(section.label); }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-[11px] bg-background border border-primary rounded-sm outline-none font-light px-1.5 py-0.5 ring-2 ring-primary/20"
          />
        ) : (
          <span
            className="text-[11px] font-light tracking-wide truncate"
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
            title="Double-click to rename"
          >
            {section.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onToggle}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title={section.visible ? "Hide" : "Show"}
        >
          {section.visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
        </button>
        <button onClick={onSelect} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="h-2.5 w-2.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove section"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}

// ── Page row with inline rename ───────────────────────────────────────────────

interface PageRowProps {
  page: SitePage;
  isActive: boolean;
  isExpanded: boolean;
  depth: number;
  onSelect: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onToggleVisibility: () => void;
  onAddSection: () => void;
  hasChildren: boolean;
}

function PageRow({
  page, isActive, isExpanded, depth, onSelect, onToggleExpand,
  onDelete, onRename, onToggleVisibility, onAddSection, hasChildren,
}: PageRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(page.title); }, [page.title]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.title) onRename(trimmed);
    else setDraft(page.title);
  };

  return (
    <div
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      className={`group flex items-center gap-1.5 py-1.5 pr-2 rounded-sm transition-colors cursor-pointer ${
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      } ${!page.is_visible && !page.is_home ? "opacity-50" : ""}`}
      onClick={onSelect}
    >
      {/* Expand / collapse chevron */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {isExpanded
          ? <ChevronDown className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />}
      </button>

      {/* Page icon */}
      {page.is_home
        ? <Home className="h-3 w-3 text-muted-foreground shrink-0" />
        : <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}

      {/* Title */}
      <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
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
            className="w-full text-[11px] bg-background border border-primary rounded-sm outline-none font-light px-1.5 py-0.5 ring-2 ring-primary/20"
          />
        ) : (
          <span
            className="text-[11px] font-light tracking-wide truncate block cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!page.is_home) setEditing(true);
            }}
            title={!page.is_home ? "Double-click to rename" : undefined}
          >
            {page.title}
            {page.is_home && (
              <span className="ml-1 text-[9px] text-muted-foreground/50 tracking-widest uppercase">Home</span>
            )}
          </span>
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {/* + Add Section (always visible on hover for all pages) */}
          <button
            onClick={(e) => { e.stopPropagation(); onAddSection(); }}
            className="p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Add section"
          >
            <Plus className="h-3 w-3" />
          </button>

          {!page.is_home && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                className="p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={page.is_visible ? "Hide page" : "Show page"}
              >
                {page.is_visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(page.title); }}
                    className="gap-2"
                  >
                    <FileText className="h-3 w-3" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pages + Sections tree ────────────────────────────────────────────────────

interface PagesTreeProps {
  pages: SitePage[];
  activePageId: string | null;
  onSelectPage: (id: string | null) => void;
  onAddPage: (parentId?: string | null) => void;
  onAddSection: (pageId: string) => void;
  onDeletePage: (id: string) => void;
  onRenamePage: (id: string, title: string) => void;
  onTogglePageVisibility: (id: string) => void;
  onReorderPages: (pages: SitePage[]) => void;
  // Sections (for home page)
  sections: SectionDef[];
  activeBlock: BlockKey | null;
  onSelectBlock: (key: BlockKey) => void;
  onReorder: (sections: SectionDef[]) => void;
  onToggleVisibility: (key: BlockKey) => void;
  onRemoveSection: (pageId: string | null, sectionKey: BlockKey) => void;
  onReorderPageSections: (pageId: string, sections: SectionDef[]) => void;
}

function PagesTree({
  pages, activePageId, onSelectPage, onAddPage, onAddSection, onDeletePage, onRenamePage,
  onTogglePageVisibility, onReorderPages,
  sections, activeBlock, onSelectBlock, onReorder, onToggleVisibility, onRemoveSection,
  onReorderPageSections,
}: PagesTreeProps) {
  const homePage = pages.find((p) => p.is_home);
  const nonHomePages = pages.filter((p) => !p.is_home);

  // Default: home expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (homePage) init[homePage.id] = true;
    return init;
  });

  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.key === active.id);
      const newIndex = sections.findIndex((s) => s.key === over.id);
      onReorder(arrayMove(sections, oldIndex, newIndex));
    }
  };

  // Flat ordered list of non-home pages
  const topLevel = nonHomePages.filter((p) => !p.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const ordered: SitePage[] = [];
  for (const page of topLevel) {
    ordered.push(page);
    const children = nonHomePages
      .filter((p) => p.parent_id === page.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    ordered.push(...children);
  }
  const orphans = nonHomePages.filter(
    (p) => p.parent_id && !nonHomePages.find((pp) => pp.id === p.parent_id)
  );
  ordered.push(...orphans.filter((o) => !ordered.find((op) => op.id === o.id)));

  /** Shared fixed row (header / footer) — not sortable, shown as structural anchor */
  const FixedRow = ({ label, icon, blockKey }: { label: string; icon: string; blockKey: BlockKey }) => (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer transition-colors ${
        activeBlock === blockKey && activePageId === null
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
      }`}
      onClick={() => { onSelectPage(null); onSelectBlock(blockKey); }}
      title={`Edit ${label} (shared across all pages)`}
    >
      <span className="text-[11px] w-4 text-center">{icon}</span>
      <span className="text-[11px] tracking-wide flex-1">{label}</span>
      <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground/50 font-light">ALL PAGES</span>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto py-1 px-1.5 flex flex-col">
      {/* ── Fixed: Header (shared) ── */}
      <FixedRow label="Header / Nav" icon="🔝" blockKey="header" />
      <div className="my-1 mx-2 border-t border-dashed border-border/40" />

      {/* ── Pages tree ── */}
      <div>
        {/* Home page row */}
        {homePage && (
          <>
            <PageRow
              page={homePage}
              isActive={activePageId === null || activePageId === homePage.id}
              isExpanded={!!expanded[homePage.id]}
              depth={0}
              onSelect={() => onSelectPage(null)}
              onToggleExpand={() => toggleExpand(homePage.id)}
              onDelete={() => {}}
              onRename={() => {}}
              onToggleVisibility={() => {}}
              onAddSection={() => onAddSection(homePage.id)}
              hasChildren={sections.length > 0}
            />

            {/* Home's sections as sub-items */}
            {expanded[homePage.id] && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                  {sections.map((section) => (
                    <SortableItem
                      key={section.key}
                      section={section}
                      isActive={activeBlock === section.key && (activePageId === null || activePageId === homePage.id)}
                      onSelect={() => { onSelectPage(null); onSelectBlock(section.key); }}
                      onToggle={() => onToggleVisibility(section.key)}
                      onRename={(label) => onReorder(sections.map((s) => s.key === section.key ? { ...s, label } : s))}
                      onRemove={() => onRemoveSection(null, section.key)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </>
        )}

        {/* Divider before other pages */}
        {ordered.length > 0 && <div className="my-1.5 mx-2 border-t border-border/30" />}

        {/* Other pages */}
        {ordered.map((page) => {
          const children = nonHomePages
            .filter((p) => p.parent_id === page.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          const pageSections = (page.sections_order as SectionDef[] | null) ?? [];
          return (
            <div key={page.id}>
              <PageRow
                page={page}
                isActive={activePageId === page.id}
                isExpanded={!!expanded[page.id]}
                depth={page.parent_id ? 1 : 0}
                onSelect={() => onSelectPage(page.id)}
                onToggleExpand={() => toggleExpand(page.id)}
                onDelete={() => onDeletePage(page.id)}
                onRename={(title) => onRenamePage(page.id, title)}
                onToggleVisibility={() => onTogglePageVisibility(page.id)}
                onAddSection={() => onAddSection(page.id)}
                hasChildren={children.length > 0 || pageSections.length > 0}
              />

              {/* Custom page sections as sortable sub-items */}
              {expanded[page.id] && pageSections.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      const oldIdx = pageSections.findIndex((s) => s.key === active.id);
                      const newIdx = pageSections.findIndex((s) => s.key === over.id);
                      onReorderPageSections(page.id, arrayMove(pageSections, oldIdx, newIdx));
                    }
                  }}
                >
                  <SortableContext items={pageSections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                    {pageSections.map((section) => (
                      <SortableItem
                        key={section.key}
                        section={section}
                        isActive={activeBlock === section.key && activePageId === page.id}
                        onSelect={() => { onSelectPage(page.id); onSelectBlock(section.key); }}
                        onToggle={() => {}}
                        onRename={(label) =>
                          onReorderPageSections(
                            page.id,
                            pageSections.map((s) => s.key === section.key ? { ...s, label } : s)
                          )
                        }
                        onRemove={() => onRemoveSection(page.id, section.key)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {/* Sub-pages */}
              {expanded[page.id] &&
                children.map((child) => (
                  <PageRow
                    key={child.id}
                    page={child}
                    isActive={activePageId === child.id}
                    isExpanded={false}
                    depth={2}
                    onSelect={() => onSelectPage(child.id)}
                    onToggleExpand={() => {}}
                    onDelete={() => onDeletePage(child.id)}
                    onRename={(title) => onRenamePage(child.id, title)}
                    onToggleVisibility={() => onTogglePageVisibility(child.id)}
                    onAddSection={() => onAddSection(child.id)}
                    hasChildren={false}
                  />
                ))}
            </div>
          );
        })}

        {/* Empty state */}
        {ordered.length === 0 && (
          <div className="px-3 py-3 text-center">
            <p className="text-[10px] text-muted-foreground/40 leading-relaxed mb-2">
              Add pages like <strong>About</strong> or <strong>Investment</strong>.
            </p>
            <button onClick={() => onAddPage(null)} className="text-[10px] text-primary hover:underline">
              + Add your first page
            </button>
          </div>
        )}
      </div>

      {/* ── Fixed: Footer (shared) — right below pages, not pushed to bottom ── */}
      <div className="my-1 mx-2 border-t border-dashed border-border/40" />
      <FixedRow label="Footer" icon="📄" blockKey="footer" />
      {/* Spacer so content doesn't feel cramped at bottom */}
      <div className="pb-2" />
    </div>
  );
}

// ── Styles Tab ───────────────────────────────────────────────────────────────

interface StylesTabProps {
  data: Partial<SiteConfig>;
  onChange: (patch: Partial<SiteConfig>) => void;
}

function StylesTab({ data, onChange }: StylesTabProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
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

      <div className="flex flex-col gap-0">
        <ImageUploadField label="Logo" value={data.logo_url ?? null} onChange={(url) => onChange({ logo_url: url })} />
        <div className="mt-1.5 flex flex-col gap-0.5">
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            📍 Appears in the <strong>navigation bar</strong> at the top of every page.
          </p>
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
            Recommended: PNG or SVG with transparent background · 200×60 px minimum · max 2 MB
          </p>
        </div>
      </div>

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

      <div className="flex flex-col gap-0">
        <ImageUploadField label="Favicon" value={data.favicon_url ?? null} onChange={(url) => onChange({ favicon_url: url })} />
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
        <p className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground mb-1">SEO</p>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed mb-3">
          Controls how your site appears in <strong>Google search results</strong> and when shared on social media.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-light text-muted-foreground">Page Title</Label>
            <Input
              value={data.seo_title ?? ""}
              onChange={(e) => onChange({ seo_title: e.target.value })}
              className="h-8 text-xs"
              placeholder="Studio Name — Photography"
            />
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
              📍 Shown as the <strong>clickable headline</strong> in Google results and in the browser tab. Keep it under 60 characters.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-light text-muted-foreground">Meta Description</Label>
            <textarea
              value={data.seo_description ?? ""}
              onChange={(e) => onChange({ seo_description: e.target.value })}
              className="text-xs min-h-[70px] resize-none rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="A short description of your studio..."
            />
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
              📍 The <strong>summary text</strong> shown below your title in search results. Aim for 120–160 characters to maximize visibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────

interface Props {
  data: Partial<SiteConfig>;
  sections: SectionDef[];
  activeBlock: BlockKey | null;
  onSelectBlock: (key: BlockKey) => void;
  onReorder: (sections: SectionDef[]) => void;
  onToggleVisibility: (key: BlockKey) => void;
  onStyleChange: (patch: Partial<SiteConfig>) => void;
  pages: SitePage[];
  activePageId: string | null;
  onSelectPage: (id: string | null) => void;
  onAddPage: (parentId?: string | null) => void;
  onAddSection: (pageId: string) => void;
  onDeletePage: (id: string) => void;
  onRenamePage: (id: string, title: string) => void;
  onTogglePageVisibility: (id: string) => void;
  onReorderPages: (pages: SitePage[]) => void;
  onRemoveSection: (pageId: string | null, sectionKey: BlockKey) => void;
  onReorderPageSections: (pageId: string, sections: SectionDef[]) => void;
}

type Tab = "pages" | "styles";

export function EditorSidebar({
  data, sections, activeBlock, onSelectBlock, onReorder, onToggleVisibility, onStyleChange,
  pages, activePageId, onSelectPage, onAddPage, onAddSection, onDeletePage, onRenamePage,
  onTogglePageVisibility, onReorderPages, onRemoveSection, onReorderPageSections,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("pages");

  const tabs: { key: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { key: "pages",  label: "Pages",  Icon: LayoutList },
    { key: "styles", label: "Styles", Icon: Palette },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[9px] tracking-[0.2em] uppercase font-light transition-colors ${
              activeTab === key
                ? "text-foreground border-b-2 border-foreground -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}

        {/* Add page shortcut */}
        <button
          onClick={() => { onAddPage(null); setActiveTab("pages"); }}
          className="px-3 text-muted-foreground hover:text-foreground transition-colors border-l border-border"
          title="Add new page"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {activeTab === "pages" && (
        <>
          <div className="px-3 py-2 shrink-0">
            <p className="text-[10px] text-muted-foreground/50">Click to edit · double-click to rename</p>
          </div>
          <PagesTree
            pages={pages}
            activePageId={activePageId}
            onSelectPage={onSelectPage}
            onAddPage={onAddPage}
            onAddSection={onAddSection}
            onDeletePage={onDeletePage}
            onRenamePage={onRenamePage}
            onTogglePageVisibility={onTogglePageVisibility}
            onReorderPages={onReorderPages}
            sections={sections}
            activeBlock={activeBlock}
            onSelectBlock={onSelectBlock}
            onReorder={onReorder}
            onToggleVisibility={onToggleVisibility}
            onRemoveSection={onRemoveSection}
            onReorderPageSections={onReorderPageSections}
          />
        </>
      )}

      {activeTab === "styles" && (
        <StylesTab data={data} onChange={onStyleChange} />
      )}
    </div>
  );
}

export { DEFAULT_SECTIONS };
