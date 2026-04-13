import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppConfig = {
  companyName: string;
  defaultCta: string;
  defaultTone: string;
  defaultLanguage: string;
  defaultArticleSize: string;
  defaultImagePrompt: string;
};

type BlogContextType = {
  config: AppConfig;
  setConfig: (config: AppConfig) => void;
  configId: string | null;
  photographerId: string | null;
};

const defaultConfig: AppConfig = {
  companyName: "Meu Estúdio",
  defaultCta: "Agende sua sessão → meu-estudio.com",
  defaultTone: "Informativo e próximo",
  defaultLanguage: "Português",
  defaultArticleSize: "Médio (800–1200 palavras)",
  defaultImagePrompt:
    "Professional photography studio setting, soft natural lighting, elegant and modern aesthetic, photorealistic",
};

const BlogContext = createContext<BlogContextType | undefined>(undefined);

export const BlogProvider = ({ children }: { children: ReactNode }) => {
  const { photographerId } = useAuth();
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (!photographerId) return;

    const load = async () => {
      const { data } = await supabase
        .from("ai_blog_config")
        .select("*")
        .eq("photographer_id", photographerId)
        .maybeSingle();

      if (data) {
        setConfigId(data.id);
        setConfig({
          companyName: data.company_name,
          defaultCta: data.default_cta ?? defaultConfig.defaultCta,
          defaultTone: data.default_tone ?? defaultConfig.defaultTone,
          defaultLanguage: data.default_language ?? defaultConfig.defaultLanguage,
          defaultArticleSize: data.default_article_size ?? defaultConfig.defaultArticleSize,
          defaultImagePrompt: data.default_image_prompt ?? defaultConfig.defaultImagePrompt,
        });
      }
    };
    load();
  }, [photographerId]);

  return (
    <BlogContext.Provider value={{ config, setConfig, configId, photographerId }}>
      {children}
    </BlogContext.Provider>
  );
};

export const useBlogContext = () => {
  const context = useContext(BlogContext);
  if (!context) throw new Error("useBlogContext must be used within BlogProvider");
  return context;
};
