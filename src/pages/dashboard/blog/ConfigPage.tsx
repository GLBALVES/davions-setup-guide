import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBlogContext } from "@/contexts/BlogContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export const ConfigPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setConfig, photographerId } = useBlogContext();

  const [companyName, setCompanyName] = useState("");
  const [defaultCta, setDefaultCta] = useState("");
  const [defaultTone, setDefaultTone] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("");
  const [defaultArticleSize, setDefaultArticleSize] = useState("");
  const [defaultImagePrompt, setDefaultImagePrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: moduleConfig, isLoading, refetch } = useQuery({
    queryKey: ["module-config", photographerId],
    enabled: !!photographerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_blog_config")
        .select("*")
        .eq("photographer_id", photographerId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (moduleConfig) {
      setCompanyName(moduleConfig.company_name ?? "");
      setDefaultCta(moduleConfig.default_cta ?? "");
      setDefaultTone(moduleConfig.default_tone ?? "");
      setDefaultLanguage(moduleConfig.default_language ?? "");
      setDefaultArticleSize(moduleConfig.default_article_size ?? "");
      setDefaultImagePrompt(moduleConfig.default_image_prompt ?? "");
    }
  }, [moduleConfig]);

  const hasUnsavedChanges =
    companyName !== (moduleConfig?.company_name ?? "") ||
    defaultCta !== (moduleConfig?.default_cta ?? "") ||
    defaultTone !== (moduleConfig?.default_tone ?? "") ||
    defaultLanguage !== (moduleConfig?.default_language ?? "") ||
    defaultArticleSize !== (moduleConfig?.default_article_size ?? "") ||
    defaultImagePrompt !== (moduleConfig?.default_image_prompt ?? "");

  const salvarConfig = async () => {
    if (!photographerId) return;
    setIsSaving(true);
    try {
      if (moduleConfig?.id) {
        await supabase
          .from("ai_blog_config")
          .update({
            company_name: companyName, default_cta: defaultCta, default_tone: defaultTone,
            default_language: defaultLanguage, default_article_size: defaultArticleSize,
            default_image_prompt: defaultImagePrompt, updated_at: new Date().toISOString(),
          })
          .eq("id", moduleConfig.id);
      } else {
        await supabase
          .from("ai_blog_config")
          .insert({
            company_name: companyName, default_cta: defaultCta, default_tone: defaultTone,
            default_language: defaultLanguage, default_article_size: defaultArticleSize,
            default_image_prompt: defaultImagePrompt, photographer_id: photographerId,
          });
      }

      setConfig({ companyName, defaultCta, defaultTone, defaultLanguage, defaultArticleSize, defaultImagePrompt });
      queryClient.invalidateQueries({ queryKey: ["module-config", photographerId] });
      refetch();
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (err) {
      toast({ title: "Erro ao salvar configurações." });
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
  const selectClass = "w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-lg font-medium">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Padrões do módulo de blog com IA</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-[11px] px-2 py-1 rounded-full">Alterações não salvas</span>
          )}
          <Button size="sm" disabled={isSaving} onClick={salvarConfig}>
            {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : "Salvar configurações"}
          </Button>
        </div>
      </div>

      {/* Identidade */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Identidade</div>
        {isLoading ? <div className="space-y-3"><Skeleton className="h-9 rounded-md" /><Skeleton className="h-9 rounded-md" /></div> : (
          <>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Nome do estúdio / empresa</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Estúdio Lumina" className={inputClass} />
              <p className="text-[11px] text-muted-foreground mt-1">Aparece no cabeçalho do módulo e nos posts gerados.</p>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-foreground mb-1 block">CTA padrão</label>
              <input type="text" value={defaultCta} onChange={(e) => setDefaultCta(e.target.value)} placeholder="Ex: Agende sua sessão → meu-estudio.com" className={inputClass} />
              <p className="text-[11px] text-muted-foreground mt-1">Usado automaticamente no modo automático e como valor inicial no modo manual.</p>
            </div>
          </>
        )}
      </div>

      {/* Geração de conteúdo */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Geração de conteúdo</div>
        {isLoading ? <div className="space-y-3"><Skeleton className="h-9 rounded-md" /><Skeleton className="h-9 rounded-md" /><Skeleton className="h-9 rounded-md" /></div> : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Tom de voz padrão</label>
                <select value={defaultTone} onChange={(e) => setDefaultTone(e.target.value)} className={selectClass}>
                  <option value="Informativo e próximo">Informativo e próximo</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Casual">Casual</option>
                  <option value="Inspirador">Inspirador</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Idioma padrão</label>
                <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} className={selectClass}>
                  <option value="Português">Português</option>
                  <option value="Inglês">Inglês</option>
                  <option value="Espanhol">Espanhol</option>
                  <option value="Multi-idioma (PT/EN/ES)">Multi-idioma (PT/EN/ES)</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-foreground mb-1 block">Tamanho padrão dos artigos</label>
              <select value={defaultArticleSize} onChange={(e) => setDefaultArticleSize(e.target.value)} className={selectClass}>
                <option value="Curto (400–600 palavras)">Curto (400–600 palavras)</option>
                <option value="Médio (800–1200 palavras)">Médio (800–1200 palavras)</option>
                <option value="Longo (1500+ palavras)">Longo (1500+ palavras)</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">Valor inicial no gerador automático. Pode ser alterado por post.</p>
            </div>
          </>
        )}
      </div>

      {/* Geração de imagens */}
      <div className="bg-background border border-border rounded-lg p-4 mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Geração de imagens</div>
        {isLoading ? <Skeleton className="h-20 rounded-md" /> : (
          <>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Prompt padrão para geração de imagens</label>
              <textarea
                value={defaultImagePrompt}
                onChange={(e) => setDefaultImagePrompt(e.target.value)}
                placeholder="Ex: Professional photography studio, soft lighting, elegant aesthetic..."
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                style={{ minHeight: 80 }}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Este prompt é combinado automaticamente com o tema do blog ao gerar imagens.</p>
            </div>
            <div className="bg-muted/50 rounded-md p-3 mt-3">
              <div className="text-[10px] text-muted-foreground uppercase mb-1.5">Exemplo de prompt gerado:</div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                '{defaultImagePrompt}. Theme: [Título do blog]. Style: high quality, professional blog photography'
              </p>
            </div>
          </>
        )}
      </div>

      {/* Sobre */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Sobre</div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-[10px] uppercase text-muted-foreground">Versão</div><div className="text-xs text-foreground">1.0.0</div></div>
          <div><div className="text-[10px] uppercase text-muted-foreground">Tabelas Supabase</div><div className="text-xs text-foreground">6 tabelas ativas</div></div>
          <div><div className="text-[10px] uppercase text-muted-foreground">Modo</div><div className="text-xs text-green-600">Produção</div></div>
          <div><div className="text-[10px] uppercase text-muted-foreground">IA</div><div className="text-xs text-foreground">Claude claude-opus-4-5</div></div>
        </div>
      </div>
    </>
  );
};
