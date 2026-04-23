import { useEffect, useMemo, useRef, useState } from "react";
import { Bold, Italic, Underline, Eraser, Type, Palette, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FONT_PRESETS } from "@/components/website-editor/site-fonts";

/**
 * Field that stores a value as HTML (for inline formatting like color/font/size)
 * but displays only the plain text in the input. Formatting controls live
 * directly below the field and apply to:
 *   - the current text selection inside the input, OR
 *   - the entire value when nothing is selected.
 *
 * Use anywhere we previously rendered <Input value={props.x} /> for editable
 * site copy. Single-line by default; pass `multiline` to render a textarea.
 */

const SIZE_PRESETS: { id: string; label: string; px: number }[] = [
  { id: "xs", label: "XS", px: 12 },
  { id: "sm", label: "S", px: 14 },
  { id: "md", label: "M", px: 16 },
  { id: "lg", label: "L", px: 20 },
  { id: "xl", label: "XL", px: 28 },
  { id: "2xl", label: "2XL", px: 40 },
];

const COLOR_SWATCHES = [
  "#000000", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#FFFFFF",
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4", "#3B82F6",
  "#8B5CF6", "#EC4899",
];

function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function htmlToPlain(s: string): string {
  if (!s) return "";
  if (!looksLikeHtml(s)) return s;
  const tpl = document.createElement("template");
  tpl.innerHTML = s;
  return tpl.content.textContent ?? "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Wrap a substring [start,end) of an HTML string with <span style="..."> */
function applyStyleToHtmlRange(
  html: string,
  plainStart: number,
  plainEnd: number,
  styleCss: string,
): string {
  const source = html || "";
  // If we have no html tags at all, just produce a fresh wrapped string.
  if (!looksLikeHtml(source)) {
    const before = escapeHtml(source.slice(0, plainStart));
    const middle = escapeHtml(source.slice(plainStart, plainEnd));
    const after = escapeHtml(source.slice(plainEnd));
    return `${before}<span style="${styleCss}">${middle}</span>${after}`;
  }
  // Walk the DOM, tracking plain-text indices, and wrap matching text nodes.
  const tpl = document.createElement("template");
  tpl.innerHTML = source;
  let cursor = 0;
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (cursor >= plainEnd) return;
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.nodeValue ?? "";
        const nodeStart = cursor;
        const nodeEnd = cursor + text.length;
        const overlapStart = Math.max(plainStart, nodeStart);
        const overlapEnd = Math.min(plainEnd, nodeEnd);
        if (overlapStart < overlapEnd) {
          const localStart = overlapStart - nodeStart;
          const localEnd = overlapEnd - nodeStart;
          const before = text.slice(0, localStart);
          const middle = text.slice(localStart, localEnd);
          const after = text.slice(localEnd);
          const span = document.createElement("span");
          span.setAttribute("style", styleCss);
          span.textContent = middle;
          const frag = document.createDocumentFragment();
          if (before) frag.appendChild(document.createTextNode(before));
          frag.appendChild(span);
          if (after) frag.appendChild(document.createTextNode(after));
          child.parentNode?.replaceChild(frag, child);
        }
        cursor = nodeEnd;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

/** Apply a tag (b/i/u) over a plain-text range using the same DOM-walk approach. */
function applyTagToHtmlRange(
  html: string,
  plainStart: number,
  plainEnd: number,
  tag: "b" | "i" | "u",
): string {
  const styleCss = tag === "b" ? "font-weight:bold" : tag === "i" ? "font-style:italic" : "text-decoration:underline";
  return applyStyleToHtmlRange(html, plainStart, plainEnd, styleCss);
}

export interface RichTextFieldProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
}

/** Inspect the HTML at plain index `plainStart` and return the inline styles
 *  applied by the closest ancestor span. Used to highlight the current
 *  font/color/size in the toolbar. */
function inspectStyleAt(html: string, plainStart: number) {
  const result: {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  } = {};
  if (!html) return result;
  const tpl = document.createElement("template");
  tpl.innerHTML = looksLikeHtml(html) ? html : escapeHtml(html);
  let cursor = 0;
  let done = false;
  const walk = (node: Node, ancestors: HTMLElement[]) => {
    if (done) return;
    for (const child of Array.from(node.childNodes)) {
      if (done) return;
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.nodeValue ?? "";
        const nodeEnd = cursor + text.length;
        if (plainStart >= cursor && plainStart <= nodeEnd) {
          for (let i = ancestors.length - 1; i >= 0; i--) {
            const a = ancestors[i];
            if (a.style.color && !result.color) result.color = a.style.color;
            if (a.style.fontFamily && !result.fontFamily) result.fontFamily = a.style.fontFamily;
            if (a.style.fontSize && !result.fontSize) result.fontSize = a.style.fontSize;
            const tag = a.tagName.toLowerCase();
            const fw = a.style.fontWeight;
            const fs = a.style.fontStyle;
            const td = a.style.textDecoration || a.style.textDecorationLine;
            if (!result.bold && (tag === "b" || tag === "strong" || fw === "bold" || (fw && Number(fw) >= 600))) result.bold = true;
            if (!result.italic && (tag === "i" || tag === "em" || fs === "italic")) result.italic = true;
            if (!result.underline && (tag === "u" || (td && td.includes("underline")))) result.underline = true;
          }
          done = true;
        }
        cursor = nodeEnd;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child, [...ancestors, child as HTMLElement]);
      }
    }
  };
  walk(tpl.content, []);
  return result;
}

