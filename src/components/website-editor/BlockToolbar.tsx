import { useState } from "react";
import {
  ArrowUp, ArrowDown, Copy, Trash2, Settings2, LayoutGrid, GripVertical, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BLOCK_VARIANTS, type BlockVariant } from "./block-variants";
import type { SectionType } from "./page-templates";

// ── Block Toolbar (floating on hover) ─────────────────────────────────────────

interface BlockToolbarProps {
  sectionType: SectionType;
  currentVariant?: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSettings: () => void;
  onVariantChange: (variant: string) => void;
}

export const BlockToolbar = ({
  sectionType,
  currentVariant,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onSettings,
  onVariantChange,
}: BlockToolbarProps) => {
  const variants = BLOCK_VARIANTS[sectionType];
  const [variantOpen, setVariantOpen] = useState(false);

  return (
    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 bg-foreground/90 backdrop-blur-sm rounded-lg px-1 py-0.5 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
      <ToolbarButton onClick={onMoveUp} disabled={isFirst} title="Move up">
        <ArrowUp className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={onMoveDown} disabled={isLast} title="Move down">
        <ArrowDown className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-background/20 mx-0.5" />

      {variants && variants.length > 1 && (
        <Popover open={variantOpen} onOpenChange={setVariantOpen}>
          <PopoverTrigger asChild>
            <button
              className="p-1.5 rounded-md text-background/80 hover:text-background hover:bg-background/10 transition-colors"
              title="Change layout"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-56 p-2" sideOffset={8}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-1">
              Layout
            </p>
            <div className="grid grid-cols-3 gap-1">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { onVariantChange(v.id); setVariantOpen(false); }}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors",
                    currentVariant === v.id
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span className="text-base leading-none">{v.icon}</span>
                  <span className="text-[10px] leading-tight truncate w-full text-center">{v.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <ToolbarButton onClick={onDuplicate} title="Duplicate">
        <Copy className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={onSettings} title="Block settings">
        <Settings2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-background/20 mx-0.5" />

      <ToolbarButton onClick={onDelete} title="Delete" className="hover:!text-red-400">
        <Trash2 className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
};

// ── Toolbar button ────────────────────────────────────────────────────────────
const ToolbarButton = ({
  children,
  onClick,
  disabled,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={disabled}
    title={title}
    className={cn(
      "p-1.5 rounded-md text-background/80 hover:text-background hover:bg-background/10 transition-colors",
      disabled && "opacity-30 cursor-not-allowed hover:bg-transparent",
      className
    )}
  >
    {children}
  </button>
);

// ── Add Block Divider (between blocks) ────────────────────────────────────────

export const AddBlockDivider = ({
  onClick,
}: {
  onClick: () => void;
}) => (
  <div className="relative py-2 group/divider">
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-transparent group-hover/divider:bg-primary/30 transition-colors" />
    <div className="flex justify-center">
      <button
        onClick={onClick}
        className="relative z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-background border border-border text-muted-foreground opacity-0 group-hover/divider:opacity-100 hover:text-primary hover:border-primary/50 transition-all duration-200 shadow-sm"
      >
        <Plus className="h-3 w-3" />
        Add Block
      </button>
    </div>
  </div>
);

// ── Block Wrapper (wraps each section in the editor) ──────────────────────────

interface BlockWrapperProps {
  children: React.ReactNode;
  sectionType: SectionType;
  sectionLabel: string;
  variant?: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSettings: () => void;
  onVariantChange: (variant: string) => void;
  onAddBefore: () => void;
}

export const BlockWrapper = ({
  children,
  sectionType,
  sectionLabel,
  variant,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onSettings,
  onVariantChange,
  onAddBefore,
}: BlockWrapperProps) => (
  <>
    {index === 0 && <AddBlockDivider onClick={onAddBefore} />}
    <div className="group relative">
      {/* Hover outline */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/40 rounded-lg pointer-events-none transition-colors z-10" />

      {/* Label badge */}
      <div className="absolute top-2 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-medium bg-foreground/80 text-background px-2 py-0.5 rounded-full">
          {sectionLabel}
        </span>
      </div>

      {/* Toolbar */}
      <BlockToolbar
        sectionType={sectionType}
        currentVariant={variant}
        isFirst={index === 0}
        isLast={index === total - 1}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onSettings={onSettings}
        onVariantChange={onVariantChange}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  </>
);

export default BlockToolbar;
