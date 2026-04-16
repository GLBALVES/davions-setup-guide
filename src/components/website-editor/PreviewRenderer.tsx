import { useState } from "react";
import { cn } from "@/lib/utils";
import SectionRenderer, { type PageSection } from "@/components/store/SectionRenderer";
import { Monitor, Tablet, Smartphone } from "lucide-react";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

interface PreviewRendererProps {
  sections: PageSection[];
  selectedBlockIndex: number | null;
  onSelectBlock: (index: number) => void;
  accentColor?: string;
}

export default function PreviewRenderer({
  sections,
  selectedBlockIndex,
  onSelectBlock,
  accentColor = "#000000",
}: PreviewRendererProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop");

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
      <div className="flex-1 overflow-y-auto bg-muted/10 flex justify-center">
        <div
          className={cn(
            "bg-background transition-all duration-300 min-h-full",
            viewport !== "desktop" && "shadow-lg border-x border-border"
          )}
          style={{ width: VIEWPORT_WIDTHS[viewport], maxWidth: "100%" }}
        >
          {sections.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className="text-sm text-muted-foreground">Add blocks from the sidebar to start building your page</p>
            </div>
          ) : (
            sections.map((section, idx) => (
              <div
                key={section.id}
                onClick={(e) => { e.stopPropagation(); onSelectBlock(idx); }}
                className={cn(
                  "relative cursor-pointer group/block transition-all",
                  selectedBlockIndex === idx
                    ? "ring-2 ring-primary ring-inset"
                    : "hover:ring-2 hover:ring-primary/30 hover:ring-inset"
                )}
              >
                {/* Block label overlay */}
                <div className={cn(
                  "absolute top-0 left-0 z-20 text-[10px] px-2 py-0.5 rounded-br transition-opacity",
                  selectedBlockIndex === idx
                    ? "opacity-100 bg-primary text-primary-foreground"
                    : "opacity-0 group-hover/block:opacity-100 bg-foreground/80 text-background"
                )}>
                  {section.label}
                </div>
                {/* Render the actual block */}
                <SectionRenderer sections={[section]} accentColor={accentColor} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
