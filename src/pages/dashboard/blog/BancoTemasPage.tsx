import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBlogContext } from "@/contexts/BlogContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Lightbulb, MoreHorizontal, Tag, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type ThemeRow = {
  id: string; title: string; keyword: string; secondary_keywords: string[] | null;
  intent: string | null; tone: string | null; language: string | null;
  status: string | null; generated_at: string | null; used_at: string | null; blog_id: string | null;
};

type FilterType = "all" | "available" | "in_use" | "published" | "archived";
type SortType = "gen_desc" | "gen_asc" | "title_asc" | "title_desc";
const ITEMS_PER_PAGE = 12;

export const BancoTemasPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { photographerId } = useBlogContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("gen_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ThemeRow | null>(null);
  const [sheetTheme, setSheetTheme] = useState<ThemeRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const handler = () => setDropdownId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [activeFilter, searchQuery, sortBy]);

  const { data: themes, isLoading, refetch } = useQuery({
    queryKey: ["all-themes", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_themes")
        .select("id, title, keyword, secondary_keywords, intent, tone, language, status, generated_at, used_at, blog_id")
        .eq("photographer_id", photographerId!)
        .order("generated_at", { ascending: false });
      return (data ?? []) as ThemeRow[];
    },
  });

  const counts = useMemo(() => {
    if (!themes) return { all: 0, available: 0, in_use: 0, published: 0, archived: 0 };
    return {
      all: themes.length,
      available: themes.filter((t) => t.status === "available").length,
      in_use: themes.filter((t) => t.status === "in_use").length,
      published: themes.filter((t) => t.status === "published").length,
      archived: themes.filter((t) => t.status === "archived").length,
    };
  }, [themes]);

  const filteredThemes = useMemo(() => {
    if (!themes) return [];
    let result = [...themes];
    if (activeFilter !== "all") result = result.filter((t) => t.status === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.keyword.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "gen_desc": return (b.generated_at ?? "").localeCompare(a.generated_at ?? "");
        case "gen_asc": return (a.generated_at ?? "").localeCompare(b.generated_at ?? "");
        case "title_asc": return a.title.localeCompare(b.title);
        case "title_desc": return b.title.localeCompare(a.title);
        default: return 0;
      }
    });
    return result;
  }, [themes, activeFilter, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredThemes.length / ITEMS_PER_PAGE);
  const paginatedThemes = filteredThemes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const showStart = filteredThemes.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredThemes.length);

  const invalidateThemes = () => {
    queryClient.invalidateQueries({ queryKey: ["theme-stats", photographerId] });
    queryClient.invalidateQueries({ queryKey: ["available-themes", photographerId] });
  };

  const formatDate = (d: string | null) => { if (!d) return "—"; try { return format(new Date(d), "dd/MM/yy"); } catch { return "—"; } };

  const getIntentBadge = (intent: string | null) => {
    switch (intent) {
      case "informacional": return "bg-blue-50 text-blue-700 border-blue-200";
      case "transacional": return "bg-green-50 text-green-700 border-green-200";
      case "navegacional": return "bg-purple-50 text-purple-700 border-purple-200";
      case "comercial": return "bg-orange-50 text-orange-700 border-orange-200";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const usarTema = async (theme: ThemeRow) => {
    sessionStorage.setItem("selected_themes", JSON.stringify([theme]));
    await supabase.from("ai_themes").update({ status: "in_use", used_at: new Date().toISOString() }).eq("id", theme.id);
    refetch(); invalidateThemes();
    toast({ title: "Tema selecionado! Redirecionando para o gerador..." });
    setTimeout(() => navigate("/dashboard/blog/gerador"), 1200);
  };

  const restaurarTema = async (id: string) => {
    await supabase.from("ai_themes").update({ status: "available", used_at: null }).eq("id", id);
    refetch();
    toast({ title: "Tema restaurado e disponível para uso." });
  };

  const arquivarTema = async (id: string) => {
    await supabase.from("ai_themes").update({ status: "archived" }).eq("id", id);
    refetch(); invalidateThemes();
    toast({ title: "Tema arquivado." });
  };

  const confirmarExclusao = async () => {
    if (!deleteTarget) return;
    await supabase.from("ai_themes").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null); refetch(); invalidateThemes();
    toast({ title: "Tema excluído." });
  };

  const usarTemasMultiplos = async (ids: string[]) => {
    const temasParaUsar = themes?.filter((t) => ids.includes(t.id)) ?? [];
    sessionStorage.setItem("selected_themes", JSON.stringify(temasParaUsar));
    await supabase.from("ai_themes").update({ status: "in_use", used_at: new Date().toISOString() }).in("id", ids);
    refetch(); invalidateThemes(); setSelectedIds([]);
    toast({ title: `${ids.length} tema(s) selecionado(s)! Redirecionando para o gerador...` });
    setTimeout(() => navigate("/dashboard/blog/gerador"), 1200);
  };

  const arquivarMultiplos = async (ids: string[]) => {
    await supabase.from("ai_themes").update({ status: "archived" }).in("id", ids);
    refetch(); invalidateThemes(); setSelectedIds([]);
    toast({ title: `${ids.length} tema(s) arquivado(s).` });
  };

  const availableInFiltered = filteredThemes.filter((t) => t.status === "available");
  const allAvailableSelected = availableInFiltered.length > 0 && availableInFiltered.every((t) => selectedIds.includes(t.id));

  const toggleSelectAll = () => {
    if (allAvailableSelected) setSelectedIds([]);
    else setSelectedIds(availableInFiltered.map((t) => t.id));
  };

  const toggleSelect = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const filterButtons: { label: string; value: FilterType }[] = [
    { label: "Todos", value: "all" }, { label: "Disponíveis", value: "available" },
    { label: "Em uso", value: "in_use" }, { label: "Publicados", value: "published" },
    { label: "Arquivados", value: "archived" },
  ];

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const getCardClass = (status: string | null) => {
    switch (status) {
      case "available": return "bg-background border-border hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer";
      case "in_use": return "bg-blue-50/50 border-blue-200";
      case "published": return "bg-green-50/50 border-green-200 opacity-80";
      case "archived": return "bg-muted/30 border-border opacity-60";
      default: return "bg-background border-border";
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "available": return { label: "Disponível", cls: "bg-green-50 text-green-700 border-green-200" };
      case "in_use": return { label: "Em uso", cls: "bg-blue-50 text-blue-700 border-blue-200" };
      case "published": return { label: "Publicado", cls: "bg-gray-50 text-gray-600 border-gray-200" };
      case "archived": return { label: "Arquivado", cls: "bg-muted text-muted-foreground border-border" };
      default: return { label: "—", cls: "bg-muted text-muted-foreground border-border" };
    }
  };

  return (
    <>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-lg font-medium">Banco de Temas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.available} disponíveis · {counts.in_use} em uso · {counts.published} publicados · {counts.archived} arquivados
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/dashboard/blog/temas")}><Plus className="w-3.5 h-3.5" /> Gerar novos temas</Button>
      </div>

      <div className="flex items-center justify-between mb-4">
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
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Buscar tema ou keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs w-44 border border-border rounded-md pl-8 pr-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortType)} className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="gen_desc">Mais recentes</option>
            <option value="gen_asc">Mais antigos</option>
            <option value="title_asc">A–Z</option>
            <option value="title_desc">Z–A</option>
          </select>
        </div>
      </div>

      {themes && themes.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Disponíveis", value: counts.available, color: "text-green-600" },
            { label: "Em uso", value: counts.in_use, color: "text-blue-600" },
            { label: "Publicados", value: counts.published, color: "text-muted-foreground" },
            { label: "Arquivados", value: counts.archived, color: "text-muted-foreground" },
          ].map((card) => (
            <div key={card.label} className="bg-muted/50 rounded-md px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase mb-0.5">{card.label}</div>
              <div className={`text-lg font-medium ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Checkbox checked={allAvailableSelected && availableInFiltered.length > 0} onCheckedChange={toggleSelectAll} className="w-3.5 h-3.5" />
          <span className="text-xs text-muted-foreground ml-2">Selecionar tudo</span>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600 font-medium">{selectedIds.length} selecionado(s)</span>
            <Button size="sm" onClick={() => usarTemasMultiplos(selectedIds)}>Usar selecionados →</Button>
            <Button size="sm" variant="outline" onClick={() => arquivarMultiplos(selectedIds)}>Arquivar selecionados</Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      )}

      {!isLoading && filteredThemes.length === 0 && (
        <div className="py-12 text-center">
          <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum tema encontrado.</p>
          {themes && themes.length === 0 ? (
            <Button size="sm" className="mt-3" onClick={() => navigate("/dashboard/blog/temas")}>Gerar primeiros temas →</Button>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}>Limpar filtros</Button>
          )}
        </div>
      )}

      {!isLoading && filteredThemes.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {paginatedThemes.map((theme) => {
              const badge = getStatusBadge(theme.status);
              const isAvailable = theme.status === "available";
              const showCheckbox = isAvailable && selectedIds.length > 0;

              return (
                <div key={theme.id} className={`relative border rounded-lg p-3 transition-all ${getCardClass(theme.status)}`} onClick={() => { if (isAvailable) setSheetTheme(theme); }}>
                  {isAvailable && (
                    <div className={`absolute top-2 left-2 ${showCheckbox || selectedIds.includes(theme.id) ? "opacity-100" : "opacity-0 hover:opacity-100"}`} onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.includes(theme.id)} onCheckedChange={() => toggleSelect(theme.id)} className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>{badge.label}</span>
                    <div className="flex items-center gap-1">
                      {theme.intent && <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getIntentBadge(theme.intent)}`}>{theme.intent}</span>}
                      <span className="text-[10px] text-muted-foreground ml-1">{formatDate(theme.generated_at)}</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-foreground leading-snug mb-1.5 line-clamp-2">{theme.title}</div>
                  <div className="flex items-center gap-1 mb-2">
                    <Tag className="w-2.5 h-2.5 text-muted-foreground mr-1" />
                    <span className="text-[11px] text-blue-600 font-medium">{theme.keyword}</span>
                  </div>
                  {theme.secondary_keywords && theme.secondary_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {theme.secondary_keywords.slice(0, 3).map((kw, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/50 text-muted-foreground border-border">{kw}</span>
                      ))}
                      {theme.secondary_keywords.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">+{theme.secondary_keywords.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <div>
                      {isAvailable && <span className="text-[11px] text-blue-600 font-medium cursor-pointer hover:text-blue-800" onClick={(e) => { e.stopPropagation(); usarTema(theme); }}>Usar este tema →</span>}
                      {theme.status === "in_use" && theme.blog_id && (
                        <span className="text-[11px] text-blue-600 cursor-pointer hover:text-blue-800" onClick={(e) => { e.stopPropagation(); sessionStorage.setItem("current_blog_id", theme.blog_id!); navigate("/dashboard/blog/preview"); }}>Ver blog →</span>
                      )}
                      {theme.status === "published" && theme.blog_id && (
                        <span className="text-[11px] text-green-600 cursor-pointer hover:text-green-800" onClick={(e) => { e.stopPropagation(); sessionStorage.setItem("current_blog_id", theme.blog_id!); navigate("/dashboard/blog/publicados"); }}>Ver post →</span>
                      )}
                      {theme.status === "archived" && (
                        <span className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground" onClick={(e) => { e.stopPropagation(); restaurarTema(theme.id); }}>Restaurar</span>
                      )}
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setDropdownId(dropdownId === theme.id ? null : theme.id); }}>
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                      {dropdownId === theme.id && (
                        <div className="absolute z-10 bg-background border border-border rounded-md shadow-sm py-1 min-w-32 right-0 top-full mt-1" onClick={(e) => e.stopPropagation()}>
                          {(theme.status === "available" || theme.status === "in_use") && (
                            <div className="px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer" onClick={() => { setDropdownId(null); arquivarTema(theme.id); }}>Arquivar</div>
                          )}
                          {theme.status === "archived" && (
                            <div className="px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer" onClick={() => { setDropdownId(null); restaurarTema(theme.id); }}>Restaurar</div>
                          )}
                          <div className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => { setDropdownId(null); setDeleteTarget(theme); }}>Excluir</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mostrando {showStart}–{showEnd} de {filteredThemes.length} temas</span>
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

      {/* Detail Sheet */}
      <Sheet open={!!sheetTheme} onOpenChange={(open) => !open && setSheetTheme(null)}>
        <SheetContent side="right" className="w-80">
          {sheetTheme && (
            <>
              <SheetHeader>
                <SheetTitle className="text-sm font-medium leading-snug">{sheetTheme.title}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-1">{sheetTheme.keyword}</p>
              </SheetHeader>
              <Separator className="mt-4 mb-4" />
              <div className="text-[10px] uppercase text-muted-foreground mb-2 font-medium">Detalhes</div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Intent</div><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getIntentBadge(sheetTheme.intent)}`}>{sheetTheme.intent ?? "—"}</span></div>
                <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Tom de voz</div><div className="text-xs text-foreground">{sheetTheme.tone ?? "—"}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Idioma</div><div className="text-xs text-foreground">{sheetTheme.language ?? "—"}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Gerado em</div><div className="text-xs text-foreground">{formatDate(sheetTheme.generated_at)}</div></div>
              </div>
              <Separator className="my-4" />
              <div>
                <div className="text-[10px] uppercase text-muted-foreground mb-1.5">Keyword principal</div>
                <span className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2.5 py-1 rounded-full border">{sheetTheme.keyword}</span>
                {sheetTheme.secondary_keywords && sheetTheme.secondary_keywords.length > 0 && (
                  <>
                    <div className="text-[10px] uppercase text-muted-foreground mt-3 mb-1.5">Keywords secundárias</div>
                    <div className="flex flex-wrap gap-1.5">
                      {sheetTheme.secondary_keywords.map((kw, i) => (
                        <span key={i} className="bg-muted text-muted-foreground border-border text-xs px-2 py-0.5 rounded-full border">{kw}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Separator className="my-4" />
              <Button className="w-full" size="sm" onClick={() => { setSheetTheme(null); usarTema(sheetTheme); }}>Usar este tema →</Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tema?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O tema '{deleteTarget?.title}' será excluído permanentemente.</AlertDialogDescription>
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
