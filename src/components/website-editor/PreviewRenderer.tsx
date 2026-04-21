import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import SectionRenderer, { type PageSection, type EditContext } from "@/components/store/SectionRenderer";
import { Monitor, Tablet, Smartphone, ArrowUp, ArrowDown, Copy, Trash2, Settings2, Plus, GripVertical } from "lucide-react";
import CanvasAddSection from "@/components/website-editor/CanvasAddSection";
import QuickAddPopover from "@/components/website-editor/QuickAddPopover";
import PreviewHeader, { type HeaderConfig } from "@/components/website-editor/PreviewHeader";
import EditorOnboarding from "@/components/website-editor/EditorOnboarding";
import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, DragOverlay, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type { HeaderConfig, HeaderSlide } from "@/components/website-editor/PreviewHeader";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export interface PreviewSiteConfig {
  logoUrl?: string | null;
  logoAltUrl?: string | null;
  faviconUrl?: string | null;
  logoText?: string | null;
  /** "small" | "medium" | "large" — controls logo size in the navbar */
  logoSize?: string | null;
  /** When true, hides the "Made with Davions" badge on the public site */
  hideBranding?: boolean | null;
  displayName?: string;
  accentColor?: string;
  headerBg?: string | null;
  headerTextColor?: string | null;
  footerBg?: string | null;
  footerTextColor?: string | null;
  footerText?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
}

export interface PreviewNavLink {
  id: string;
  label: string;
  isHome?: boolean;
  type?: "page" | "folder" | "link";
  url?: string;
  /** When type === "link", whether to open the URL in a new tab. Defaults to true. */
  openInNewTab?: boolean;
  children?: PreviewNavLink[];
}

interface PreviewRendererProps {
  sections: PageSection[];
  selectedBlockIndex: number | null;
  onSelectBlock: (index: number) => void;
  onMoveBlock?: (from: number, to: number) => void;
  onDuplicateBlock?: (index: number) => void;
  onDeleteBlock?: (index: number) => void;
  /** Called when the user clicks a "+ Add Section" divider in the canvas. When `type` is provided, insert that block directly (quick-add); otherwise open the full picker. */
  onAddBlockAt?: (index: number, type?: import("./page-templates").SectionType) => void;
  /** Called with the new full ordered list when the user drags a block to a new position. */
  onReorderBlocks?: (next: PageSection[]) => void;
  accentColor?: string;
  site?: PreviewSiteConfig | null;
  navLinks?: PreviewNavLink[];
  activePageId?: string | null;
  onNavigatePage?: (pageId: string) => void;
  showHeaderFooter?: boolean;
  /** Enables inline editing handles inside each block */
  editMode?: boolean;
  /** Called when an inline editor changes a prop on a section */
  onPropChange?: (sectionId: string, path: string, value: any) => void;
  photographerId?: string | null;
  /** Per-page header (slider) configuration */
  headerConfig?: HeaderConfig | null;
  /** Open the header settings panel in the sidebar */
  onEditHeader?: () => void;
}

