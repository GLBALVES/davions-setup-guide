import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { getShopDefaults } from "@/lib/shop-defaults";

const LAYOUT_OPTIONS: { value: "grid-3" | "grid-4" | "grid-2-feature"; label: string }[] = [
  { value: "grid-3", label: "3 cols" },
  { value: "grid-4", label: "4 cols" },
  { value: "grid-2-feature", label: "Featured" },
];

const ORDER_OPTIONS: { value: "manual" | "price-asc" | "price-desc"; labelKey: keyof Labels }[] = [
  { value: "manual", labelKey: "orderManual" },
  { value: "price-asc", labelKey: "orderPriceAsc" },
  { value: "price-desc", labelKey: "orderPriceDesc" },
];

type Labels = {
  description: string;
  enable: string;
  enableHint: string;
  pageTitle: string;
  pageSubtitle: string;
  content: string;
  showSessions: string;
  showGalleries: string;
  display: string;
  showFilters: string;
  showFiltersHint: string;
  showPrice: string;
  layout: string;
  ordering: string;
  orderManual: string;
  orderPriceAsc: string;
  orderPriceDesc: string;
  limit: string;
  limitHint: string;
  preview: string;
  refresh: string;
  openExternal: string;
  hidePreview: string;
  showPreview: string;
  disabledPreview: string;
};

const L: Record<"en" | "pt" | "es", Labels> = {
  en: {
    description: "Showcase your sessions and published galleries on a dedicated page that visitors can access from the menu.",
    enable: "Enable Showcase",
    enableHint: 'Adds a link to your menu and footer.',
    pageTitle: "Page title",
    pageSubtitle: "Subtitle / description",
    content: "Content",
    showSessions: "Show sessions",
    showGalleries: "Show published galleries",
    display: "Display",
    showFilters: "Show category tabs",
    showFiltersHint: "All · Sessions · Galleries",
    showPrice: "Show prices",
    layout: "Default layout",
    ordering: "Ordering",
    orderManual: "Manual",
    orderPriceAsc: "Price ↑",
    orderPriceDesc: "Price ↓",
    limit: "Item limit (0 = all)",
    limitHint: "Maximum items shown on the Showcase page.",
    preview: "Live preview",
    refresh: "Refresh",
    openExternal: "Open full preview",
    hidePreview: "Hide preview",
    showPreview: "Show preview",
    disabledPreview: "Enable Showcase to see the preview.",
  },
  pt: {
    description: "Exiba suas sessões e galerias publicadas em uma página dedicada que visitantes acessam pelo menu.",
    enable: "Ativar Showcase",
    enableHint: "Adiciona um link no menu e rodapé.",
    pageTitle: "Título da página",
    pageSubtitle: "Subtítulo / descrição",
    content: "Conteúdo",
    showSessions: "Mostrar sessões",
    showGalleries: "Mostrar galerias publicadas",
    display: "Exibição",
    showFilters: "Mostrar abas de categoria",
    showFiltersHint: "Todos · Sessões · Galerias",
    showPrice: "Mostrar preços",
    layout: "Leiaute padrão",
    ordering: "Ordenação",
    orderManual: "Manual",
    orderPriceAsc: "Preço ↑",
    orderPriceDesc: "Preço ↓",
    limit: "Limite de itens (0 = todos)",
    limitHint: "Máximo de itens exibidos na página.",
    preview: "Pré-visualização",
    refresh: "Atualizar",
    openExternal: "Abrir em nova aba",
    hidePreview: "Ocultar prévia",
    showPreview: "Mostrar prévia",
    disabledPreview: "Ative o Showcase para ver a prévia.",
  },
  es: {
    description: "Muestra tus sesiones y galerías publicadas en una página dedicada accesible desde el menú.",
    enable: "Activar Showcase",
    enableHint: "Añade un enlace al menú y al pie.",
    pageTitle: "Título de la página",
    pageSubtitle: "Subtítulo / descripción",
    content: "Contenido",
    showSessions: "Mostrar sesiones",
    showGalleries: "Mostrar galerías publicadas",
    display: "Visualización",
    showFilters: "Mostrar pestañas de categoría",
    showFiltersHint: "Todos · Sesiones · Galerías",
    showPrice: "Mostrar precios",
    layout: "Diseño predeterminado",
    ordering: "Orden",
    orderManual: "Manual",
    orderPriceAsc: "Precio ↑",
    orderPriceDesc: "Precio ↓",
    limit: "Límite de elementos (0 = todos)",
    limitHint: "Máximo de elementos mostrados.",
    preview: "Vista previa en vivo",
    refresh: "Actualizar",
    openExternal: "Abrir vista completa",
    hidePreview: "Ocultar vista",
    showPreview: "Mostrar vista",
    disabledPreview: "Activa Showcase para ver la vista previa.",
  },
};

