import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBlogContext } from "@/contexts/BlogContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, Upload, X, Loader2 } from "lucide-react";

function convertMarkdownToHtml(text: string): string {
  const lines = text.split("\n");
  const output: string[] = [];
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { if (inList) { output.push("</ul>"); inList = false; } continue; }
    const h2 = trimmed.match(/^## (.+)$/);
    if (h2) { if (inList) { output.push("</ul>"); inList = false; } output.push(`<h2>${h2[1]}</h2>`); continue; }
    const h3 = trimmed.match(/^### (.+)$/);
    if (h3) { if (inList) { output.push("</ul>"); inList = false; } output.push(`<h3>${h3[1]}</h3>`); continue; }
    const li = trimmed.match(/^- (.+)$/);
    if (li) { if (!inList) { output.push("<ul>"); inList = true; } output.push(`<li>${li[1]}</li>`); continue; }
    const oli = trimmed.match(/^\d+\. (.+)$/);
    if (oli) { if (!inList) { output.push("<ul>"); inList = true; } output.push(`<li>${oli[1]}</li>`); continue; }
    if (inList) { output.push("</ul>"); inList = false; }
    let processed = trimmed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    output.push(`<p>${processed}</p>`);
  }
  if (inList) output.push("</ul>");
  return output.join("\n");
}

export const ManualPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { config, photographerId } = useBlogContext();

  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [middleAlt, setMiddleAlt] = useState("");
  const [ctaText, setCtaText] = useState(config.defaultCta);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedBlogId, setSavedBlogId] = useState<string | null>(null);
  const [includeCta, setIncludeCta] = useState(true);

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [middleImageFile, setMiddleImageFile] = useState<File | null>(null);
  const [middleImagePreview, setMiddleImagePreview] = useState<string | null>(null);
  const [skInput, setSkInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { if (title && !metaTitle) setMetaTitle(title.slice(0, 60)); }, [title]);
  useEffect(() => {
    if (title && !slug) {
      setSlug(title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-"));
    }
  }, [title]);
  useEffect(() => { if (keyword && !ogTitle) setOgTitle(metaTitle || title); }, [keyword]);

  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  const manualChecks = useMemo(() => [
    { id: "has_title", label: "Título preenchido", pass: title.trim().length > 0 },
    { id: "has_keyword", label: "Keyword principal definida", pass: keyword.trim().length > 0 },
    { id: "has_content", label: "Conteúdo com ao menos 300 palavras", pass: wordCount >= 300 },
    { id: "has_meta_title", label: "Meta title preenchido (máx 60 chars)", pass: metaTitle.length > 0 && metaTitle.length <= 60 },
    { id: "has_meta_description", label: "Meta description preenchida (máx 155 chars)", pass: metaDescription.length > 0 && metaDescription.length <= 155 },
    { id: "has_slug", label: "Slug definido", pass: slug.trim().length > 0 },
    { id: "has_cover", label: "Imagem de capa adicionada", pass: !!coverImagePreview },
    { id: "has_middle_image", label: "Imagem do meio adicionada", pass: !!middleImagePreview },
    { id: "keyword_in_title", label: "Keyword no título", pass: keyword.length > 0 && title.toLowerCase().includes(keyword.toLowerCase()) },
    { id: "has_secondary_keywords", label: "Ao menos 2 keywords secundárias", pass: secondaryKeywords.length >= 2 },
  ], [title, keyword, wordCount, metaTitle, metaDescription, slug, coverImagePreview, middleImagePreview, secondaryKeywords]);

  const score = Math.round((manualChecks.filter((c) => c.pass).length / manualChecks.length) * 100);
  const getScoreColor = (s: number) => s < 60 ? "text-red-500" : s < 75 ? "text-yellow-500" : s < 90 ? "text-blue-500" : "text-green-600";

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverImageFile(file);
    setCoverImagePreview(URL.createObjectURL(file));
  };

  const handleMiddleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMiddleImageFile(file);
    setMiddleImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `blog-images/${path}/${fileName}`;
    const { error } = await supabase.storage.from("blog-module").upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from("blog-module").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const addSecondaryKeyword = (value: string) => {
    const v = value.trim();
    if (v && !secondaryKeywords.includes(v)) setSecondaryKeywords((prev) => [...prev, v]);
  };

  const addTag = (value: string) => {
    const v = value.trim();
    if (v && !tags.includes(v)) setTags((prev) => [...prev, v]);
  };

  const salvarBlog = async (targetStatus: string) => {
    if (!photographerId) return;
    setIsSaving(true);
    try {
      let coverUrl: string | null = null;
      let middleUrl: string | null = null;
      if (coverImageFile) coverUrl = await uploadImage(coverImageFile, "covers");
      if (middleImageFile) middleUrl = await uploadImage(middleImageFile, "middle");

      const processedContent = convertMarkdownToHtml(content);

      const blogData = {
        title: title.trim(), slug: slug.trim(), content: processedContent,
        keyword: keyword.trim(), secondary_keywords: secondaryKeywords,
        mode: "manual" as const, status: targetStatus, word_count: wordCount,
        reading_time_minutes: readingTime, cover_image_url: coverUrl, cover_image_alt: coverAlt,
        middle_image_url: middleUrl, middle_image_alt: middleAlt,
        cta_text: includeCta ? ctaText : null,
        published_at: targetStatus === "published" ? new Date().toISOString() : null,
        scheduled_at: scheduledAt || null, updated_at: new Date().toISOString(),
        photographer_id: photographerId,
      };

      let blogId = savedBlogId;
      if (blogId) {
        await supabase.from("blogs").update(blogData).eq("id", blogId);
      } else {
        const { data: newBlog } = await supabase.from("blogs").insert(blogData).select().single();
        blogId = newBlog!.id;
        setSavedBlogId(blogId);
      }

      const checklistObj = Object.fromEntries(manualChecks.map((c) => [c.id, c.pass]));
      const seoData = {
        blog_id: blogId, meta_title: metaTitle, meta_description: metaDescription,
        slug, og_title: ogTitle, og_description: ogDescription,
        secondary_keywords: secondaryKeywords, score, checklist: checklistObj,
        updated_at: new Date().toISOString(), photographer_id: photographerId,
      };

      const { data: existingSeo } = await supabase.from("ai_blog_seo").select("id").eq("blog_id", blogId!).maybeSingle();
      if (existingSeo) {
        await supabase.from("ai_blog_seo").update(seoData).eq("blog_id", blogId!);
      } else {
        await supabase.from("ai_blog_seo").insert(seoData);
      }

      queryClient.invalidateQueries({ queryKey: ["blog-stats", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["recent-blogs", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["seo-stats", photographerId] });

      if (targetStatus === "published") {
        toast({ title: "Blog publicado com sucesso!" });
        sessionStorage.setItem("current_blog_id", blogId!);
        navigate("/dashboard/blog/publicados");
      } else {
        toast({ title: "Rascunho salvo!" });
      }
    } catch (err) {
      toast({ title: "Erro ao salvar. Tente novamente." });
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const companySlug = config.companyName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

  return (
    <>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-lg font-medium">Modo Manual</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Crie um blog preenchendo todos os campos manualmente</p>
        </div>
        <span className="bg-teal-50 text-teal-700 border-teal-200 text-xs px-2.5 py-1 rounded-full border">Manual</span>
      </div>

      {/* Conteúdo */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Conteúdo</div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-foreground">Título do blog</label>
            <span className="text-[10px] text-muted-foreground">{title.length} caracteres</span>
          </div>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Como escolher o fotógrafo ideal para seu casamento"
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Keyword principal</label>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Ex: fotógrafo de casamento SP"
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Categoria</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Fotografia, Casamento, Dicas"
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs font-medium text-foreground mb-1 block">Tags</label>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 bg-muted text-muted-foreground border-border text-[11px] px-2 py-0.5 rounded-full border cursor-pointer" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                {tag}<X className="w-2.5 h-2.5" />
              </span>
            ))}
          </div>
          <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput.replace(",", "")); setTagInput(""); } }}
            placeholder="Pressione Enter ou vírgula para adicionar"
            className="w-full text-xs border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="mt-3">
          <label className="text-xs font-medium text-foreground mb-1 block">Keywords secundárias</label>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {secondaryKeywords.map((kw) => (
              <span key={kw} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 text-[11px] px-2 py-0.5 rounded-full border cursor-pointer" onClick={() => setSecondaryKeywords((prev) => prev.filter((k) => k !== kw))}>
                {kw}<X className="w-2.5 h-2.5" />
              </span>
            ))}
          </div>
          <input type="text" value={skInput} onChange={(e) => setSkInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSecondaryKeyword(skInput.replace(",", "")); setSkInput(""); } }}
            placeholder="Pressione Enter ou vírgula para adicionar"
            className="w-full text-xs border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-foreground">Conteúdo do artigo</label>
            <span className="text-[11px] text-muted-foreground">{wordCount} palavras · ~{readingTime} min</span>
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={`Escreva o conteúdo completo do blog aqui.\nUse markdown simples:\n## Subtítulo\n### Sub-subtítulo\n**negrito**\n- lista\n\nA tag <blog-image-middle /> marca onde a imagem do meio será inserida.`}
            className="w-full text-sm leading-relaxed border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono resize-y"
            style={{ minHeight: 280 }} />
          <div className="flex gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer underline" onClick={() => setContent((prev) => prev + "\n\n<blog-image-middle />\n\n")}>Inserir imagem do meio</span>
            <span className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer underline" onClick={() => setContent((prev) => prev + "\n\n" + ctaText + "\n\n")}>Inserir CTA</span>
          </div>
        </div>
      </div>

      {/* Imagens */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Imagens</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Imagem de capa", size: "1200 × 630px", preview: coverImagePreview, onChange: handleCoverUpload, onClear: () => { setCoverImagePreview(null); setCoverImageFile(null); }, altValue: coverAlt, onAltChange: setCoverAlt, altPlaceholder: "Alt text da capa..." },
            { label: "Imagem do meio", size: "800 × 450px", preview: middleImagePreview, onChange: handleMiddleUpload, onClear: () => { setMiddleImagePreview(null); setMiddleImageFile(null); }, altValue: middleAlt, onAltChange: setMiddleAlt, altPlaceholder: "Alt text da imagem do meio..." },
          ].map((img) => (
            <div key={img.label}>
              <div className="flex items-center mb-1.5">
                <label className="text-xs font-medium text-foreground">{img.label}</label>
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-2">{img.size}</span>
              </div>
              {!img.preview ? (
                <label className="border-2 border-dashed border-border rounded-lg h-28 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                  <Upload className="w-5 h-5 text-muted-foreground mb-1.5" />
                  <span className="text-xs text-muted-foreground">Clique para fazer upload</span>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG até 5MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={img.onChange} />
                </label>
              ) : (
                <div className="relative">
                  <img src={img.preview} className="object-cover h-28 w-full rounded-lg" alt="" />
                  <button className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center" onClick={img.onClear}>
                    <X className="w-2.5 h-2.5 text-muted-foreground" />
                  </button>
                </div>
              )}
              <input type="text" value={img.altValue} onChange={(e) => img.onAltChange(e.target.value)} placeholder={img.altPlaceholder}
                className="w-full text-xs border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring mt-1.5" />
            </div>
          ))}
        </div>
      </div>

      {/* SEO */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">SEO</div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-foreground">Meta title</label>
            <span className={`text-[10px] ${metaTitle.length > 60 ? "text-red-500" : "text-muted-foreground"}`}>{metaTitle.length}/60</span>
          </div>
          <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)}
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
            <div className={`h-full rounded-full transition-all ${metaTitle.length > 60 ? "bg-red-500" : metaTitle.length > 45 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min((metaTitle.length / 60) * 100, 100)}%` }} />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-foreground">Meta description</label>
            <span className={`text-[10px] ${metaDescription.length > 155 ? "text-red-500" : "text-muted-foreground"}`}>{metaDescription.length}/155</span>
          </div>
          <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3}
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
          <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
            <div className={`h-full rounded-full transition-all ${metaDescription.length > 155 ? "bg-red-500" : metaDescription.length > 120 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min((metaDescription.length / 155) * 100, 100)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Slug</label>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-2 border-r border-border whitespace-nowrap">/{companySlug}/</span>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="flex-1 text-sm px-2 py-2 bg-background text-foreground focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">OG Title</label>
            <input type="text" value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs font-medium text-foreground mb-1 block">OG Description</label>
          <input type="text" value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>

      {/* CTA e publicação */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">CTA e publicação</div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Texto do CTA</label>
          <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Ex: Agende sua sessão → site.com"
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <div className="flex items-center gap-2 mt-2">
            <Switch checked={includeCta} onCheckedChange={setIncludeCta} />
            <label className="text-xs text-muted-foreground">Incluir CTA ao final do artigo</label>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium text-foreground mb-1 block">Agendamento (opcional)</label>
          <div className="flex items-center gap-3">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="text-xs border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            <span className="text-[11px] text-muted-foreground">Deixe vazio para publicar manualmente</span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Qualidade do post</div>
          <span className={`text-lg font-medium ${getScoreColor(score)}`}>{score}</span>
        </div>
        <div className="space-y-1.5">
          {manualChecks.map((check) => (
            <div key={check.id} className="flex items-center gap-1.5 text-xs">
              {check.pass ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              <span className={check.pass ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="outline" className="flex-1" disabled={isSaving} onClick={() => salvarBlog("draft")}>
          {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : "Salvar rascunho"}
        </Button>
        <Button className="flex-1" disabled={isSaving || score < 40} title={score < 40 ? "Complete ao menos 4 itens do checklist para publicar" : undefined} onClick={() => salvarBlog("published")}>
          {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : "Publicar blog"}
        </Button>
      </div>
    </>
  );
};
