import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLegalDefaults } from "@/lib/legal-defaults";
import { RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";

/**
 * Settings → Legal sub-panel. Lets the photographer override the default
 * Terms of Service and Privacy Policy texts shown on their public site.
 *
 * Empty fields = the public site falls back to the platform default text
 * (which already describes the photographer↔client relationship).
 */
export default function LegalSubPanel({
  site,
  onSiteChange,
}: {
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
}) {
  const { lang: language } = useLanguage();
  const defaults = getLegalDefaults(language);
  const studio = site?.business_name || "your studio";

  const [terms, setTerms] = useState<string>(site?.terms_content ?? "");
  const [privacy, setPrivacy] = useState<string>(site?.privacy_content ?? "");

  const labels =
    language === "pt"
      ? {
          intro: "Personalize o texto legal do seu site. Deixe em branco para usar o texto padrão da plataforma (relação fotógrafo↔cliente).",
          termsTitle: "Termos de Serviço",
          termsHelp: "Texto exibido em /terms do seu site.",
          privacyTitle: "Política de Privacidade",
          privacyHelp: "Texto exibido em /privacy do seu site.",
          loadDefault: "Carregar texto padrão",
          clear: "Limpar (usar padrão)",
          preview: "Pré-visualizar",
          save: "Salvar alterações",
          saved: "Textos legais atualizados",
          placeholder: "Deixe em branco para usar o texto padrão. Você pode usar HTML básico (<h2>, <p>, <ul>, <strong>).",
        }
      : language === "es"
      ? {
          intro: "Personaliza el texto legal de tu sitio. Deja en blanco para usar el texto por defecto de la plataforma (relación fotógrafo↔cliente).",
          termsTitle: "Términos de Servicio",
          termsHelp: "Texto mostrado en /terms de tu sitio.",
          privacyTitle: "Política de Privacidad",
          privacyHelp: "Texto mostrado en /privacy de tu sitio.",
          loadDefault: "Cargar texto por defecto",
          clear: "Limpiar (usar por defecto)",
          preview: "Vista previa",
          save: "Guardar cambios",
          saved: "Textos legales actualizados",
          placeholder: "Déjalo en blanco para usar el texto por defecto. Puedes usar HTML básico (<h2>, <p>, <ul>, <strong>).",
        }
      : {
          intro: "Customize the legal text of your site. Leave blank to use the platform default (describing the photographer↔client relationship).",
          termsTitle: "Terms of Service",
          termsHelp: "Shown at /terms on your site.",
          privacyTitle: "Privacy Policy",
          privacyHelp: "Shown at /privacy on your site.",
          loadDefault: "Load default text",
          clear: "Clear (use default)",
          preview: "Preview",
          save: "Save changes",
          saved: "Legal texts updated",
          placeholder: "Leave blank to use the default. Basic HTML allowed (<h2>, <p>, <ul>, <strong>).",
        };

  const previewHtml = (html: string, fallback: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const body = html.trim().length > 0 ? html : fallback;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Preview</title>
      <style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111;line-height:1.6;font-size:14px}
      h2{font-size:13px;letter-spacing:.2em;text-transform:uppercase;font-weight:400;margin-top:32px;margin-bottom:10px}
      p,li{font-size:13px}</style></head><body>${body}</body></html>`);
    w.document.close();
  };

  const handleSave = async () => {
    const patch: Record<string, any> = {
      terms_content: terms.trim() ? terms : null,
      privacy_content: privacy.trim() ? privacy : null,
    };
    await onSiteChange(patch);
    toast.success(labels.saved);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <p className="text-xs text-muted-foreground leading-relaxed">{labels.intro}</p>

      {/* Terms */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{labels.termsTitle}</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => setTerms(defaults.termsHtml(studio))}
            >
              {labels.loadDefault}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => setTerms("")}
              disabled={!terms}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {labels.clear}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => previewHtml(terms, defaults.termsHtml(studio))}
            >
              <Eye className="h-3 w-3 mr-1" />
              {labels.preview}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{labels.termsHelp}</p>
        <Textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder={labels.placeholder}
          rows={12}
          className="text-xs font-mono"
        />
      </div>

      {/* Privacy */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{labels.privacyTitle}</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => setPrivacy(defaults.privacyHtml(studio))}
            >
              {labels.loadDefault}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => setPrivacy("")}
              disabled={!privacy}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {labels.clear}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => previewHtml(privacy, defaults.privacyHtml(studio))}
            >
              <Eye className="h-3 w-3 mr-1" />
              {labels.preview}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{labels.privacyHelp}</p>
        <Textarea
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
          placeholder={labels.placeholder}
          rows={12}
          className="text-xs font-mono"
        />
      </div>

      <div className="pt-2 border-t border-border">
        <Button onClick={handleSave} className="w-full" size="sm">
          {labels.save}
        </Button>
      </div>
    </div>
  );
}
