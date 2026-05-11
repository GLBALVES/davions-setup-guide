import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  siteColors: string[];
  onSiteColorsChange: (next: string[]) => void;
}

const DEFAULT_NEW_COLOR = "#000000";

function normalizeHex(input: string): string | null {
  const v = input.trim().toLowerCase();
  if (!v) return null;
  // #rgb / #rgba / #rrggbb / #rrggbbaa
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(v)) return v;
  if (/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(v)) return `#${v}`;
  return null;
}

export default function ColorsSubPanel({ siteColors, onSiteColorsChange }: Props) {
  const { lang } = useLanguage();
  const colors = siteColors ?? [];

  const t = {
    title: lang === "en" ? "Site Colors" : lang === "es" ? "Colores del Sitio" : "Cores do Site",
    desc:
      lang === "en"
        ? "Build your site palette by adding the colors you want to use. Add or remove freely."
        : lang === "es"
          ? "Crea la paleta de tu sitio agregando los colores que quieras usar. Añade o elimina libremente."
          : "Monte a paleta do seu site adicionando as cores que deseja usar. Adicione ou remova à vontade.",
    add: lang === "en" ? "Add color" : lang === "es" ? "Agregar color" : "Adicionar cor",
    empty:
      lang === "en"
        ? "No colors yet. Add your first color to start building your palette."
        : lang === "es"
          ? "Aún no hay colores. Añade el primero para empezar tu paleta."
          : "Nenhuma cor ainda. Adicione a primeira cor para iniciar sua paleta.",
    invalid: lang === "en" ? "Invalid color" : lang === "es" ? "Color inválido" : "Cor inválida",
    duplicate: lang === "en" ? "Color already in palette" : lang === "es" ? "Color ya en la paleta" : "Cor já na paleta",
    removed: lang === "en" ? "Color removed" : lang === "es" ? "Color eliminado" : "Cor removida",
  };

  const handleAdd = () => {
    onSiteColorsChange([...colors, DEFAULT_NEW_COLOR]);
  };

  const handleChange = (index: number, raw: string) => {
    const next = [...colors];
    next[index] = raw;
    onSiteColorsChange(next);
  };

  const handleBlur = (index: number, raw: string) => {
    const norm = normalizeHex(raw);
    if (!norm) {
      toast.error(t.invalid);
      const reset = [...colors];
      reset[index] = DEFAULT_NEW_COLOR;
      onSiteColorsChange(reset);
      return;
    }
    if (colors.some((c, i) => i !== index && c.toLowerCase() === norm)) {
      toast.error(t.duplicate);
      const reset = colors.filter((_, i) => i !== index);
      onSiteColorsChange(reset);
      return;
    }
    if (norm !== raw) {
      const next = [...colors];
      next[index] = norm;
      onSiteColorsChange(next);
    }
  };

  const handleRemove = (index: number) => {
    onSiteColorsChange(colors.filter((_, i) => i !== index));
    toast.success(t.removed);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">{t.title}</h3>
        <p className="text-[11px] text-muted-foreground leading-snug">{t.desc}</p>
      </div>

      {colors.length === 0 ? (
        <div className="text-[11px] text-muted-foreground py-6 text-center border border-dashed border-border">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-px border border-border">
          {colors.map((color, index) => (
            <ColorRow
              key={index}
              color={color}
              onChange={(raw) => handleChange(index, raw)}
              onBlur={(raw) => handleBlur(index, raw)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={handleAdd}
        className="w-full h-9 text-[11px] gap-2 border border-dashed border-border"
      >
        <Plus className="h-3.5 w-3.5" />
        {t.add}
      </Button>
    </div>
  );
}

interface ColorRowProps {
  color: string;
  onChange: (raw: string) => void;
  onBlur: (raw: string) => void;
  onRemove: () => void;
}

function ColorRow({ color, onChange, onBlur, onRemove }: ColorRowProps) {
  const [local, setLocal] = useState(color);

  // Sync external changes (e.g. normalization on blur).
  if (local !== color && document.activeElement?.tagName !== "INPUT") {
    setTimeout(() => setLocal(color), 0);
  }

  const safeColor = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ? color : "#000000";

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0 group">
      <label className="relative h-7 w-7 shrink-0 border border-border cursor-pointer overflow-hidden">
        <span
          className="absolute inset-0"
          style={{ backgroundColor: safeColor }}
        />
        <input
          type="color"
          value={safeColor.length === 9 ? safeColor.slice(0, 7) : safeColor.length === 5 ? `#${safeColor.slice(1, 4)}` : safeColor}
          onChange={(e) => {
            setLocal(e.target.value);
            onChange(e.target.value);
          }}
          onBlur={(e) => onBlur(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Pick color"
        />
      </label>
      <input
        type="text"
        value={local}
        spellCheck={false}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        onBlur={(e) => onBlur(e.target.value)}
        className={cn(
          "flex-1 min-w-0 px-2 py-1 text-[11px] font-mono",
          "bg-background border border-border text-foreground",
          "focus:outline-none focus:ring-1 focus:ring-foreground",
        )}
      />
      <button
        type="button"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
        aria-label="Remove color"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
