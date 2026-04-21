import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Image as ImageIcon, Type, LayoutGrid, Columns2,
  Target, Mail, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionType } from "./page-templates";

interface QuickAddPopoverProps {
  /** Trigger button (must be a single React element) */
  children: React.ReactNode;
  /** Called when the user picks a quick block */
  onPick: (type: SectionType) => void;
  /** Called when the user clicks "More blocks" — should open the full picker */
  onMore: () => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

const QUICK_BLOCKS: { type: SectionType; label: string; icon: React.ElementType }[] = [
  { type: "hero",         label: "Header",   icon: ImageIcon },
  { type: "text",         label: "Text",     icon: Type },
  { type: "gallery-grid", label: "Gallery",  icon: LayoutGrid },
  { type: "image-text",   label: "Image",    icon: Columns2 },
  { type: "cta",          label: "CTA",      icon: Target },
  { type: "contact-form", label: "Contact",  icon: Mail },
];

export default function QuickAddPopover({
  children, onPick, onMore, align = "center", side = "bottom",
}: QuickAddPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={8}
        className="w-[260px] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="px-2 pt-1 pb-2 text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
          Quick add
        </p>
        <div className="grid grid-cols-3 gap-1">
          {QUICK_BLOCKS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-2 rounded-md",
                "border border-transparent hover:border-primary/30 hover:bg-primary/5",
                "transition-colors text-center group"
              )}
            >
              <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[10px] font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onMore}
            className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            More blocks…
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