/** Remove a formatting tag/style across a plain-text range. Walks the DOM and
 *  unwraps spans/tags whose text overlaps the range and that match the format. */
function removeFormatFromHtmlRange(
  html: string,
  plainStart: number,
  plainEnd: number,
  format: "b" | "i" | "u",
): string {
  const source = html || "";
  if (!looksLikeHtml(source)) return source;
  const tpl = document.createElement("template");
  tpl.innerHTML = source;

  const matches = (el: HTMLElement): boolean => {
    const tag = el.tagName.toLowerCase();
    if (format === "b") {
      if (tag === "b" || tag === "strong") return true;
      const fw = el.style.fontWeight;
      return fw === "bold" || (!!fw && Number(fw) >= 600);
    }
    if (format === "i") {
      if (tag === "i" || tag === "em") return true;
      return el.style.fontStyle === "italic";
    }
    // underline
    if (tag === "u") return true;
    const td = el.style.textDecoration || el.style.textDecorationLine;
    return !!td && td.includes("underline");
  };

  const stripStyle = (el: HTMLElement) => {
    if (format === "b") {
      el.style.removeProperty("font-weight");
    } else if (format === "i") {
      el.style.removeProperty("font-style");
    } else {
      el.style.removeProperty("text-decoration");
      el.style.removeProperty("text-decoration-line");
    }
  };

  // Compute plain-text indices of every element so we know which intersect.
  let cursor = 0;
  const ranges = new Map<HTMLElement, { start: number; end: number }>();
  const measure = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        cursor += (child.nodeValue ?? "").length;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const start = cursor;
        measure(el);
        ranges.set(el, { start, end: cursor });
      }
    }
  };
  measure(tpl.content);

  const targets: HTMLElement[] = [];
  ranges.forEach((r, el) => {
    if (r.start < plainEnd && r.end > plainStart && matches(el)) targets.push(el);
  });

  for (const el of targets) {
    const r = ranges.get(el)!;
    const fullyInside = r.start >= plainStart && r.end <= plainEnd;
    if (fullyInside) {
      // Unwrap (or strip) the entire element.
      const tag = el.tagName.toLowerCase();
      const isFormatTag =
        (format === "b" && (tag === "b" || tag === "strong")) ||
        (format === "i" && (tag === "i" || tag === "em")) ||
        (format === "u" && tag === "u");
      if (isFormatTag && el.getAttribute("style")) {
        // Convert to span keeping other styles.
        const span = document.createElement("span");
        span.setAttribute("style", el.getAttribute("style") || "");
        while (el.firstChild) span.appendChild(el.firstChild);
        el.parentNode?.replaceChild(span, el);
      } else if (isFormatTag) {
        // Pure tag — unwrap children.
        const frag = document.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        el.parentNode?.replaceChild(frag, el);
      } else {
        stripStyle(el);
        if (!el.getAttribute("style") && el.tagName.toLowerCase() === "span") {
          const frag = document.createDocumentFragment();
          while (el.firstChild) frag.appendChild(el.firstChild);
          el.parentNode?.replaceChild(frag, el);
        }
      }
    } else {
      // Partial overlap: split text content. Simplest approach — wrap the
      // non-overlapping portions back with the same format after stripping.
      const text = el.textContent ?? "";
      const localStart = Math.max(0, plainStart - r.start);
      const localEnd = Math.min(text.length, plainEnd - r.start);
      const before = text.slice(0, localStart);
      const after = text.slice(localEnd);
      const middle = text.slice(localStart, localEnd);
      const styleCss =
        format === "b" ? "font-weight:bold" : format === "i" ? "font-style:italic" : "text-decoration:underline";
      const frag = document.createDocumentFragment();
      const mkWrap = (s: string) => {
        if (!s) return null;
        const span = document.createElement("span");
        span.setAttribute("style", styleCss);
        // Preserve element's other inline styles.
        const otherStyle = el.getAttribute("style") || "";
        if (otherStyle) span.setAttribute("style", `${otherStyle};${styleCss}`);
        span.textContent = s;
        return span;
      };
      const beforeNode = mkWrap(before);
      const afterNode = mkWrap(after);
      if (beforeNode) frag.appendChild(beforeNode);
      if (middle) frag.appendChild(document.createTextNode(middle));
      if (afterNode) frag.appendChild(afterNode);
      el.parentNode?.replaceChild(frag, el);
    }
  }

  return tpl.innerHTML;
}

