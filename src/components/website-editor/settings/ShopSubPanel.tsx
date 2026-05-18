import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Eye, EyeOff, Plus, Trash2, ArrowUp, ArrowDown, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { getShopDefaults } from "@/lib/shop-defaults";
import { supabase } from "@/integrations/supabase/client";
import type { PageSection } from "@/components/store/SectionRenderer";

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
  photographerId,
}: {
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
  storeSlug?: string | null;
  photographerId?: string | null;
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
  const showDefaultGrid = site?.shop_show_default_grid !== false;
  const manualSessions: string[] = Array.isArray(site?.shop_manual_sessions) ? site!.shop_manual_sessions : [];
  const manualGalleries: string[] = Array.isArray(site?.shop_manual_galleries) ? site!.shop_manual_galleries : [];
  const blocksAbove: PageSection[] = Array.isArray(site?.shop_blocks_above) ? site!.shop_blocks_above : [];
  const blocksBelow: PageSection[] = Array.isArray(site?.shop_blocks_below) ? site!.shop_blocks_below : [];

  const publicUrl = storeSlug ? `/vitrine/${storeSlug}/shop` : "/shop";

  // ── Load sessions & galleries for manual pickers ───────────────────────────
  const [allSessions, setAllSessions] = useState<Array<{ id: string; title: string }>>([]);
  const [allGalleries, setAllGalleries] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => {
    if (!photographerId) return;
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: g }] = await Promise.all([
        (supabase as any)
          .from("sessions")
          .select("id, title")
          .eq("photographer_id", photographerId)
          .eq("status", "active")
          .neq("hide_from_store", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("galleries")
          .select("id, title")
          .eq("photographer_id", photographerId)
          .eq("status", "published")
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      setAllSessions((s as any[]) ?? []);
      setAllGalleries((g as any[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [photographerId]);

  // ── Block management helpers ───────────────────────────────────────────────
  const makeBlock = (type: string, label: string): PageSection => ({
    id: `shop-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    label,
    props: type === "hero"
      ? { headline: "Headline", subtitle: "Subtitle" }
      : type === "text"
      ? { body: "Write your text here…" }
      : type === "cta"
      ? { headline: "Ready to book?", buttonText: "Get in touch", buttonHref: "#" }
      : type === "image"
      ? { src: "", alt: "" }
      : {},
  });

  const updateBlocks = (zone: "above" | "below", next: PageSection[]) => {
    onSiteChange(zone === "above" ? { shop_blocks_above: next } : { shop_blocks_below: next });
  };
  const addBlock = (zone: "above" | "below", type: string) => {
    const src = zone === "above" ? blocksAbove : blocksBelow;
    updateBlocks(zone, [...src, makeBlock(type, type)]);
  };
  const removeBlock = (zone: "above" | "below", idx: number) => {
    const src = zone === "above" ? blocksAbove : blocksBelow;
    updateBlocks(zone, src.filter((_, i) => i !== idx));
  };
  const moveBlock = (zone: "above" | "below", idx: number, dir: -1 | 1) => {
    const src = [...(zone === "above" ? blocksAbove : blocksBelow)];
    const j = idx + dir;
    if (j < 0 || j >= src.length) return;
    [src[idx], src[j]] = [src[j], src[idx]];
    updateBlocks(zone, src);
  };

  // ── Manual selection helpers ───────────────────────────────────────────────
  const toggleManualSession = (id: string) => {
    onSiteChange({
      shop_manual_sessions: manualSessions.includes(id)
        ? manualSessions.filter((x) => x !== id)
        : [...manualSessions, id],
    });
  };
  const toggleManualGallery = (id: string) => {
    onSiteChange({
      shop_manual_galleries: manualGalleries.includes(id)
        ? manualGalleries.filter((x) => x !== id)
        : [...manualGalleries, id],
    });
  };


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

          {/* Default grid toggle */}
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2.5">
            <div className="min-w-0">
              <Label className="text-xs font-medium block">
                {lang === "pt" ? "Mostrar grade automática" : lang === "es" ? "Mostrar cuadrícula automática" : "Show default grid"}
              </Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {lang === "pt"
                  ? "Desative para usar somente blocos personalizados."
                  : lang === "es"
                  ? "Desactiva para usar solo bloques personalizados."
                  : "Disable to use only custom blocks."}
              </p>
            </div>
            <Switch
              checked={showDefaultGrid}
              onCheckedChange={(v) => onSiteChange({ shop_show_default_grid: v })}
            />
          </div>

          {/* Manual Sessions selection */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs">
              {lang === "pt" ? "Sessões manuais (vazio = todas)" : lang === "es" ? "Sesiones manuales (vacío = todas)" : "Manual sessions (empty = all)"}
            </Label>
            <div className="max-h-40 overflow-y-auto rounded border border-border bg-muted/10 divide-y divide-border">
              {allSessions.length === 0 && (
                <p className="text-[10px] text-muted-foreground px-2 py-1.5 italic">—</p>
              )}
              {allSessions.map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 text-[11px] cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={manualSessions.includes(s.id)}
                    onChange={() => toggleManualSession(s.id)}
                    className="h-3 w-3"
                  />
                  <span className="truncate">{s.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Manual Galleries selection */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              {lang === "pt" ? "Galerias manuais (vazio = todas)" : lang === "es" ? "Galerías manuales (vacío = todas)" : "Manual galleries (empty = all)"}
            </Label>
            <div className="max-h-40 overflow-y-auto rounded border border-border bg-muted/10 divide-y divide-border">
              {allGalleries.length === 0 && (
                <p className="text-[10px] text-muted-foreground px-2 py-1.5 italic">—</p>
              )}
              {allGalleries.map((g) => (
                <label key={g.id} className="flex items-center gap-2 px-2 py-1.5 text-[11px] cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={manualGalleries.includes(g.id)}
                    onChange={() => toggleManualGallery(g.id)}
                    className="h-3 w-3"
                  />
                  <span className="truncate">{g.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom blocks (above / below) */}
          {(["above", "below"] as const).map((zone) => {
            const list = zone === "above" ? blocksAbove : blocksBelow;
            const zoneLabel = zone === "above"
              ? (lang === "pt" ? "Blocos acima da grade" : lang === "es" ? "Bloques arriba de la cuadrícula" : "Blocks above grid")
              : (lang === "pt" ? "Blocos abaixo da grade" : lang === "es" ? "Bloques debajo de la cuadrícula" : "Blocks below grid");
            return (
              <div key={zone} className="space-y-1.5 pt-1">
                <Label className="text-xs">{zoneLabel}</Label>
                <div className="space-y-1">
                  {list.map((b, idx) => (
                    <div key={b.id} className="flex items-center gap-1 rounded border border-border bg-muted/10 px-2 py-1.5">
                      <span className="flex-1 truncate text-[11px]">
                        <span className="text-muted-foreground">{b.type}</span> · {b.label}
                      </span>
                      <button onClick={() => moveBlock(zone, idx, -1)} className="p-1 text-muted-foreground hover:text-foreground" title="Up"><ArrowUp className="h-3 w-3" /></button>
                      <button onClick={() => moveBlock(zone, idx, 1)} className="p-1 text-muted-foreground hover:text-foreground" title="Down"><ArrowDown className="h-3 w-3" /></button>
                      <button onClick={() => removeBlock(zone, idx)} className="p-1 text-muted-foreground hover:text-destructive" title="Remove"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {["hero", "text", "image", "cta"].map((tp) => (
                    <button
                      key={tp}
                      onClick={() => addBlock(zone, tp)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wide border border-border rounded hover:bg-muted/40"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      {tp}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Header config info */}
          <div className="flex gap-2 rounded-md border border-border bg-muted/20 px-3 py-2.5">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {lang === "pt"
                ? "O cabeçalho da Showcase usa o cabeçalho global por padrão. Para customizar (slides, altura, sobreposição) edite shop_header_config diretamente — UI dedicada em breve."
                : lang === "es"
                ? "El encabezado de Showcase usa el encabezado global por defecto. Para personalizar edita shop_header_config — UI dedicada próximamente."
                : "Showcase header uses the global header by default. To customize (slides, height, overlay) edit shop_header_config directly — dedicated UI coming next."}
            </p>
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
