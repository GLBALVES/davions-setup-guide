import { useState, useMemo } from "react";
import {
  Camera, Type, Briefcase, MessageSquare, Target,
  Image, LayoutGrid, SlidersHorizontal, Play,
  FileText, Columns2, Columns3, Minus, Video,
  DollarSign, HelpCircle, Quote, BarChart3, Users, Clock,
  Mail, Map, Instagram, Share2, Code, Award,
  Search, Sparkles, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SectionType } from "./page-templates";
import BlockThumbnail from "./BlockThumbnail";

// ── Block categories ──────────────────────────────────────────────────────────

interface BlockOption {
  type: SectionType;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface BlockCategory {
  id: string;
  label: string;
  emoji: string;
  icon: React.ElementType;
  blocks: BlockOption[];
}

const CATEGORIES: BlockCategory[] = [
  {
    id: "photos",
    label: "Photos",
    emoji: "📸",
    icon: Camera,
    blocks: [
      { type: "hero", label: "Hero", description: "Full-width banner with headline", icon: Image },
      { type: "gallery-grid", label: "Gallery Grid", description: "Photo grid with columns", icon: LayoutGrid },
      { type: "gallery-masonry", label: "Gallery Masonry", description: "Pinterest-style layout", icon: LayoutGrid },
      { type: "slideshow", label: "Slideshow", description: "Fullwidth slider with autoplay", icon: SlidersHorizontal },
      { type: "carousel", label: "Carousel", description: "Horizontal scrolling gallery", icon: Play },
    ],
  },
  {
    id: "content",
    label: "Content",
    emoji: "✍️",
    icon: Type,
    blocks: [
      { type: "text", label: "Text", description: "Rich text content block", icon: FileText },
      { type: "image-text", label: "Image + Text", description: "Image on left, text on right", icon: Columns2 },
      { type: "text-image", label: "Text + Image", description: "Text on left, image on right", icon: Columns2 },
      { type: "video", label: "Video", description: "Embed YouTube, Vimeo or upload", icon: Video },
      { type: "columns-2", label: "Two Columns", description: "Side by side content", icon: Columns2 },
      { type: "columns-3", label: "Three Columns", description: "Three column layout", icon: Columns3 },
      { type: "spacer", label: "Spacer", description: "Add vertical spacing", icon: Minus },
      { type: "divider", label: "Divider", description: "Horizontal line separator", icon: Minus },
    ],
  },
  {
    id: "business",
    label: "Business",
    emoji: "📊",
    icon: Briefcase,
    blocks: [
      { type: "pricing-table", label: "Pricing", description: "Showcase your packages", icon: DollarSign },
      { type: "faq-accordion", label: "FAQ", description: "Collapsible Q&A section", icon: HelpCircle },
      { type: "testimonials", label: "Testimonials", description: "Client reviews and quotes", icon: Quote },
      { type: "stats", label: "Stats", description: "Key numbers and metrics", icon: BarChart3 },
      { type: "team", label: "Team", description: "Meet the team section", icon: Users },
      { type: "timeline", label: "Timeline", description: "Chronological milestones", icon: Clock },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    emoji: "📬",
    icon: MessageSquare,
    blocks: [
      { type: "contact-form", label: "Contact Form", description: "Inquiry form with fields", icon: Mail },
      { type: "map", label: "Map", description: "Studio location map", icon: Map },
      { type: "instagram-feed", label: "Instagram Feed", description: "Live Instagram grid", icon: Instagram },
      { type: "social-links", label: "Social Links", description: "Social media icon links", icon: Share2 },
      { type: "embed", label: "Custom Code", description: "Embed widgets, iframes, code", icon: Code },
    ],
  },
  {
    id: "conversion",
    label: "Conversion",
    emoji: "🎯",
    icon: Target,
    blocks: [
      { type: "cta", label: "Call to Action", description: "Drive visitors to act", icon: Target },
      { type: "logo-strip", label: "Logo Strip", description: "'As seen on' brand logos", icon: Award },
    ],
  },
];

// ── Add Block Picker ──────────────────────────────────────────────────────────

interface AddBlockPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: SectionType) => void;
}

export const AddBlockPicker = ({ open, onOpenChange, onSelect }: AddBlockPickerProps) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredBlocks = useMemo(() => {
    const pool = activeCategory === "all"
      ? CATEGORIES.flatMap((c) => c.blocks.map((b) => ({ ...b, _cat: c.label })))
      : (CATEGORIES.find((c) => c.id === activeCategory)?.blocks ?? []).map((b) => ({
          ...b,
          _cat: CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "",
        }));
    if (!normalizedQuery) return pool;
    return pool.filter((b) =>
      b.label.toLowerCase().includes(normalizedQuery) ||
      b.description.toLowerCase().includes(normalizedQuery) ||
      b.type.toLowerCase().includes(normalizedQuery)
    );
  }, [activeCategory, normalizedQuery]);

  const handleClose = (next: boolean) => {
    if (!next) {
      setQuery("");
      setActiveCategory("all");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-medium">Add Block</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border bg-muted/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search blocks..."
              className="h-8 pl-8 pr-8 text-xs"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground"
                title="Clear"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex min-h-[340px] max-h-[60vh]">
          {/* Category tabs */}
          <div className="w-[140px] border-r border-border bg-muted/20 p-1.5 space-y-0.5 shrink-0 overflow-y-auto">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-xs transition-colors text-left",
                activeCategory === "all"
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-xs transition-colors text-left",
                  activeCategory === cat.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <span className="text-sm">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Blocks grid */}
          <div className="flex-1 p-3 overflow-y-auto">
            {filteredBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                <Search className="h-6 w-6 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No blocks match "{query}"</p>
                <button
                  onClick={() => { setQuery(""); setActiveCategory("all"); }}
                  className="mt-2 text-[11px] text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredBlocks.map((block) => {
                  const Icon = block.icon;
                  return (
                    <button
                      key={block.type}
                      onClick={() => { onSelect(block.type); handleClose(false); }}
                      className="flex flex-col gap-2 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group"
                    >
                      {/* Visual wireframe preview */}
                      <BlockThumbnail type={block.type} className="group-hover:bg-primary/5 transition-colors" />

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{block.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{block.description}</p>
                          {activeCategory === "all" && (
                            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider mt-1">{(block as any)._cat}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddBlockPicker;
