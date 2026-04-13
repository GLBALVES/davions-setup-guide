import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBlogContext } from "@/contexts/BlogContext";
import { toast } from "sonner";
import { StepFlow } from "@/components/blog/StepFlow";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { ImageModal } from "@/components/blog/ImageModal";
import { format } from "date-fns";

const checkLabels: Record<string, string> = {
  keyword_in_title: "Keyword principal no título",
  keyword_in_slug: "Keyword no slug",
  meta_title_length: "Meta title entre 30 e 60 caracteres",
  meta_description_length: "Meta description entre 80 e 155 caracteres",
  has_slug: "Slug definido e em lowercase",
  has_og: "OG title e description preenchidos",
  has_secondary_keywords: "Ao menos 3 keywords secundárias",
  has_cover_image: "Imagem de capa definida",
  has_alt_texts: "Alt text das imagens preenchido",
  word_count: "Artigo com ao menos 600 palavras",
};

const previewStyles = `
  .blog-content h2 { font-size:1.35rem;font-weight:600;color:#111827;margin:2rem 0 0.75rem;line-height:1.3; }
  .blog-content h3 { font-size:1.1rem;font-weight:600;color:#374151;margin:1.5rem 0 0.5rem; }
  .blog-content p { font-size:1rem;color:#374151;line-height:1.75;margin-bottom:1rem; }
  .blog-content ul, .blog-content ol { padding-left:1.5rem;margin-bottom:1rem; }
  .blog-content li { font-size:1rem;color:#374151;line-height:1.7;margin-bottom:0.35rem; }
  .blog-content strong { color:#111827; }
  .blog-content a { color:#2563EB;text-decoration:underline; }
  .blog-image-middle-placeholder { width:100%;background:#F3F4F6;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:0.8rem;margin:1.5rem 0;border-radius:8px; }
`;

