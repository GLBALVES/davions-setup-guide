import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Filter, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  COLOR_PALETTES,
  DEFAULT_PALETTE_ID,
  DEFAULT_SCHEME_ID,
  SCHEME_FIELD_GROUPS,
  SCHEME_LABELS,
  SCHEME_ORDER,
  getPalette,
  resolveScheme,
  type ColorOverrides,
  type ColorPalette,
  type ColorScheme,
  type CustomColorPalette,
  type SchemeId,
} from "@/components/website-editor/color-palettes";

interface Props {
  paletteId: string | null | undefined;
  schemeId: SchemeId | null | undefined;
  overrides: ColorOverrides | null | undefined;
  customPalettes: CustomColorPalette[] | null | undefined;
  onPaletteChange: (paletteId: string, schemeId: SchemeId) => void;
  onSchemeChange: (schemeId: SchemeId) => void;
  onOverridesChange: (next: ColorOverrides) => void;
  onCustomPalettesChange: (next: CustomColorPalette[]) => void;
}

type View = "list" | "editScheme";
type Tab = "preset" | "custom";

export default function ColorsSubPanel({
  paletteId,
  schemeId,
  overrides,
  customPalettes,
  onPaletteChange,
  onSchemeChange,
  onOverridesChange,
  onCustomPalettesChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("preset");
  const [view, setView] = useState<View>("list");
  const [expandedPaletteId, setExpandedPaletteId] = useState<string | null>(null);
  const [editingScheme, setEditingScheme] = useState<{ paletteId: string; schemeId: SchemeId } | null>(null);

  const activePaletteId = paletteId || DEFAULT_PALETTE_ID;
  const activeSchemeId = (schemeId || DEFAULT_SCHEME_ID) as SchemeId;
  const ov = overrides ?? {};
  const customs = customPalettes ?? [];

  const visiblePalettes = useMemo<ColorPalette[]>(
    () => (tab === "preset" ? COLOR_PALETTES : customs),
    [tab, customs],
  );

  // ── Edit Scheme view ─────────────────────────────────────────────────────
  if (view === "editScheme" && editingScheme) {
    const palette = getPalette(editingScheme.paletteId, customs);
    const schemeKey = `${editingScheme.paletteId}::${editingScheme.schemeId}`;
    const eff = resolveScheme(editingScheme.paletteId, editingScheme.schemeId, ov, customs);
    const isCustom = customs.some((p) => p.id === palette.id);

    const updateField = (field: keyof ColorScheme, value: string) => {
      if (isCustom) {
        // Edit the custom palette directly.
        const next = customs.map((p) => {
          if (p.id !== palette.id) return p;
          return {
            ...p,
            schemes: {
              ...p.schemes,
              [editingScheme.schemeId]: { ...p.schemes[editingScheme.schemeId], [field]: value },
            },
          };
        });
        onCustomPalettesChange(next);
      } else {
        // Preset → store in overrides.
        const current = ov[schemeKey] ?? {};
        onOverridesChange({ ...ov, [schemeKey]: { ...current, [field]: value } });
      }
    };

    const resetField = (field: keyof ColorScheme) => {
      if (isCustom) return; // Custom has no "default" to reset to.
      const current = { ...(ov[schemeKey] ?? {}) };
      delete current[field];
      const next = { ...ov };
      if (Object.keys(current).length === 0) delete next[schemeKey];
      else next[schemeKey] = current;
      onOverridesChange(next);
    };

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setView("list");
            setEditingScheme(null);
          }}
          className="flex items-center gap-2 text-xs font-light tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div>
          <h3 className="text-base font-medium text-foreground">Edit Scheme</h3>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] tracking-widest uppercase font-light text-muted-foreground">
            Color Scheme
          </p>
          <Select
            value={editingScheme.schemeId}
            onValueChange={(v) => setEditingScheme({ ...editingScheme, schemeId: v as SchemeId })}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              {SCHEME_ORDER.map((sk) => (
                <SelectItem key={sk} value={sk}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm border border-border"
                      style={{ backgroundColor: palette.schemes[sk].background }}
                    />
                    {SCHEME_LABELS[sk]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {SCHEME_FIELD_GROUPS.map((group) => (
          <div key={group.group} className="space-y-2 pt-2">
            <p className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">
              {group.group}
            </p>
            <div className="border border-border">
              {group.fields.map((f, idx) => {
                const value = eff[f.key] as string;
                const isOverridden = !isCustom && Boolean(ov[schemeKey]?.[f.key]);
                return (
                  <div
                    key={f.key}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 group",
                      idx !== group.fields.length - 1 && "border-b border-border",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-foreground truncate">{f.label}</span>
                      {isOverridden && (
                        <button
                          type="button"
                          onClick={() => resetField(f.key)}
                          className="text-[9px] tracking-widest uppercase text-muted-foreground hover:text-foreground"
                          title="Reset to template default"
                        >
                          reset
                        </button>
                      )}
                    </div>
                    <ColorDot value={value} onChange={(v) => updateField(f.key, v)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-foreground">Colors</h3>
        {tab === "custom" ? (
          <button
            type="button"
            onClick={() => {
              const palette = createBlankCustomPalette(customs.length + 1);
              onCustomPalettesChange([...customs, palette]);
              onPaletteChange(palette.id, activeSchemeId);
              setExpandedPaletteId(palette.id);
            }}
            className="inline-flex items-center gap-1 text-[12px] text-primary hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" /> Add Palette
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] text-primary hover:opacity-80"
            title="Filter (coming soon)"
          >
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-border">
        {(["preset", "custom"] as Tab[]).map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={cn(
              "py-2 text-sm font-light tracking-wide capitalize -mb-px border-b-2 transition-colors",
              tab === tb
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tb}
          </button>
        ))}
      </div>

      {/* Palettes list */}
      <div className="space-y-3">
        {visiblePalettes.length === 0 && tab === "custom" && (
          <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border">
            No custom palettes yet. Click <strong>Add Palette</strong> to create one.
          </p>
        )}

        {visiblePalettes.map((tpl) => {
          const isActive = tpl.id === activePaletteId;
          const expanded = expandedPaletteId === tpl.id;
          const isCustom = tab === "custom";
          return (
            <div
              key={tpl.id}
              className={cn(
                "border transition-colors overflow-hidden",
                isActive ? "border-foreground" : "border-border hover:border-foreground/40",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  onPaletteChange(tpl.id, activeSchemeId);
                  setExpandedPaletteId(expanded ? null : tpl.id);
                }}
                className="w-full text-left px-4 py-3.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  {tpl.swatches.map((sw, i) => (
                    <span
                      key={i}
                      className="inline-block h-7 w-7 rounded-full border border-border/60"
                      style={{ backgroundColor: sw }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{tpl.label}</span>
                  {isCustom ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <span className="p-1 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[60]">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = window.prompt("Rename palette", tpl.label);
                            if (!newName) return;
                            onCustomPalettesChange(
                              customs.map((p) => (p.id === tpl.id ? { ...p, label: newName } : p)),
                            );
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!window.confirm(`Delete palette "${tpl.label}"?`)) return;
                            onCustomPalettesChange(customs.filter((p) => p.id !== tpl.id));
                            if (activePaletteId === tpl.id) {
                              onPaletteChange(DEFAULT_PALETTE_ID, activeSchemeId);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  )}
                </div>
              </button>

              {(expanded || (isCustom && isActive)) && (
                <div className="border-t border-border bg-muted/10">
                  <p className="px-4 pt-3 pb-2 text-[10px] tracking-widest uppercase font-light text-muted-foreground inline-flex items-center gap-1">
                    Color Schemes
                  </p>
                  <div className="space-y-px px-3 pb-3">
                    {SCHEME_ORDER.map((sk) => {
                      const sch = tpl.schemes[sk];
                      const isActiveScheme = isActive && sk === activeSchemeId;
                      return (
                        <button
                          key={sk}
                          type="button"
                          onClick={() => {
                            onPaletteChange(tpl.id, sk);
                            onSchemeChange(sk);
                          }}
                          onDoubleClick={() => {
                            setEditingScheme({ paletteId: tpl.id, schemeId: sk });
                            setView("editScheme");
                          }}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 px-3 py-2.5 border transition-colors",
                            isActiveScheme
                              ? "border-foreground"
                              : "border-transparent hover:border-border",
                          )}
                          style={{
                            backgroundColor: sch.background,
                            color: sch.headings,
                          }}
                        >
                          <span className="inline-flex items-center gap-2 text-xs">
                            <span
                              className="inline-block h-4 w-4 rounded-sm border border-current/20"
                              style={{ backgroundColor: sch.headings, opacity: 0.9 }}
                            />
                            <span style={{ fontFamily: "serif" }}>Aa</span>
                            <span>{SCHEME_LABELS[sk]}</span>
                          </span>
                          <span
                            className="text-[10px] tracking-widest uppercase opacity-60 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingScheme({ paletteId: tpl.id, schemeId: sk });
                              setView("editScheme");
                            }}
                          >
                            Edit
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function createBlankCustomPalette(seed: number): CustomColorPalette {
  const id = `custom-${Date.now().toString(36)}-${seed}`;
  const swatches: [string, string, string, string, string] = [
    "#ffffff",
    "#f5f5f5",
    "#d4d4d4",
    "#525252",
    "#0a0a0a",
  ];
  const blank = (bg: string, isDark = false): ColorScheme => ({
    background: bg,
    headings: isDark ? "#ffffff" : "#0a0a0a",
    paragraphs: isDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.62)",
    lines: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
    secondaryBackground: isDark ? "#1a1a1a" : "#f5f5f5",
    secondaryHeadings: isDark ? "#ffffff" : "#0a0a0a",
    secondaryParagraphs: isDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.62)",
    secondaryLines: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
    buttonBackground: isDark ? "#ffffff" : "#0a0a0a",
    buttonText: isDark ? "#0a0a0a" : "#ffffff",
    buttonBackgroundHover: isDark ? "#d4d4d4" : "#525252",
    buttonTextHover: isDark ? "#0a0a0a" : "#ffffff",
  });
  return {
    id,
    label: `Custom Palette ${seed}`,
    swatches,
    schemes: {
      light: blank("#ffffff"),
      lightAccent: blank("#f5f5f5"),
      accent: blank("#d4d4d4"),
      darkAccent: blank("#525252", true),
      dark: blank("#0a0a0a", true),
    },
  };
}

function ColorDot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // value may be hex or rgba. The native picker only accepts hex.
  const hex = useMemo(() => toHex(value), [value]);
  return (
    <div className="relative inline-flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-[120px] text-[11px] font-mono"
      />
      <label className="relative inline-block cursor-pointer">
        <span
          className="block h-7 w-7 rounded-full border border-border shadow-sm"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
}

function toHex(input: string): string {
  if (!input) return "#000000";
  if (input.startsWith("#")) {
    if (input.length === 4) {
      const [r, g, b] = input.slice(1).split("");
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return input.slice(0, 7);
  }
  // rgba/rgb → hex (drops alpha)
  const m = input.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
    const [r, g, b] = parts;
    return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("")}`;
  }
  return "#000000";
}
