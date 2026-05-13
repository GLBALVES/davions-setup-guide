import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import LanguageTabs from "./LanguageTabs";
import {
  getI18nField,
  setI18nField,
  type SiteI18nKey,
  type SiteI18nLang,
} from "@/lib/site-i18n";
import { getShopDefaults } from "@/lib/shop-defaults";
import { getBlogDefaults } from "@/lib/blog-defaults";

type Tab = "identity" | "layout" | "seo";

const T_LABELS: Record<SiteI18nLang, Record<Tab, string>> = {
  en: { identity: "Identity", layout: "Layout & Subpages", seo: "SEO (PT/EN/ES)" },
  pt: { identity: "Identidade", layout: "Layout & Subpáginas", seo: "SEO (PT/EN/ES)" },
  es: { identity: "Identidad", layout: "Diseño y Subpáginas", seo: "SEO (PT/EN/ES)" },
};

const STR: Record<SiteI18nLang, Record<string, string>> = {
  en: {
    intro: "Customize your public Vitrine: identity, sections and SEO per language.",
    studioName: "Studio name",
    tagline: "Tagline",
    headline: "Headline",
    subheadline: "Subheadline",
    logo: "Logo URL",
    favicon: "Favicon URL",
    moreIdentity: "Open colors / fonts panels for full theming.",
    shopTitle: "Showcase title",
    shopDesc: "Showcase description",
    blogTitle: "Blog title",
    blogDesc: "Blog description",
    seoTitle: "Meta title",
    seoDesc: "Meta description",
    open: "Open public Vitrine",
    perLang: "Editing for",
  },
  pt: {
    intro: "Personalize sua Vitrine pública: identidade, seções e SEO por idioma.",
    studioName: "Nome do estúdio",
    tagline: "Slogan",
    headline: "Título principal",
    subheadline: "Subtítulo",
    logo: "URL do logo",
    favicon: "URL do favicon",
    moreIdentity: "Abra os painéis de cores e fontes para personalização completa.",
    shopTitle: "Título da Vitrine (Shop)",
    shopDesc: "Descrição da Vitrine",
    blogTitle: "Título do Blog",
    blogDesc: "Descrição do Blog",
    seoTitle: "Meta título",
    seoDesc: "Meta descrição",
    open: "Abrir Vitrine pública",
    perLang: "Editando para",
  },
  es: {
    intro: "Personaliza tu Vitrina pública: identidad, secciones y SEO por idioma.",
    studioName: "Nombre del estudio",
    tagline: "Eslogan",
    headline: "Titular",
    subheadline: "Subtítulo",
    logo: "URL del logo",
    favicon: "URL del favicon",
    moreIdentity: "Abre los paneles de colores y fuentes para personalización completa.",
    shopTitle: "Título de la Vitrina",
    shopDesc: "Descripción de la Vitrina",
    blogTitle: "Título del Blog",
    blogDesc: "Descripción del Blog",
    seoTitle: "Meta título",
    seoDesc: "Meta descripción",
    open: "Abrir Vitrina pública",
    perLang: "Editando para",
  },
};

