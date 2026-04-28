import { useMemo, useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * Color picker that surfaces the **active site palette** (read from CSS vars
 * injected by useSiteColors) plus a free hex input — replacing native
 * `<input type="color">` across the website editor so users stay on-brand.
 */

const SITE_TOKENS: { var: string; label: string }[] = [
  { var: "--site-bg", label: "Background" },
  { var: "--site-headings", label: "Headings" },
  { var: "--site-paragraphs", label: "Paragraphs" },
  { var: "--site-lines", label: "Lines" },
  { var: "--site-secondary-bg", label: "Secondary BG" },
  { var: "--site-secondary-headings", label: "Secondary H" },
  { var: "--site-button-bg", label: "Button BG" },
  { var: "--site-button-text", label: "Button Text" },
];

const NEUTRALS = ["#000000", "#1a1a1a", "#444444", "#888888", "#cccccc", "#f5f5f5", "#ffffff", "transparent"];

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

export function SitePalettePicker({
  value,
  onChange,
  className,
  allowTransparent = false,
  disabled = false,
}: SitePalettePickerProps) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value || "#000000");

  useEffect(() => {
    setHex(value || "#000000");
  }, [value]);

  // Read live palette tokens whenever the popover opens.
  const paletteSwatches = useMemo(() => {
    if (!open) return [];
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    return SITE_TOKENS.map((t) => {
      const raw = styles.getPropertyValue(t.var).trim();
      if (!raw) return null;
      return { ...t, raw, hex: resolveCssColor(raw) };
    }).filter(Boolean) as { var: string; label: string; raw: string; hex: string }[];
  }, [open]);

  const apply = (v: string) => {
    onChange(v);
    setHex(v);
  };

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
        {/* Site palette */}
        {paletteSwatches.length > 0 && (
          <div className="space-y-1.5 mb-3">
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

        {/* Neutrals */}
        <div className="space-y-1.5 mb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Neutrals
          </p>
          <div className="grid grid-cols-8 gap-1.5">
            {NEUTRALS.map((n) => {
              if (n === "transparent" && !allowTransparent) return null;
              const active = hex.toLowerCase() === n.toLowerCase();
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => apply(n)}
                  title={n}
                  className={cn(
                    "h-6 w-6 rounded border transition-all",
                    active ? "ring-2 ring-foreground ring-offset-1" : "border-border hover:scale-110",
                  )}
                  style={{
                    background:
                      n === "transparent"
                        ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 6px 6px"
                        : n,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Custom hex */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Custom
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={hex.startsWith("#") ? hex : "#000000"}
              onChange={(e) => apply(e.target.value)}
              className="h-8 w-8 rounded border border-border cursor-pointer p-0"
            />
            <input
              type="text"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              onBlur={() => apply(hex)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply(hex);
                  setOpen(false);
                }
              }}
              placeholder="#000000"
              className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs font-mono"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
