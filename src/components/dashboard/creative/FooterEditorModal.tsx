import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Trash2, Palette, Ruler, Type, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { DIMS, type CreativeFormat } from "./creative-types";
import {
  FOOTER_ICONS, FOOTER_PRESETS, DEFAULT_FOOTER_CONFIG,
  migrateFooterConfig, type FooterConfig, type FooterIconInstance,
} from "./footer-constants";

interface FooterTemplate { id: string; name: string; footer_config: FooterConfig; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formato: CreativeFormat;
  editingFooter: FooterTemplate | null;
  onApply: (cfg: FooterConfig) => void;
  onSaved: () => void;
}

interface DragState { type: "icon" | "text"; id: string; startMouseX: number; startMouseY: number; startElX: number; startElY: number; }

function hexWithAlpha(hex: string, opacity: number): string {
  if (hex === "transparent") return "transparent";
  const alpha = Math.round((opacity / 100) * 255).toString(16).padStart(2, "0");
  return hex.slice(0, 7) + alpha;
}

export default function FooterEditorModal({ open, onOpenChange, formato, editingFooter, onApply, onSaved }: Props) {
  const { user } = useAuth();
  const dim = DIMS[formato];
  const canvasRef = useRef<HTMLDivElement>(null);
  const [cfg, setCfg] = useState<FooterConfig>({ ...DEFAULT_FOOTER_CONFIG });
  const [footerName, setFooterName] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const scale = Math.min(0.55, (window.innerWidth * 0.9 - 40) / dim.w);

  useEffect(() => {
    if (open) {
      if (editingFooter?.footer_config) { setCfg(migrateFooterConfig(editingFooter.footer_config)); setFooterName(editingFooter.name); }
      else { setCfg({ ...DEFAULT_FOOTER_CONFIG, icons: [] }); setFooterName(""); }
      setSelectedIconId(null);
    }
  }, [open, editingFooter]);

  const update = <K extends keyof FooterConfig>(key: K, value: FooterConfig[K]) => setCfg(prev => ({ ...prev, [key]: value }));
  const updateIcon = (id: string, patch: Partial<FooterIconInstance>) => setCfg(prev => ({ ...prev, icons: prev.icons.map(ic => ic.id === id ? { ...ic, ...patch } : ic) }));
  const addIcon = (name: string) => {
    const newIcon: FooterIconInstance = { id: crypto.randomUUID(), name, x: dim.w / 2 - 14, y: cfg.footerHeight / 2, size: 28, color: cfg.textColor, bgColor: "transparent", bgRadius: 999 };
    setCfg(prev => ({ ...prev, icons: [...prev.icons, newIcon] }));
    setSelectedIconId(newIcon.id);
  };
  const deleteIcon = (id: string) => { setCfg(prev => ({ ...prev, icons: prev.icons.filter(ic => ic.id !== id) })); if (selectedIconId === id) setSelectedIconId(null); };

  const handlePointerDown = useCallback((e: React.PointerEvent, type: "icon" | "text", id: string, elX: number, elY: number) => {
    e.preventDefault(); e.stopPropagation();
    setDragState({ type, id, startMouseX: e.clientX, startMouseY: e.clientY, startElX: elX, startElY: elY });
    if (type === "icon") setSelectedIconId(id);
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const handleMove = (e: PointerEvent) => {
      const dx = (e.clientX - dragState.startMouseX) / scale;
      const dy = (e.clientY - dragState.startMouseY) / scale;
      const newX = Math.max(0, Math.min(dim.w - 20, dragState.startElX + dx));
      const newY = Math.max(0, Math.min(cfg.footerHeight - 20, dragState.startElY + dy));
      if (dragState.type === "icon") updateIcon(dragState.id, { x: Math.round(newX), y: Math.round(newY) });
      else setCfg(prev => ({ ...prev, textX: Math.round(newX), textY: Math.round(newY) }));
    };
    const handleUp = () => setDragState(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
  }, [dragState, scale, dim.w, cfg.footerHeight]);

  const handleApply = () => { onApply(cfg); onOpenChange(false); toast({ title: "Footer applied!" }); };

  const handleSaveAndApply = async () => {
    if (!footerName.trim() || !user) return;
    setSaving(true);
    try {
      if (editingFooter) {
        const { error } = await supabase.from("creative_templates")
          .update({ name: footerName, footer_config: cfg as any, updated_at: new Date().toISOString() })
          .eq("id", editingFooter.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("creative_templates").insert({
          name: footerName, format: "footer", category: "footer",
          background_config: {}, elements: [],
          footer_config: cfg as any, photographer_id: user.id,
        } as any);
        if (error) throw error;
      }
      toast({ title: editingFooter ? "Footer updated!" : "Footer saved!" });
      onSaved(); onApply(cfg); onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const selectedIcon = cfg.icons.find(ic => ic.id === selectedIconId);
  const canvasW = dim.w * scale;
  const canvasH = cfg.footerHeight * scale;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl p-4 max-h-[95vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-sm">{editingFooter ? "Edit Footer" : "Create Footer"}</DialogTitle></DialogHeader>
        <div className="flex justify-center">
          <div ref={canvasRef} className="relative border-2 border-dashed border-border rounded-lg overflow-hidden cursor-crosshair" style={{ width: canvasW, height: canvasH }} onClick={() => setSelectedIconId(null)}>
            <div style={{ width: dim.w, height: cfg.footerHeight, transform: `scale(${scale})`, transformOrigin: "top left", backgroundColor: cfg.bgColor === "transparent" ? "transparent" : hexWithAlpha(cfg.bgColor, cfg.bgOpacity), position: "relative" }}>
              <div style={{ position: "absolute", left: cfg.textX === -1 ? 0 : cfg.textX, top: cfg.textY, width: cfg.textX === -1 ? dim.w : "auto", textAlign: cfg.textX === -1 ? "center" : "left", color: cfg.textColor, fontSize: cfg.textSize, fontWeight: "bold", fontFamily: "Inter", cursor: "grab", userSelect: "none" }}
                onPointerDown={(e) => handlePointerDown(e, "text", "text", cfg.textX === -1 ? dim.w / 2 - 100 : cfg.textX, cfg.textY)}>
                {cfg.footerText}
              </div>
              {cfg.icons.map((ic) => {
                const fi = FOOTER_ICONS.find(f => f.name === ic.name);
                if (!fi) return null;
                const IconComp = fi.icon;
                const isSelected = selectedIconId === ic.id;
                return (
                  <div key={ic.id} style={{ position: "absolute", left: ic.x, top: ic.y, display: "flex", alignItems: "center", justifyContent: "center", width: ic.size + 24, height: ic.size + 24, backgroundColor: ic.bgColor === "transparent" ? "transparent" : ic.bgColor, borderRadius: ic.bgRadius, cursor: "grab", outline: isSelected ? "2px solid #3b82f6" : "none", outlineOffset: 2 }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "icon", ic.id, ic.x, ic.y); }}
                    onClick={(e) => { e.stopPropagation(); setSelectedIconId(ic.id); }}>
                    <IconComp size={ic.size} color={ic.color} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold">Add Icon</Label>
              <div className="grid grid-cols-7 gap-1 max-h-[100px] overflow-y-auto pr-1">
                {FOOTER_ICONS.map(fi => { const IconComp = fi.icon; return (<Button key={fi.name} variant="outline" size="sm" className="h-7 w-7 p-0" title={fi.name} onClick={() => addIcon(fi.name)}><IconComp className="h-3 w-3" /></Button>); })}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold flex items-center gap-1"><Palette className="h-3 w-3" /> {selectedIcon ? `Icon: ${selectedIcon.name}` : "Select an icon"}</Label>
              {selectedIcon ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[9px] text-muted-foreground shrink-0">Size</Label>
                    <Slider min={16} max={60} value={[selectedIcon.size]} onValueChange={([v]) => updateIcon(selectedIcon.id, { size: v })} className="flex-1" />
                    <span className="text-[9px] w-5 text-right">{selectedIcon.size}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[9px] text-muted-foreground">Color</Label><div className="flex gap-1 mt-0.5"><Input type="color" value={selectedIcon.color} onChange={e => updateIcon(selectedIcon.id, { color: e.target.value })} className="h-6 w-8 p-0.5 shrink-0" /><Input value={selectedIcon.color} onChange={e => updateIcon(selectedIcon.id, { color: e.target.value })} className="h-6 text-[10px] font-mono flex-1" maxLength={7} /></div></div>
                    <div><Label className="text-[9px] text-muted-foreground">Background</Label><div className="flex gap-1 mt-0.5"><Input type="color" value={selectedIcon.bgColor === "transparent" ? "#000000" : selectedIcon.bgColor} onChange={e => updateIcon(selectedIcon.id, { bgColor: e.target.value })} className="h-6 w-8 p-0.5 shrink-0" /><Button size="sm" variant={selectedIcon.bgColor === "transparent" ? "default" : "outline"} className="h-6 text-[8px] px-1.5" onClick={() => updateIcon(selectedIcon.id, { bgColor: "transparent" })} title="Transparent"><EyeOff className="h-2.5 w-2.5" /></Button></div></div>
                  </div>
                  <div className="flex items-center gap-2"><Label className="text-[9px] text-muted-foreground shrink-0">Radius</Label><Slider min={0} max={999} value={[selectedIcon.bgRadius]} onValueChange={([v]) => updateIcon(selectedIcon.id, { bgRadius: v })} className="flex-1" /><span className="text-[9px] w-5 text-right">{selectedIcon.bgRadius}</span></div>
                  <Button size="sm" variant="destructive" className="h-6 text-[10px] w-full gap-1" onClick={() => deleteIcon(selectedIcon.id)}><Trash2 className="h-3 w-3" /> Remove</Button>
                </div>
              ) : (<p className="text-[10px] text-muted-foreground">Click an icon on the canvas to edit</p>)}
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold flex items-center gap-1"><Type className="h-3 w-3" /> Text</Label>
              <Input value={cfg.footerText} onChange={e => update("footerText", e.target.value)} placeholder="Footer text" className="h-7 text-xs" />
              <div className="flex gap-1 flex-wrap">
                {FOOTER_PRESETS.map(p => (<Button key={p.label} size="sm" variant={cfg.footerText === p.text ? "default" : "outline"} className="text-[8px] h-4 px-1" onClick={() => update("footerText", p.text)}>{p.label}</Button>))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1"><Label className="text-[9px] text-muted-foreground shrink-0">Size</Label><Slider min={12} max={40} value={[cfg.textSize]} onValueChange={([v]) => update("textSize", v)} className="flex-1" /><span className="text-[9px] w-5 text-right">{cfg.textSize}</span></div>
                <div><div className="flex gap-1"><Input type="color" value={cfg.textColor} onChange={e => update("textColor", e.target.value)} className="h-6 w-8 p-0.5 shrink-0" /><Input value={cfg.textColor} onChange={e => update("textColor", e.target.value)} className="h-6 text-[10px] font-mono flex-1" maxLength={7} /></div></div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold flex items-center gap-1"><Ruler className="h-3 w-3" /> Background & Dimensions</Label>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[9px] text-muted-foreground">Bg Color</Label><div className="flex gap-1 mt-0.5"><Input type="color" value={cfg.bgColor === "transparent" ? "#000000" : cfg.bgColor} onChange={e => update("bgColor", e.target.value)} className="h-6 w-8 p-0.5 shrink-0" /><Input value={cfg.bgColor} onChange={e => update("bgColor", e.target.value)} className="h-6 text-[10px] font-mono flex-1" maxLength={7} /></div></div>
                <div className="flex items-center gap-1"><Button size="sm" variant={cfg.bgColor === "transparent" ? "default" : "outline"} className="h-6 text-[8px] px-1.5 gap-0.5" onClick={() => setCfg(prev => ({ ...prev, bgColor: "transparent", bgOpacity: 0 }))}><EyeOff className="h-2.5 w-2.5" /> Transparent</Button></div>
              </div>
              <div className="flex items-center gap-2"><Label className="text-[9px] text-muted-foreground shrink-0">Opacity</Label><Slider min={0} max={100} value={[cfg.bgOpacity]} onValueChange={([v]) => update("bgOpacity", v)} className="flex-1" /><span className="text-[9px] w-7 text-right">{cfg.bgOpacity}%</span></div>
              <div className="flex items-center gap-2"><Label className="text-[9px] text-muted-foreground shrink-0">Height</Label><Slider min={60} max={200} value={[cfg.footerHeight]} onValueChange={([v]) => update("footerHeight", v)} className="flex-1" /><span className="text-[9px] w-5 text-right">{cfg.footerHeight}</span></div>
            </div>
            <Separator />
            <div><Label className="text-[9px] text-muted-foreground">Template Name</Label><Input value={footerName} onChange={e => setFooterName(e.target.value)} placeholder="E.g. Default footer" className="h-7 text-xs mt-0.5" /></div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-1">
          <Button variant="outline" onClick={handleApply} className="flex-1 h-8 text-xs">Apply without saving</Button>
          <Button onClick={handleSaveAndApply} disabled={saving || !footerName.trim()} className="flex-1 gap-1.5 h-8 text-xs">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {editingFooter ? "Save and Apply" : "Save as Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
