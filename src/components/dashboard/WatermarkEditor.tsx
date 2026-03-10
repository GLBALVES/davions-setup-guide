import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2, X, Type, Image } from "lucide-react";
import { cn } from "@/lib/utils";

type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface WatermarkData {
  id?: string;
  name: string;
  text_enabled: boolean;
  text_content: string;
  text_font: string;
  text_color: string;
  text_opacity: number;
  text_scale: number;
  text_position: Position;
  image_enabled: boolean;
  image_url: string | null;
  image_opacity: number;
  image_scale: number;
  image_position: Position;
}

const defaultWatermark = (): WatermarkData => ({
  name: "",
  text_enabled: true,
  text_content: "",
  text_font: "serif",
  text_color: "#ffffff",
  text_opacity: 0.9,
  text_scale: 0.5,
  text_position: "bottom-center",
  image_enabled: false,
  image_url: null,
  image_opacity: 0.8,
  image_scale: 0.4,
  image_position: "center",
});

const POSITIONS: { value: Position; row: number; col: number }[] = [
  { value: "top-left", row: 0, col: 0 },
  { value: "top-center", row: 0, col: 1 },
  { value: "top-right", row: 0, col: 2 },
  { value: "center-left", row: 1, col: 0 },
  { value: "center", row: 1, col: 1 },
  { value: "center-right", row: 1, col: 2 },
  { value: "bottom-left", row: 2, col: 0 },
  { value: "bottom-center", row: 2, col: 1 },
  { value: "bottom-right", row: 2, col: 2 },
];

function positionToStyle(pos: Position, scale: number): React.CSSProperties {
  const map: Record<Position, React.CSSProperties> = {
    "top-left": { top: "8%", left: "5%", transform: "none" },
    "top-center": { top: "8%", left: "50%", transform: "translateX(-50%)" },
    "top-right": { top: "8%", right: "5%", transform: "none" },
    "center-left": { top: "50%", left: "5%", transform: "translateY(-50%)" },
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "center-right": { top: "50%", right: "5%", transform: "translateY(-50%)" },
    "bottom-left": { bottom: "8%", left: "5%", transform: "none" },
    "bottom-center": { bottom: "8%", left: "50%", transform: "translateX(-50%)" },
    "bottom-right": { bottom: "8%", right: "5%", transform: "none" },
  };
  return map[pos];
}

function PositionGrid({
  value,
  onChange,
}: {
  value: Position;
  onChange: (v: Position) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 w-[84px]">
      {POSITIONS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            "w-6 h-6 border transition-colors rounded-sm",
            value === p.value
              ? "bg-foreground border-foreground"
              : "border-border hover:border-foreground/50 bg-muted/20"
          )}
          title={p.value}
        />
      ))}
    </div>
  );
}

