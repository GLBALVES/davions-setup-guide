import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Circle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBlogContext } from "@/contexts/BlogContext";
import { StepFlow } from "@/components/blog/StepFlow";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ImageModal } from "@/components/blog/ImageModal";

const STEPS = ["Temas", "Blog", "Imagens", "SEO", "Preview", "Publicar"];

const INTENT_STYLES: Record<string, string> = {
  informacional: "bg-green-50 text-green-700 border-green-200",
  transacional: "bg-purple-50 text-purple-700 border-purple-200",
  comparativo: "bg-amber-50 text-amber-700 border-amber-200",
  navegacional: "bg-gray-50 text-gray-600 border-gray-200",
};

const LOADING_LABELS = [
  "Gerando conteúdo do artigo",
  "Calculando SEO e keywords",
  "Preparando estrutura do post",
  "Salvando no banco de dados",
];

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "");

export const GeradorPage = () => {
  const { config, photographerId } = useBlogContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedThemes] = useState<any[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("selected_themes") ?? "[]"); } catch { return []; }
  });

  const [activeThemeIndex, setActiveThemeIndex] = useState(0);
  const [articleSize, setArticleSize] = useState(config.defaultArticleSize);
  const [includeCta, setIncludeCta] = useState("Sim — usar CTA padrão");
  const [tone, setTone] = useState(config.defaultTone);
  const [structure, setStructure] = useState("Introdução + subtítulos + conclusão");
  const [primaryLanguage, setPrimaryLanguage] = useState<"Português" | "Inglês" | "Espanhol">("Português");
  const [translateTo, setTranslateTo] = useState<Record<"Português" | "Inglês" | "Espanhol", boolean>>({
    "Português": false, "Inglês": false, "Espanhol": false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [generatedBlog, setGeneratedBlog] = useState<any>(null);
  const [translatedBlogs, setTranslatedBlogs] = useState<any[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalPosition, setImageModalPosition] = useState<"cover" | "middle">("cover");

  const [fallbackBlogId] = useState<string | null>(() => sessionStorage.getItem("current_blog_id"));

  useEffect(() => {
    if (selectedThemes.length === 0 && !fallbackBlogId) {
      toast({ title: "Nenhum tema selecionado. Selecione ao menos um tema primeiro.", variant: "destructive" });
      navigate("/dashboard/blog/temas");
    }
  }, [selectedThemes.length, fallbackBlogId, navigate, toast]);

  useEffect(() => {
    if (selectedThemes.length === 0 && fallbackBlogId && !generatedBlog) {
      const loadBlog = async () => {
        const { data } = await supabase.from("blogs").select("*").eq("id", fallbackBlogId).single();
        if (data) setGeneratedBlog(data);
        else navigate("/dashboard/blog/temas");
      };
      loadBlog();
    }
  }, [selectedThemes.length, fallbackBlogId, generatedBlog, navigate]);

  if (selectedThemes.length === 0 && !fallbackBlogId) return null;

  const activeTheme = selectedThemes[activeThemeIndex];
  const remainingThemes = selectedThemes.length - activeThemeIndex - 1;

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const generateOne = async (lang: "Português" | "Inglês" | "Espanhol") => {
    const ctaValue = includeCta === "Sim — usar CTA padrão" ? config.defaultCta : "não incluir CTA";
    const { data, error } = await supabase.functions.invoke("generate-blog", {
      body: {
        title: activeTheme.title,
        keyword: activeTheme.keyword,
        secondaryKeywords: activeTheme.secondary_keywords?.join(", "),
        tone, articleSize, structure, cta: ctaValue, language: lang,
      },
    });
    if (error) throw error;
    const parsed = data;
    if (!parsed.title || !parsed.content) throw new Error("Invalid AI response");

    const slugSuffix = lang === "Inglês" ? "-en" : lang === "Espanhol" ? "-es" : "";
    const finalSlug = slugSuffix && !parsed.slug?.endsWith(slugSuffix) ? `${parsed.slug}${slugSuffix}` : parsed.slug;

    const { data: newBlog, error: blogErr } = await supabase
      .from("blogs")
      .insert({
        theme_id: activeTheme.id,
        title: parsed.title, slug: finalSlug, content: parsed.content,
        keyword: activeTheme.keyword, secondary_keywords: parsed.secondary_keywords,
        mode: "auto", status: "draft",
        word_count: parsed.word_count, reading_time_minutes: parsed.reading_time_minutes,
        cta_text: includeCta === "Sim — usar CTA padrão" ? config.defaultCta : null,
        cover_image_alt: parsed.cover_image_alt ?? null,
        middle_image_alt: parsed.middle_image_alt ?? null,
        photographer_id: photographerId,
      })
      .select().single();
    if (blogErr) throw blogErr;

    const kw = activeTheme.keyword?.toLowerCase() ?? "";
    const seoChecks = [
      !!(parsed.title?.toLowerCase().includes(kw) && kw),
      !!(finalSlug?.toLowerCase().includes(kw.replace(/\s+/g, "-")) && kw),
      parsed.meta_title?.length >= 30 && parsed.meta_title?.length <= 60,
      parsed.meta_description?.length >= 80 && parsed.meta_description?.length <= 155,
      !!finalSlug && finalSlug === finalSlug.toLowerCase() && !finalSlug.includes(" "),
      !!(parsed.og_title && parsed.og_description),
      (parsed.secondary_keywords?.length ?? 0) >= 3,
      false,
      !!(parsed.cover_image_alt && parsed.middle_image_alt),
      (parsed.word_count ?? 0) >= 600,
    ];
    const seoScore = Math.round((seoChecks.filter(Boolean).length / seoChecks.length) * 100);

    await supabase.from("ai_blog_seo").insert({
      blog_id: newBlog.id,
      meta_title: parsed.meta_title, meta_description: parsed.meta_description,
      slug: finalSlug, secondary_keywords: parsed.secondary_keywords,
      og_title: parsed.og_title ?? parsed.meta_title,
      og_description: parsed.og_description ?? parsed.meta_description,
      score: seoScore,
      checklist: {
        keyword_in_title: seoChecks[0], keyword_in_slug: seoChecks[1],
        meta_title_length: seoChecks[2], meta_description_length: seoChecks[3],
        has_slug: seoChecks[4], has_og: seoChecks[5],
        has_secondary_keywords: seoChecks[6], has_cover_image: seoChecks[7],
        has_alt_texts: seoChecks[8], word_count: seoChecks[9],
      },
      photographer_id: photographerId,
    });

    return { ...newBlog, _language: lang };
  };

  const handleGenerate = async () => {
    if (!photographerId) return;
    setIsGenerating(true);
    setCurrentLoadingStep(0);
    setGeneratedBlog(null);
    setTranslatedBlogs([]);

    try {
      const extraLangs = (Object.keys(translateTo) as Array<"Português" | "Inglês" | "Espanhol">)
        .filter((l) => translateTo[l] && l !== primaryLanguage);

      setGenerationProgress(`Gerando versão em ${primaryLanguage}...`);
      const primaryBlog = await generateOne(primaryLanguage);

      setCurrentLoadingStep(1);
      await delay(400);
      setCurrentLoadingStep(2);

      const translations: any[] = [];
      for (const lang of extraLangs) {
        setGenerationProgress(`Gerando tradução em ${lang}...`);
        const translated = await generateOne(lang);
        translations.push(translated);
      }

      setCurrentLoadingStep(3);
      await supabase.from("ai_themes").update({ blog_id: primaryBlog.id }).eq("id", activeTheme.id);

      setCurrentLoadingStep(4);
      setGeneratedBlog(primaryBlog);
      setTranslatedBlogs(translations);
      setGenerationProgress("");

      queryClient.invalidateQueries({ queryKey: ["blog-stats", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["recent-blogs", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["available-themes", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["theme-stats", photographerId] });

      const total = 1 + translations.length;
      toast({ title: total > 1 ? `${total} versões geradas (${primaryLanguage} + ${translations.length} tradução(ões))` : "Blog gerado e salvo!" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao gerar blog. Tente novamente.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishDirect = async () => {
    if (!generatedBlog) return;
    await supabase.from("blogs").update({ status: "published", published_at: new Date().toISOString() }).eq("id", generatedBlog.id);
    await supabase.from("ai_themes").update({ status: "published" }).eq("id", activeTheme.id);
    queryClient.invalidateQueries({ queryKey: ["blog-stats", photographerId] });
    queryClient.invalidateQueries({ queryKey: ["recent-blogs", photographerId] });
    toast({ title: "Blog publicado com sucesso!" });
    navigate("/dashboard/blog/publicados");
  };

  const handleNextTheme = () => {
    setActiveThemeIndex((i) => i + 1);
    setGeneratedBlog(null);
    window.scrollTo(0, 0);
  };

  const renderLoadingStep = (index: number) => {
    const isDone = currentLoadingStep > index;
    const isActive = currentLoadingStep === index;
    return (
      <div key={index} className="flex items-center gap-2 py-1">
        {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          : isActive ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
          : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
        <span className={`text-xs ${isDone ? "text-green-700" : isActive ? "text-blue-700 font-medium" : "text-muted-foreground"}`}>
          {LOADING_LABELS[index]}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Gerar Blog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Modo automático — passo 2 de 2</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">Tarefa 2 / 2</span>
      </div>

      <StepFlow steps={STEPS} currentStep={1} completedSteps={[0]} />

      {selectedThemes.length > 1 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">
            Gerando {activeThemeIndex + 1} de {selectedThemes.length} temas selecionados
          </p>
          <div className="flex gap-2 flex-wrap">
            {selectedThemes.map((t: any, i: number) => (
              <button
                key={t.id}
                onClick={() => { setActiveThemeIndex(i); setGeneratedBlog(null); }}
                className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                  i === activeThemeIndex ? "bg-blue-50 border-blue-400 text-blue-700 font-medium" : "bg-background border-border text-muted-foreground"
                }`}
              >
                Tema {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTheme && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-[10px] font-medium text-green-700 uppercase tracking-wider mb-1">Tema selecionado</p>
          <p className="text-sm font-medium text-green-900">{activeTheme.title}</p>
          <p className="text-xs text-green-700 mt-1">{activeTheme.keyword}</p>
          {activeTheme.intent && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border mt-1.5 inline-block ${INTENT_STYLES[activeTheme.intent] ?? INTENT_STYLES.informacional}`}>
              {activeTheme.intent}
            </span>
          )}
        </div>
      )}

      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tamanho do artigo</label>
            <select value={articleSize} onChange={(e) => setArticleSize(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option>Médio (800–1200 palavras)</option>
              <option>Longo (1500+ palavras)</option>
              <option>Curto (400–600 palavras)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Incluir CTA</label>
            <select value={includeCta} onChange={(e) => setIncludeCta(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option>Sim — usar CTA padrão</option>
              <option>Não incluir CTA</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tom de voz</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option>Informativo e próximo</option>
              <option>Técnico</option>
              <option>Casual</option>
              <option>Inspirador</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Estrutura</label>
            <select value={structure} onChange={(e) => setStructure(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option>Introdução + subtítulos + conclusão</option>
              <option>Listicle (lista numerada)</option>
              <option>FAQ + respostas</option>
              <option>Guia passo a passo</option>
            </select>
          </div>
        </div>

        {/* Multi-language section */}
        <div className="mt-4 border-t border-border pt-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Idioma principal do post</label>
          <div className="flex gap-2 mb-3">
            {(["Português", "Inglês", "Espanhol"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setPrimaryLanguage(lang);
                  setTranslateTo((prev) => ({ ...prev, [lang]: false }));
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  primaryLanguage === lang
                    ? "bg-blue-50 border-blue-400 text-blue-700 font-medium"
                    : "bg-background border-border text-muted-foreground hover:border-blue-300"
                }`}
              >
                {lang === "Português" ? "🇧🇷 Português" : lang === "Inglês" ? "🇺🇸 Inglês" : "🇪🇸 Espanhol"}
              </button>
            ))}
          </div>

          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Gerar versões traduzidas (opcional)</label>
          <div className="flex flex-wrap gap-3">
            {(["Português", "Inglês", "Espanhol"] as const)
              .filter((l) => l !== primaryLanguage)
              .map((lang) => (
                <label key={lang} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={translateTo[lang]}
                    onChange={(e) => setTranslateTo((prev) => ({ ...prev, [lang]: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <span className="text-foreground">
                    {lang === "Português" ? "🇧🇷 Português" : lang === "Inglês" ? "🇺🇸 Inglês" : "🇪🇸 Espanhol"}
                  </span>
                </label>
              ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            A IA criará versões traduzidas independentes do post no mesmo tema, cada uma como um draft separado.
          </p>
        </div>

        {isGenerating ? (
          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <p className="text-sm font-medium mb-3">Gerando seu blog...</p>
            {generationProgress && (
              <p className="text-xs text-blue-600 mb-2">{generationProgress}</p>
            )}
            {LOADING_LABELS.map((_, i) => renderLoadingStep(i))}
          </div>
        ) : (
          <Button onClick={handleGenerate} disabled={isGenerating || !activeTheme} className="mt-4 w-full">
            {Object.values(translateTo).some(Boolean)
              ? `Gerar blog + ${Object.values(translateTo).filter(Boolean).length} tradução(ões)`
              : "Gerar blog com IA"}
          </Button>
        )}
      </div>

      {generatedBlog && (
        <>
          <div className="bg-background border border-border rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <p className="text-sm font-medium line-clamp-2 flex-1 mr-2">{generatedBlog.title}</p>
              <div className="flex gap-1.5 shrink-0">
                <span className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2 py-0.5 rounded-full border">
                  {primaryLanguage === "Português" ? "🇧🇷 PT" : primaryLanguage === "Inglês" ? "🇺🇸 EN" : "🇪🇸 ES"}
                </span>
                <span className="bg-green-50 text-green-700 border-green-200 text-[10px] px-2 py-0.5 rounded-full border">Principal</span>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground mb-3">
              <span>{generatedBlog.word_count} palavras</span>
              <span>Leitura: ~{generatedBlog.reading_time_minutes} min</span>
              <span>Keyword: {generatedBlog.keyword}</span>
            </div>
            <div className="border-t border-border pt-3 mt-1">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {stripHtml(generatedBlog.content ?? "").slice(0, 300)}
              </p>
            </div>
          </div>

          {translatedBlogs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Versões traduzidas ({translatedBlogs.length})
              </p>
              <div className="space-y-2">
                {translatedBlogs.map((tb) => (
                  <div key={tb.id} className="bg-background border border-border rounded-lg p-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-medium line-clamp-2 flex-1">{tb.title}</p>
                      <span className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-2 py-0.5 rounded-full border shrink-0">
                        {tb._language === "Português" ? "🇧🇷 PT" : tb._language === "Inglês" ? "🇺🇸 EN" : "🇪🇸 ES"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {tb.word_count} palavras · Slug: <span className="font-mono">{tb.slug}</span>
                    </p>
                    <button
                      onClick={() => { sessionStorage.setItem("current_blog_id", tb.id); navigate("/dashboard/blog/seo"); }}
                      className="text-[11px] text-blue-600 mt-1.5 cursor-pointer"
                    >
                      Abrir SEO desta versão →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            {(["cover", "middle"] as const).map((pos) => {
              const url = pos === "cover" ? generatedBlog.cover_image_url : generatedBlog.middle_image_url;
              const alt = pos === "cover" ? generatedBlog.cover_image_alt : generatedBlog.middle_image_alt;
              const label = pos === "cover" ? "Imagem de capa" : "Imagem do meio";
              const size = pos === "cover" ? "1200 × 630px" : "800 × 450px";
              return (
                <div key={pos}>
                  <p className="text-xs font-medium mb-1.5">{label}</p>
                  {url ? (
                    <img src={url} alt={alt ?? ""} className="h-20 w-full object-cover rounded-md border border-border" />
                  ) : (
                    <div
                      className="h-20 bg-muted/50 border border-dashed border-border rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => { setImageModalPosition(pos); setImageModalOpen(true); }}
                    >
                      <span className="text-xs text-primary font-medium">Gerar imagem →</span>
                      <span className="text-[10px] text-muted-foreground">{size}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/blog/temas")}>← Voltar</Button>
            <Button variant="outline" size="sm" onClick={() => { setGeneratedBlog(null); handleGenerate(); }}>Regenerar</Button>
            <Button variant="outline" size="sm" onClick={() => { sessionStorage.setItem("current_blog_id", generatedBlog.id); navigate("/dashboard/blog/seo"); }}>Ver SEO →</Button>
            <Button size="sm" onClick={handlePublishDirect}>Publicar direto →</Button>
          </div>

          {selectedThemes.length > 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2.5 mt-4">
              {remainingThemes > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-700">Você tem mais {remainingThemes} tema(s) para gerar.</span>
                  <button onClick={handleNextTheme} className="text-xs text-blue-600 font-medium cursor-pointer">Gerar próximo tema →</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-700">Todos os temas foram gerados.</span>
                  <button onClick={() => navigate("/dashboard/blog/publicados")} className="text-xs text-blue-600 font-medium cursor-pointer">Ver todos os blogs →</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {generatedBlog && (
        <ImageModal
          open={imageModalOpen}
          onOpenChange={setImageModalOpen}
          position={imageModalPosition}
          blogId={generatedBlog.id}
          blogTitle={generatedBlog.title}
          blogKeyword={generatedBlog.keyword ?? ""}
          onImageSaved={async () => {
            const { data } = await supabase.from("blogs").select("*").eq("id", generatedBlog.id).single();
            if (data) setGeneratedBlog(data);
          }}
        />
      )}
    </>
  );
};
