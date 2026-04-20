import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBlogContext } from "@/contexts/BlogContext";
import { StepFlow } from "@/components/blog/StepFlow";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = ["Temas", "Blog", "Imagens", "SEO", "Preview", "Publicar"];

const INTENT_STYLES: Record<string, string> = {
  informacional: "bg-green-50 text-green-700 border-green-200",
  transacional: "bg-purple-50 text-purple-700 border-purple-200",
  comparativo: "bg-amber-50 text-amber-700 border-amber-200",
  navegacional: "bg-gray-50 text-gray-600 border-gray-200",
};

export const TemasPage = () => {
  const { config, photographerId } = useBlogContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [niche, setNiche] = useState("");
  const [rootKeyword, setRootKeyword] = useState("");
  const [tone, setTone] = useState(config.defaultTone);
  const [language, setLanguage] = useState(config.defaultLanguage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedThemes, setGeneratedThemes] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formExpanded, setFormExpanded] = useState(true);

  const { data: existingThemes, isLoading: loadingExisting } = useQuery({
    queryKey: ["available-themes", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_themes")
        .select("*")
        .eq("photographer_id", photographerId!)
        .eq("status", "available")
        .order("generated_at", { ascending: false });
      return data ?? [];
    },
  });

  const themes = generatedThemes.length > 0 ? generatedThemes : (existingThemes ?? []);
  const hasExisting = (existingThemes?.length ?? 0) > 0 && generatedThemes.length === 0;

  const handleGenerate = async () => {
    if (!niche.trim() || !rootKeyword.trim() || !photographerId) return;
    setIsGenerating(true);
    setGeneratedThemes([]);
    setSelectedIds(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("generate-themes", {
        body: { niche, rootKeyword, tone, language },
      });

      if (error) throw error;

      const themesData = data.themes;
      if (!Array.isArray(themesData) || themesData.length === 0) throw new Error("Invalid response");

      const rows = themesData.map((t: any) => ({
        title: t.title,
        keyword: t.keyword,
        secondary_keywords: t.secondary_keywords,
        intent: t.intent,
        tone,
        language,
        status: "available",
        photographer_id: photographerId,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("ai_themes")
        .insert(rows)
        .select();

      if (insertErr) throw insertErr;

      setGeneratedThemes(inserted ?? []);
      setFormExpanded(false);
      queryClient.invalidateQueries({ queryKey: ["available-themes", photographerId] });
      queryClient.invalidateQueries({ queryKey: ["theme-stats", photographerId] });
      toast({ title: "10 temas gerados e salvos!" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao gerar temas. Tente novamente.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTheme = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdvance = async () => {
    const ids = Array.from(selectedIds);
    await supabase
      .from("ai_themes")
      .update({ status: "in_use", used_at: new Date().toISOString() })
      .in("id", ids);

    const selected = themes.filter((t: any) => selectedIds.has(t.id));
    sessionStorage.setItem("selected_themes", JSON.stringify(selected));
    queryClient.invalidateQueries({ queryKey: ["available-themes", photographerId] });
    queryClient.invalidateQueries({ queryKey: ["theme-stats", photographerId] });
    navigate("/dashboard/blog/gerador");
  };

  const showForm = !hasExisting || formExpanded;

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Gerar Temas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Modo automático — passo 1 de 2</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
          Tarefa 1 / 2
        </span>
      </div>

      <StepFlow steps={STEPS} currentStep={0} completedSteps={[]} />

      {hasExisting && (
        <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">
          <p className="text-xs text-muted-foreground">
            Você tem {existingThemes!.length} temas disponíveis. Selecione ou gere novos abaixo.
          </p>
        </div>
      )}

      {hasExisting && !formExpanded && (
        <button onClick={() => setFormExpanded(true)} className="text-xs text-blue-600 cursor-pointer mb-3">
          ＋ Gerar novos temas
        </button>
      )}

      {showForm && (
        <div className="bg-background border border-border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nicho / assunto</label>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: Fotografia de casamento"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Keyword raiz</label>
              <input
                value={rootKeyword}
                onChange={(e) => setRootKeyword(e.target.value)}
                placeholder="Ex: fotógrafo de casamento SP"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
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
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Idioma</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option>Português</option>
                <option>Inglês</option>
                <option>Espanhol</option>
              </select>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!niche.trim() || !rootKeyword.trim() || isGenerating}
            className="mt-4 w-full"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando temas...</>
            ) : (
              "Gerar 10 temas com IA"
            )}
          </Button>
        </div>
      )}

      {loadingExisting && themes.length === 0 && (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-md" />)}
        </div>
      )}

      {themes.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Selecione os temas para gerar blogs</span>
            <span className={`text-xs ${selectedIds.size > 0 ? "text-blue-600 font-medium" : "text-muted-foreground"}`}>
              {selectedIds.size} selecionado(s)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme: any, idx: number) => {
              const isSelected = selectedIds.has(theme.id);
              return (
                <div
                  key={theme.id}
                  onClick={() => toggleTheme(theme.id)}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50 border-blue-400"
                      : "bg-background border-border hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                >
                  <p className="text-[10px] text-muted-foreground mb-1">Tema {String(idx + 1).padStart(2, "0")}</p>
                  <p className="text-xs font-medium text-foreground leading-snug">{theme.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{theme.keyword}</p>
                  {theme.intent && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border mt-1.5 inline-block ${INTENT_STYLES[theme.intent] ?? INTENT_STYLES.informacional}`}>
                      {theme.intent}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <Button onClick={handleAdvance} disabled={selectedIds.size === 0} className="mt-4 w-full">
            {selectedIds.size === 0 ? "Selecione ao menos 1 tema" : `Usar ${selectedIds.size} tema(s) → Gerar Blog`}
          </Button>
        </>
      )}
    </>
  );
};