/** Parse a CSS color (named/hex/rgb) to a normalized #rrggbb hex. */
function normalizeColor(c?: string): string | undefined {
  if (!c || typeof document === "undefined") return undefined;
  const probe = document.createElement("div");
  probe.style.color = c;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return c;
  const [r, g, b] = [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0"));
  return `#${r}${g}${b}`.toUpperCase();
}

export function RichTextField({
  value,
  onChange,
  placeholder,
  multiline = false,
  className,
  inputClassName,
}: RichTextFieldProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [showColor, setShowColor] = useState(false);
  const [showFont, setShowFont] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  const plainValue = useMemo(() => htmlToPlain(value || ""), [value]);

  const captureSelection = () => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    setSelection({ start, end });
  };

  const onPlainChange = (nextPlain: string) => {
    if (nextPlain === plainValue) return;
    onChange(nextPlain);
  };

  // Determine the effective range to apply formatting to.
  const getRange = (): { start: number; end: number } => {
    const el = inputRef.current;
    const len = plainValue.length;
    if (el && document.activeElement === el) {
      const s = el.selectionStart ?? 0;
      const e = el.selectionEnd ?? 0;
      if (s !== e) return { start: s, end: e };
    }
    if (selection && selection.start !== selection.end) return selection;
    return { start: 0, end: len };
  };

  // Active style at the current effective range start (visual highlight).
  const activeStyle = useMemo(() => {
    const { start } = getRange();
    return inspectStyleAt(value || "", start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selection, plainValue]);

  const activeColorHex = useMemo(() => normalizeColor(activeStyle.color), [activeStyle.color]);
  const activeFontStack = activeStyle.fontFamily;
  const activeFontPreset = useMemo(
    () =>
      activeFontStack
        ? FONT_PRESETS.find(
            (f) =>
              f.stack.replace(/\s|"|'/g, "").toLowerCase() ===
              activeFontStack.replace(/\s|"|'/g, "").toLowerCase(),
          )
        : undefined,
    [activeFontStack],
  );
  const activeFontSizePx = useMemo(() => {
    if (!activeStyle.fontSize) return undefined;
    const m = activeStyle.fontSize.match(/(\d+(?:\.\d+)?)px/);
    return m ? Number(m[1]) : undefined;
  }, [activeStyle.fontSize]);

  const apply = (styleCss: string) => {
    const { start, end } = getRange();
    if (start === end) return;
    const next = applyStyleToHtmlRange(value || plainValue, start, end, styleCss);
    onChange(next);
  };

  const applyTag = (tag: "b" | "i" | "u") => {
    const { start, end } = getRange();
    if (start === end) return;
    const isActive = tag === "b" ? !!activeStyle.bold : tag === "i" ? !!activeStyle.italic : !!activeStyle.underline;
    const next = isActive
      ? removeFormatFromHtmlRange(value || plainValue, start, end, tag)
      : applyTagToHtmlRange(value || plainValue, start, end, tag);
    onChange(next);
  };

  const clearFormatting = () => {
    onChange(plainValue);
  };

  const closeAllPopovers = () => {
    setShowColor(false);
    setShowFont(false);
    setShowSize(false);
  };

  const onApplyColor = (color: string) => {
    apply(`color:${color}`);
    closeAllPopovers();
  };
  const onApplyFont = (stack: string) => {
    apply(`font-family:${stack}`);
    closeAllPopovers();
  };
  const onApplySize = (px: number) => {
    apply(`font-size:${px}px;line-height:1.2`);
    closeAllPopovers();
  };

  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) closeAllPopovers();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const commonInputProps = {
    value: plainValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onPlainChange(e.target.value),
    onSelect: captureSelection,
    onKeyUp: captureSelection,
    onMouseUp: captureSelection,
    onBlur: captureSelection,
    placeholder,
  };

  return (
    <div ref={wrapRef} className={cn("space-y-1.5", className)}>
      {multiline ? (
        <textarea
          {...commonInputProps}
          ref={(el) => (inputRef.current = el)}
          className={cn(
            "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]",
            inputClassName,
          )}
        />
      ) : (
        <input
          {...commonInputProps}
          ref={(el) => (inputRef.current = el)}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName,
          )}
        />
      )}

      {/* Format toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap rounded-md border border-border bg-muted/30 p-1">
        <ToolbarButton title="Bold" onClick={() => applyTag("b")} active={!!activeStyle.bold}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => applyTag("i")} active={!!activeStyle.italic}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => applyTag("u")} active={!!activeStyle.underline}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Font family */}
        <div className="relative">
          <ToolbarButton
            title={activeFontPreset ? `Font: ${activeFontPreset.label}` : "Font family"}
            active={showFont}
            onClick={() => {
              setShowFont((v) => !v);
              setShowColor(false);
              setShowSize(false);
            }}
          >
            <Type className="h-3.5 w-3.5" />
            <span
              className="hidden sm:inline max-w-[60px] truncate text-[10px] text-muted-foreground"
              style={activeFontStack ? { fontFamily: activeFontStack } : undefined}
            >
              {activeFontPreset?.label ?? "Default"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </ToolbarButton>
          {showFont && (
            <div className="absolute z-20 top-full mt-1 right-0 bg-background border border-border rounded-md shadow-lg py-1 min-w-[180px] max-h-[260px] overflow-y-auto">
              {FONT_PRESETS.map((f) => {
                const isActive = activeFontPreset?.id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onApplyFont(f.stack);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 hover:bg-muted text-foreground text-xs flex items-center justify-between",
                      isActive && "bg-muted font-medium",
                    )}
                    style={{ fontFamily: f.stack }}
                  >
                    <span>{f.label}</span>
                    {isActive && <span className="text-primary text-[10px]">●</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Font size */}
        <div className="relative">
          <ToolbarButton
            title={activeFontSizePx ? `Size: ${activeFontSizePx}px` : "Font size"}
            active={showSize}
            onClick={() => {
              setShowSize((v) => !v);
              setShowColor(false);
              setShowFont(false);
            }}
          >
            <span className="font-medium text-[11px]">Aa</span>
            <span className="hidden sm:inline text-[10px] text-muted-foreground">
              {activeFontSizePx ? `${activeFontSizePx}` : "—"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </ToolbarButton>
          {showSize && (
            <div className="absolute z-20 top-full mt-1 right-0 bg-background border border-border rounded-md shadow-lg p-2 min-w-[180px]">
              <div className="grid grid-cols-3 gap-1 mb-2">
                {SIZE_PRESETS.map((s) => {
                  const isActive = activeFontSizePx === s.px;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onApplySize(s.px);
                      }}
                      className={cn(
                        "px-2 py-1 hover:bg-muted rounded text-foreground border text-center text-xs",
                        isActive ? "border-primary bg-primary/10 font-medium" : "border-border",
                      )}
                      title={`${s.px}px`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={8}
                  max={200}
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder={activeFontSizePx ? String(activeFontSizePx) : "px"}
                  className="w-full px-2 py-1 border border-border rounded bg-background text-foreground text-xs"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const n = parseInt(customSize, 10);
                    if (!Number.isNaN(n) && n >= 8 && n <= 200) onApplySize(n);
                  }}
                  className="px-2 py-1 hover:bg-muted rounded text-foreground border border-border text-xs"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Color */}
        <div className="relative">
          <ToolbarButton
            title={activeColorHex ? `Color: ${activeColorHex}` : "Color"}
            active={showColor}
            onClick={() => {
              setShowColor((v) => !v);
              setShowFont(false);
              setShowSize(false);
            }}
          >
            <Palette className="h-3.5 w-3.5" />
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm border border-border"
              style={{ background: activeColorHex || "transparent" }}
            />
          </ToolbarButton>
          {showColor && (
            <div className="absolute z-20 top-full mt-1 right-0 bg-background border border-border rounded-md shadow-lg p-2 w-[200px] max-w-[calc(100vw-2rem)]">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {COLOR_SWATCHES.map((c) => {
                  const isActive = activeColorHex?.toUpperCase() === c.toUpperCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onApplyColor(c);
                      }}
                      className={cn(
                        "w-6 h-6 rounded border",
                        isActive
                          ? "border-primary ring-2 ring-primary ring-offset-1"
                          : "border-border",
                      )}
                      style={{ background: c }}
                      title={c}
                    />
                  );
                })}
              </div>
              <input
                type="color"
                value={activeColorHex || "#000000"}
                onChange={(e) => onApplyColor(e.target.value)}
                className="w-full h-7 cursor-pointer rounded border border-border bg-background"
              />
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border mx-0.5" />

        <ToolbarButton title="Clear formatting" onClick={clearFormatting}>
          <Eraser className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        // Prevent stealing focus from the input so the selection is preserved.
        e.preventDefault();
      }}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded text-foreground hover:bg-muted flex items-center gap-0.5 transition-colors",
        active && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      {children}
    </button>
  );
}

export default RichTextField;
