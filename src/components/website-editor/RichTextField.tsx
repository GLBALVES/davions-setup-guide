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

  // When user types/edits the plain text, we have to either:
  //  - drop existing HTML formatting (text changed shape)
  //  - or keep it intact (text unchanged)
  // To keep things predictable for users, when the plain text changes we
  // commit the new value as plain text. They can then reapply formatting.
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

  const apply = (styleCss: string) => {
    const { start, end } = getRange();
    if (start === end) return;
    const next = applyStyleToHtmlRange(value || plainValue, start, end, styleCss);
    onChange(next);
  };

  const applyTag = (tag: "b" | "i" | "u") => {
    const { start, end } = getRange();
    if (start === end) return;
    const next = applyTagToHtmlRange(value || plainValue, start, end, tag);
    onChange(next);
  };

  const clearFormatting = () => {
    // Strip all html, keep plain text only.
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

  // Close popovers when clicking outside the toolbar.
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
        <ToolbarButton title="Bold" onClick={() => applyTag("b")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => applyTag("i")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => applyTag("u")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Font family */}
        <div className="relative">
          <ToolbarButton
            title="Font family"
            active={showFont}
            onClick={() => {
              setShowFont((v) => !v);
              setShowColor(false);
              setShowSize(false);
            }}
          >
            <Type className="h-3.5 w-3.5" />
            <ChevronDown className="h-3 w-3" />
          </ToolbarButton>
          {showFont && (
            <div className="absolute z-20 top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg py-1 min-w-[180px] max-h-[260px] overflow-y-auto">
              {FONT_PRESETS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onApplyFont(f.stack);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-foreground text-xs"
                  style={{ fontFamily: f.stack }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font size */}
        <div className="relative">
          <ToolbarButton
            title="Font size"
            active={showSize}
            onClick={() => {
              setShowSize((v) => !v);
              setShowColor(false);
              setShowFont(false);
            }}
          >
            <span className="font-medium text-[11px]">Aa</span>
            <ChevronDown className="h-3 w-3" />
          </ToolbarButton>
          {showSize && (
            <div className="absolute z-20 top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg p-2 min-w-[180px]">
              <div className="grid grid-cols-3 gap-1 mb-2">
                {SIZE_PRESETS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onApplySize(s.px);
                    }}
                    className="px-2 py-1 hover:bg-muted rounded text-foreground border border-border text-center text-xs"
                    title={`${s.px}px`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={8}
                  max={200}
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="px"
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
            title="Color"
            active={showColor}
            onClick={() => {
              setShowColor((v) => !v);
              setShowFont(false);
              setShowSize(false);
            }}
          >
            <Palette className="h-3.5 w-3.5" />
          </ToolbarButton>
          {showColor && (
            <div className="absolute z-20 top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg p-2 min-w-[200px]">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onApplyColor(c);
                    }}
                    className="w-6 h-6 rounded border border-border"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
              <input
                type="color"
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
        "p-1.5 rounded text-foreground hover:bg-muted flex items-center gap-0.5",
        active && "bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export default RichTextField;
