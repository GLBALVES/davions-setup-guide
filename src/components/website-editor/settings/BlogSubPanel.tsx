import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STR = {
  en: {
    title: "Blog",
    toggleLabel: "Show blog on site",
    toggleDesc: "Adds a /blog section to your public website.",
    managePosts: "Manage blog posts",
    settings: "Blog settings & themes",
    footnote: "Full blog management (posts, AI generation, SEO) lives in the Blog module.",
  },
  pt: {
    title: "Blog",
    toggleLabel: "Mostrar blog no site",
    toggleDesc: "Adiciona uma seção /blog ao seu site público.",
    managePosts: "Gerenciar posts do blog",
    settings: "Configurações e temas do blog",
    footnote: "A gestão completa do blog (posts, IA, SEO) fica no módulo Blog.",
  },
  es: {
    title: "Blog",
    toggleLabel: "Mostrar blog en el sitio",
    toggleDesc: "Agrega una sección /blog a tu sitio público.",
    managePosts: "Gestionar entradas del blog",
    settings: "Configuración y temas del blog",
    footnote: "La gestión completa del blog (entradas, IA, SEO) está en el módulo Blog.",
  },
};

export default function BlogSubPanel({
  site,
  onSiteChange,
}: {
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
}) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = STR[lang as keyof typeof STR] ?? STR.en;
  const enabled = site?.show_blog ?? false;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full normal-case tracking-normal">
      <h3 className="text-sm font-medium text-foreground normal-case tracking-normal">{t.title}</h3>

      <div className="flex items-start justify-between gap-3 py-3 border-b border-border">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground normal-case tracking-normal">
            {t.toggleLabel}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 normal-case tracking-normal leading-relaxed">
            {t.toggleDesc}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onSiteChange({ show_blog: v })}
        />
      </div>

      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs normal-case tracking-normal font-normal h-9 px-3"
          onClick={() => navigate("/dashboard/blog")}
        >
          <span>{t.managePosts}</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs normal-case tracking-normal font-normal h-9 px-3"
          onClick={() => navigate("/dashboard/blog/config")}
        >
          <span>{t.settings}</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/70 pt-2 normal-case tracking-normal leading-relaxed">
        {t.footnote}
      </p>
    </div>
  );
}
