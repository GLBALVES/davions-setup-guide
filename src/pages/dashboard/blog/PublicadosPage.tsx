import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBlogContext } from "@/contexts/BlogContext";
import { useToast } from "@/hooks/use-toast";
import { StepFlow } from "@/components/blog/StepFlow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, FileText, ImageOff, Pencil, MoreHorizontal,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

type BlogSeoJoin = { score: number | null; meta_title: string | null; cannibalization_warning: boolean | null; };
type BlogRow = {
  id: string; title: string; slug: string | null; keyword: string | null;
  mode: string | null; status: string | null; word_count: number | null;
  reading_time_minutes: number | null; cover_image_url: string | null;
  created_at: string | null; updated_at: string | null;
  published_at: string | null; scheduled_at: string | null;
  ai_blog_seo: BlogSeoJoin | null;
};

type FilterType = "all" | "published" | "draft" | "review" | "archived";
type SortType = "updated_desc" | "updated_asc" | "seo_desc" | "seo_asc" | "title_asc" | "title_desc";
const ITEMS_PER_PAGE = 10;

export const PublicadosPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { photographerId } = useBlogContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("updated_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<BlogRow | null>(null);

  useEffect(() => { setCurrentPage(1); }, [activeFilter, searchQuery, sortBy]);

  const { data: blogs, isLoading, refetch } = useQuery({
    queryKey: ["all-blogs", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select(`id, title, slug, keyword, mode, status, word_count, reading_time_minutes, cover_image_url, created_at, updated_at, published_at, scheduled_at, ai_blog_seo!ai_blog_seo_blog_id_fkey(score, meta_title, cannibalization_warning)`)
        .eq("photographer_id", photographerId!)
        .order("updated_at", { ascending: false });
      if (error) { console.error(error); throw error; }
      return (data ?? []) as unknown as BlogRow[];
    },
  });

  const counts = useMemo(() => {
    if (!blogs) return { all: 0, published: 0, draft: 0, review: 0, archived: 0 };
    return {
      all: blogs.length,
      published: blogs.filter((b) => b.status === "published").length,
      draft: blogs.filter((b) => b.status === "draft").length,
      review: blogs.filter((b) => b.status === "review").length,
      archived: blogs.filter((b) => b.status === "archived").length,
    };
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    if (!blogs) return [];
    let result = [...blogs];
    if (activeFilter !== "all") result = result.filter((b) => b.status === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) => b.title.toLowerCase().includes(q) || b.keyword?.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "updated_desc": return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
        case "updated_asc": return (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
        case "seo_desc": return (b.ai_blog_seo?.score ?? 0) - (a.ai_blog_seo?.score ?? 0);
        case "seo_asc": return (a.ai_blog_seo?.score ?? 0) - (b.ai_blog_seo?.score ?? 0);
        case "title_asc": return a.title.localeCompare(b.title);
        case "title_desc": return b.title.localeCompare(a.title);
        default: return 0;
      }
    });
    return result;
  }, [blogs, activeFilter, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredBlogs.length / ITEMS_PER_PAGE);
  const paginatedBlogs = filteredBlogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const showStart = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredBlogs.length);

  const handleStatusChange = async (blogId: string, newStatus: string) => {
    await supabase.from("blogs").update({ status: newStatus, published_at: newStatus === "published" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", blogId);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["blog-stats", photographerId] });
    queryClient.invalidateQueries({ queryKey: ["recent-blogs", photographerId] });
    toast({ title: "Status atualizado!" });
  };

  const duplicarPost = async (blog: BlogRow) => {
    const { data: seoOriginal } = await supabase.from("ai_blog_seo").select("*").eq("blog_id", blog.id).single();
    const { data: novoBlog } = await supabase.from("blogs").insert({
      title: blog.title + " (cópia)", slug: (blog.slug ?? "post") + "-copia-" + Date.now(),
      keyword: blog.keyword, mode: blog.mode, status: "draft",
      word_count: blog.word_count, reading_time_minutes: blog.reading_time_minutes,
      cover_image_url: blog.cover_image_url, published_at: null, scheduled_at: null,
      photographer_id: photographerId,
    }).select().single();

    if (seoOriginal && novoBlog) {
      await supabase.from("ai_blog_seo").insert({
        blog_id: novoBlog.id, meta_title: seoOriginal.meta_title,
        meta_description: seoOriginal.meta_description, slug: (seoOriginal.slug ?? "") + "-copia",
        og_title: seoOriginal.og_title, og_description: seoOriginal.og_description,
        secondary_keywords: seoOriginal.secondary_keywords, checklist: seoOriginal.checklist,
        score: 0, cannibalization_warning: false, cannibalization_conflict_id: null,
        photographer_id: photographerId,
      });
    }
    refetch();
    toast({ title: "Post duplicado! Edite o rascunho criado." });
  };

  const confirmarExclusao = async () => {
    if (!deleteTarget) return;
    await supabase.from("ai_blog_seo").delete().eq("blog_id", deleteTarget.id);
    await supabase.from("ai_blog_images").delete().eq("blog_id", deleteTarget.id);
    await supabase.from("blogs").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["blog-stats", photographerId] });
    queryClient.invalidateQueries({ queryKey: ["recent-blogs", photographerId] });
    toast({ title: "Post excluído." });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try { return format(new Date(dateStr), "dd/MM/yy"); } catch { return "—"; }
  };

  const getScoreColor = (score: number | null | undefined) => {
    const s = score ?? 0;
    if (s === 0) return "text-muted-foreground";
    if (s < 60) return "text-red-500";
    if (s < 75) return "text-yellow-500";
    if (s < 90) return "text-blue-500";
    return "text-green-600";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "draft": return "text-yellow-600";
      case "review": return "text-blue-600";
      case "published": return "text-green-600";
      default: return "text-muted-foreground";
    }
  };

  const getSortIcon = (column: string) => {
    const map: Record<string, SortType[]> = { title: ["title_asc", "title_desc"], seo: ["seo_asc", "seo_desc"], date: ["updated_asc", "updated_desc"] };
    const pair = map[column];
    if (!pair) return null;
    if (sortBy === pair[0]) return <ChevronUp className="inline w-3 h-3" />;
    if (sortBy === pair[1]) return <ChevronDown className="inline w-3 h-3" />;
    return null;
  };

  const toggleSort = (column: string) => {
    const map: Record<string, [SortType, SortType]> = { title: ["title_asc", "title_desc"], seo: ["seo_desc", "seo_asc"], date: ["updated_desc", "updated_asc"] };
    const pair = map[column];
    if (!pair) return;
    setSortBy((prev) => (prev === pair[0] ? pair[1] : pair[0]));
  };

  const filterButtons: { label: string; value: FilterType }[] = [
    { label: "Todos", value: "all" }, { label: "Publicados", value: "published" },
    { label: "Rascunhos", value: "draft" }, { label: "Em revisão", value: "review" },
    { label: "Arquivados", value: "archived" },
  ];

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <>
      <StepFlow steps={["Temas", "Blog", "Imagens", "SEO", "Preview", "Publicar"]} currentStep={5} completedSteps={[0, 1, 2, 3, 4]} />

      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-lg font-medium">Blogs Publicados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.published} publicados · {counts.draft} rascunhos · {counts.review} em revisão
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Buscar por título ou keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs w-48 border border-border rounded-md pl-8 pr-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <Button size="sm" onClick={() => navigate("/dashboard/blog/temas")}><Plus className="w-3.5 h-3.5" /> Novo blog</Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 mt-4">
        <div className="flex gap-2">
          {filterButtons.map((fb) => (
            <Button key={fb.value} size="sm" variant={activeFilter === fb.value ? "default" : "outline"}
              className={activeFilter === fb.value ? "bg-foreground text-background border-foreground hover:bg-foreground/90" : "text-muted-foreground"}
              onClick={() => setActiveFilter(fb.value)}>
              {fb.label} ({counts[fb.value]})
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortType)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="updated_desc">Mais recentes</option>
            <option value="updated_asc">Mais antigos</option>
            <option value="seo_desc">Melhor SEO</option>
            <option value="seo_asc">Pior SEO</option>
            <option value="title_asc">A–Z</option>
            <option value="title_desc">Z–A</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="border border-border rounded-lg overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-12 ${i < 4 ? "border-b border-border" : ""}`}>
              <Skeleton className="h-full w-full rounded-none" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredBlogs.length === 0 && (
        <div className="py-12 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum blog encontrado.</p>
          {activeFilter === "all" && searchQuery === "" ? (
            <Button size="sm" className="mt-3" onClick={() => navigate("/dashboard/blog/temas")}>Criar primeiro blog →</Button>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}>Limpar filtros</Button>
          )}
        </div>
      )}

      {!isLoading && filteredBlogs.length > 0 && (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs border-collapse" style={{ tableLayout: "fixed" }}>
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-14 px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Capa</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("title")}>Título {getSortIcon("title")}</th>
                  <th className="w-16 px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Modo</th>
                  <th className="w-16 px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("seo")}>SEO {getSortIcon("seo")}</th>
                  <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("date")}>Data {getSortIcon("date")}</th>
                  <th className="w-28 px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBlogs.map((blog, idx) => (
                  <tr key={blog.id} className={`hover:bg-muted/30 transition-colors border-b border-border ${idx === paginatedBlogs.length - 1 ? "border-0" : ""}`}>
                    <td className="w-14 px-3 py-2">
                      {blog.cover_image_url ? (
                        <img src={blog.cover_image_url} className="w-8 h-8 rounded object-cover" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <ImageOff className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 min-w-0">
                      <div className="font-medium text-foreground overflow-hidden text-ellipsis whitespace-nowrap">{blog.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground truncate">{blog.keyword ?? "—"}</span>
                        {blog.ai_blog_seo?.cannibalization_warning && (
                          <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-600 border-red-200 text-[10px] px-1.5 py-0.5 rounded border">
                            <AlertTriangle className="w-2.5 h-2.5" /> Canibalização
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{blog.word_count ?? "—"} palavras</span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">{blog.reading_time_minutes ?? "—"} min</span>
                      </div>
                    </td>
                    <td className="w-16 px-3 py-2.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${blog.mode === "manual" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                        {blog.mode ?? "auto"}
                      </span>
                    </td>
                    <td className="w-16 px-3 py-2.5 text-center">
                      <span className={`font-medium ${getScoreColor(blog.ai_blog_seo?.score)}`}>{blog.ai_blog_seo?.score ?? "—"}</span>
                    </td>
                    <td className="w-24 px-3 py-2.5">
                      <select value={blog.status ?? "draft"} onChange={(e) => handleStatusChange(blog.id, e.target.value)}
                        className={`text-[11px] border-0 bg-transparent cursor-pointer focus:outline-none ${getStatusColor(blog.status)}`}>
                        <option value="draft">Rascunho</option>
                        <option value="review">Em revisão</option>
                        <option value="published">Publicado</option>
                        <option value="archived">Arquivado</option>
                      </select>
                    </td>
                    <td className="w-24 px-3 py-2.5">
                      {blog.status === "published" && blog.published_at ? (
                        <div className="text-[11px] text-green-600">Pub: {formatDate(blog.published_at)}</div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground">Atu: {formatDate(blog.updated_at)}</div>
                      )}
                      {blog.scheduled_at && <div className="text-[11px] text-blue-500">Ag: {formatDate(blog.scheduled_at)}</div>}
                    </td>
                    <td className="w-28 px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { sessionStorage.setItem("current_blog_id", blog.id); navigate("/dashboard/blog/preview"); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { sessionStorage.setItem("current_blog_id", blog.id); navigate("/dashboard/blog/seo"); }}>
                          <Search className="w-3 h-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-3 h-3" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-32">
                            <DropdownMenuItem onClick={() => duplicarPost(blog)}>Duplicar post</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { sessionStorage.setItem("current_blog_id", blog.id); navigate("/dashboard/blog/preview"); }}>Ver preview</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(blog.id, "archived")}>Arquivar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(blog)}>Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mostrando {showStart}–{showEnd} de {filteredBlogs.length} posts</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                {getPageNumbers().map((page) => (
                  <Button key={page} variant={page === currentPage ? "default" : "outline"} size="sm"
                    className={`h-7 w-7 p-0 text-xs ${page === currentPage ? "bg-foreground text-background" : ""}`}
                    onClick={() => setCurrentPage(page)}>{page}</Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post '{deleteTarget?.title}' será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
