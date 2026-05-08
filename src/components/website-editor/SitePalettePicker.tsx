import { useMemo, useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * Color picker that surfaces the **active site palette** (read from CSS vars
 * injected by useSiteColors) plus a free hex input — replacing native
 * `<input type="color">` across the website editor so users stay on-brand.
 */

/** Preset color rows shown when the user expands "Custom (HEX)". */
const PRESET_ROWS: string[][] = [
  ["transparent", "#ffffff", "#f5f5f0", "#e8e6e1", "#c9c7c2", "#6b7a8a", "#1f1f1f", "#000000"],
  ["#1a1a1a", "#e8d8c8", "#d9c4a8", "#c9a87c", "#bda489", "#e8c4c4", "#d4c4d4", "#b8c4b0"],
  ["#7a8a5a", "#7a9a6a", "#a89a8a", "#8a9aaa", "#8a8a8a", "#5a6a7a", "#c4b8d0", "#a8b4a8"],
  ["#5a3a8a", "#c47a5a", "#d4a878", "#a88858", "#8a6a4a", "#5a3a2a", "#3a2a1a", "#2a1a0a"],
];

const SITE_TOKENS: { var: string; label: string }[] = [
  { var: "--site-bg", label: "Background" },
  { var: "--site-headings", label: "Headings" },
  { var: "--site-paragraphs", label: "Paragraphs" },
  { var: "--site-lines", label: "Lines" },
  { var: "--site-secondary-bg", label: "Secondary BG" },
  { var: "--site-secondary-headings", label: "Secondary H" },
  { var: "--site-secondary-paragraphs", label: "Secondary P" },
  { var: "--site-secondary-lines", label: "Secondary Lines" },
  { var: "--site-button-bg", label: "Button BG" },
  { var: "--site-button-text", label: "Button Text" },
  { var: "--site-button-bg-hover", label: "Button BG Hover" },
  { var: "--site-button-text-hover", label: "Button Text Hover" },
];



/** Resolve a CSS color string (hex, rgb, rgba, hsl, color()) to #rrggbb. */
function resolveCssColor(value: string): string {
  if (!value) return "#000000";
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) return value;
  // Use a hidden div to let the browser parse anything (var(), hsl(), rgb(), etc).
  try {
    const probe = document.createElement("div");
    probe.style.color = value;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    const m = rgb.match(/rgba?\(([^)]+)\)/);
    if (!m) return "#000000";
    const [r, g, b] = m[1].split(",").map((s) => parseInt(s.trim(), 10));
    return (
      "#" +
      [r, g, b]
        .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return "#000000";
  }
}

interface SitePalettePickerProps {
  value: string;
  onChange: (hex: string) => void;
  /** Optional trigger override. By default a swatch button is rendered. */
  className?: string;
  /** Allow selecting "transparent". Defaults to false. */
  allowTransparent?: boolean;
  /** Disable the trigger button. */
  disabled?: boolean;
}

interface SitePaletteColorOptionsProps {
  value: string;
  onChange: (hex: string) => void;
  allowTransparent?: boolean;
  onCommit?: () => void;
}

export function SitePaletteColorOptions({
  value,
  onChange,
  allowTransparent = false,
  onCommit,
}: SitePaletteColorOptionsProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [hex, setHex] = useState(value || "#000000");

  useEffect(() => {
    setHex(value || "#000000");
  }, [value]);

  const paletteSwatches = useMemo(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    return SITE_TOKENS.map((t) => {
      const raw = styles.getPropertyValue(t.var).trim();
      if (!raw) return null;
      return { ...t, raw, hex: resolveCssColor(raw) };
    }).filter(Boolean) as { var: string; label: string; raw: string; hex: string }[];
  }, []);

  const apply = (v: string) => {
    onChange(v);
    setHex(v);
  };

  return (
    <div className="space-y-3">
      {paletteSwatches.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Site palette
          </p>
          <div className="grid grid-cols-8 gap-1.5">
            {paletteSwatches.map((sw) => {
              const active = hex.toLowerCase() === sw.hex.toLowerCase();
              return (
                <button
                  key={sw.var}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => apply(sw.hex)}
                  title={`${sw.label} · ${sw.hex}`}
                  className={cn(
                    "h-6 w-6 rounded border transition-all relative",
                    active ? "ring-2 ring-foreground ring-offset-1" : "border-border hover:scale-110",
                  )}
                  style={{ background: sw.hex }}
                >
                  {active && (
                    <Check className="h-3 w-3 absolute inset-0 m-auto" style={{ color: hex === "#ffffff" || hex === "#fff" ? "#000" : "#fff" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {allowTransparent && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Transparent
          </p>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply("transparent")}
            title="transparent"
            className={cn(
              "h-6 w-6 rounded border transition-all",
              hex === "transparent" ? "ring-2 ring-foreground ring-offset-1" : "border-border hover:scale-110",
            )}
            style={{ background: "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 6px 6px" }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowCustom((v) => !v)}
          className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium hover:text-foreground transition-colors flex items-center gap-1"
        >
          Custom (HEX)
          <span className="text-[8px]">{showCustom ? "▲" : "▼"}</span>
        </button>
        {showCustom && (
          <>
            <div className="space-y-1 mb-2">
              {PRESET_ROWS.map((row, ri) => (
                <div key={ri} className="grid grid-cols-8 gap-1">
                  {row.map((c, ci) => {
                    const isTransparent = c === "transparent";
                    const active = hex.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={`${ri}-${ci}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => apply(c)}
                        title={c}
                        className={cn(
                          "h-6 w-6 rounded border transition-all",
                          active ? "ring-2 ring-foreground ring-offset-1" : "border-border hover:scale-110",
                        )}
                        style={{
                          background: isTransparent
                            ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 6px 6px"
                            : c,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={hex.startsWith("#") ? hex : "#000000"}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => apply(e.target.value)}
                className="h-8 w-8 rounded border border-border cursor-pointer p-0"
              />
              <input
                type="text"
                value={hex}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setHex(e.target.value)}
                onBlur={() => apply(hex)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    apply(hex);
                    onCommit?.();
                  }
                }}
                placeholder="#000000"
                className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs font-mono"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SitePalettePicker({
  value,
  onChange,
  className,
  allowTransparent = false,
  disabled = false,
}: SitePalettePickerProps) {
  const [open, setOpen] = useState(false);

  const swatchBg = !value || value === "transparent"
    ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 8px 8px"
    : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "h-8 w-8 rounded-md border border-border shadow-sm transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          )}
          style={{ background: swatchBg }}
          aria-label="Pick color"
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-64 p-3 z-[60]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SitePaletteColorOptions
          value={value}
          onChange={onChange}
          allowTransparent={allowTransparent}
          onCommit={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