export default function ShopSubPanel({
  site,
  onSiteChange,
  storeSlug,
}: {
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
  storeSlug?: string | null;
}) {
  const { lang } = useLanguage();
  const d = getShopDefaults(lang);
  const t = L[(lang as "en" | "pt" | "es") ?? "en"] ?? L.en;

  const enabled = site?.show_store === true;
  const showSessions = site?.shop_show_sessions !== false;
  const showGalleries = site?.shop_show_galleries !== false;
  const showFilters = site?.shop_show_filters !== false;
  const showPrice = site?.shop_show_price !== false;
  const layout = (site?.shop_layout as string) || "grid-3";
  const order = (site?.shop_order as string) || "manual";
  const limit = typeof site?.shop_limit === "number" ? site!.shop_limit : 0;

  const publicUrl = storeSlug ? `/vitrine/${storeSlug}/shop` : "/shop";

  // Live preview iframe with debounced refresh + manual refresh
  const [previewOpen, setPreviewOpen] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const debounceRef = useRef<number | null>(null);

  // Build a "signature" of preview-affecting fields. When it changes, reload.
  const previewSignature = useMemo(() => JSON.stringify({
    enabled, showSessions, showGalleries, showFilters, showPrice, layout, order, limit,
    title: site?.shop_title ?? "", desc: site?.shop_description ?? "",
  }), [enabled, showSessions, showGalleries, showFilters, showPrice, layout, order, limit, site?.shop_title, site?.shop_description]);

  useEffect(() => {
    if (!previewOpen || !enabled) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setReloadKey((k) => k + 1), 600);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [previewSignature, previewOpen, enabled]);

  const iframeSrc = `${publicUrl}?preview=1&_=${reloadKey}`;

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      <p className="text-[11px] text-muted-foreground">{t.description}</p>

      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2.5">
        <div className="min-w-0">
          <Label className="text-xs font-medium block">{t.enable}</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t.enableHint} ("{d.navLabel}")
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onSiteChange({ show_store: v })}
        />
      </div>

      {enabled && (
        <>
          {/* Page title + description */}
          <div className="space-y-1">
            <Label className="text-xs">{t.pageTitle}</Label>
            <Input
              value={site?.shop_title ?? ""}
              onChange={(e) => onSiteChange({ shop_title: e.target.value || null })}
              placeholder={d.pageTitle}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t.pageSubtitle}</Label>
            <Textarea
              value={site?.shop_description ?? ""}
              onChange={(e) => onSiteChange({ shop_description: e.target.value || null })}
              placeholder={d.pageDescription}
              className="text-xs min-h-[60px]"
              rows={3}
            />
          </div>

          {/* Content toggles */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
              {t.content}
            </p>
            <div className="flex items-center justify-between px-2 py-1.5">
              <Label className="text-xs">{t.showSessions}</Label>
              <Switch
                checked={showSessions}
                onCheckedChange={(v) => onSiteChange({ shop_show_sessions: v })}
              />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <Label className="text-xs">{t.showGalleries}</Label>
              <Switch
                checked={showGalleries}
                onCheckedChange={(v) => onSiteChange({ shop_show_galleries: v })}
              />
            </div>
          </div>

          {/* Display toggles */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
              {t.display}
            </p>
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="min-w-0">
                <Label className="text-xs block">{t.showFilters}</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.showFiltersHint}</p>
              </div>
              <Switch
                checked={showFilters}
                onCheckedChange={(v) => onSiteChange({ shop_show_filters: v })}
              />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <Label className="text-xs">{t.showPrice}</Label>
              <Switch
                checked={showPrice}
                onCheckedChange={(v) => onSiteChange({ shop_show_price: v })}
              />
            </div>
          </div>

          {/* Layout */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs">{t.layout}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSiteChange({ shop_layout: opt.value })}
                  className={`px-2 py-2 text-[10px] tracking-wide uppercase border rounded transition-colors ${
                    layout === opt.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ordering */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.ordering}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {ORDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSiteChange({ shop_order: opt.value })}
                  className={`px-2 py-2 text-[10px] tracking-wide uppercase border rounded transition-colors ${
                    order === opt.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {t[opt.labelKey]}
                </button>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div className="space-y-1">
            <Label className="text-xs">{t.limit}</Label>
            <Input
              type="number"
              min={0}
              value={limit}
              onChange={(e) =>
                onSiteChange({ shop_limit: Math.max(0, parseInt(e.target.value || "0", 10) || 0) })
              }
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">{t.limitHint}</p>
          </div>

          {/* Live preview */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
                {t.preview}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  title={t.refresh}
                  aria-label={t.refresh}
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setPreviewOpen((v) => !v)}
                  className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  title={previewOpen ? t.hidePreview : t.showPreview}
                  aria-label={previewOpen ? t.hidePreview : t.showPreview}
                >
                  {previewOpen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {previewOpen && (
              <div className="rounded border border-border bg-muted/20 overflow-hidden">
                {/* Scaled iframe — render at 1280px wide, scaled down to fit panel */}
                <div className="relative w-full" style={{ height: 360 }}>
                  <iframe
                    key={reloadKey}
                    src={iframeSrc}
                    title="Showcase preview"
                    className="absolute top-0 left-0 origin-top-left border-0 bg-background"
                    style={{
                      width: "1280px",
                      height: `${Math.round(360 / 0.18)}px`,
                      transform: "scale(0.18)",
                    }}
                  />
                </div>
              </div>
            )}

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 mt-2 text-[11px] font-medium border border-border rounded hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {t.openExternal}
            </a>
          </div>
        </>
      )}

      {!enabled && (
        <p className="text-[11px] text-muted-foreground italic">{t.disabledPreview}</p>
      )}
    </div>
  );
}