export function PreviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { photographerId } = useBlogContext();

  const [currentBlogId] = useState<string | null>(() => sessionStorage.getItem("current_blog_id"));
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [isPublishing, setIsPublishing] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalPosition, setImageModalPosition] = useState<"cover" | "middle">("cover");

  useEffect(() => {
    (window as any).__openMiddleImageModal = () => { setImageModalPosition("middle"); setImageModalOpen(true); };
    return () => { delete (window as any).__openMiddleImageModal; };
  }, []);

  useEffect(() => {
    if (!currentBlogId) {
      toast("Nenhum blog selecionado.");
      navigate("/dashboard/blog/publicados");
    }
  }, [currentBlogId, navigate]);

  const { data: blog, refetch: refetchBlog } = useQuery({
    queryKey: ["blog-preview", currentBlogId],
    queryFn: async () => {
      const { data } = await supabase.from("blogs").select("*").eq("id", currentBlogId!).single();
      return data;
    },
    enabled: !!currentBlogId,
  });

  const { data: seo } = useQuery({
    queryKey: ["blog-seo-preview", currentBlogId],
    queryFn: async () => {
      const { data } = await supabase.from("ai_blog_seo").select("*").eq("blog_id", currentBlogId!).single();
      return data;
    },
    enabled: !!currentBlogId,
  });

  const isLoading = !blog || !seo;
  const score = seo?.score ?? 0;
  const scoreColor = score < 60 ? "text-red-500" : score < 75 ? "text-yellow-500" : score < 90 ? "text-blue-500" : "text-green-600";
  const scoreBgColor = score < 60 ? "bg-red-500" : score < 75 ? "bg-yellow-500" : score < 90 ? "bg-blue-500" : "bg-green-500";

  const failedChecks = useMemo(() => {
    if (!seo?.checklist || typeof seo.checklist !== "object") return [];
    const cl = seo.checklist as Record<string, boolean>;
    return Object.entries(cl).filter(([, v]) => !v).map(([k]) => k);
  }, [seo]);

  const allPassing = failedChecks.length === 0 && seo?.checklist;

  const processedContent = useMemo(() => {
    if (!blog?.content) return "";
    return blog.content.replace(
      "<blog-image-middle />",
      blog.middle_image_url
        ? `<img src="${blog.middle_image_url}" alt="${blog.middle_image_alt ?? ""}" style="width:100%;border-radius:8px;margin:1.5rem 0;object-fit:cover;max-height:400px;" />`
        : `<div class="blog-image-middle-placeholder" style="height:200px;cursor:pointer;" onclick="window.__openMiddleImageModal && window.__openMiddleImageModal()">Imagem do meio — clique para gerar</div>`
    );
  }, [blog]);

  const contentReady = !!blog?.content;
  const imagesReady = !!blog?.cover_image_url && !!blog?.middle_image_url;
  const seoReady = score >= 70;

  const statusBadge = useMemo(() => {
    if (!blog) return { label: "Rascunho", cls: "bg-yellow-50 text-yellow-700" };
    switch (blog.status) {
      case "review": return { label: "Em revisão", cls: "bg-blue-50 text-blue-700" };
      case "published": return { label: "Publicado", cls: "bg-green-50 text-green-700" };
      default: return { label: "Rascunho", cls: "bg-yellow-50 text-yellow-700" };
    }
  }, [blog]);

  const handleSendToReview = async () => {
    await supabase.from("blogs").update({ status: "review", updated_at: new Date().toISOString() }).eq("id", currentBlogId!);
    queryClient.invalidateQueries({ queryKey: ["blog-preview"] });
    queryClient.invalidateQueries({ queryKey: ["blog-stats", photographerId] });
    queryClient.invalidateQueries({ queryKey: ["recent-blogs", photographerId] });
    refetchBlog();
    toast("Post enviado para revisão!");
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await supabase.from("blogs").update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", currentBlogId!);
    await supabase.from("ai_themes").update({ status: "published" }).eq("blog_id", currentBlogId!);
    queryClient.invalidateQueries({ queryKey: ["blog-preview"] });
    queryClient.invalidateQueries({ queryKey: ["blog-stats", photographerId] });
    queryClient.invalidateQueries({ queryKey: ["recent-blogs", photographerId] });
    queryClient.invalidateQueries({ queryKey: ["theme-stats", photographerId] });
    setIsPublishing(false);
    toast("Blog publicado com sucesso!");
    navigate("/dashboard/blog/publicados");
  };

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    await supabase.from("blogs").update({ scheduled_at: scheduledAt, status: "draft", updated_at: new Date().toISOString() }).eq("id", currentBlogId!);
    const formatted = format(new Date(scheduledAt), "dd/MM/yyyy 'às' HH:mm");
    toast(`Publicação agendada para ${formatted}!`);
    setShowScheduler(false);
  };

  if (!currentBlogId) return null;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-lg" />
        {[3, 4, 5, 6].map((w) => <div key={w} className="h-4 bg-muted rounded" style={{ width: `${w * 15}%` }} />)}
      </div>
    );
  }

  const Pill = ({ ready, label }: { ready: boolean; label: string }) => (
    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${ready ? "bg-green-50 border-green-200 text-green-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
      {ready ? <CheckCircle2 size={12} /> : <Clock size={12} />}
      {label}
    </span>
  );

  const seoPanel = (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Resumo SEO</p>
      <div className="text-center mb-1"><span className={`text-4xl font-medium ${scoreColor}`}>{score}</span></div>
      <p className="text-xs text-muted-foreground text-center">de 100 pontos</p>
      <div className="h-2 bg-muted rounded-full overflow-hidden mt-2 mb-4">
        <div className={`h-full rounded-full transition-all ${scoreBgColor}`} style={{ width: `${score}%` }} />
      </div>
      <div className="border-t border-border pt-3 mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Pontos a melhorar</p>
        {allPassing ? (
          <div className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500" /><span className="text-xs text-green-600">Todos os checks passando!</span></div>
        ) : (
          failedChecks.map((key) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
              <XCircle size={12} className="text-red-400" />
              {checkLabels[key] ?? key}
            </div>
          ))
        )}
      </div>
      <div className="border-t border-border pt-3 space-y-3">
        <div><p className="text-[10px] text-muted-foreground uppercase mb-0.5">Meta title</p><p className="text-xs text-foreground truncate">{seo?.meta_title ?? "—"}</p></div>
        <div><p className="text-[10px] text-muted-foreground uppercase mb-0.5">Slug</p><p className="text-xs text-foreground truncate">/{seo?.slug ?? "—"}</p></div>
        <div><p className="text-[10px] text-muted-foreground uppercase mb-0.5">Keyword</p><p className="text-xs text-foreground truncate">{blog?.keyword ?? "—"}</p></div>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => navigate("/dashboard/blog/seo")}>Editar SEO</Button>
    </div>
  );

  const previewContent = (
    <div className={`${viewMode === "desktop" ? "border border-border rounded-lg overflow-hidden" : "max-w-sm mx-auto border border-border rounded-2xl overflow-hidden"}`}>
      <div style={{ background: "#fff", color: "#111827" }}>
        {blog?.cover_image_url ? (
          <img src={blog.cover_image_url} alt={blog.cover_image_alt ?? ""} className="w-full object-cover" style={{ height: viewMode === "desktop" ? "360px" : "200px" }} />
        ) : (
          <div className="w-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
            style={{ height: viewMode === "desktop" ? "360px" : "200px", background: "#F3F4F6", color: "#9CA3AF", fontSize: "0.875rem" }}
            onClick={() => { setImageModalPosition("cover"); setImageModalOpen(true); }}>
            Imagem de capa não gerada ainda
            <span style={{ color: "#3B82F6", textDecoration: "underline", fontSize: "0.75rem", marginTop: "0.5rem" }}>Gerar imagem →</span>
          </div>
        )}
        <div style={{ padding: viewMode === "desktop" ? "1.5rem 1.5rem 1rem" : "1rem 1rem 0.75rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#9CA3AF", marginBottom: "0.75rem" }}>Blog › {blog?.keyword}</p>
          <h1 style={{ fontSize: viewMode === "desktop" ? "1.5rem" : "1.25rem", fontWeight: 700, color: "#111827", lineHeight: 1.25, marginBottom: "0.75rem" }}>{blog?.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.75rem", color: "#6B7280" }}>
            <span>{blog?.created_at ? format(new Date(blog.created_at), "dd/MM/yyyy") : "—"}</span>
            <span>·</span><span>{blog?.reading_time_minutes ?? "—"} min de leitura</span>
            <span>·</span>
            <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.6875rem", border: "1px solid #DBEAFE" }}>{blog?.keyword}</span>
          </div>
        </div>
        <div style={{ padding: viewMode === "desktop" ? "0 1.5rem" : "0 1rem" }}>
          <div className="blog-content">
            <style>{previewStyles}</style>
            <div dangerouslySetInnerHTML={{ __html: processedContent }} />
          </div>
        </div>
        {blog?.cta_text && (
          <div style={{ margin: viewMode === "desktop" ? "0 1.5rem 1.5rem" : "0 1rem 1.5rem", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1E3A8A", marginBottom: "0.5rem" }}>{blog.cta_text}</p>
          </div>
        )}
        <div style={{ padding: viewMode === "desktop" ? "1rem 1.5rem" : "0.75rem 1rem", borderTop: "1px solid #F3F4F6" }}>
          <p style={{ fontSize: "0.6875rem", color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Meta: {seo?.meta_title}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-lg font-medium">Preview do Blog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Revise antes de publicar</p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className={viewMode === "desktop" ? "bg-muted border-border font-medium" : "text-muted-foreground"} onClick={() => setViewMode("desktop")}><Monitor size={16} /></Button>
          <Button variant="outline" size="sm" className={viewMode === "mobile" ? "bg-muted border-border font-medium" : "text-muted-foreground"} onClick={() => setViewMode("mobile")}><Smartphone size={16} /></Button>
        </div>
      </div>

      <StepFlow steps={["Temas", "Blog", "Imagens", "SEO", "Preview", "Publicar"]} currentStep={4} completedSteps={[0, 1, 2, 3]} />

      <div className="bg-muted/50 rounded-lg px-4 py-3 flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Pill ready={contentReady} label="Conteúdo" />
          <Pill ready={imagesReady} label="Imagens" />
          <Pill ready={seoReady} label={`SEO ${seo?.score ?? 0}`} />
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${statusBadge.cls}`}>{statusBadge.label}</span>
      </div>

      {viewMode === "desktop" ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">{previewContent}</div>
          <div>{seoPanel}</div>
        </div>
      ) : (
        <>
          {previewContent}
          <div className="mt-4 bg-background border border-border rounded-lg p-4">{seoPanel}</div>
        </>
      )}

      <div className="mt-6 flex gap-3 items-center">
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/blog/seo")}>← Voltar ao SEO</Button>
        <Button variant="outline" size="sm" onClick={() => toast("Post salvo como rascunho.")}>Salvar rascunho</Button>
        <Button variant="outline" size="sm" onClick={handleSendToReview}>Enviar para revisão</Button>
        <Button onClick={handlePublish} disabled={isPublishing}>
          {isPublishing ? <><Loader2 className="animate-spin" size={16} /> Publicando...</> : "Publicar agora"}
        </Button>
      </div>

      <div className="mt-3">
        <button className="text-xs text-muted-foreground underline cursor-pointer" onClick={() => setShowScheduler(!showScheduler)}>
          Ou agendar publicação
        </button>
        {showScheduler && (
          <div className="flex items-center gap-3 mt-3 p-3 bg-muted/50 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground">Publicar em:</span>
            <input type="datetime-local" className="text-xs border border-border rounded px-2 py-1 bg-background" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <Button variant="outline" size="sm" onClick={handleSchedule}>Agendar</Button>
          </div>
        )}
      </div>

      {currentBlogId && blog && (
        <ImageModal
          open={imageModalOpen}
          onOpenChange={setImageModalOpen}
          position={imageModalPosition}
          blogId={currentBlogId}
          blogTitle={blog.title}
          blogKeyword={blog.keyword ?? ""}
          onImageSaved={() => { refetchBlog(); queryClient.invalidateQueries({ queryKey: ["blog-preview"] }); }}
        />
      )}
    </>
  );
}
