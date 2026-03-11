import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Check, FolderOpen, Pencil, List, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Slide, CreativeFormat } from "./creative-types";

interface Template { id: string; name: string; category: string; format: string; background_config: any; elements: any; footer_config: any; created_at: string; }

interface Props {
  formato: CreativeFormat;
  currentSlides: Slide[];
  onLoadTemplate: (slides: Slide[], format: CreativeFormat) => void;
  onEditTemplate?: (slides: Slide[], format: CreativeFormat, templateId: string, templateName: string) => void;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "promotional", label: "Promotional" },
  { value: "educational", label: "Educational" },
  { value: "institutional", label: "Institutional" },
  { value: "events", label: "Events" },
  { value: "testimonials", label: "Testimonials" },
];

export default function CreativeTemplateList({ formato, currentSlides, onLoadTemplate, onEditTemplate }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState("general");
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [subTab, setSubTab] = useState("list");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("creative_templates").select("*").neq("format", "footer").order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async () => {
    if (!saveName.trim() || !user) return;
    setSaving(true);
    try {
      const slidesData = currentSlides.map((slide) => {
        const bgConfig: any = {};
        if (slide.background_color) bgConfig.color = slide.background_color;
        if (slide.background_gradient) bgConfig.gradient = slide.background_gradient;
        if (slide.background_url) bgConfig.url = slide.background_url;
        return { bgConfig, elements: slide.elements };
      });
      const firstSlide = slidesData[0] || { bgConfig: {}, elements: [] };
      const { error } = await (supabase as any).from("creative_templates").insert({
        name: saveName, format: formato, category: saveCategory,
        background_config: firstSlide.bgConfig, elements: firstSlide.elements,
        footer_config: currentSlides.length > 1 ? { allSlides: slidesData } : null,
        photographer_id: user.id,
      });
      if (error) throw error;
      toast({ title: "Template saved!" });
      setSaveName("");
      setSubTab("list");
      fetchTemplates();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const buildSlidesFromTemplate = (t: Template): Slide[] => {
    if (t.footer_config?.allSlides) {
      return (t.footer_config.allSlides as any[]).map((sd: any) => ({
        background_url: sd.bgConfig?.url || "", background_color: sd.bgConfig?.color,
        background_gradient: sd.bgConfig?.gradient, elements: sd.elements || [],
      }));
    }
    return [{ background_url: t.background_config?.url || "", background_color: t.background_config?.color, background_gradient: t.background_config?.gradient, elements: t.elements || [] }];
  };

  const handleLoad = (t: Template) => { onLoadTemplate(buildSlidesFromTemplate(t), t.format as CreativeFormat); };
  const handleEdit = (t: Template) => { if (onEditTemplate) onEditTemplate(buildSlidesFromTemplate(t), t.format as CreativeFormat, t.id, t.name); };
  const handleDelete = async (id: string) => { if (!confirm("Delete template?")) return; await (supabase as any).from("creative_templates").delete().eq("id", id); fetchTemplates(); };

  const filteredTemplates = filterCategory === "all" ? templates : templates.filter((t) => t.category === filterCategory);

  const getPreviewStyle = (t: Template): React.CSSProperties => {
    const bg = t.background_config;
    if (bg?.gradient) return { background: bg.gradient };
    if (bg?.color) return { backgroundColor: bg.color };
    if (bg?.url) return { backgroundImage: `url(${bg.url})`, backgroundSize: "cover", backgroundPosition: "center" };
    return { backgroundColor: "hsl(var(--muted))" };
  };

  return (
    <div className="space-y-3">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="list" className="text-xs gap-1"><List className="h-3 w-3" /> My Templates</TabsTrigger>
          <TabsTrigger value="save" className="text-xs gap-1"><Save className="h-3 w-3" /> Save Current</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-2 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><FolderOpen className="h-3 w-3" /> Filter</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : filteredTemplates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No templates found.</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {filteredTemplates.map((t) => (
                <Card key={t.id} className="p-2 flex items-center gap-2">
                  <div className="w-10 h-10 rounded border border-border shrink-0 overflow-hidden" style={getPreviewStyle(t)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[9px]">{t.format}</Badge>
                      <Badge variant="secondary" className="text-[9px]">{t.category}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleLoad(t)}>Use</Button>
                    {onEditTemplate && (<Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleEdit(t)} title="Edit template"><Pencil className="h-3 w-3" /></Button>)}
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="save" className="space-y-2 mt-2">
          <div>
            <Label className="text-xs mb-1">Template Name</Label>
            <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="E.g. Photo Promo" className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs mb-1">Category</Label>
            <Select value={saveCategory} onValueChange={setSaveCategory}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving || !saveName.trim()} className="w-full gap-1 text-xs">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save as Template
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">Saves the current canvas (all slides) as a new reusable template.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
