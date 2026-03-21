import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import type { BlockKey } from "./BlockPanel";

interface BlockDef {
  key: BlockKey;
  label: string;
  description: string;
  thumbnail: React.ReactNode;
}

interface Category {
  id: string;
  label: string;
  blocks: BlockDef[];
}

const Thumb = {
  HeroFull: () => (
    <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1 rounded-sm overflow-hidden">
      <div className="absolute inset-0 bg-foreground/80" />
      <div className="relative z-10 flex flex-col items-center gap-1">
        <div className="w-10 h-1.5 bg-background/80 rounded-full" />
        <div className="w-14 h-1 bg-background/50 rounded-full" />
        <div className="w-8 h-1 bg-background/30 rounded-full mt-0.5" />
      </div>
    </div>
  ),
  HeroSplit: () => (
    <div className="w-full h-full flex rounded-sm overflow-hidden">
      <div className="w-1/2 bg-muted flex flex-col justify-center px-1.5 gap-1">
        <div className="w-full h-1.5 bg-foreground/30 rounded-full" />
        <div className="w-3/4 h-1 bg-foreground/20 rounded-full" />
        <div className="w-1/2 h-1 bg-foreground/15 rounded-full" />
      </div>
      <div className="w-1/2 bg-foreground/15" />
    </div>
  ),
  AboutImageRight: () => (
    <div className="w-full h-full flex gap-1 p-1 rounded-sm overflow-hidden">
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="w-full h-1.5 bg-foreground/25 rounded-full" />
        <div className="w-4/5 h-1 bg-foreground/15 rounded-full" />
        <div className="w-full h-1 bg-foreground/12 rounded-full" />
        <div className="w-3/4 h-1 bg-foreground/12 rounded-full" />
      </div>
      <div className="w-2/5 bg-muted rounded-sm" />
    </div>
  ),
  AboutImageLeft: () => (
    <div className="w-full h-full flex gap-1 p-1 rounded-sm overflow-hidden">
      <div className="w-2/5 bg-muted rounded-sm" />
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="w-full h-1.5 bg-foreground/25 rounded-full" />
        <div className="w-4/5 h-1 bg-foreground/15 rounded-full" />
        <div className="w-full h-1 bg-foreground/12 rounded-full" />
        <div className="w-3/4 h-1 bg-foreground/12 rounded-full" />
      </div>
    </div>
  ),
  TextOnly: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 rounded-sm">
      <div className="w-2/3 h-1.5 bg-foreground/25 rounded-full" />
      <div className="w-full h-1 bg-foreground/12 rounded-full" />
      <div className="w-5/6 h-1 bg-foreground/12 rounded-full" />
      <div className="w-full h-1 bg-foreground/12 rounded-full" />
      <div className="w-3/4 h-1 bg-foreground/12 rounded-full" />
    </div>
  ),
  Quote: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 bg-muted/40 rounded-sm">
      <div className="text-foreground/30 text-lg leading-none font-serif select-none">"</div>
      <div className="w-4/5 h-1 bg-foreground/20 rounded-full" />
      <div className="w-3/5 h-1 bg-foreground/15 rounded-full" />
      <div className="w-1/3 h-0.5 bg-foreground/10 rounded-full mt-0.5" />
    </div>
  ),
  Sessions: () => (
    <div className="w-full h-full flex flex-col gap-1 p-1 rounded-sm overflow-hidden">
      <div className="w-1/2 h-1.5 bg-foreground/25 rounded-full mx-auto" />
      <div className="flex gap-1 flex-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 bg-muted rounded-sm flex flex-col">
            <div className="flex-1 bg-foreground/10 rounded-t-sm" />
            <div className="p-0.5 flex flex-col gap-0.5">
              <div className="w-full h-0.5 bg-foreground/20 rounded-full" />
              <div className="w-2/3 h-0.5 bg-foreground/12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
  Portfolio: () => (
    <div className="w-full h-full flex flex-col gap-1 p-1 rounded-sm overflow-hidden">
      <div className="w-1/2 h-1.5 bg-foreground/25 rounded-full mx-auto" />
      <div className="grid grid-cols-3 gap-0.5 flex-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-foreground/10 rounded-sm" />
        ))}
      </div>
    </div>
  ),
  Contact: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 rounded-sm">
      <div className="w-1/2 h-1.5 bg-foreground/25 rounded-full" />
      <div className="w-full h-4 bg-muted rounded-sm mt-0.5" />
      <div className="w-full h-4 bg-muted rounded-sm" />
      <div className="w-1/3 h-2 bg-foreground/20 rounded-sm mt-0.5 mx-auto" />
    </div>
  ),
  Footer: () => (
    <div className="w-full h-full flex flex-col rounded-sm overflow-hidden">
      <div className="flex-1" />
      <div className="bg-foreground/80 p-1 flex flex-col gap-0.5">
        <div className="flex gap-1 justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-2 h-2 bg-background/30 rounded-full" />
          ))}
        </div>
        <div className="w-2/3 h-0.5 bg-background/20 rounded-full mx-auto" />
      </div>
    </div>
  ),
  Experience: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 rounded-sm">
      <div className="w-1/2 h-1.5 bg-foreground/25 rounded-full" />
      <div className="w-full h-0.5 bg-border rounded-full my-0.5" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-full flex gap-1 items-start">
          <div className="w-2 h-2 bg-foreground/15 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="w-full h-0.5 bg-foreground/20 rounded-full" />
            <div className="w-3/4 h-0.5 bg-foreground/12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  ),
};

