import { useState, useCallback, useRef, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Save, Sparkles, Hash, Lightbulb, List, Layout, Image, FilePlus, RefreshCw, Loader2, Copy } from "lucide-react";
import CreativeAIPanel from "@/components/dashboard/creative/CreativeAIPanel";
import CreativeCanvas from "@/components/dashboard/creative/CreativeCanvas";
import CreativeThemeGenerator from "@/components/dashboard/creative/CreativeThemeGenerator";
import CreativePostsList from "@/components/dashboard/creative/CreativePostsList";
import CreativeTemplateList from "@/components/dashboard/creative/CreativeTemplateList";
import IconLibrary from "@/components/dashboard/creative/IconLibrary";
import FooterTemplateEditor from "@/components/dashboard/creative/FooterTemplateEditor";
import BrandAssetsLibrary from "@/components/dashboard/creative/BrandAssetsLibrary";
import UnsavedChangesModal from "@/components/dashboard/creative/UnsavedChangesModal";
import type { CreativeFormat, GeneratedTexts, Slide, CanvasElement, BackgroundType } from "@/components/dashboard/creative/creative-types";

export default function CreativeStudio() {
  const { user, signOut } = useAuth();
  const [formato, setFormato] = useState<CreativeFormat>("post_1080");
  const [plataformas, setPlataformas] = useState<string[]>(["instagram"]);
  const [slides, setSlides] = useState<Slide[]>([{ background_url: "", elements: [] }]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [generatedTexts, setGeneratedTexts] = useState<GeneratedTexts | null>(null);
  const [saving, setSaving] = useState(false);
  const [numSlides, setNumSlides] = useState(4);
  const [caption, setCaption] = useState("");
  const [leftTab, setLeftTab] = useState("ia");
  const [canvasPadding, setCanvasPadding] = useState(60);
  const [tema, setTema] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [updatingTemplate, setUpdatingTemplate] = useState(false);
  const bgHistoryRef = useRef<{ url: string; color?: string; gradient?: string; position?: string }[]>([]);
  const initialStateRef = useRef(JSON.stringify({ slides: [{ background_url: "", elements: [] }], caption: "" }));

  useEffect(() => {
    const current = JSON.stringify({ slides, caption });
    setIsDirty(current !== initialStateRef.current);
  }, [slides, caption]);

  const markClean = useCallback(() => { initialStateRef.current = JSON.stringify({ slides, caption }); setIsDirty(false); }, [slides, caption]);
  const currentSlideData = slides[currentSlide];

  const handleTextsGenerated = useCallback((texts: GeneratedTexts) => {
    setGeneratedTexts(texts);
    const captionStr = `${texts.titulo}\n\n${texts.subtitulo}\n\n${texts.cta}\n\n${texts.hashtags.map((h) => `#${h}`).join(" ")}`;
    setCaption(captionStr);
    if (formato === "carrossel" && texts.slides?.length) {
      const pad = canvasPadding;
      const newSlides: Slide[] = texts.slides.map((s, i) => ({
        background_url: slides[i]?.background_url || "",
        background_color: slides[i]?.background_color, background_gradient: slides[i]?.background_gradient, background_position: slides[i]?.background_position,
        elements: [
          { id: crypto.randomUUID(), type: "text" as const, content: s.titulo, x: pad, y: 300, fontSize: 64, color: "#ffffff", fontWeight: "bold" as const, fontStyle: "normal" as const, textAlign: "left" as const },
          { id: crypto.randomUUID(), type: "text" as const, content: s.subtitulo, x: pad, y: 450, fontSize: 32, color: "#eeeeee", fontWeight: "normal" as const, fontStyle: "normal" as const, textAlign: "left" as const },
        ],
      }));
      setSlides(newSlides); setCurrentSlide(0);
    } else {
      const pad = canvasPadding;
      const elements: CanvasElement[] = [
        { id: crypto.randomUUID(), type: "text", content: texts.titulo, x: pad, y: formato === "story_1080" ? 600 : 300, fontSize: 64, color: "#ffffff", fontWeight: "bold", fontStyle: "normal", textAlign: "left" },
        { id: crypto.randomUUID(), type: "text", content: texts.subtitulo, x: pad, y: formato === "story_1080" ? 750 : 450, fontSize: 32, color: "#eeeeee", fontWeight: "normal", fontStyle: "normal", textAlign: "left" },
        { id: crypto.randomUUID(), type: "text", content: texts.cta, x: pad, y: formato === "story_1080" ? 1500 : 800, fontSize: 40, color: "#00d4aa", fontWeight: "bold", fontStyle: "normal", textAlign: "center" },
      ];
      setSlides([{ background_url: slides[0]?.background_url || "", background_color: slides[0]?.background_color, background_gradient: slides[0]?.background_gradient, background_position: slides[0]?.background_position, elements }]);
      setCurrentSlide(0);
    }
    toast({ title: "Texts generated successfully!" });
  }, [formato, slides, canvasPadding]);

  const handleImageGenerated = useCallback((url: string, applyToAll?: boolean) => {
    setSlides((prev) => {
      const current = prev[currentSlide];
      if (current) bgHistoryRef.current.push({ url: current.background_url, color: current.background_color, gradient: current.background_gradient, position: current.background_position });
      if (applyToAll) return prev.map((s) => ({ ...s, background_url: url, background_color: undefined, background_gradient: undefined }));
      return prev.map((s, i) => (i === currentSlide ? { ...s, background_url: url, background_color: undefined, background_gradient: undefined } : s));
    });
    toast({ title: applyToAll ? "Image applied to all slides!" : "Background image generated!" });
  }, [currentSlide]);

  const handleUndoBackground = useCallback(() => {
    const prev = bgHistoryRef.current.pop();
    if (!prev) return;
    setSlides((slides) => slides.map((s, i) => (i !== currentSlide ? s : { ...s, background_url: prev.url, background_color: prev.color, background_gradient: prev.gradient, background_position: prev.position })));
    toast({ title: "Previous background restored!" });
  }, [currentSlide]);

  const handleRemoveBackground = useCallback(() => {
    setSlides((prev) => prev.map((s, i) => {
      if (i !== currentSlide) return s;
      bgHistoryRef.current.push({ url: s.background_url, color: s.background_color, gradient: s.background_gradient, position: s.background_position });
      return { ...s, background_url: "", background_color: undefined, background_gradient: undefined, background_position: undefined };
    }));
    toast({ title: "Background removed!" });
  }, [currentSlide]);

  const handleBackgroundChange = useCallback((type: BackgroundType, value: string) => {
    setSlides((prev) => prev.map((s, i) => {
      if (i !== currentSlide) return s;
      if (type === "solid") return { ...s, background_color: value, background_gradient: undefined, background_url: "" };
      if (type === "gradient") return { ...s, background_gradient: value, background_color: undefined, background_url: "" };
      return s;
    }));
  }, [currentSlide]);

  const handleBackgroundPositionChange = useCallback((pos: string) => {
    setSlides((prev) => prev.map((s, i) => (i === currentSlide ? { ...s, background_position: pos } : s)));
  }, [currentSlide]);

  const handleAddIcon = useCallback((el: CanvasElement) => {
    setSlides((prev) => prev.map((s, i) => (i === currentSlide ? { ...s, elements: [...s.elements, el] } : s)));
  }, [currentSlide]);

  const handleAddBrandAsset = useCallback((url: string, knownW?: number, knownH?: number) => {
    const maxSide = 400;
    const loadAndAdd = (w: number, h: number) => {
      const ratio = Math.min(maxSide / w, maxSide / h, 1);
      const el: CanvasElement = {
        id: crypto.randomUUID(), type: "image", content: "",
        x: 100, y: 100, fontSize: 0, color: "transparent",
        fontWeight: "normal", fontStyle: "normal", textAlign: "left",
        imageUrl: url, width: Math.round(w * ratio), height: Math.round(h * ratio), borderRadius: 0,
      };
      setSlides((prev) => prev.map((s, i) => (i === currentSlide ? { ...s, elements: [...s.elements, el] } : s)));
    };
    if (knownW && knownH) { loadAndAdd(knownW, knownH); return; }
    const img = new window.Image();
    img.onload = () => loadAndAdd(img.naturalWidth, img.naturalHeight);
    img.onerror = () => loadAndAdd(300, 300);
    img.crossOrigin = "anonymous"; img.src = url;
  }, [currentSlide]);

  const handleApplyFooter = useCallback((elements: CanvasElement[], applyToAll?: boolean) => {
    if (applyToAll && formato === "carrossel") {
      setSlides((prev) => prev.map((s) => ({ ...s, elements: [...s.elements, ...elements] })));
      toast({ title: "Footer applied to all slides!" });
    } else {
      setSlides((prev) => prev.map((s, i) => (i === currentSlide ? { ...s, elements: [...s.elements, ...elements] } : s)));
      toast({ title: "Footer applied!" });
    }
  }, [currentSlide, formato]);

  const handleApplyBgToAll = useCallback(() => {
    setSlides((prev) => { const current = prev[currentSlide]; if (!current) return prev; return prev.map((s) => ({ ...s, background_url: current.background_url, background_color: current.background_color, background_gradient: current.background_gradient, background_position: current.background_position })); });
    toast({ title: "Background applied to all slides!" });
  }, [currentSlide]);

  const handleLoadTemplate = (templateSlides: Slide[], format: CreativeFormat) => {
    setFormato(format); setSlides(templateSlides); setCurrentSlide(0);
    setEditingTemplateId(null); setEditingTemplateName("");
    toast({ title: "Template loaded!" });
  };

  const handleEditTemplate = (templateSlides: Slide[], format: CreativeFormat, templateId: string, templateName: string) => {
    setFormato(format); setSlides(templateSlides); setCurrentSlide(0);
    setEditingTemplateId(templateId); setEditingTemplateName(templateName); setLeftTab("ia");
    toast({ title: `Editing template: ${templateName}` });
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !user) return;
    setUpdatingTemplate(true);
    try {
      const slidesData = slides.map((slide) => {
        const bgConfig: any = {};
        if (slide.background_color) bgConfig.color = slide.background_color;
        if (slide.background_gradient) bgConfig.gradient = slide.background_gradient;
        if (slide.background_url) bgConfig.url = slide.background_url;
        if (slide.background_position) bgConfig.position = slide.background_position;
        return { bgConfig, elements: slide.elements };
      });
      const firstSlide = slidesData[0] || { bgConfig: {}, elements: [] };
      const { error } = await supabase.from("creative_templates").update({
        format: formato, background_config: firstSlide.bgConfig, elements: firstSlide.elements,
        footer_config: slides.length > 1 ? { allSlides: slidesData } : null,
      } as any).eq("id", editingTemplateId);
      if (error) throw error;
      toast({ title: `Template "${editingTemplateName}" updated!` });
    } catch (e: any) {
      toast({ title: "Error updating", description: e.message, variant: "destructive" });
    } finally { setUpdatingTemplate(false); }
  };

  const handleEditPost = (post: any) => {
    if (post.media_urls?.slides) { setSlides(post.media_urls.slides); setFormato(post.media_urls.format || "post_1080"); }
    if (post.caption) setCaption(post.caption);
    setEditingTemplateId(null); setEditingTemplateName(""); setLeftTab("ia");
    toast({ title: `Editing: ${post.name}` });
  };

  const handleSaveAsPost = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const canvasData = { format: formato, slides };
      const { error } = await supabase.from("mkt_social_posts").insert({
        name: generatedTexts?.titulo || "Untitled creative",
        platform: plataformas[0] || "instagram",
        post_type: formato === "carrossel" ? "carousel" : formato === "story_1080" ? "story" : "feed",
        caption, hashtags: generatedTexts?.hashtags || [],
        media_urls: canvasData as any, status: "draft", photographer_id: user.id,
      });
      if (error) throw error;
      markClean();
      toast({ title: "Creative saved as draft!" });
    } catch (e: any) {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    setSlides([{ background_url: "", elements: [] }]); setCurrentSlide(0);
    setGeneratedTexts(null); setCaption(""); setFormato("post_1080");
    setPlataformas(["instagram"]); setNumSlides(4);
    setEditingTemplateId(null); setEditingTemplateName("");
    bgHistoryRef.current = []; markClean();
    toast({ title: "Editor reset!" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-4 overflow-hidden">
            <UnsavedChangesModal isDirty={isDirty} pendingNavigation={null} onSave={handleSaveAsPost} onDiscard={() => {}} onCancel={() => {}} />
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-100px)]">
              {/* Left panel */}
              <div className="space-y-3 overflow-y-auto">
                <Tabs value={leftTab} onValueChange={setLeftTab}>
                  <TabsList className="w-full grid grid-cols-5">
                    <TabsTrigger value="ia" className="text-xs gap-1"><Sparkles className="h-3 w-3" /> AI</TabsTrigger>
                    <TabsTrigger value="temas" className="text-xs gap-1"><Lightbulb className="h-3 w-3" /> Themes</TabsTrigger>
                    <TabsTrigger value="lista" className="text-xs gap-1"><List className="h-3 w-3" /> Posts</TabsTrigger>
                    <TabsTrigger value="templates" className="text-xs gap-1"><Layout className="h-3 w-3" /> Templates</TabsTrigger>
                    <TabsTrigger value="assets" className="text-xs gap-1"><Image className="h-3 w-3" /> Assets</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ia" className="space-y-3 mt-3">
                    {editingTemplateId && (
                      <Card className="p-3 border-primary bg-primary/5">
                        <div className="flex items-center justify-between gap-2">
                          <div><p className="text-xs text-muted-foreground">Editing template</p><p className="text-sm font-semibold truncate">{editingTemplateName}</p></div>
                          <Button size="sm" onClick={handleUpdateTemplate} disabled={updatingTemplate} className="gap-1 shrink-0">
                            {updatingTemplate ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Update
                          </Button>
                        </div>
                      </Card>
                    )}
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Configure AI</CardTitle></CardHeader>
                      <CardContent>
                        <CreativeAIPanel
                          formato={formato}
                          setFormato={(f) => { setFormato(f); if (f !== "carrossel") { setSlides([slides[0] || { background_url: "", elements: [] }]); setCurrentSlide(0); } }}
                          plataformas={plataformas} setPlataformas={setPlataformas}
                          onTextsGenerated={handleTextsGenerated} onImageGenerated={handleImageGenerated}
                          onBackgroundChange={handleBackgroundChange} numSlides={numSlides} setNumSlides={setNumSlides}
                          onUndoBackground={handleUndoBackground} canUndoBackground={bgHistoryRef.current.length > 0}
                          isCarrossel={formato === "carrossel"} slidesCount={slides.length}
                          onApplyBgToAll={handleApplyBgToAll} tema={tema} setTema={setTema}
                          onRemoveBackground={handleRemoveBackground}
                          backgroundPosition={currentSlideData?.background_position}
                          onBackgroundPositionChange={handleBackgroundPositionChange}
                          hasBackgroundImage={!!currentSlideData?.background_url}
                        />
                      </CardContent>
                    </Card>
                    {generatedTexts && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /> Generated Texts</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          <div><Label className="text-xs text-muted-foreground">Title</Label><p className="text-sm font-semibold">{generatedTexts.titulo}</p></div>
                          <div><Label className="text-xs text-muted-foreground">Subtitle</Label><p className="text-sm">{generatedTexts.subtitulo}</p></div>
                          <div><Label className="text-xs text-muted-foreground">CTA</Label><p className="text-sm font-medium text-primary">{generatedTexts.cta}</p></div>
                          <div className="flex flex-wrap gap-1">{generatedTexts.hashtags.map((h) => (<Badge key={h} variant="secondary" className="text-xs">#{h}</Badge>))}</div>
                        </CardContent>
                      </Card>
                    )}
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Copy className="h-4 w-4 text-primary" /> Post Caption</CardTitle></CardHeader>
                      <CardContent>
                        <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} placeholder="Caption with hashtags..." className="text-sm" />
                      </CardContent>
                    </Card>
                    <Button onClick={handleReset} variant="outline" className="w-full gap-2"><FilePlus className="h-4 w-4" /> New Post</Button>
                    <Button onClick={handleSaveAsPost} disabled={saving} className="w-full gap-2"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save as Post"}</Button>
                  </TabsContent>

                  <TabsContent value="temas" className="mt-3">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Theme Generator</CardTitle></CardHeader>
                      <CardContent><CreativeThemeGenerator onSelectTheme={(t) => { setTema(t); setLeftTab("ia"); toast({ title: `Theme selected: ${t}` }); }} /></CardContent></Card>
                  </TabsContent>

                  <TabsContent value="lista" className="mt-3">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><List className="h-4 w-4 text-primary" /> Saved Creatives</CardTitle></CardHeader>
                      <CardContent><CreativePostsList onEdit={handleEditPost} onDownload={(post: any) => { handleEditPost(post); toast({ title: "Post loaded on canvas. Click 'Export PNG' to download." }); }} /></CardContent></Card>
                  </TabsContent>

                  <TabsContent value="templates" className="mt-3">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layout className="h-4 w-4 text-primary" /> Templates</CardTitle></CardHeader>
                      <CardContent><CreativeTemplateList formato={formato} currentSlides={slides} onLoadTemplate={handleLoadTemplate} onEditTemplate={handleEditTemplate} /></CardContent></Card>
                  </TabsContent>

                  <TabsContent value="assets" className="mt-3 space-y-3">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Brand Assets</CardTitle></CardHeader><CardContent><BrandAssetsLibrary onAddToCanvas={handleAddBrandAsset} /></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Icon Library</CardTitle></CardHeader><CardContent><IconLibrary onAddIcon={handleAddIcon} /></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Social Footer</CardTitle></CardHeader><CardContent><FooterTemplateEditor formato={formato} onApplyFooter={handleApplyFooter} isCarrossel={formato === "carrossel"} slidesCount={slides.length} /></CardContent></Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right panel - Canvas */}
              <Card className="overflow-hidden">
                <CardContent className="p-4 h-full">
                  <CreativeCanvas formato={formato} slides={slides} setSlides={setSlides} currentSlide={currentSlide} setCurrentSlide={setCurrentSlide} canvasPadding={canvasPadding} onCanvasPaddingChange={setCanvasPadding} onReset={handleReset} />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
