import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import RichTextEditor from "@/components/RichTextEditor";
import { toast } from "@/hooks/use-toast";
import {
  fetchBlogPostById, upsertBlogPost, generateSlug, calcReadingTime,
  fetchBlogThemes, insertBlogThemes, updateBlogThemeStatus,
} from "@/lib/blog-api";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Save, Sparkles, Eye, Globe, Wand2, ImagePlus,
  Lightbulb, FileText, Loader2, X, Check,
} from "lucide-react";

export default function BlogEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const b = t.blog;
  const [previewOpen, setPreviewOpen] = useState(false);

  const [form, setForm] = useState({
    title: "", slug: "", content: "", summary: "", author: "",
    cover_image_url: "", mid_image_1: "", mid_image_2: "",
    tags: [] as string[], published: false, featured: false,
    category: "", meta_description: "", meta_keywords: [] as string[],
    canonical_url: "", og_image_url: "", reading_time_min: 1,
    published_at: null as string | null, scheduled_at: null as string | null,
    footer: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [themeSuggestionInput, setThemeSuggestionInput] = useState("");
  const [contentSize, setContentSize] = useState("medium");
  const [selectedTheme, setSelectedTheme] = useState<{ theme: string; description: string; id?: string } | null>(null);
  const [themeFilter, setThemeFilter] = useState<"pending" | "used">("pending");
  const [aiTab, setAiTab] = useState("themes");
  const [aiLoading, setAiLoading] = useState("");
  const [imagePrompts, setImagePrompts] = useState<Record<string, string>>({ cover: "", mid_1: "", mid_2: "" });

  const { data: existingPost } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: () => fetchBlogPostById(id!),
    enabled: !isNew && !!id,
  });

  const { data: themes = [], refetch: refetchThemes } = useQuery({
    queryKey: ["blog-themes-pending"],
    queryFn: () => fetchBlogThemes("pending"),
  });

  const { data: usedThemes = [], refetch: refetchUsedThemes } = useQuery({
    queryKey: ["blog-themes-used"],
    queryFn: () => fetchBlogThemes("used"),
  });

  useEffect(() => {
    if (existingPost) {
      const p = existingPost as any;
      setForm({
        title: p.title || "", slug: p.slug || "", content: p.content || "",
        summary: p.summary || "", author: p.author || "",
        cover_image_url: p.cover_image_url || "", mid_image_1: p.mid_image_1 || "",
        mid_image_2: p.mid_image_2 || "", tags: p.tags || [],
        published: p.published || false, featured: p.featured || false,
        category: p.category || "", meta_description: p.meta_description || "",
        meta_keywords: p.meta_keywords || [], canonical_url: p.canonical_url || "",
        og_image_url: p.og_image_url || "", reading_time_min: p.reading_time_min || 1,
        published_at: p.published_at || null, scheduled_at: p.scheduled_at || null,
        footer: p.footer || "",
      });
    }
  }, [existingPost]);

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f, title,
      slug: isNew || f.slug === generateSlug(f.title) ? generateSlug(title) : f.slug,
      reading_time_min: calcReadingTime(f.content),
    }));
  };

  const handleContentChange = (content: string) => {
    setForm((f) => ({ ...f, content, reading_time_min: calcReadingTime(content) }));
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm((f) => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, photographer_id: user?.id };
      if (!isNew) payload.id = id;
      if (form.published && !form.published_at) payload.published_at = new Date().toISOString();
      return upsertBlogPost(payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      toast({ title: "Post saved successfully!" });
      if (isNew && data?.id) navigate(`/dashboard/blog/${data.id}`, { replace: true });
    },
    onError: (err: any) => toast({ title: "Error saving", description: err.message, variant: "destructive" }),
  });

  const callAI = useCallback(async (action: string, extra?: Record<string, string>) => {
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-blog-seo", {
        body: { title: form.title, content: form.content, action, ...extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.result || "";
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setAiLoading("");
    }
  }, [form.title, form.content]);

  const handleSEOAction = useCallback(async (action: string) => {
    const result = await callAI(action);
    if (!result) return;
    if (action === "meta_description") {
      setForm((f) => ({ ...f, meta_description: result.replace(/^"|"$/g, "") }));
    } else if (action === "suggest_tags") {
      try { const tags = JSON.parse(result); if (Array.isArray(tags)) setForm((f) => ({ ...f, tags })); } catch { toast({ title: "Error processing tags", variant: "destructive" }); }
    } else if (action === "improve_title") {
      try { const titles = JSON.parse(result); if (Array.isArray(titles) && titles.length > 0) { setForm((f) => ({ ...f, title: titles[0] })); toast({ title: "Suggestions", description: titles.join(" | ") }); } } catch { toast({ title: "Error", variant: "destructive" }); }
    } else {
      toast({ title: "SEO Analysis", description: result.slice(0, 200) });
    }
  }, [callAI]);

  const handleGenerateThemes = async (suggestion?: string) => {
    const extra = suggestion ? { theme_suggestion: suggestion } : {};
    const result = await callAI("generate_themes", extra);
    if (!result || !user?.id) return;
    try {
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await insertBlogThemes(user.id, parsed.map((t: any) => ({ theme: t.theme || t.tema, description: t.description || t.descricao, category: t.category || t.categoria || "" })));
        refetchThemes();
        setThemeSuggestionInput("");
        toast({ title: `${parsed.length} themes generated!` });
      }
    } catch { toast({ title: "Error processing themes", variant: "destructive" }); }
  };

  const handleGenerateContent = async (theme?: { theme: string; description: string; id?: string }) => {
    const themeTitle = theme?.theme || form.title;
    const themeDesc = theme?.description || "";
    if (!themeTitle) { toast({ title: "Fill in the title or select a theme" }); return; }
    const result = await callAI("generate_content", { title: themeTitle, theme_description: themeDesc, content_size: contentSize });
    if (!result) return;
    try {
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setForm((f) => ({
        ...f,
        title: parsed.title || parsed.titulo || themeTitle,
        slug: generateSlug(parsed.title || parsed.titulo || themeTitle),
        content: parsed.content || parsed.conteudo || "",
        summary: parsed.summary || parsed.resumo || "",
        meta_description: parsed.meta_description || "",
        tags: parsed.tags || [],
        category: parsed.category || parsed.categoria || f.category,
        reading_time_min: calcReadingTime(parsed.content || parsed.conteudo || ""),
      }));
      if (theme?.id) { await updateBlogThemeStatus(theme.id, "used"); refetchThemes(); refetchUsedThemes(); }
      toast({ title: "Article generated! Review before publishing." });
    } catch { toast({ title: "Error processing content", variant: "destructive" }); }
  };

  const handleAnalyzeContent = async (slot: string) => {
    if (!form.content && !form.title) { toast({ title: "Add title or content first", variant: "destructive" }); return; }
    setAiLoading(`analyze_${slot}`);
    try {
      const { data, error } = await supabase.functions.invoke("ai-blog-seo", {
        body: { title: form.title, content: form.content, action: "suggest_image_prompt", slot },
      });
      if (error) throw error;
      setImagePrompts((prev) => ({ ...prev, [slot]: data?.result || "" }));
      toast({ title: "Suggestion generated!" });
    } catch (err: any) {
      toast({ title: "Error analyzing content", description: err.message, variant: "destructive" });
    } finally { setAiLoading(""); }
  };

  const handleGenerateImage = async (slot: string, field: string) => {
    const customPrompt = imagePrompts[slot]?.trim();
    const promptPrefix = customPrompt || `Professional editorial image for photography blog about: ${form.title}. Elegant, minimal style. No text.`;
    setAiLoading(`generate_${slot}`);
    try {
      const { data, error } = await supabase.functions.invoke("ai-blog-seo", {
        body: { title: form.title, action: "generate_image", image_prompt: promptPrefix },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const base64 = data?.result;
      if (!base64) throw new Error("No image generated");
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const fileName = `${Date.now()}-${slot}.png`;
      const { error: uploadError } = await supabase.storage.from("blog-images").upload(fileName, bytes, { contentType: "image/png" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(fileName);
      setForm((f) => ({ ...f, [field]: urlData.publicUrl, ...(slot === "cover" ? { og_image_url: urlData.publicUrl } : {}) }));
      toast({ title: "Image generated!" });
    } catch (err: any) {
      toast({ title: "Error generating image", description: err.message, variant: "destructive" });
    } finally { setAiLoading(""); }
  };

  const serpTitle = form.title || "Article title";
  const serpDesc = form.meta_description || form.summary || "Article description...";

  const renderImageSlot = (label: string, value: string, field: string, slotKey: string) => (
    <div key={slotKey} className="border rounded-lg p-3 space-y-2">
      <p className="text-xs font-medium">{label}</p>
      {value ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <img src={value} alt={label} className="w-full h-40 object-contain rounded-md bg-muted/20 border" />
            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setForm((f) => ({ ...f, [field]: "" }))}><X className="h-3 w-3" /></Button>
          </div>
          <div className="flex flex-col gap-2">
            <Textarea value={imagePrompts[slotKey] || ""} onChange={(e) => setImagePrompts((prev) => ({ ...prev, [slotKey]: e.target.value }))} placeholder="Describe the desired image..." className="text-xs min-h-[56px] resize-none flex-1" rows={3} />
            <div className="flex gap-1.5">
              <Button className="flex-1" variant="secondary" size="sm" onClick={() => handleAnalyzeContent(slotKey)} disabled={!!aiLoading}>
                {aiLoading === `analyze_${slotKey}` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />} Analyze
              </Button>
              <Button className="flex-1" variant="outline" size="sm" onClick={() => handleGenerateImage(slotKey, field)} disabled={!!aiLoading}>
                {aiLoading === `generate_${slotKey}` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />} Generate
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="w-full h-20 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <ImagePlus className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <Textarea value={imagePrompts[slotKey] || ""} onChange={(e) => setImagePrompts((prev) => ({ ...prev, [slotKey]: e.target.value }))} placeholder="Describe the desired image..." className="text-xs min-h-[56px] resize-none" rows={2} />
          <div className="flex gap-1.5">
            <Button className="flex-1" variant="secondary" size="sm" onClick={() => handleAnalyzeContent(slotKey)} disabled={!!aiLoading}>
              {aiLoading === `analyze_${slotKey}` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />} Analyze
            </Button>
            <Button className="flex-1" variant="outline" size="sm" onClick={() => handleGenerateImage(slotKey, field)} disabled={!!aiLoading}>
              {aiLoading === `generate_${slotKey}` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />} Generate
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/blog")}><ArrowLeft className="h-5 w-5" /></Button>
                  <h1 className="text-xl font-light tracking-wide">{isNew ? "New Post" : "Edit Post"}</h1>
                  {form.published && <Badge>Published</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={!form.content}>
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  {form.published && form.slug && (
                    <Button variant="outline" size="sm" onClick={() => window.open(`/blog/${form.slug}`, "_blank")}>
                      <Globe className="mr-2 h-4 w-4" /> View
                    </Button>
                  )}
                  <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.title || !form.slug}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Main editor */}
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <Label>Title</Label>
                        <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Article title" />
                        <p className={`text-xs mt-1 ${form.title.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>{form.title.length}/60 characters</p>
                      </div>
                      <div>
                        <Label>Slug</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">/blog/</span>
                          <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Summary</Label>
                        <Textarea value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} rows={2} placeholder="Brief article description" />
                      </div>
                      <div>
                        <Label>Content</Label>
                        <div className="max-h-[400px] overflow-y-auto border rounded-md">
                          <RichTextEditor content={form.content} onChange={handleContentChange} placeholder="Start writing your article..." />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">⏱ ~{form.reading_time_min} min read</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* AI Assistant */}
                  <Card className="border-foreground/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 font-light tracking-wide">
                        <Wand2 className="h-4 w-4" /> AI Assistant
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Tabs value={aiTab} onValueChange={setAiTab} className="w-full">
                        <TabsList className="w-full grid grid-cols-3 mx-3" style={{ width: "calc(100% - 24px)" }}>
                          <TabsTrigger value="themes" className="text-xs"><Lightbulb className="h-3 w-3 mr-1" />Themes</TabsTrigger>
                          <TabsTrigger value="content" className="text-xs"><FileText className="h-3 w-3 mr-1" />Content</TabsTrigger>
                          <TabsTrigger value="images" className="text-xs"><ImagePlus className="h-3 w-3 mr-1" />Images</TabsTrigger>
                        </TabsList>

                        <TabsContent value="themes" className="px-4 pb-4 space-y-3">
                          <div className="space-y-2">
                            <Input value={themeSuggestionInput} onChange={(e) => setThemeSuggestionInput(e.target.value)} placeholder="Theme suggestion (optional)..." className="text-xs h-8" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleGenerateThemes(themeSuggestionInput || undefined))} />
                            <Button className="w-full" size="sm" onClick={() => handleGenerateThemes(themeSuggestionInput || undefined)} disabled={!!aiLoading}>
                              {aiLoading === "generate_themes" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                              {themeSuggestionInput ? "Generate Similar Themes" : "Generate Themes"}
                            </Button>
                          </div>
                          <div className="flex gap-1 border-b pb-1">
                            <Button variant={themeFilter === "pending" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-3" onClick={() => setThemeFilter("pending")}>Pending ({themes.length})</Button>
                            <Button variant={themeFilter === "used" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-3" onClick={() => setThemeFilter("used")}>Used ({usedThemes.length})</Button>
                          </div>
                          <ScrollArea className="max-h-[300px]">
                            <div className="space-y-2">
                              {(themeFilter === "pending" ? themes : usedThemes).map((t: any) => (
                                <div key={t.id} className="border rounded-md p-2 space-y-1 hover:bg-accent/50 transition-colors">
                                  <p className="text-xs font-medium leading-tight">{t.theme}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                                  <div className="flex items-center gap-1 pt-1">
                                    <Badge variant="outline" className="text-[10px] h-5">{t.category}</Badge>
                                    <div className="flex-1" />
                                    {themeFilter === "pending" && (
                                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => {
                                        setForm((f) => ({ ...f, title: t.theme, slug: generateSlug(t.theme), summary: t.description || "", category: t.category || f.category }));
                                        setSelectedTheme({ theme: t.theme, description: t.description, id: t.id });
                                        setAiTab("content");
                                        toast({ title: "Theme selected! Click 'Generate Full Article' to create content." });
                                      }} disabled={!!aiLoading}><Check className="h-3 w-3 mr-1" /> Use</Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {(themeFilter === "pending" ? themes : usedThemes).length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  {themeFilter === "pending" ? 'No pending themes. Click "Generate Themes" to start.' : "No used themes yet."}
                                </p>
                              )}
                            </div>
                          </ScrollArea>
                        </TabsContent>

                        <TabsContent value="content" className="px-4 pb-4 space-y-3">
                          <p className="text-xs text-muted-foreground">Generate a complete article from the current title or select a theme in the Themes tab.</p>
                          <div>
                            <Label className="text-xs mb-1.5 block">Content size</Label>
                            <RadioGroup value={contentSize} onValueChange={setContentSize} className="flex gap-3">
                              <div className="flex items-center gap-1.5"><RadioGroupItem value="small" id="sz-s" /><Label htmlFor="sz-s" className="text-xs font-normal cursor-pointer">Small <span className="text-muted-foreground">(~500 words)</span></Label></div>
                              <div className="flex items-center gap-1.5"><RadioGroupItem value="medium" id="sz-m" /><Label htmlFor="sz-m" className="text-xs font-normal cursor-pointer">Medium <span className="text-muted-foreground">(~1000)</span></Label></div>
                              <div className="flex items-center gap-1.5"><RadioGroupItem value="large" id="sz-l" /><Label htmlFor="sz-l" className="text-xs font-normal cursor-pointer">Large <span className="text-muted-foreground">(~2000)</span></Label></div>
                            </RadioGroup>
                          </div>
                          <Button className="w-full" size="sm" onClick={() => handleGenerateContent(selectedTheme || undefined)} disabled={!!aiLoading || !form.title}>
                            {aiLoading === "generate_content" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                            Generate Full Article
                          </Button>
                          <div className="border-t pt-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Quick SEO</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleSEOAction("meta_description")} disabled={!!aiLoading}><Sparkles className="h-3 w-3 mr-1" /> Meta Desc</Button>
                              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleSEOAction("suggest_tags")} disabled={!!aiLoading}><Sparkles className="h-3 w-3 mr-1" /> Tags</Button>
                              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleSEOAction("improve_title")} disabled={!!aiLoading}><Sparkles className="h-3 w-3 mr-1" /> Title</Button>
                              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleSEOAction("analyze")} disabled={!!aiLoading}><Sparkles className="h-3 w-3 mr-1" /> Analyze</Button>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="images" className="px-4 pb-4 space-y-3">
                          <p className="text-xs text-muted-foreground">3 fixed images: cover + 2 intermediate (inserted after H2s).</p>
                          {renderImageSlot("🖼 Cover Image", form.cover_image_url, "cover_image_url", "cover")}
                          {renderImageSlot("📸 Intermediate 1 (after 1st H2)", form.mid_image_1, "mid_image_1", "mid_1")}
                          {renderImageSlot("📸 Intermediate 2 (after 2nd H2)", form.mid_image_2, "mid_image_2", "mid_2")}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Settings */}
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-light tracking-wide">Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))} /></div>
                      <div className="flex items-center justify-between"><Label>Featured</Label><Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} /></div>
                      <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Tips, Behind the Scenes" /></div>
                      <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} /></div>
                    </CardContent>
                  </Card>

                  {/* SEO */}
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-light tracking-wide flex items-center gap-1"><Globe className="h-4 w-4" /> SEO</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Meta Description</Label>
                        <Textarea value={form.meta_description} onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))} rows={3} placeholder="Search engine description (150-160 chars)" />
                        <p className={`text-xs mt-1 ${form.meta_description.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>{form.meta_description.length}/160</p>
                      </div>
                      <div>
                        <Label>Tags</Label>
                        <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add tag" />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {form.tags.map((t) => <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>{t} ×</Badge>)}
                        </div>
                      </div>
                      <div><Label>OG Image URL</Label><Input value={form.og_image_url} onChange={(e) => setForm((f) => ({ ...f, og_image_url: e.target.value }))} placeholder="Social media image URL" /></div>
                      <div><Label>Canonical URL</Label><Input value={form.canonical_url} onChange={(e) => setForm((f) => ({ ...f, canonical_url: e.target.value }))} placeholder="https://..." /></div>
                    </CardContent>
                  </Card>

                  {/* SERP Preview */}
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-light tracking-wide">Google Preview</CardTitle></CardHeader>
                    <CardContent>
                      <div className="border rounded-md p-3 bg-background space-y-1">
                        <p className="text-sm text-blue-600 font-medium truncate">{serpTitle}</p>
                        <p className="text-xs text-green-700 truncate">davions.app/blog/{form.slug || "slug"}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{serpDesc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>Post Preview</DialogTitle></DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="px-2 pb-6">
                    {form.cover_image_url && <img src={form.cover_image_url} alt={form.title} className="w-full h-64 object-cover rounded-xl mb-6" />}
                    <h1 className="text-3xl font-light tracking-wide mb-2">{form.title}</h1>
                    {form.summary && <p className="text-lg text-muted-foreground font-light mb-4">{form.summary}</p>}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {form.category && <Badge>{form.category}</Badge>}
                      {form.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                    </div>
                    <div className="prose prose-lg max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: form.content }} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
