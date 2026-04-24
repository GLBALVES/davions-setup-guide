import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, Sparkles, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBlogDefaults } from "@/lib/blog-defaults";

const STR = {
  en: {
    title: "Blog",
    toggleLabel: "Show blog on site",
    toggleDesc: "Adds a /blog section to your public website.",
    heroTitle: "Page title",
    heroTitlePh: "Blog",
    heroDesc: "Page description",
    heroDescPh: "Stories, tips & inspiration from behind the lens.",
    viewPublic: "View public blog",
    createPost: "Create new post with AI",
    createPostDesc: "Opens the AI blog generator in a new tab.",
    managePosts: "Manage blog posts",
    settings: "Blog settings & themes",
    footnote: "Full blog management (posts, AI generation, SEO) lives in the Blog module.",
  },
  pt: {
    title: "Blog",
    toggleLabel: "Mostrar blog no site",
    toggleDesc: "Adiciona uma seção /blog ao seu site público.",
    heroTitle: "Título da página",
    heroTitlePh: "Blog",
    heroDesc: "Descrição da página",
    heroDescPh: "Histórias, dicas e inspiração de quem está por trás das lentes.",
    viewPublic: "Ver blog público",
    createPost: "Criar novo post com IA",
    createPostDesc: "Abre o gerador de blog com IA em uma nova aba.",
    managePosts: "Gerenciar posts do blog",
    settings: "Configurações e temas do blog",
    footnote: "A gestão completa do blog (posts, IA, SEO) fica no módulo Blog.",
  },
  es: {
    title: "Blog",
    toggleLabel: "Mostrar blog en el sitio",
    toggleDesc: "Agrega una sección /blog a tu sitio público.",
    heroTitle: "Título de la página",
    heroTitlePh: "Blog",
    heroDesc: "Descripción de la página",
    heroDescPh: "Historias, consejos e inspiración detrás de la lente.",
    viewPublic: "Ver blog público",
    createPost: "Crear nueva entrada con IA",
    createPostDesc: "Abre el generador de blog con IA en una nueva pestaña.",
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
  const { lang } = useLanguage();
  const t = STR[lang as keyof typeof STR] ?? STR.en;
  const d = getBlogDefaults(lang);
  const enabled = site?.show_blog ?? false;

  const openInNewTab = (path: string) => {
    window.open(path, "_blank", "noopener,noreferrer");
  };

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

      {enabled && (
        <div className="space-y-3 pb-3 border-b border-border">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-foreground normal-case tracking-normal">
              {t.heroTitle}
            </Label>
            <Input
              value={site?.blog_title ?? ""}
              onChange={(e) => onSiteChange({ blog_title: e.target.value })}
              placeholder={d.pageTitle || t.heroTitlePh}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-foreground normal-case tracking-normal">
              {t.heroDesc}
            </Label>
            <Textarea
              value={site?.blog_description ?? ""}
              onChange={(e) => onSiteChange({ blog_description: e.target.value })}
              placeholder={d.pageDescription || t.heroDescPh}
              rows={2}
              className="text-xs resize-none"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs normal-case tracking-normal h-8 px-3"
            onClick={() => openInNewTab("/blog")}
          >
            <span className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5" />
              {t.viewPublic}
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </div>
      )}

      <Button
        size="sm"
        className="w-full justify-between text-xs normal-case tracking-normal font-medium h-10 px-3"
        onClick={() => openInNewTab("/dashboard/blog/temas")}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          {t.createPost}
        </span>
        <ExternalLink className="h-3.5 w-3.5 opacity-80" />
      </Button>
      <p className="text-[10px] text-muted-foreground -mt-2 normal-case tracking-normal leading-relaxed">
        {t.createPostDesc}
      </p>

      <div className="space-y-2 pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs normal-case tracking-normal font-normal h-9 px-3"
          onClick={() => openInNewTab("/dashboard/blog")}
        >
          <span>{t.managePosts}</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs normal-case tracking-normal font-normal h-9 px-3"
          onClick={() => openInNewTab("/dashboard/blog/config")}
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
