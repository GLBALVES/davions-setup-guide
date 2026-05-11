import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { FONT_PRESETS, getFontStack, type ExternalFontEntry } from "@/components/website-editor/site-fonts";
import {
  DEFAULT_FONT_TEMPLATE_ID,
  ELEMENT_GROUPS,
  FONT_SIZE_SCALES,
  FONT_TEMPLATES,
  getFontTemplate,
  resolveElement,
  type ElementKey,
  type FontOverrides,
  type FontSizeScale,
  type FontStyle,
  type FontTemplate,
  type TextDecoration,
  type TextTransform,
} from "@/components/website-editor/font-templates";

export interface CustomFontEntry {
  id: string;
  label: string;
  url: string;
  format?: string;
}

interface Props {
  templateId: string | null | undefined;
  overrides: FontOverrides | null | undefined;
  fontSize: FontSizeScale | null | undefined;
  customFonts: CustomFontEntry[];
  customFontCss: string | null | undefined;
  photographerId: string | null;
  onTemplateChange: (templateId: string, template: FontTemplate) => void;
  onOverridesChange: (next: FontOverrides) => void;
  onFontSizeChange: (size: FontSizeScale) => void;
  onCustomFontsChange: (next: CustomFontEntry[]) => void;
  onCustomFontCssChange: (next: string) => void;
}

type GroupKey = (typeof ELEMENT_GROUPS)[number]["key"];

