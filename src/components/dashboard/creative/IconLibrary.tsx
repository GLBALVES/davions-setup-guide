import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { icons } from "lucide-react";
import type { CanvasElement } from "./creative-types";

const ICON_CATEGORIES: Record<string, string[]> = {
  "Photography": ["Camera", "Aperture", "Focus", "Image", "Film", "Palette", "Sun", "Moon", "Sparkles", "Eye"],
  "Social": ["Instagram", "Facebook", "Twitter", "Linkedin", "Youtube", "Share2", "MessageCircle", "ThumbsUp", "Users", "UserPlus"],
  "Business": ["TrendingUp", "BarChart3", "Target", "Award", "Briefcase", "DollarSign", "PieChart", "Rocket", "Zap", "Star"],
  "General": ["Phone", "Mail", "MapPin", "Clock", "Calendar", "CheckCircle", "ArrowRight", "Sparkles", "Shield", "Globe"],
};

interface Props { onAddIcon: (el: CanvasElement) => void; }

export default function IconLibrary({ onAddIcon }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Photography");

  const filteredIcons = search
    ? Object.values(ICON_CATEGORIES).flat().filter((name) => name.toLowerCase().includes(search.toLowerCase()))
    : ICON_CATEGORIES[category] || [];

  const handleAdd = (iconName: string) => {
    const el: CanvasElement = {
      id: crypto.randomUUID(), type: "icon", content: "", x: 100, y: 100, fontSize: 0, color: "transparent",
      fontWeight: "normal", fontStyle: "normal", textAlign: "left",
      iconName, iconColor: "#ffffff", iconBgColor: "transparent", iconBgShape: "circle", iconSize: 48,
    };
    onAddIcon(el);
  };

  return (
    <div className="space-y-2">
      <Input placeholder="Search icon..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />
      {!search && (
        <div className="flex gap-1 flex-wrap">
          {Object.keys(ICON_CATEGORIES).map((cat) => (
            <Button key={cat} size="sm" variant={category === cat ? "default" : "outline"} className="text-[10px] h-6 px-2" onClick={() => setCategory(cat)}>{cat}</Button>
          ))}
        </div>
      )}
      <ScrollArea className="h-40">
        <div className="grid grid-cols-5 gap-1.5">
          {filteredIcons.map((name) => {
            const IconComp = (icons as any)[name];
            if (!IconComp) return null;
            return (
              <button key={name} onClick={() => handleAdd(name)} className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-accent transition-colors" title={name}>
                <IconComp className="h-5 w-5" />
                <span className="text-[8px] text-muted-foreground truncate w-full text-center">{name}</span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
