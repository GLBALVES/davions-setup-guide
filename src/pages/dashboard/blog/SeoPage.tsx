import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBlogContext } from "@/contexts/BlogContext";
import { StepFlow } from "@/components/blog/StepFlow";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = ["Temas", "Blog", "Imagens", "SEO", "Preview", "Publicar"];

export const SeoPage = () => {
  const { config, photographerId } = useBlogContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentBlogId] = useState<string | null>(() => sessionStorage.getItem("current_blog_id"));

  useEffect(() => {
    if (!currentBlogId) {
      toast.error("Nenhum blog selecionado.");
      navigate("/dashboard/blog/publicados");
    }
  }, [currentBlogId, navigate]);

  const { data: blog, isLoading: loadingBlog } = useQuery({
    queryKey: ["blog", currentBlogId],
    queryFn: async () => {
      const { data } = await supabase.from("blogs").select("*").eq("id", currentBlogId!).maybeSingle();
      return data;
    },
    enabled: !!currentBlogId,
  });

  const { data: seo, isLoading: loadingSeo, refetch: refetchSeo } = useQuery({
    queryKey: ["blog-seo", currentBlogId],
    queryFn: async () => {
      const { data } = await supabase.from("ai_blog_seo").select("*").eq("blog_id", currentBlogId!).maybeSingle();
      return data;
    },
    enabled: !!currentBlogId,
  });

  const { data: allBlogs } = useQuery({
    queryKey: ["all-blogs-keywords", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase.from("blogs").select("id, title, slug, keyword").eq("photographer_id", photographerId!).eq("status", "published");
      return data ?? [];
    },
  });

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [middleAlt, setMiddleAlt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (seo && blog && !initialized) {
      setMetaTitle(seo.meta_title ?? "");
      setMetaDescription(seo.meta_description ?? "");
      setSlug(seo.slug ?? "");
      setOgTitle(seo.og_title ?? seo.meta_title ?? "");
      setOgDescription(seo.og_description ?? seo.meta_description ?? "");
      setSecondaryKeywords(seo.secondary_keywords ?? []);
      setCoverAlt(blog.cover_image_alt ?? "");
      setMiddleAlt(blog.middle_image_alt ?? "");
      setInitialized(true);
    }
  }, [seo, blog, initialized]);

  const checks = useMemo(() => {
    const kw = blog?.keyword?.toLowerCase() ?? "";
    return [
      { id: "keyword_in_title", label: "Keyword principal no título", pass: !!(blog?.title?.toLowerCase().includes(kw) && kw) },
      { id: "keyword_in_slug", label: "Keyword no slug", pass: !!(slug?.toLowerCase().includes(kw.replace(/\s+/g, "-")) && kw) },
      { id: "meta_title_length", label: "Meta title entre 30 e 60 caracteres", pass: metaTitle.length >= 30 && metaTitle.length <= 60 },
      { id: "meta_description_length", label: "Meta description entre 80 e 155 caracteres", pass: metaDescription.length >= 80 && metaDescription.length <= 155 },
      { id: "has_slug", label: "Slug definido e em lowercase", pass: !!slug && slug === slug.toLowerCase() && !slug.includes(" ") },
      { id: "has_og", label: "OG title e description preenchidos", pass: !!ogTitle && !!ogDescription },
      { id: "has_secondary_keywords", label: "Ao menos 3 keywords secundárias", pass: secondaryKeywords.length >= 3 },
      { id: "has_cover_image", label: "Imagem de capa definida", pass: !!blog?.cover_image_url },
      { id: "has_alt_texts", label: "Alt text das imagens preenchido", pass: !!coverAlt && !!middleAlt },
      { id: "word_count", label: "Artigo com ao menos 600 palavras", pass: (blog?.word_count ?? 0) >= 600 },
    ];
  }, [metaTitle, metaDescription, slug, ogTitle, ogDescription, secondaryKeywords, blog, coverAlt, middleAlt]);

  const passCount = checks.filter((c) => c.pass).length;
  const score = Math.round((passCount / checks.length) * 100);

  const conflict = useMemo(() => {
    if (!allBlogs || !blog?.keyword) return null;
    return allBlogs.find((b) => b.id !== currentBlogId && b.keyword?.toLowerCase() === blog.keyword?.toLowerCase()) ?? null;
  }, [allBlogs, blog?.keyword, currentBlogId]);

  useEffect(() => {
    if (!currentBlogId || !allBlogs || !blog) return;
    if (conflict) {
      supabase.from("ai_blog_seo").update({ cannibalization_warning: true, cannibalization_conflict_id: conflict.id }).eq("blog_id", currentBlogId).then();
    }
  }, [conflict, currentBlogId, blog, allBlogs]);

  const addKeyword = (val: string) => {
    const kw = val.trim().replace(/,$/, "").trim();
    if (kw && !secondaryKeywords.includes(kw)) setSecondaryKeywords((prev) => [...prev, kw]);
    setNewKeyword("");
  };

  const suggestedLinks = useMemo(() => {
    if (!allBlogs) return [];
    return allBlogs.filter((b) => b.id !== currentBlogId).slice(0, 3);
  }, [allBlogs, currentBlogId]);

  const companySlug = config.companyName.toLowerCase().replace(/\s+/g, "-");

  const scoreColor = score < 60 ? "text-red-500" : score < 75 ? "text-yellow-500" : score < 90 ? "text-blue-500" : "text-green-600";

  const handleSave = async () => {
    if (!currentBlogId) return;
    setIsSaving(true);
    try {
      await supabase.from("ai_blog_seo").update({
        meta_title: metaTitle, meta_description: metaDescription, slug,
        og_title: ogTitle, og_description: ogDescription, secondary_keywords: secondaryKeywords,
        score, checklist: Object.fromEntries(checks.map((c) => [c.id, c.pass])),
        updated_at: new Date().toISOString(),
      }).eq("blog_id", currentBlogId);

      await supabase.from("blogs").update({ cover_image_alt: coverAlt, middle_image_alt: middleAlt, updated_at: new Date().toISOString() }).eq("id", currentBlogId);

      queryClient.invalidateQueries({ queryKey: ["blog-stats", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["seo-stats", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["blog", currentBlogId] });
      queryClient.invalidateQueries({ queryKey: ["blog-seo", currentBlogId] });

      toast.success("SEO salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar SEO.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentBlogId) return null;

  const isLoading = loadingBlog || loadingSeo;
  const renderSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );

  return (
    <>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-lg font-medium">SEO do Blog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerado automaticamente — revise antes de publicar</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-medium ${scoreColor}`}>{score}</span>
          <span className="text-xs text-muted-foreground">Score SEO</span>
        </div>
      </div>

      <StepFlow steps={STEPS} currentStep={3} completedSteps={[0, 1, 2]} />

      {/* Metadados */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Metadados</p>
        {isLoading ? renderSkeleton() : (
          <>
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Meta title</label>
                <span className={`text-xs ${metaTitle.length <= 60 ? "text-green-600" : "text-red-500"}`}>{metaTitle.length}/60</span>
              </div>
              <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                <div className={`h-full transition-all ${metaTitle.length <= 60 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min((metaTitle.length / 60) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Meta description</label>
                <span className={`text-xs ${metaDescription.length <= 155 ? "text-green-600" : "text-red-500"}`}>{metaDescription.length}/155</span>
              </div>
              <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none" />
              <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                <div className={`h-full transition-all ${metaDescription.length <= 155 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min((metaDescription.length / 155) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Slug</label>
              <div className="flex">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded-l-md border border-r-0 border-border">/{companySlug}/</span>
                <input value={slug} onChange={(e) => setSlug(e.target.value)} className="flex-1 rounded-r-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">OG Title (redes sociais)</label>
                <input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">OG Description</label>
                <input value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Keywords */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Keywords</p>
        {isLoading ? renderSkeleton() : (
          <>
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Keyword principal</label>
              <div className="flex items-center gap-2">
                <input value={blog?.keyword ?? ""} readOnly className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm cursor-default" />
                <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full">Principal</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Keywords secundárias</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {secondaryKeywords.map((kw, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-full border bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-1">
                    {kw}
                    <button onClick={() => setSecondaryKeywords((prev) => prev.filter((_, idx) => idx !== i))} className="text-blue-400 hover:text-blue-600 cursor-pointer">
                      <XCircle className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(newKeyword); } }}
                placeholder="Adicionar keyword..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs" />
            </div>
          </>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Checklist on-page</p>
        {isLoading ? renderSkeleton() : (
          <div>
            {checks.map((check, i) => (
              <div key={check.id} className={`flex items-center gap-2 py-1.5 text-xs ${i < checks.length - 1 ? "border-b border-border" : ""}`}>
                {check.pass ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                <span className={check.pass ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Canibalização */}
      {!isLoading && blog && (
        conflict ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-red-700">
                  Atenção: a keyword '{blog.keyword}' já está sendo usada no post '{conflict.title}'. Isso pode causar canibalização de SEO.
                </p>
                <button onClick={() => { sessionStorage.setItem("current_blog_id", conflict.id); refetchSeo(); }} className="text-xs text-red-600 underline cursor-pointer mt-1">
                  Ver post conflitante →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs text-green-700">Nenhuma canibalização detectada para esta keyword.</span>
          </div>
        )
      )}

      {/* Links internos */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Links internos sugeridos</p>
        {isLoading ? renderSkeleton() : suggestedLinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum post publicado para sugerir links internos ainda.</p>
        ) : (
          <div>
            {suggestedLinks.map((post, i) => {
              const anchor = post.title?.split(" ").slice(0, 4).join(" ") + "...";
              return (
                <div key={post.id} className={`flex items-start gap-2 py-2 ${i < suggestedLinks.length - 1 ? "border-b border-border" : ""}`}>
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{post.title}</p>
                    <p className="text-[11px] text-blue-600">Âncora: '{anchor}'</p>
                    <p className="text-[10px] text-muted-foreground">/{post.slug}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(anchor); toast.success("Âncora copiada!"); }} className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                    Copiar âncora
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alt texts */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Alt text das imagens</p>
        {isLoading ? renderSkeleton() : (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Alt text — Imagem de capa</label>
              <input value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} placeholder="Descreva a imagem de capa para SEO..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Alt text — Imagem do meio</label>
              <input value={middleAlt} onChange={(e) => setMiddleAlt(e.target.value)} placeholder="Descreva a imagem do meio para SEO..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/blog/gerador")}>← Voltar</Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : "Salvar SEO"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/blog/preview")}>Preview →</Button>
      </div>
    </>
  );
};