export default function FontsSubPanel({
  templateId,
  overrides,
  fontSize,
  customFonts,
  customFontCss,
  photographerId,
  onTemplateChange: _onTemplateChange,
  onOverridesChange,
  onFontSizeChange,
  onCustomFontsChange,
  onCustomFontCssChange,
}: Props) {
  const [groupKey, setGroupKey] = useState<GroupKey | null>(null);
  const [expandedItem, setExpandedItem] = useState<ElementKey | null>(null);

  const activeId = templateId || DEFAULT_FONT_TEMPLATE_ID;
  const ov = overrides ?? {};
  const scale = FONT_SIZE_SCALES[fontSize ?? "regular"] ?? 1;

  const group = ELEMENT_GROUPS.find((g) => g.key === groupKey);

  // ── Group items editor ────────────────────────────────────────────────────
  if (group) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setGroupKey(null);
            setExpandedItem(null);
          }}
          className="flex items-center gap-2 text-xs font-light tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <h3 className="text-sm font-medium text-foreground">Edit {group.label}</h3>
        <div className="space-y-px">
          {group.items.map((item) => {
            const expanded = expandedItem === item.key;
            const eff = resolveElement(activeId, ov, item.key, scale);
            const stack = getFontStack(eff.fontFamily);
            return (
              <div key={item.key} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setExpandedItem(expanded ? null : item.key)}
                  className="w-full flex items-center justify-between py-3 text-left"
                >
                  <span className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">
                    {item.label}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </button>
                <div
                  className="text-foreground py-2 truncate"
                  style={{
                    fontFamily: stack,
                    fontWeight: eff.weight,
                    fontStyle: eff.style,
                    fontSize: Math.min(eff.fontSize, 28),
                    lineHeight: eff.lineHeight,
                    letterSpacing: `${eff.letterSpacing}em`,
                    textTransform: eff.textTransform,
                    textDecoration: eff.textDecoration,
                  }}
                >
                  Share your story
                </div>
                {expanded && (
                  <ElementEditor
                    elementKey={item.key}
                    overrides={ov}
                    templateId={activeId}
                    customFonts={customFonts}
                    onChange={(patch) => {
                      const next: FontOverrides = {
                        ...ov,
                        [item.key]: { ...(ov[item.key] ?? {}), ...patch },
                      };
                      onOverridesChange(next);
                    }}
                    onReset={() => {
                      const next: FontOverrides = { ...ov };
                      delete next[item.key];
                      onOverridesChange(next);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Root view: global size + group list ──────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">Fonts</h3>
        <p className="text-[11px] text-muted-foreground">
          Customize the font for each element of your site.
        </p>
      </div>

      <div className="space-y-px border border-border">
        {ELEMENT_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGroupKey(g.key)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40 transition-colors border-b border-border last:border-b-0"
          >
            <span className="font-light text-foreground">{g.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <CustomFontsSection
        customFonts={customFonts}
        photographerId={photographerId}
        onChange={onCustomFontsChange}
      />

      <CustomFontCssSection
        value={customFontCss ?? ""}
        onChange={onCustomFontCssChange}
      />
    </div>
  );
}

// ── Per-element editor (font family/weight/style/size/etc.) ────────────────
interface ElementEditorProps {
  elementKey: ElementKey;
  templateId: string;
  overrides: FontOverrides;
  customFonts: CustomFontEntry[];
  onChange: (patch: Partial<{ fontFamily: string; weight: number; style: FontStyle; fontSize: number; lineHeight: number; letterSpacing: number; textTransform: TextTransform; textDecoration: TextDecoration }>) => void;
  onReset: () => void;
}

function ElementEditor({ elementKey, templateId, overrides, customFonts, onChange, onReset }: ElementEditorProps) {
  const { lang } = useLanguage();
  const eff = resolveElement(templateId, overrides, elementKey, 1);
  const hasOverride = Boolean(overrides[elementKey] && Object.keys(overrides[elementKey]!).length > 0);

  // Localized BIU letters: EN uses B/I/U; PT/ES use N/I/S (Negrito/Itálico/Sublinhado).
  const biuLabels = lang === "en"
    ? { bold: "B", italic: "I", underline: "U" }
    : { bold: "N", italic: "I", underline: "S" };

  return (
    <div className="space-y-3 pb-4">

      <Row label="Font Family">
        <Select value={eff.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[60] max-h-72">
            {customFonts.length > 0 && (
              <>
                <div className="px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                  {lang === "en" ? "Custom" : "Personalizadas"}
                </div>
                {customFonts.map((f) => (
                  <SelectItem key={f.id} value={f.id} style={{ fontFamily: `'${f.id}', sans-serif` }}>
                    {f.label}
                  </SelectItem>
                ))}
                <div className="border-t border-border my-1" />
              </>
            )}
            {FONT_PRESETS.map((f) => (
              <SelectItem key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      <Row label="Weight">
        <Select value={String(eff.weight)} onValueChange={(v) => onChange({ weight: Number(v) })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[60]">
            {[300, 400, 500, 600, 700, 800].map((w) => (
              <SelectItem key={w} value={String(w)}>{w}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      <Row label="Style">
        <div className="flex items-center gap-1">
          {([
            { key: "bold", label: biuLabels.bold, active: eff.weight >= 600, onClick: () => onChange({ weight: eff.weight >= 600 ? 400 : 700 }), className: "font-bold" },
            { key: "italic", label: biuLabels.italic, active: eff.style === "italic", onClick: () => onChange({ style: eff.style === "italic" ? "normal" : "italic" }), className: "italic font-serif" },
            { key: "underline", label: biuLabels.underline, active: eff.textDecoration === "underline", onClick: () => onChange({ textDecoration: eff.textDecoration === "underline" ? "none" : "underline" }), className: "underline" },
          ] as const).map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={b.onClick}
              className={cn(
                "h-8 w-8 flex items-center justify-center text-xs border transition-colors",
                b.className,
                b.active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:bg-muted/40",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </Row>

      <SliderRow
        label="Font Size"
        value={eff.fontSize}
        min={8}
        max={120}
        step={1}
        suffix="px"
        onChange={(v) => onChange({ fontSize: v })}
      />

      <SliderRow
        label="Line Height"
        value={Number(eff.lineHeight.toFixed(2))}
        min={0.8}
        max={3}
        step={0.05}
        suffix="em"
        onChange={(v) => onChange({ lineHeight: v })}
      />

      <SliderRow
        label="Letter Spacing"
        value={Number(eff.letterSpacing.toFixed(2))}
        min={-0.1}
        max={0.5}
        step={0.01}
        suffix="em"
        onChange={(v) => onChange({ letterSpacing: v })}
      />

      <Row label="Text Transform">
        <Select value={eff.textTransform} onValueChange={(v) => onChange({ textTransform: v as TextTransform })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[60]">
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="uppercase">Uppercase</SelectItem>
            <SelectItem value="lowercase">Lowercase</SelectItem>
            <SelectItem value="capitalize">Capitalize</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      {hasOverride && (
        <Button variant="ghost" size="sm" className="w-full h-8 text-[10px]" onClick={onReset}>
          Reset to template default
        </Button>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-[11px] text-muted-foreground flex-shrink-0">{label}</label>
      <div className="w-[160px]">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-muted-foreground">{label}</label>
        <span className="text-[11px] text-foreground tabular-nums">
          {value}{suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

// ── Custom fonts uploader ────────────────────────────────────────────────────
const FONT_MIME_TO_FORMAT: Record<string, string> = {
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "truetype",
  "application/font-woff": "woff",
  "application/x-font-ttf": "truetype",
  "application/x-font-otf": "opentype",
  "font/otf": "opentype",
};

function inferFormatFromName(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "woff2") return "woff2";
  if (ext === "woff") return "woff";
  if (ext === "ttf") return "truetype";
  if (ext === "otf") return "opentype";
  return "";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "font";
}

interface CustomFontsSectionProps {
  customFonts: CustomFontEntry[];
  photographerId: string | null;
  onChange: (next: CustomFontEntry[]) => void;
}

function CustomFontsSection({ customFonts, photographerId, onChange }: CustomFontsSectionProps) {
  const { lang } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const t = {
    title: lang === "en" ? "Custom Fonts" : lang === "es" ? "Fuentes Personalizadas" : "Fontes Personalizadas",
    desc:
      lang === "en"
        ? "Upload your own .woff2, .woff, .ttf or .otf files to use across your site."
        : lang === "es"
          ? "Sube tus propios archivos .woff2, .woff, .ttf o .otf para usar en tu sitio."
          : "Envie seus próprios arquivos .woff2, .woff, .ttf ou .otf para usar no site.",
    upload: lang === "en" ? "Upload font" : lang === "es" ? "Subir fuente" : "Enviar fonte",
    uploading: lang === "en" ? "Uploading…" : lang === "es" ? "Subiendo…" : "Enviando…",
    empty:
      lang === "en"
        ? "No custom fonts yet."
        : lang === "es"
          ? "Aún no hay fuentes personalizadas."
          : "Nenhuma fonte personalizada ainda.",
    deleted: lang === "en" ? "Font removed" : lang === "es" ? "Fuente eliminada" : "Fonte removida",
    failed: lang === "en" ? "Upload failed" : lang === "es" ? "Error al subir" : "Falha no envio",
    invalid:
      lang === "en"
        ? "Unsupported file type. Use .woff2, .woff, .ttf or .otf."
        : lang === "es"
          ? "Tipo de archivo no admitido. Usa .woff2, .woff, .ttf o .otf."
          : "Tipo de arquivo não suportado. Use .woff2, .woff, .ttf ou .otf.",
    needPh:
      lang === "en"
        ? "Sign in to upload fonts."
        : lang === "es"
          ? "Inicia sesión para subir fuentes."
          : "Faça login para enviar fontes.",
  };

  const handlePickFile = async (file: File) => {
    if (!photographerId) {
      toast.error(t.needPh);
      return;
    }
    const fmt = FONT_MIME_TO_FORMAT[file.type] || inferFormatFromName(file.name);
    if (!fmt) {
      toast.error(t.invalid);
      return;
    }
    setUploading(true);
    try {
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const slug = slugify(baseName);
      const path = `${photographerId}/fonts/${Date.now()}-${slug}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      const url = pub.publicUrl;
      const id = `custom-${slug}-${Date.now().toString(36)}`;
      const next: CustomFontEntry[] = [
        ...customFonts,
        { id, label: baseName, url, format: fmt },
      ];
      onChange(next);
    } catch (err: unknown) {
      console.error("Custom font upload failed", err);
      toast.error(t.failed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = (id: string) => {
    onChange(customFonts.filter((f) => f.id !== id));
    toast.success(t.deleted);
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-medium text-foreground">{t.title}</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
        </div>
      </div>

      {customFonts.length === 0 ? (
        <div className="text-[11px] text-muted-foreground py-3 text-center border border-dashed border-border">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-px border border-border">
          {customFonts.map((f) => {
            const previewText =
              lang === "en"
                ? "The quick brown fox jumps over the lazy dog"
                : lang === "es"
                  ? "El veloz murciélago hindú comía feliz cardillo y kiwi"
                  : "A rápida raposa marrom salta sobre o cão preguiçoso";
            return (
              <div
                key={f.id}
                className="flex items-start justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                    {f.label}
                  </div>
                  <div
                    className="text-base text-foreground truncate mt-0.5"
                    style={{ fontFamily: `'${f.id}', sans-serif` }}
                  >
                    {previewText}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(f.id)}
                  className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity mt-1"
                  aria-label="Remove font"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePickFile(file);
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full h-8 text-[11px] gap-2 border border-dashed border-border"
      >
        {uploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.uploading}
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" />
            {t.upload}
          </>
        )}
      </Button>
    </div>
  );
}

// ── Custom Font CSS (Typekit / Adobe Fonts / @import / @font-face) ─────────
function CustomFontCssSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { lang } = useLanguage();
  const [local, setLocal] = useState(value);

  // keep local in sync if parent changes
  if (local !== value && document.activeElement?.tagName !== "TEXTAREA") {
    // best-effort sync without rerender storms
    setTimeout(() => setLocal(value), 0);
  }

  const t = {
    title:
      lang === "en"
        ? "Custom Font CSS"
        : lang === "es"
          ? "CSS de Fuentes Personalizado"
          : "CSS de Fontes Personalizado",
    desc:
      lang === "en"
        ? "Paste a Typekit/Adobe Fonts <link> tag, @import, or @font-face declarations to load external fonts."
        : lang === "es"
          ? "Pega una etiqueta <link> de Typekit/Adobe Fonts, @import o declaraciones @font-face para cargar fuentes externas."
          : "Cole uma tag <link> do Typekit/Adobe Fonts, @import ou declarações @font-face para carregar fontes externas.",
    save: lang === "en" ? "Save" : lang === "es" ? "Guardar" : "Salvar",
    clear: lang === "en" ? "Clear" : lang === "es" ? "Limpiar" : "Limpar",
  };

  const placeholder = `<link rel="stylesheet" href="https://use.typekit.net/btb3gmc.css">

/* or */
@import url("https://fonts.googleapis.com/css2?family=Lora&display=swap");

/* or */
@font-face {
  font-family: 'My Font';
  src: url('https://example.com/fonts/myfont.woff2') format('woff2');
}`;

  return (
    <div className="space-y-2 pt-3 border-t border-border">
      <div>
        <h4 className="text-xs font-medium text-foreground">{t.title}</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
      </div>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onChange(local);
        }}
        placeholder={placeholder}
        spellCheck={false}
        className={cn(
          "w-full h-32 px-3 py-2 text-[11px] font-mono",
          "bg-background border border-border text-foreground",
          "focus:outline-none focus:ring-1 focus:ring-foreground",
          "placeholder:text-muted-foreground/60 resize-y",
        )}
      />
      <div className="flex items-center justify-end gap-2">
        {value && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setLocal("");
              onChange("");
            }}
            className="h-7 text-[10px]"
          >
            {t.clear}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          disabled={local === value}
          onClick={() => onChange(local)}
          className="h-7 text-[10px]"
        >
          {t.save}
        </Button>
      </div>
    </div>
  );
}