const CATEGORIES: Category[] = [
  {
    id: "hero",
    label: "Hero / Banner",
    blocks: [
      {
        key: "hero",
        label: "Hero — Full Bleed",
        description: "Full-width image with centered headline and CTA",
        thumbnail: <Thumb.HeroFull />,
      },
      {
        key: "hero",
        label: "Hero — Split",
        description: "Text on one side, image on the other",
        thumbnail: <Thumb.HeroSplit />,
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    blocks: [
      {
        key: "about",
        label: "About — Image Right",
        description: "Bio text with photo to the right",
        thumbnail: <Thumb.AboutImageRight />,
      },
      {
        key: "about",
        label: "About — Image Left",
        description: "Bio text with photo to the left",
        thumbnail: <Thumb.AboutImageLeft />,
      },
      {
        key: "experience",
        label: "Experience",
        description: "Highlight key points of your experience",
        thumbnail: <Thumb.Experience />,
      },
    ],
  },
  {
    id: "quote",
    label: "Quote",
    blocks: [
      {
        key: "quote",
        label: "Pull Quote",
        description: "Large styled quote with attribution",
        thumbnail: <Thumb.Quote />,
      },
    ],
  },
  {
    id: "links",
    label: "Sessions & Portfolio",
    blocks: [
      {
        key: "sessions",
        label: "Sessions",
        description: "Grid of your bookable photo sessions",
        thumbnail: <Thumb.Sessions />,
      },
      {
        key: "portfolio",
        label: "Portfolio",
        description: "Masonry grid of your published galleries",
        thumbnail: <Thumb.Portfolio />,
      },
    ],
  },
  {
    id: "contact",
    label: "Contact & Footer",
    blocks: [
      {
        key: "contact",
        label: "Contact",
        description: "Contact form or social links section",
        thumbnail: <Thumb.Contact />,
      },
      {
        key: "footer",
        label: "Footer",
        description: "Site footer with social icons and copyright",
        thumbnail: <Thumb.Footer />,
      },
    ],
  },
];

interface Props {
  open: boolean;
  insertAfterIndex: number;
  hiddenSections: string[];
  onAdd: (blockKey: BlockKey, insertAfterIndex: number) => void;
  onClose: () => void;
}

export function AddBlockModal({ open, insertAfterIndex, hiddenSections, onAdd, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];

  const isAvailable = (key: BlockKey) => hiddenSections.includes(key);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl h-[560px] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-light tracking-[0.12em] uppercase">Add Section</DialogTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left category nav */}
          <nav className="w-44 border-r border-border flex flex-col py-2 shrink-0 overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-left px-4 py-2.5 text-[11px] tracking-[0.08em] uppercase transition-colors ${
                  activeCategory === cat.id
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </nav>

          {/* Right block grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {currentCategory.blocks.map((block, i) => {
                const available = isAvailable(block.key);
                return (
                  <button
                    key={`${block.key}-${i}`}
                    onClick={() => onAdd(block.key, insertAfterIndex)}
                    className={`group flex flex-col rounded-md border overflow-hidden text-left transition-all duration-150 ${
                      available
                        ? "border-border hover:border-foreground hover:shadow-md"
                        : "border-border/50 opacity-50 cursor-default"
                    }`}
                    disabled={!available}
                    title={!available ? "This section is already visible on your site" : undefined}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full aspect-video bg-background overflow-hidden">
                      {block.thumbnail}
                      {!available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <span className="text-[9px] text-muted-foreground tracking-widest uppercase px-2 py-0.5 bg-muted rounded-full border border-border">
                            Already visible
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="px-2.5 py-2 border-t border-border">
                      <p className="text-[11px] font-medium tracking-[0.06em] text-foreground leading-tight">
                        {block.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {block.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
