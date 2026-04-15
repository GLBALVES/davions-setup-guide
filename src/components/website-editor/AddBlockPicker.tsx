import { useState } from "react";
import {
  Camera, Type, Briefcase, MessageSquare, Target,
  Image, LayoutGrid, SlidersHorizontal, Play,
  FileText, Columns2, Columns3, Minus, Video,
  DollarSign, HelpCircle, Quote, BarChart3, Users, Clock,
  Mail, Map, Instagram, Share2, Code, Award,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SectionType } from "./page-templates";

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
  const [activeCategory, setActiveCategory] = useState("photos");
  const category = CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-medium">Add Block</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[340px]">
          {/* Category tabs */}
          <div className="w-[140px] border-r border-border bg-muted/20 p-1.5 space-y-0.5 shrink-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
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
              );
            })}
          </div>

          {/* Blocks grid */}
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {category.blocks.map((block) => {
                const Icon = block.icon;
                return (
                  <button
                    key={block.type}
                    onClick={() => { onSelect(block.type); onOpenChange(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-center group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{block.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{block.description}</p>
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
};

export default AddBlockPicker;