export default function VitrineSubPanel({
  site,
  onSiteChange,
  storeSlug,
}: {
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
  storeSlug?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("identity");
  const [lang, setLang] = useState<SiteI18nLang>("pt");
  const t = STR[lang];
  const labels = T_LABELS[lang];

  const publicUrl = storeSlug ? `/vitrine/${storeSlug}` : "/vitrine";

  const setField = (key: SiteI18nKey, value: string) => {
    onSiteChange(setI18nField(site, lang, key, value));
  };

  const get = (key: SiteI18nKey, fallback?: string) =>
    getI18nField(site, lang, key, fallback);

  const shopD = getShopDefaults(lang);
  const blogD = getBlogDefaults(lang);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 shrink-0 border-b border-border">
        {(Object.keys(labels) as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "px-2.5 py-1.5 text-[11px] font-medium rounded-t transition-colors",
              tab === k
                ? "text-foreground border-b-2 border-foreground -mb-px"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[k]}
          </button>
        ))}
      </div>

      {/* Language switcher (shared across all tabs) */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t.perLang}
        </span>
        <LanguageTabs value={lang} onChange={setLang} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">{t.intro}</p>

        {tab === "identity" && (
          <>
            <Field label={t.studioName}>
              <Input
                value={(site as any)?.business_name ?? ""}
                onChange={(e) =>
                  onSiteChange({ business_name: e.target.value || null })
                }
                placeholder="Studio Davions"
                className="h-8 text-xs"
              />
            </Field>

            <Field label={t.tagline}>
              <Input
                value={get("site_subheadline")}
                onChange={(e) => setField("site_subheadline", e.target.value)}
                placeholder={lang === "pt" ? "Fotografia autoral" : lang === "es" ? "Fotografía de autor" : "Signature photography"}
                className="h-8 text-xs"
              />
            </Field>

            <Field label={t.headline}>
              <Input
                value={get("site_headline")}
                onChange={(e) => setField("site_headline", e.target.value)}
                placeholder={(site as any)?.business_name || ""}
                className="h-8 text-xs"
              />
            </Field>

            <Field label={t.subheadline}>
              <Textarea
                value={get("site_subheadline")}
                onChange={(e) => setField("site_subheadline", e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </Field>

            <Field label={t.logo}>
              <Input
                value={(site as any)?.logo_url ?? ""}
                onChange={(e) => onSiteChange({ logo_url: e.target.value || null })}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </Field>

            <Field label={t.favicon}>
              <Input
                value={(site as any)?.favicon_url ?? ""}
                onChange={(e) => onSiteChange({ favicon_url: e.target.value || null })}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </Field>

            <p className="text-[10px] text-muted-foreground/80 italic">{t.moreIdentity}</p>
          </>
        )}

        {tab === "layout" && (
          <>
            <Section title={lang === "pt" ? "Vitrine (Shop)" : lang === "es" ? "Vitrina (Shop)" : "Showcase (Shop)"}>
              <Field label={t.shopTitle}>
                <Input
                  value={get("shop_title", shopD.pageTitle)}
                  onChange={(e) => setField("shop_title", e.target.value)}
                  placeholder={shopD.pageTitle}
                  className="h-8 text-xs"
                />
              </Field>
              <Field label={t.shopDesc}>
                <Textarea
                  value={get("shop_description", shopD.pageDescription)}
                  onChange={(e) => setField("shop_description", e.target.value)}
                  placeholder={shopD.pageDescription}
                  rows={2}
                  className="text-xs resize-none"
                />
              </Field>
            </Section>

            <Section title="Blog">
              <Field label={t.blogTitle}>
                <Input
                  value={get("blog_title", blogD.pageTitle)}
                  onChange={(e) => setField("blog_title", e.target.value)}
                  placeholder={blogD.pageTitle}
                  className="h-8 text-xs"
                />
              </Field>
              <Field label={t.blogDesc}>
                <Textarea
                  value={get("blog_description", blogD.pageDescription)}
                  onChange={(e) => setField("blog_description", e.target.value)}
                  placeholder={blogD.pageDescription}
                  rows={2}
                  className="text-xs resize-none"
                />
              </Field>
            </Section>

            <p className="text-[10px] text-muted-foreground/80 italic">
              {lang === "pt"
                ? "Para reordenar seções e personalizar o Legal, use os painéis dedicados em Settings."
                : lang === "es"
                ? "Para reordenar secciones y personalizar la página Legal, usa los paneles dedicados en Settings."
                : "To reorder sections and edit Legal, use the dedicated panels in Settings."}
            </p>
          </>
        )}

        {tab === "seo" && (
          <>
            <Field label={t.seoTitle}>
              <Input
                value={get("seo_title")}
                onChange={(e) => setField("seo_title", e.target.value)}
                maxLength={60}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {get("seo_title").length}/60
              </p>
            </Field>

            <Field label={t.seoDesc}>
              <Textarea
                value={get("seo_description")}
                onChange={(e) => setField("seo_description", e.target.value)}
                maxLength={160}
                rows={3}
                className="text-xs resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {get("seo_description").length}/160
              </p>
            </Field>
          </>
        )}

        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 mt-2 text-[11px] font-medium border border-border rounded hover:bg-muted/50 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          {t.open}
        </a>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}
