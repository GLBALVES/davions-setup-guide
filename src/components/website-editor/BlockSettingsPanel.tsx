import { useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { PageSection } from "./page-templates";

// ── Block Settings ────────────────────────────────────────────────────────────
// Per-block visual configuration: background, padding, color scheme, animation.

export interface BlockSettings {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  paddingTop?: number;
  paddingBottom?: number;
  colorScheme?: "light" | "dark" | "auto";
  animation?: "none" | "fade-up" | "fade-in" | "slide-left";
}

const PRESET_COLORS = [
  { label: "None", value: "" },
  { label: "White", value: "hsl(0, 0%, 100%)" },
  { label: "Light Gray", value: "hsl(0, 0%, 96%)" },
  { label: "Dark", value: "hsl(0, 0%, 8%)" },
  { label: "Black", value: "hsl(0, 0%, 0%)" },
  { label: "Primary", value: "hsl(var(--primary))" },
];

const PADDING_PRESETS = [
  { label: "Compact", top: 24, bottom: 24 },
  { label: "Normal", top: 48, bottom: 48 },
  { label: "Spacious", top: 80, bottom: 80 },
  { label: "Extra", top: 120, bottom: 120 },
];

const ANIMATIONS = [
  { id: "none", label: "None" },
  { id: "fade-up", label: "Fade Up" },
  { id: "fade-in", label: "Fade In" },
  { id: "slide-left", label: "Slide Left" },
];

interface BlockSettingsPanelProps {
  section: PageSection;
  settings: BlockSettings;
  onUpdate: (settings: BlockSettings) => void;
  onBack: () => void;
}

export const BlockSettingsPanel = ({
  section,
  settings,
  onUpdate,
  onBack,
}: BlockSettingsPanelProps) => {
  const s = settings;

  const update = (patch: Partial<BlockSettings>) => {
    onUpdate({ ...s, ...patch });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button onClick={onBack} className="p-1 rounded hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-medium text-foreground">Block Settings</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{section.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Background Color ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Background</p>
        </div>
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value || "none"}
                  onClick={() => update({ backgroundColor: c.value })}
                  className={cn(
                    "w-7 h-7 rounded-md border transition-all",
                    s.backgroundColor === c.value
                      ? "ring-2 ring-primary ring-offset-1"
                      : "border-border hover:border-foreground/30"
                  )}
                  style={{ backgroundColor: c.value || "transparent" }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Background Image</label>
            <div className="border border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer">
              <Upload className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">Upload Image</span>
            </div>
          </div>

          {s.backgroundImage && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Image Opacity: {Math.round(s.backgroundOpacity ?? 100)}%
              </label>
              <Slider
                value={[s.backgroundOpacity ?? 100]}
                min={10}
                max={100}
                step={5}
                onValueChange={([v]) => update({ backgroundOpacity: v })}
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* ── Padding ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Spacing</p>
        </div>
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-1.5">
            {PADDING_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => update({ paddingTop: p.top, paddingBottom: p.bottom })}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium border transition-colors",
                  s.paddingTop === p.top && s.paddingBottom === p.bottom
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Top: {s.paddingTop ?? 48}px
            </label>
            <Slider
              value={[s.paddingTop ?? 48]}
              min={0}
              max={200}
              step={8}
              onValueChange={([v]) => update({ paddingTop: v })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Bottom: {s.paddingBottom ?? 48}px
            </label>
            <Slider
              value={[s.paddingBottom ?? 48]}
              min={0}
              max={200}
              step={8}
              onValueChange={([v]) => update({ paddingBottom: v })}
            />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* ── Color Scheme ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Color Scheme</p>
        </div>
        <div className="px-4 pb-4">
          <Select
            value={s.colorScheme ?? "auto"}
            onValueChange={(v) => update({ colorScheme: v as BlockSettings["colorScheme"] })}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (inherit)</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border" />

        {/* ── Animation ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Animation</p>
        </div>
        <div className="px-4 pb-4">
          <div className="flex gap-1.5 flex-wrap">
            {ANIMATIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => update({ animation: a.id as BlockSettings["animation"] })}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-medium border transition-colors",
                  (s.animation ?? "none") === a.id
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockSettingsPanel;
