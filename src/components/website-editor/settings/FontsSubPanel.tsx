import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil } from "lucide-react";
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
import { FONT_PRESETS, getFontStack } from "@/components/website-editor/site-fonts";
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
  type TextTransform,
} from "@/components/website-editor/font-templates";

interface Props {
  templateId: string | null | undefined;
  overrides: FontOverrides | null | undefined;
  fontSize: FontSizeScale | null | undefined;
  onTemplateChange: (templateId: string, template: FontTemplate) => void;
  onOverridesChange: (next: FontOverrides) => void;
  onFontSizeChange: (size: FontSizeScale) => void;
}

type View = "list" | "editor";
type GroupKey = (typeof ELEMENT_GROUPS)[number]["key"];

const TABS: { key: "all" | "serif" | "sans" | "combo"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "serif", label: "Serif" },
  { key: "sans", label: "Sans Serif" },
  { key: "combo", label: "Combo" },
];

export default function FontsSubPanel({
  templateId,
  overrides,
  fontSize,
  onTemplateChange,
  onOverridesChange,
  onFontSizeChange,
}: Props) {
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<"all" | "serif" | "sans" | "combo">("all");
  const [groupKey, setGroupKey] = useState<GroupKey | null>(null);
  const [expandedItem, setExpandedItem] = useState<ElementKey | null>(null);

  const activeId = templateId || DEFAULT_FONT_TEMPLATE_ID;
  const activeTemplate = getFontTemplate(activeId);
  const ov = overrides ?? {};
  const scale = FONT_SIZE_SCALES[fontSize ?? "regular"] ?? 1;

  const filtered = useMemo(() => {
    if (tab === "all") return FONT_TEMPLATES;
    return FONT_TEMPLATES.filter((f) => f.category === tab);
  }, [tab]);

  // ── Font Template Editor ─────────────────────────────────────────────────
  if (view === "editor") {
    const group = ELEMENT_GROUPS.find((g) => g.key === groupKey);
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            if (group) {
              setGroupKey(null);
              setExpandedItem(null);
            } else {
              setView("list");
            }
          }}
          className="flex items-center gap-2 text-xs font-light tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {!group ? (
          <>
            <h3 className="text-sm font-medium text-foreground">Edit Font Template</h3>
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
          </>
        ) : (
          <>
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
                    {/* Live preview */}
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
                      }}
                    >
                      Share your story
                    </div>
                    {expanded && (
                      <ElementEditor
                        elementKey={item.key}
                        overrides={ov}
                        templateId={activeId}
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
          </>
        )}
      </div>
    );
  }

  // ── Template list ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">Fonts</h3>
        <p className="text-[11px] text-muted-foreground">
          Pick a typography template, adjust the global size, or fine-tune each element.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={cn(
              "text-[11px] tracking-widest uppercase font-light pb-2 -mb-px border-b-2 transition-colors",
              tab === tb.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div className="space-y-3">
        {filtered.map((tpl) => {
          const headingStack = getFontStack(tpl.heading);
          const bodyStack = getFontStack(tpl.body);
          const isActive = tpl.id === activeId;
          return (
            <div
              key={tpl.id}
              className={cn(
                "border transition-colors cursor-pointer overflow-hidden",
                isActive ? "border-foreground" : "border-border hover:border-foreground/40",
              )}
              onClick={() => onTemplateChange(tpl.id, tpl)}
            >
              <div className="px-4 pt-4 pb-3 space-y-1.5">
                <div
                  className="text-2xl text-foreground leading-tight"
                  style={{ fontFamily: headingStack }}
                >
                  {tpl.label}
                </div>
                <div
                  className="text-xs text-muted-foreground leading-relaxed"
                  style={{ fontFamily: bodyStack }}
                >
                  This is example text that shows the look and feel of the font.
                </div>
              </div>
              {isActive && (
                <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-muted/20">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Font Size:</span>
                    <Select
                      value={fontSize ?? "regular"}
                      onValueChange={(v) => onFontSizeChange(v as FontSizeScale)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-[11px] border-none bg-transparent focus:ring-0 px-1" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setView("editor");
                      setGroupKey(null);
                    }}
                    className="flex items-center gap-1 text-[11px] tracking-widest uppercase font-light text-foreground hover:opacity-70"
                  >
                    Edit <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Per-element editor (font family/weight/style/size/etc.) ────────────────
interface ElementEditorProps {
  elementKey: ElementKey;
  templateId: string;
  overrides: FontOverrides;
  onChange: (patch: Partial<{ fontFamily: string; weight: number; style: FontStyle; fontSize: number; lineHeight: number; letterSpacing: number; textTransform: TextTransform }>) => void;
  onReset: () => void;
}

function ElementEditor({ elementKey, templateId, overrides, onChange, onReset }: ElementEditorProps) {
  const eff = resolveElement(templateId, overrides, elementKey, 1);
  const hasOverride = Boolean(overrides[elementKey] && Object.keys(overrides[elementKey]!).length > 0);

  return (
    <div className="space-y-3 pb-4">
      <Row label="Font Family">
        <Select value={eff.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[60] max-h-72">
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
        <Select value={eff.style} onValueChange={(v) => onChange({ style: v as FontStyle })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[60]">
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="italic">Italic</SelectItem>
          </SelectContent>
        </Select>
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