// ── Inline preview Nav (mimics public site SharedNav lightly) ────────────────
function PreviewNav({
  site,
  navLinks,
  activePageId,
  onNavigatePage,
}: {
  site?: PreviewSiteConfig | null;
  navLinks: PreviewNavLink[];
  activePageId?: string | null;
  onNavigatePage?: (id: string) => void;
}) {
  const bg = site?.headerBg ?? undefined;
  const fg = site?.headerTextColor ?? undefined;
  const logoText = site?.logoText || site?.displayName || "Studio";
  const logoSize = site?.logoSize || "medium";
  const logoImgClass =
    logoSize === "small" ? "h-6 w-auto object-contain"
    : logoSize === "large" ? "h-12 w-auto object-contain"
    : "h-8 w-auto object-contain";
  const logoTextClass =
    logoSize === "small" ? "text-xs font-light tracking-[0.25em] uppercase"
    : logoSize === "large" ? "text-base font-light tracking-[0.25em] uppercase"
    : "text-sm font-light tracking-[0.25em] uppercase";

  return (
    <header
      className="border-b border-border/50 sticky top-0 z-10"
      style={{ backgroundColor: bg ?? "hsl(var(--background))", color: fg ?? undefined }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {site?.logoUrl ? (
            <img src={site.logoUrl} alt={logoText} className={logoImgClass} />
          ) : (
            <span className={logoTextClass} style={{ color: fg ?? undefined }}>
              {logoText}
            </span>
          )}
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            if (link.type === "link") {
              const newTab = link.openInNewTab !== false;
              return (
                <a
                  key={link.id}
                  href={link.url || "#"}
                  target={newTab ? "_blank" : "_self"}
                  rel={newTab ? "noopener noreferrer" : undefined}
                  className="text-[11px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-70"
                  style={{ color: fg ?? undefined }}
                >
                  {link.label}
                </a>
              );
            }
            if (link.type === "folder" && link.children && link.children.length > 0) {
              return (
                <div key={link.id} className="relative group">
                  <button
                    className="text-[11px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-70 inline-flex items-center gap-1"
                    style={{ color: fg ?? undefined }}
                  >
                    {link.label}
                    <span className="text-[8px] opacity-60">▼</span>
                  </button>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[180px] z-20"
                  >
                    <div
                      className="border border-border/40 shadow-lg py-2"
                      style={{ backgroundColor: bg ?? "hsl(var(--background))" }}
                    >
                      {link.children.map((child) => {
                        if (child.type === "link") {
                          const newTab = child.openInNewTab !== false;
                          return (
                            <a
                              key={child.id}
                              href={child.url || "#"}
                              target={newTab ? "_blank" : "_self"}
                              rel={newTab ? "noopener noreferrer" : undefined}
                              className="block px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-light hover:opacity-70 text-left"
                              style={{ color: fg ?? undefined }}
                            >
                              {child.label}
                            </a>
                          );
                        }
                        return (
                          <button
                            key={child.id}
                            onClick={() => onNavigatePage?.(child.id)}
                            className={cn(
                              "block w-full px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-light hover:opacity-70 text-left",
                              activePageId === child.id && "underline underline-offset-4"
                            )}
                            style={{ color: fg ?? undefined }}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
            // Default: page
            return (
              <button
                key={link.id}
                onClick={() => onNavigatePage?.(link.id)}
                className={cn(
                  "text-[11px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-70",
                  activePageId === link.id && "underline underline-offset-4"
                )}
                style={{ color: fg ?? undefined }}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

// ── Inline preview Footer ────────────────────────────────────────────────────
function PreviewFooter({ site }: { site?: PreviewSiteConfig | null }) {
  const bg = site?.footerBg ?? "hsl(var(--foreground))";
  const fg = site?.footerTextColor ?? "hsl(var(--background))";
  const text = site?.footerText || `© ${new Date().getFullYear()} ${site?.displayName || "Studio"}`;

  return (
    <footer style={{ backgroundColor: bg, color: fg }} className="py-12 px-6">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase font-light opacity-80">{text}</p>
      </div>
    </footer>
  );
}

// ── Floating block toolbar (Pixieset style) ──────────────────────────────────
function FloatingBlockToolbar({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onSettings,
  onDelete,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onSettings: () => void;
  onDelete: () => void;
}) {
  const Btn = ({ onClick, disabled, title, children, danger, ...rest }: any) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      disabled={disabled}
      title={title}
      {...rest}
      className={cn(
        "p-1.5 rounded text-background/80 hover:text-background hover:bg-background/15 transition-colors",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent",
        danger && "hover:!text-red-400"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-foreground/95 backdrop-blur-sm rounded-md px-1 py-0.5 shadow-lg pointer-events-auto">
      <Btn onClick={onMoveUp} disabled={isFirst} title="Move up"><ArrowUp className="h-3.5 w-3.5" /></Btn>
      <Btn onClick={onMoveDown} disabled={isLast} title="Move down"><ArrowDown className="h-3.5 w-3.5" /></Btn>
      <div className="w-px h-4 bg-background/20 mx-0.5" />
      <Btn onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Btn>
      <Btn onClick={onSettings} title="Settings"><Settings2 className="h-3.5 w-3.5" /></Btn>
      <div className="w-px h-4 bg-background/20 mx-0.5" />
      <Btn onClick={onDelete} title="Delete" danger><Trash2 className="h-3.5 w-3.5" /></Btn>
    </div>
  );
}

// ── Sortable wrapper for a block in the canvas ───────────────────────────────
function SortableBlock({
  section,
  idx,
  isSelected,
  isLast,
  editMode,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  children,
}: {
  section: PageSection;
  idx: number;
  isSelected: boolean;
  isLast: boolean;
  editMode: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: !editMode,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 40 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={cn(
        "relative group/block transition-all",
        isDragging
          ? "ring-2 ring-primary border-2 border-dashed border-primary/60 bg-primary/5"
          : isSelected
            ? "ring-2 ring-primary ring-inset"
            : "hover:ring-2 hover:ring-primary/40 hover:ring-inset"
      )}
    >
      {/* Block label badge */}
      <div className={cn(
        "absolute top-0 left-0 z-20 text-[10px] px-2 py-0.5 rounded-br transition-opacity pointer-events-none",
        isSelected || isDragging
          ? "opacity-100 bg-primary text-primary-foreground"
          : "opacity-0 group-hover/block:opacity-100 bg-foreground/80 text-background"
      )}>
        {section.label}{isDragging && " — moving…"}
      </div>

      {/* Drag handle (left side, edit mode only) */}
      {editMode && (
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -left-3 z-30 w-6 h-10 rounded bg-foreground/90 text-background flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing touch-none transition-opacity",
            isSelected || isDragging ? "opacity-100" : "opacity-0 group-hover/block:opacity-100"
          )}
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Floating toolbar (selected or hover) — hidden during drag */}
      {!isDragging && (
        <div className={cn(
          "transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100"
        )}>
          <FloatingBlockToolbar
            isFirst={idx === 0}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onSettings={onSelect}
            onDelete={onDelete}
          />
        </div>
      )}

      <div className={cn(isDragging && "opacity-30 pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}

export default function PreviewRenderer({
  sections,
  selectedBlockIndex,
  onSelectBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onAddBlockAt,
  onReorderBlocks,
  accentColor = "#000000",
  site,
  navLinks = [],
  activePageId,
  onNavigatePage,
  showHeaderFooter = true,
  editMode = false,
  onPropChange,
  photographerId,
  headerConfig,
  onEditHeader,
}: PreviewRendererProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop");

  const editCtx: EditContext | undefined = editMode && onPropChange
    ? { onPropChange, photographerId }
    : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragSection = activeDragId ? sections.find((s) => s.id === activeDragId) : null;

  // Track which block is closest to the viewport center to use as the
  // insertion target for the floating "Add section" button.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [nearestBlockIdx, setNearestBlockIdx] = useState<number | null>(null);

  const recomputeNearest = useCallback(() => {
    const container = scrollRef.current;
    if (!container || sections.length === 0) {
      setNearestBlockIdx(null);
      return;
    }
    const centerY = container.getBoundingClientRect().top + container.clientHeight / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    blockRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const blockCenter = r.top + r.height / 2;
      const d = Math.abs(blockCenter - centerY);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    setNearestBlockIdx(bestIdx);
  }, [sections.length]);

  useEffect(() => {
    recomputeNearest();
  }, [sections, recomputeNearest]);

  // Insertion index for the floating button: just after the nearest block.
  const fabInsertIndex = nearestBlockIdx !== null
    ? Math.min(nearestBlockIdx + 1, sections.length)
    : sections.length;

  const handleDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));
  const handleDragCancel = () => setActiveDragId(null);
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(sections, from, to);
    if (onReorderBlocks) {
      onReorderBlocks(next);
    } else if (onMoveBlock) {
      onMoveBlock(from, to);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Viewport toolbar */}
      <div className="h-10 border-b border-border bg-card flex items-center justify-center gap-1 shrink-0">
        {([
          { id: "desktop" as Viewport, Icon: Monitor, label: "Desktop" },
          { id: "tablet" as Viewport, Icon: Tablet, label: "Tablet" },
          { id: "mobile" as Viewport, Icon: Smartphone, label: "Mobile" },
        ]).map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setViewport(id)}
            className={cn(
              "p-1.5 rounded transition-colors",
              viewport === id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Preview container */}
      <div
        ref={scrollRef}
        onScroll={recomputeNearest}
        className="flex-1 overflow-y-auto bg-muted/20 flex justify-center py-4 relative"
      >
        {/* Floating Add Section button — always visible while editing.
            Inserts after the block currently nearest to the viewport center. */}
        {/* 2-step onboarding for new users on an empty page */}
        <EditorOnboarding active={!!editMode && sections.length === 0} />

        {editMode && onAddBlockAt && (
          <QuickAddPopover
            side="top"
            align="end"
            onPick={(type) => onAddBlockAt(fabInsertIndex, type)}
            onMore={() => onAddBlockAt(fabInsertIndex)}
          >
            <button
              type="button"
              data-onboarding-target="add-section-fab"
              className="fixed bottom-6 right-8 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground text-xs font-medium tracking-wide shadow-xl hover:bg-primary/90 hover:shadow-2xl transition-all"
              title={
                sections.length === 0
                  ? "Add section"
                  : nearestBlockIdx !== null
                    ? `Insert after "${sections[nearestBlockIdx]?.label ?? "section"}"`
                    : "Add section at end"
              }
            >
              <Plus className="h-4 w-4" />
              Add section
            </button>
          </QuickAddPopover>
        )}
        <div
          className={cn(
            "bg-background transition-all duration-300 min-h-full shadow-lg",
            "border border-border"
          )}
          style={{
            width: VIEWPORT_WIDTHS[viewport],
            maxWidth: "100%",
            // Apply site typography live in the preview
            ["--site-heading-font" as any]: site?.headingFont
              ? `'${site.headingFont}'`
              : undefined,
            fontFamily: site?.bodyFont || undefined,
          }}
        >
          {/* Header */}
          {showHeaderFooter && (
            <PreviewHeader
              site={site}
              navLinks={navLinks}
              activePageId={activePageId}
              onNavigatePage={onNavigatePage}
              config={headerConfig}
              editMode={editMode}
              onEditHeader={onEditHeader}
            />
          )}

          {/* Blocks */}
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[480px] gap-5 px-6 text-center">
              <div className="space-y-1.5 max-w-md">
                <p className="text-base font-medium text-foreground">This page is empty</p>
                <p className="text-xs text-muted-foreground/80">
                  Click <span className="font-medium text-foreground">Add section</span> to open the quick picker.
                  Choose a template like <span className="text-foreground">Header</span>, <span className="text-foreground">Text</span>,
                  {" "}<span className="text-foreground">Gallery</span>, <span className="text-foreground">Image</span>,
                  {" "}<span className="text-foreground">CTA</span> or <span className="text-foreground">Contact</span> —
                  or hit <span className="font-medium text-foreground">More blocks…</span> for the full catalog.
                </p>
              </div>
              {editMode && onAddBlockAt && (
                <QuickAddPopover
                  onPick={(type) => onAddBlockAt(0, type)}
                  onMore={() => onAddBlockAt(0)}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add your first section
                  </button>
                </QuickAddPopover>
              )}
              <p className="text-[10px] text-muted-foreground/70 tracking-wide">
                Tip: hover between blocks later to insert a new section anywhere.
              </p>
            </div>
          ) : (
            <>
              {/* + above the very first block */}
              {editMode && onAddBlockAt && (
                <CanvasAddSection onClick={() => onAddBlockAt(0)} />
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map((section, idx) => {
                    const isSelected = selectedBlockIndex === idx;
                    return (
                      <div key={section.id} ref={(el) => { blockRefs.current[idx] = el; }}>
                        <SortableBlock
                          section={section}
                          idx={idx}
                          isSelected={isSelected}
                          isLast={idx === sections.length - 1}
                          editMode={editMode}
                          onSelect={() => onSelectBlock(idx)}
                          onMoveUp={() => onMoveBlock?.(idx, idx - 1)}
                          onMoveDown={() => onMoveBlock?.(idx, idx + 1)}
                          onDuplicate={() => onDuplicateBlock?.(idx)}
                          onDelete={() => onDeleteBlock?.(idx)}
                        >
                          <SectionRenderer
                            sections={[section]}
                            accentColor={accentColor}
                            editMode={editMode}
                            edit={editCtx}
                          />
                        </SortableBlock>

                        {editMode && onAddBlockAt && (
                          <CanvasAddSection onClick={() => onAddBlockAt(idx + 1)} />
                        )}
                      </div>
                    );
                  })}
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeDragSection ? (
                    <div className="px-3 py-2 rounded-md bg-foreground text-background shadow-2xl border border-primary text-xs font-medium tracking-wide uppercase flex items-center gap-2 cursor-grabbing">
                      <GripVertical className="h-3.5 w-3.5" />
                      {activeDragSection.label}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

            </>
          )}

          {/* Footer */}
          {showHeaderFooter && <PreviewFooter site={site} />}
        </div>
      </div>
    </div>
  );
}
