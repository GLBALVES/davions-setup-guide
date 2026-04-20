import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBlogContext } from "@/contexts/BlogContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogOnboardingWizard, isBlogOnboardingCompleted, resetBlogOnboarding } from "@/components/blog/BlogOnboardingWizard";
import { Sparkles } from "lucide-react";

function formatRelativeDate(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return "agora";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export const BlogDashboardPage = () => {
  const { config, photographerId } = useBlogContext();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (photographerId && !isBlogOnboardingCompleted(photographerId)) {
      setWizardOpen(true);
    }
  }, [photographerId]);

  const { data: blogStats, isLoading: loadingBlogs } = useQuery({
    queryKey: ["blog-stats", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("blogs")
        .select("status, mode")
        .eq("photographer_id", photographerId!);
      return data ?? [];
    },
  });

  const { data: themeStats, isLoading: loadingThemes } = useQuery({
    queryKey: ["theme-stats", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_themes")
        .select("status")
        .eq("photographer_id", photographerId!);
      return data ?? [];
    },
  });

  const { data: seoStats, isLoading: loadingSeo } = useQuery({
    queryKey: ["seo-stats", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_blog_seo")
        .select("score")
        .eq("photographer_id", photographerId!);
      return data ?? [];
    },
  });

  const { data: recentBlogs, isLoading: loadingRecent } = useQuery({
    queryKey: ["recent-blogs", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("blogs")
        .select("id, title, status, mode, created_at, updated_at")
        .eq("photographer_id", photographerId!)
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: draftBlogs, isLoading: loadingDrafts } = useQuery({
    queryKey: ["draft-blogs", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("blogs")
        .select("id, title, keyword, updated_at")
        .eq("photographer_id", photographerId!)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  function handleOpenBlog(blogId: string) {
    sessionStorage.setItem("current_blog_id", blogId);
    navigate("/dashboard/blog/preview");
  }

  const isLoading = loadingBlogs || loadingThemes || loadingSeo || loadingRecent;

  const totalPublished = blogStats?.filter((b) => b.status === "published").length ?? 0;
  const totalDraft = blogStats?.filter((b) => b.status === "draft").length ?? 0;
  const totalReview = blogStats?.filter((b) => b.status === "review").length ?? 0;
  const totalAuto = blogStats?.filter((b) => b.mode === "auto").length ?? 0;
  const totalManual = blogStats?.filter((b) => b.mode === "manual").length ?? 0;
  const totalBlogs = blogStats?.length ?? 0;
  const totalAvailableThemes = themeStats?.filter((t) => t.status === "available").length ?? 0;

  const avgSeoScore =
    seoStats && seoStats.length > 0
      ? Math.round(seoStats.reduce((sum, s) => sum + (s.score ?? 0), 0) / seoStats.length)
      : null;

  const statusDot: Record<string, string> = {
    published: "bg-green-500",
    draft: "bg-yellow-400",
    review: "bg-blue-400",
    archived: "bg-muted-foreground",
  };

  function barWidth(value: number) {
    if (totalBlogs === 0) return "0%";
    return `${(value / totalBlogs) * 100}%`;
  }

  return (
    <>
      <BlogOnboardingWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão geral — {config.companyName}
          </p>
          <button
            onClick={() => {
              resetBlogOnboarding(photographerId);
              setWizardOpen(true);
            }}
            className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Refazer tour de boas-vindas
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/blog/temas")}>
            ＋ Gerar Temas
          </Button>
          <Button size="sm" onClick={() => navigate("/dashboard/blog/temas")}>
            ＋ Novo Blog
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Blogs publicados</p>
          {loadingBlogs ? <Skeleton className="h-8 w-12 rounded" /> : (
            <p className="text-2xl font-medium text-foreground">{totalPublished}</p>
          )}
          <p className={`text-xs mt-1.5 ${totalPublished > 0 ? "text-green-600" : "text-muted-foreground"}`}>
            {totalPublished > 0 ? `${totalPublished} no ar` : "nenhum ainda"}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Em rascunho</p>
          {loadingBlogs ? <Skeleton className="h-8 w-12 rounded" /> : (
            <p className="text-2xl font-medium text-foreground">{totalDraft}</p>
          )}
          <p className={`text-xs mt-1.5 ${totalReview > 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
            {totalReview > 0 ? `${totalReview} aguardando revisão` : "tudo em dia"}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Temas disponíveis</p>
          {loadingThemes ? <Skeleton className="h-8 w-12 rounded" /> : (
            <p className="text-2xl font-medium text-foreground">{totalAvailableThemes}</p>
          )}
          <p className={`text-xs mt-1.5 ${totalAvailableThemes > 0 ? "text-green-600" : "text-muted-foreground"}`}>
            {totalAvailableThemes > 0 ? "prontos para usar" : "banco vazio — gere temas"}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Score SEO médio</p>
          {loadingSeo ? <Skeleton className="h-8 w-12 rounded" /> : (
            <p className="text-2xl font-medium text-foreground">{avgSeoScore ?? "—"}</p>
          )}
          <p className={`text-xs mt-1.5 ${
            avgSeoScore === null ? "text-muted-foreground"
              : avgSeoScore >= 85 ? "text-green-600"
              : avgSeoScore >= 70 ? "text-yellow-600"
              : "text-red-500"
          }`}>
            {avgSeoScore === null ? "sem posts ainda"
              : avgSeoScore >= 85 ? "excelente"
              : avgSeoScore >= 70 ? "bom"
              : "precisa melhorar"}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-background border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Posts por status</p>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
          ) : totalBlogs === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum blog criado ainda.</p>
          ) : (
            <div>
              {[
                { label: "Publicados", value: totalPublished, color: "bg-green-500" },
                { label: "Rascunho", value: totalDraft, color: "bg-yellow-400" },
                { label: "Em revisão", value: totalReview, color: "bg-blue-400" },
              ].map((bar) => (
                <div key={bar.label} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{bar.label}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} rounded-full`} style={{ width: barWidth(bar.value), transition: "width 600ms ease" }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-5 text-right">{bar.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-background border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Modo de criação</p>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          ) : totalBlogs === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum blog criado ainda.</p>
          ) : (
            <div>
              {[
                { label: "Automático", value: totalAuto, color: "bg-purple-400" },
                { label: "Manual", value: totalManual, color: "bg-teal-400" },
              ].map((bar) => (
                <div key={bar.label} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{bar.label}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} rounded-full`} style={{ width: barWidth(bar.value), transition: "width 600ms ease" }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-5 text-right">{bar.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rascunhos em andamento */}
      <div className="bg-background border border-border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rascunhos em andamento</p>
          {draftBlogs && draftBlogs.length > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={() => navigate("/dashboard/blog/publicados")}>
              Ver todos →
            </button>
          )}
        </div>
        {loadingDrafts ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : draftBlogs && draftBlogs.length > 0 ? (
          <div>
            {draftBlogs.map((blog) => (
              <div
                key={blog.id}
                className="flex items-center gap-2 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                onClick={() => handleOpenBlog(blog.id)}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                <span className="text-xs text-foreground flex-1 truncate">{blog.title}</span>
                {blog.keyword && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{blog.keyword}</span>
                )}
                <span className="text-xs text-muted-foreground shrink-0">{formatRelativeDate(blog.updated_at ?? "")}</span>
                <span className="text-xs text-muted-foreground shrink-0">→</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum rascunho pendente.</p>
        )}
      </div>

      {/* Atividade recente */}
      <div className="bg-background border border-border rounded-lg p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Atividade recente</p>
        {loadingRecent ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : recentBlogs && recentBlogs.length > 0 ? (
          <div>
            {recentBlogs.map((blog) => (
              <div
                key={blog.id}
                className="flex items-start gap-2 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                onClick={() => handleOpenBlog(blog.id)}
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${statusDot[blog.status ?? "draft"]}`} />
                <span className="text-xs text-foreground flex-1 leading-relaxed">
                  {blog.status === "published"
                    ? `Blog "${blog.title}" publicado`
                    : blog.status === "review"
                      ? `"${blog.title}" enviado para revisão`
                      : `Rascunho "${blog.title}" salvo`}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeDate(blog.updated_at ?? blog.created_at ?? "")}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">→</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Nenhuma atividade ainda. Comece gerando temas ou criando um blog.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/blog/temas")}>
              Gerar primeiros temas →
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
