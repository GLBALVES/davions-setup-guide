import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RichTextEditor from "@/components/RichTextEditor";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLegalDefaults } from "@/lib/legal-defaults";
import { RotateCcw, Eye, Scale } from "lucide-react";
import { toast } from "sonner";

/**
 * Full-screen modal for editing Terms of Service & Privacy Policy with a
 * spacious rich-text editor. Replaces the cramped sidebar sub-panel.
 */
export default function LegalModal({
  open,
  onOpenChange,
  site,
  onSiteChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => Promise<void> | void;
}) {
  const { lang: language } = useLanguage();
  const defaults = getLegalDefaults(language);
  const studio = site?.business_name || "your studio";

  const [terms, setTerms] = useState<string>(site?.terms_content ?? "");
  const [privacy, setPrivacy] = useState<string>(site?.privacy_content ?? "");
  const [tab, setTab] = useState<"terms" | "privacy">("terms");
  const [saving, setSaving] = useState(false);

  // Re-sync when modal reopens / site changes
  useEffect(() => {
    if (open) {
      setTerms(site?.terms_content ?? "");
      setPrivacy(site?.privacy_content ?? "");
    }
  }, [open, site?.terms_content, site?.privacy_content]);

  const labels =
    language === "pt"
      ? {
          title: "Legal — Termos & Privacidade",
          intro: "Personalize o texto legal do seu site. Deixe em branco para usar o texto padrão da plataforma.",
          termsTab: "Termos de Serviço",
          privacyTab: "Política de Privacidade",
          termsHelp: "Texto exibido em /terms do seu site.",
          privacyHelp: "Texto exibido em /privacy do seu site.",
          loadDefault: "Carregar texto padrão",
          clear: "Limpar (usar padrão)",
          preview: "Pré-visualizar",
          save: "Salvar alterações",
          cancel: "Cancelar",
          saved: "Textos legais atualizados",
          placeholder: "Deixe em branco para usar o texto padrão.",
        }
      : language === "es"
      ? {
          title: "Legal — Términos y Privacidad",
          intro: "Personaliza el texto legal de tu sitio. Deja en blanco para usar el texto por defecto.",
          termsTab: "Términos de Servicio",
          privacyTab: "Política de Privacidad",
          termsHelp: "Texto mostrado en /terms de tu sitio.",
          privacyHelp: "Texto mostrado en /privacy de tu sitio.",
          loadDefault: "Cargar texto por defecto",
          clear: "Limpiar (usar por defecto)",
          preview: "Vista previa",
          save: "Guardar cambios",
          cancel: "Cancelar",
          saved: "Textos legales actualizados",
          placeholder: "Déjalo en blanco para usar el texto por defecto.",
        }
      : {
          title: "Legal — Terms & Privacy",
          intro: "Customize the legal text of your site. Leave blank to use the platform default.",
          termsTab: "Terms of Service",
          privacyTab: "Privacy Policy",
          termsHelp: "Shown at /terms on your site.",
          privacyHelp: "Shown at /privacy on your site.",
          loadDefault: "Load default text",
          clear: "Clear (use default)",
          preview: "Preview",
          save: "Save changes",
          cancel: "Cancel",
          saved: "Legal texts updated",
          placeholder: "Leave blank to use the default.",
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
    setSaving(true);
    try {
      await onSiteChange({
        terms_content: terms.trim() ? terms : null,
        privacy_content: privacy.trim() ? privacy : null,
      });
      toast.success(labels.saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const renderEditorBlock = (
    kind: "terms" | "privacy",
    value: string,
    setValue: (v: string) => void,
    help: string,
    defaultHtml: string,
  ) => (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <p className="text-xs text-muted-foreground">{help}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setValue(defaultHtml)}
          >
            {labels.loadDefault}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setValue("")}
            disabled={!value}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {labels.clear}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => previewHtml(value, defaultHtml)}
          >
            <Eye className="h-3 w-3 mr-1" />
            {labels.preview}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-md border border-input bg-background">
        <RichTextEditor
          content={value}
          onChange={setValue}
          placeholder={labels.placeholder}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4" />
            {labels.title}
          </DialogTitle>
          <DialogDescription className="text-xs">{labels.intro}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "terms" | "privacy")}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div className="px-6 pt-3 shrink-0">
            <TabsList>
              <TabsTrigger value="terms">{labels.termsTab}</TabsTrigger>
              <TabsTrigger value="privacy">{labels.privacyTab}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="terms" className="flex-1 min-h-0 px-6 pb-4 mt-3 data-[state=inactive]:hidden">
            {renderEditorBlock("terms", terms, setTerms, labels.termsHelp, defaults.termsHtml(studio))}
          </TabsContent>

          <TabsContent value="privacy" className="flex-1 min-h-0 px-6 pb-4 mt-3 data-[state=inactive]:hidden">
            {renderEditorBlock("privacy", privacy, setPrivacy, labels.privacyHelp, defaults.privacyHtml(studio))}
          </TabsContent>
        </Tabs>

        <div className="px-6 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            {labels.cancel}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {labels.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
