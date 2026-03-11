import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, Pencil, FootprintsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { CanvasElement } from "./creative-types";
import { DIMS, type CreativeFormat } from "./creative-types";
import FooterEditorModal from "./FooterEditorModal";
import { FOOTER_ICONS, migrateFooterConfig, type FooterConfig } from "./footer-constants";

interface FooterTemplate { id: string; name: string; footer_config: FooterConfig; }

interface Props {
  formato: CreativeFormat;
  onApplyFooter: (elements: CanvasElement[], applyToAll?: boolean) => void;
  isCarrossel?: boolean;
  slidesCount?: number;
}

export default function FooterTemplateEditor({ formato, onApplyFooter, isCarrossel, slidesCount }: Props) {
  const { user } = useAuth();
  const [applyToAll, setApplyToAll] = useState(false);
  const [savedFooters, setSavedFooters] = useState<FooterTemplate[]>([]);
  const [loadingFooters, setLoadingFooters] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFooter, setEditingFooter] = useState<FooterTemplate | null>(null);
  const dim = DIMS[formato];

  useEffect(() => { fetchSavedFooters(); }, []);

  const fetchSavedFooters = async () => {
    setLoadingFooters(true);
    const { data } = await supabase.from("creative_templates").select("id, name, footer_config").eq("format", "footer").order("created_at", { ascending: false }) as any;
    setSavedFooters(data || []);
    setLoadingFooters(false);
  };

  const buildElementsFromConfig = (rawCfg: any): CanvasElement[] => {
    const cfg = migrateFooterConfig(rawCfg);
    const footerY = dim.h - cfg.footerHeight;
    const elements: CanvasElement[] = [];
    elements.push({
      id: crypto.randomUUID(), type: "container", content: "",
      x: 0, y: footerY, fontSize: 0, color: "transparent",
      fontWeight: "normal", fontStyle: "normal", textAlign: "left",
      width: dim.w, height: cfg.footerHeight, bgColor: cfg.bgColor + "cc",
      borderRadius: 0, opacity: 100, zIndex: 10, locked: true,
    });
    const textX = cfg.textX === -1 ? dim.w / 2 - 200 : cfg.textX;
    elements.push({
      id: crypto.randomUUID(), type: "text", content: cfg.footerText,
      x: textX, y: footerY + cfg.textY, fontSize: cfg.textSize, color: cfg.textColor,
      fontWeight: "bold", fontStyle: "normal", textAlign: cfg.textX === -1 ? "center" : "left",
      zIndex: 11, locked: true,
    });
    cfg.icons.forEach((ic) => {
      const foundIcon = FOOTER_ICONS.find((fi) => fi.name === ic.name);
      if (!foundIcon) return;
      elements.push({
        id: crypto.randomUUID(), type: "icon", content: "",
        x: ic.x, y: footerY + ic.y, fontSize: 0, color: "transparent",
        fontWeight: "normal", fontStyle: "normal", textAlign: "left",
        iconName: foundIcon.lucideName, iconColor: ic.color,
        iconBgColor: ic.bgColor, iconBgRadius: ic.bgRadius, iconSize: ic.size,
        zIndex: 11, locked: true,
      });
    });
    return elements;
  };

  const handleApplyTemplate = (ft: FooterTemplate) => {
    if (!ft.footer_config) return;
    const elements = buildElementsFromConfig(ft.footer_config);
    onApplyFooter(elements, applyToAll && isCarrossel);
    toast({ title: `Footer "${ft.name}" applied!` });
  };

  const handleDeleteFooter = async (id: string) => {
    if (!confirm("Delete saved footer?")) return;
    await supabase.from("creative_templates").delete().eq("id", id);
    fetchSavedFooters();
  };

  const previewScale = 0.22;

  return (
    <div className="space-y-3">
      <Button onClick={() => { setEditingFooter(null); setModalOpen(true); }} className="w-full gap-2" size="sm"><Plus className="h-4 w-4" /> Create Footer</Button>
      {isCarrossel && (slidesCount || 0) > 1 && (
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox checked={applyToAll} onCheckedChange={(v) => setApplyToAll(!!v)} />
          Apply to all slides
        </label>
      )}
      {loadingFooters ? (
        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : savedFooters.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <FootprintsIcon className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">No saved footers</p>
          <p className="text-[10px] text-muted-foreground/60">Create your first footer by clicking the button above</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Saved footers ({savedFooters.length})</p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {savedFooters.map((ft) => {
              const rawCfg = ft.footer_config;
              if (!rawCfg) return null;
              const cfg = migrateFooterConfig(rawCfg);
              const previewH = (cfg.footerHeight || 120) * previewScale;
              return (
                <Card key={ft.id} className="overflow-hidden">
                  <div className="w-full overflow-hidden" style={{ height: previewH + 4 }}>
                    <div style={{ width: dim.w, height: cfg.footerHeight, transform: `scale(${previewScale})`, transformOrigin: "top left", backgroundColor: (cfg.bgColor || "#000") + "cc", position: "relative" }}>
                      <div style={{ position: "absolute", top: cfg.textY, left: cfg.textX === -1 ? 0 : cfg.textX, width: cfg.textX === -1 ? dim.w : "auto", textAlign: cfg.textX === -1 ? "center" : "left", color: cfg.textColor || "#fff", fontSize: cfg.textSize || 22, fontWeight: "bold" }}>
                        {cfg.footerText || ""}
                      </div>
                      {cfg.icons.map((ic) => {
                        const foundIcon = FOOTER_ICONS.find((fi) => fi.name === ic.name);
                        if (!foundIcon) return null;
                        const IconComp = foundIcon.icon;
                        return (
                          <div key={ic.id} style={{ position: "absolute", left: ic.x, top: ic.y, display: "flex", alignItems: "center", justifyContent: "center", width: ic.size + 24, height: ic.size + 24, backgroundColor: ic.bgColor === "transparent" ? "transparent" : ic.bgColor, borderRadius: ic.bgRadius }}>
                            <IconComp size={ic.size} color={ic.color} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-2 flex items-center gap-2">
                    <p className="text-xs font-medium truncate flex-1">{ft.name}</p>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={() => { setEditingFooter(ft); setModalOpen(true); }}><Pencil className="h-2.5 w-2.5" /> Edit</Button>
                    <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => handleApplyTemplate(ft)}>Apply</Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteFooter(ft.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      <FooterEditorModal open={modalOpen} onOpenChange={setModalOpen} formato={formato} editingFooter={editingFooter} onApply={(cfg) => { const elements = buildElementsFromConfig(cfg); onApplyFooter(elements, applyToAll && isCarrossel); }} onSaved={() => fetchSavedFooters()} />
    </div>
  );
}