function SectionToggle({
  label,
  icon: Icon,
  enabled,
  onToggle,
}: {
  label: string;
  icon: React.ElementType;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] tracking-[0.2em] uppercase font-light">{label}</span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          enabled ? "bg-foreground" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
            enabled ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

interface WatermarkEditorProps {
  initial?: WatermarkData;
  onSaved: (wm: WatermarkData) => void;
  onCancel: () => void;
}

export function WatermarkEditor({ initial, onSaved, onCancel }: WatermarkEditorProps) {
  const { user } = useAuth();
  const [wm, setWm] = useState<WatermarkData>(initial ?? defaultWatermark());
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof WatermarkData>(key: K, value: WatermarkData[K]) =>
    setWm((prev) => ({ ...prev, [key]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("watermarks").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("watermarks").getPublicUrl(path);
      set("image_url", data.publicUrl);
      set("image_enabled", true);
    }
    setUploadingImage(false);
  };

  const handleSave = async () => {
    if (!wm.name.trim() || !user) return;
    setSaving(true);

    const payload = {
      photographer_id: user.id,
      name: wm.name.trim(),
      text_enabled: wm.text_enabled,
      text_content: wm.text_content || null,
      text_font: wm.text_font,
      text_color: wm.text_color,
      text_opacity: wm.text_opacity,
      text_scale: wm.text_scale,
      text_position: wm.text_position,
      image_enabled: wm.image_enabled,
      image_url: wm.image_url || null,
      image_opacity: wm.image_opacity,
      image_scale: wm.image_scale,
      image_position: wm.image_position,
    };

    let error;
    let data;

    if (wm.id) {
      const res = await (supabase as any)
        .from("watermarks")
        .update(payload)
        .eq("id", wm.id)
        .select()
        .single();
      error = res.error;
      data = res.data;
    } else {
      const res = await (supabase as any)
        .from("watermarks")
        .insert([payload])
        .select()
        .single();
      error = res.error;
      data = res.data;
    }

    if (error) {
      toast({ title: "Error saving watermark", description: error.message, variant: "destructive" });
    } else {
      toast({ title: wm.id ? "Watermark updated" : "Watermark created" });
      onSaved({ ...wm, id: data.id });
    }
    setSaving(false);
  };

  // Preview font size based on scale
  const previewFontSize = `${Math.round(wm.text_scale * 48)}px`;
  const previewImgWidth = `${Math.round(wm.image_scale * 100)}%`;

  const fontFamilyMap: Record<string, string> = {
    serif: "Georgia, serif",
    sans: "system-ui, sans-serif",
    mono: "monospace",
    italic: "Georgia, serif",
  };

  return (
    <div className="flex flex-col gap-0 h-full">
      <div className="flex gap-0 flex-1 min-h-0">
        {/* ── Left panel ── */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto p-5 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">
              Name
            </Label>
            <Input
              value={wm.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. My Studio Logo"
              className="h-8 text-sm rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
            />
          </div>

          {/* ── TEXT section ── */}
          <div className="flex flex-col gap-3 border border-border p-3">
            <SectionToggle
              label="Text"
              icon={Type}
              enabled={wm.text_enabled}
              onToggle={() => set("text_enabled", !wm.text_enabled)}
            />

            {wm.text_enabled && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Text</Label>
                  <Input
                    value={wm.text_content ?? ""}
                    onChange={(e) => set("text_content", e.target.value)}
                    placeholder="© Your Studio"
                    className="h-8 text-sm rounded-none border-border focus-visible:ring-0"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Font</Label>
                  <Select value={wm.text_font} onValueChange={(v) => set("text_font", v)}>
                    <SelectTrigger className="h-8 rounded-none border-border focus:ring-0 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="sans">Sans-serif</SelectItem>
                      <SelectItem value="mono">Monospace</SelectItem>
                      <SelectItem value="italic">Italic Serif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Color</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => set("text_color", "#ffffff")}
                      className={cn(
                        "w-6 h-6 border-2 rounded-sm bg-white",
                        wm.text_color === "#ffffff" ? "border-foreground" : "border-border"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => set("text_color", "#000000")}
                      className={cn(
                        "w-6 h-6 border-2 rounded-sm bg-black",
                        wm.text_color === "#000000" ? "border-foreground" : "border-border"
                      )}
                    />
                    <div className="relative flex items-center">
                      <input
                        type="color"
                        value={wm.text_color}
                        onChange={(e) => set("text_color", e.target.value)}
                        className="sr-only absolute"
                        id="text-color-picker"
                      />
                      <label
                        htmlFor="text-color-picker"
                        className="w-6 h-6 border-2 border-border rounded-sm cursor-pointer flex items-center justify-center"
                        style={{ background: wm.text_color }}
                        title="Custom color"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{wm.text_color}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Scale</Label>
                    <span className="text-[10px] text-muted-foreground">{Math.round(wm.text_scale * 100)}%</span>
                  </div>
                  <Slider
                    min={10} max={100} step={1}
                    value={[Math.round(wm.text_scale * 100)]}
                    onValueChange={([v]) => set("text_scale", v / 100)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Opacity</Label>
                    <span className="text-[10px] text-muted-foreground">{Math.round(wm.text_opacity * 100)}%</span>
                  </div>
                  <Slider
                    min={5} max={100} step={1}
                    value={[Math.round(wm.text_opacity * 100)]}
                    onValueChange={([v]) => set("text_opacity", v / 100)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Position</Label>
                  <PositionGrid value={wm.text_position} onChange={(v) => set("text_position", v)} />
                </div>
              </div>
            )}
          </div>

          {/* ── IMAGE section ── */}
          <div className="flex flex-col gap-3 border border-border p-3">
            <SectionToggle
              label="Image"
              icon={Image}
              enabled={wm.image_enabled}
              onToggle={() => set("image_enabled", !wm.image_enabled)}
            />

            {wm.image_enabled && (
              <div className="flex flex-col gap-3">
                {wm.image_url ? (
                  <div className="relative group border border-border flex items-center justify-center bg-muted/30 p-3 min-h-[60px]">
                    <img src={wm.image_url} alt="Watermark" className="max-h-10 w-auto object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="text-white text-[10px] tracking-widest uppercase border border-white/60 px-2 py-1 hover:bg-white/10"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => { set("image_url", null); set("image_enabled", false); }}
                        className="text-white/70 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full h-14 border border-dashed border-border flex flex-col items-center justify-center gap-1.5 hover:border-foreground/40 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span className="text-[9px] tracking-widest uppercase">Upload PNG</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Scale</Label>
                    <span className="text-[10px] text-muted-foreground">{Math.round(wm.image_scale * 100)}%</span>
                  </div>
                  <Slider
                    min={5} max={100} step={1}
                    value={[Math.round(wm.image_scale * 100)]}
                    onValueChange={([v]) => set("image_scale", v / 100)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Opacity</Label>
                    <span className="text-[10px] text-muted-foreground">{Math.round(wm.image_opacity * 100)}%</span>
                  </div>
                  <Slider
                    min={5} max={100} step={1}
                    value={[Math.round(wm.image_opacity * 100)]}
                    onValueChange={([v]) => set("image_opacity", v / 100)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">Position</Label>
                  <PositionGrid value={wm.image_position} onChange={(v) => set("image_position", v)} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: Preview ── */}
        <div className="flex-1 bg-muted/20 flex items-center justify-center p-6 overflow-hidden">
          <div
            className="relative w-full max-w-lg rounded-none overflow-hidden select-none"
            style={{ aspectRatio: "3/2" }}
          >
            {/* Background photo */}
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
              alt="Preview background"
              className="w-full h-full object-cover"
              draggable={false}
            />

            {/* Subtle dark overlay */}
            <div className="absolute inset-0 bg-black/10" />

            {/* TEXT watermark layer */}
            {wm.text_enabled && wm.text_content && (
              <div
                className="absolute pointer-events-none whitespace-nowrap"
                style={{
                  ...positionToStyle(wm.text_position, wm.text_scale),
                  color: wm.text_color,
                  opacity: wm.text_opacity,
                  fontSize: previewFontSize,
                  fontFamily: fontFamilyMap[wm.text_font] ?? "serif",
                  fontStyle: wm.text_font === "italic" ? "italic" : "normal",
                  lineHeight: 1.2,
                  textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                  letterSpacing: "0.02em",
                }}
              >
                {wm.text_content}
              </div>
            )}

            {/* IMAGE watermark layer */}
            {wm.image_enabled && wm.image_url && (
              <div
                className="absolute pointer-events-none"
                style={positionToStyle(wm.image_position, wm.image_scale)}
              >
                <img
                  src={wm.image_url}
                  alt="Watermark image"
                  draggable={false}
                  style={{
                    width: previewImgWidth,
                    maxWidth: "80%",
                    minWidth: "40px",
                    opacity: wm.image_opacity,
                    display: "block",
                    filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.4))",
                  }}
                />
              </div>
            )}

            {/* Empty state hint */}
            {(!wm.text_enabled || !wm.text_content) && (!wm.image_enabled || !wm.image_url) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/40 text-[11px] tracking-widest uppercase">
                  Configure layers to preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs tracking-wider uppercase font-light">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !wm.name.trim()}
          className="text-xs tracking-wider uppercase font-light gap-2"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? "Saving…" : wm.id ? "Update watermark" : "Save watermark"}
        </Button>
      </div>
    </div>
  );
}
