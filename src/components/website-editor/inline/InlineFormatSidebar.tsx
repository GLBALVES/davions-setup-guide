import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Eraser, Type, Palette,
  Heading1, Heading2, Heading3, Quote, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import { FONT_PRESETS } from "@/components/website-editor/site-fonts";
import { cn } from "@/lib/utils";

/**
 * Sidebar version of the floating selection toolbar.
 * Mirrors all formatting actions from InlineFormatToolbar but lives in the
 * settings panel so users can format the currently-selected text from the
 * sidebar as well.
 *
 * Strategy: persist the last range of any element marked
 * `data-inline-editable="true"` while the user clicks on the sidebar.
 */

const BLOCK_PRESETS = [
  { id: "h1", label: "Heading 1", tag: "H1", Icon: Heading1 },
  { id: "h2", label: "Heading 2", tag: "H2", Icon: Heading2 },
  { id: "h3", label: "Heading 3", tag: "H3", Icon: Heading3 },
  { id: "p", label: "Body", tag: "P", Icon: Type },
  { id: "blockquote", label: "Quote", tag: "BLOCKQUOTE", Icon: Quote },
];

const SIZE_PRESETS = [
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

function getEditableHost(node: Node | null): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && cur.nodeType !== Node.ELEMENT_NODE) cur = cur.parentNode;
  let el = cur as HTMLElement | null;
  while (el) {
    if (el.dataset && el.dataset.inlineEditable === "true") return el;
    el = el.parentElement;
  }
  return null;
}

function fireInput(host: HTMLElement) {
  host.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyInlineStyle(host: HTMLElement, range: Range, styles: Partial<CSSStyleDeclaration>) {
  if (range.collapsed) return;
  if (!host.contains(range.commonAncestorContainer)) return;
  try { document.execCommand("styleWithCSS", false, "true"); } catch { /* noop */ }
  const span = document.createElement("span");
  Object.entries(styles).forEach(([k, v]) => {
    if (v != null) (span.style as any)[k] = v as string;
  });
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  const sel = window.getSelection();
  if (sel) {
    const r = document.createRange();
    r.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  fireInput(host);
}

function execSimple(host: HTMLElement, command: string, value?: string) {
  try { document.execCommand("styleWithCSS", false, "true"); } catch { /* noop */ }
  document.execCommand(command, false, value);
  fireInput(host);
}

export default function InlineFormatSidebar() {
  // Track the latest non-collapsed selection inside any inline-editable host.
  const lastRangeRef = useRef<Range | null>(null);
  const lastHostRef = useRef<HTMLElement | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [showFont, setShowFont] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [customSize, setCustomSize] = useState<string>("");

  useEffect(() => {
    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const host = getEditableHost(range.commonAncestorContainer);
      if (!host || range.collapsed) return;
      lastRangeRef.current = range.cloneRange();
      lastHostRef.current = host;
      setHasSelection(true);
    };
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  }, []);

  const withRange = (fn: (host: HTMLElement, range: Range) => void) => () => {
    const host = lastHostRef.current;
    const range = lastRangeRef.current;
    if (!host || !range) return;
    // Re-apply the saved selection so execCommand targets it.
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    fn(host, range);
    // Refresh stored range in case DOM changed
    const newSel = window.getSelection();
    if (newSel && newSel.rangeCount > 0) {
      lastRangeRef.current = newSel.getRangeAt(0).cloneRange();
    }
  };

  // Prevent sidebar buttons from stealing the selection on mousedown.
  const guard = (handler: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };

  const onBold = withRange((host) => execSimple(host, "bold"));
  const onItalic = withRange((host) => execSimple(host, "italic"));
  const onUnderline = withRange((host) => execSimple(host, "underline"));
  const onClear = withRange((host) => execSimple(host, "removeFormat"));
  const onUL = withRange((host) => execSimple(host, "insertUnorderedList"));
  const onOL = withRange((host) => execSimple(host, "insertOrderedList"));
  const onAlignL = withRange((host) => execSimple(host, "justifyLeft"));
  const onAlignC = withRange((host) => execSimple(host, "justifyCenter"));
  const onAlignR = withRange((host) => execSimple(host, "justifyRight"));
  const onLink = withRange((host) => {
    const url = window.prompt("URL:", "https://");
    if (!url) return;
    execSimple(host, "createLink", url);
  });
  const onApplyBlock = (tag: string) =>
    withRange((host) => execSimple(host, "formatBlock", `<${tag}>`))();
  const onApplyFont = (stack: string) =>
    withRange((host, range) => applyInlineStyle(host, range, { fontFamily: stack }))();
  const onApplySize = (px: number) =>
    withRange((host, range) => applyInlineStyle(host, range, { fontSize: `${px}px`, lineHeight: "1.2" }))();
  const onApplyColor = (color: string) =>
    withRange((host) => execSimple(host, "foreColor", color))();

  const Btn = ({ onClick, title, children, active }: {
    onClick: (e: React.MouseEvent) => void;
    title: string;
    children: React.ReactNode;
    active?: boolean;
  }) => (
    <button
      type="button"
      onMouseDown={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded text-foreground hover:bg-muted border border-border/60",
        active && "bg-muted",
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className="space-y-2 rounded-md border border-border/60 p-3"
      onMouseDown={(e) => {
        // Don't blur the editable; preserve the selection
        e.preventDefault();
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
          Text formatting
        </p>
        {!hasSelection && (
          <span className="text-[10px] text-muted-foreground/70">Select text first</span>
        )}
      </div>

      {/* Heading / block style */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={guard(() => {
            setShowBlock((v) => !v);
            setShowFont(false); setShowSize(false); setShowColor(false);
          })}
          className="w-full px-2 py-1.5 hover:bg-muted rounded text-foreground flex items-center justify-between border border-border/60 text-xs"
        >
          <span>Text style</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {showBlock && (
          <div className="mt-1 bg-background border border-border rounded-md py-1">
            {BLOCK_PRESETS.map(({ id, label, tag, Icon }) => (
              <button
                key={id}
                type="button"
                onMouseDown={guard(() => { onApplyBlock(tag); setShowBlock(false); })}
                className="w-full text-left px-3 py-1.5 hover:bg-muted text-foreground flex items-center gap-2 text-xs"
              >
                <Icon className="h-3.5 w-3.5 opacity-70" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline marks */}
      <div className="flex flex-wrap gap-1">
        <Btn onClick={guard(onBold)} title="Bold"><Bold className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={guard(onItalic)} title="Italic"><Italic className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={guard(onUnderline)} title="Underline"><Underline className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={guard(onClear)} title="Clear formatting"><Eraser className="h-3.5 w-3.5" /></Btn>
      </div>

      {/* Lists & alignment */}
      <div className="flex flex-wrap gap-1">
        <Btn onClick={guard(onUL)} title="Bullet list"><List className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={guard(onOL)} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={guard(onAlignL)} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={guard(onAlignC)} title="Align center"><AlignCenter className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={guard(onAlignR)} title="Align right"><AlignRight className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={guard(onLink)} title="Insert link"><LinkIcon className="h-3.5 w-3.5" /></Btn>
      </div>

      {/* Font picker */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={guard(() => {
            setShowFont((v) => !v);
            setShowSize(false); setShowColor(false); setShowBlock(false);
          })}
          className="w-full px-2 py-1.5 hover:bg-muted rounded text-foreground flex items-center justify-between border border-border/60 text-xs"
        >
          <span className="flex items-center gap-1"><Type className="h-3.5 w-3.5" />Font</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {showFont && (
          <div className="mt-1 bg-background border border-border rounded-md py-1 max-h-[220px] overflow-y-auto">
            {FONT_PRESETS.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={guard(() => { onApplyFont(f.stack); setShowFont(false); })}
                className="w-full text-left px-3 py-1.5 hover:bg-muted text-foreground text-xs"
                style={{ fontFamily: f.stack }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Size picker */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={guard(() => {
            setShowSize((v) => !v);
            setShowFont(false); setShowColor(false); setShowBlock(false);
          })}
          className="w-full px-2 py-1.5 hover:bg-muted rounded text-foreground flex items-center justify-between border border-border/60 text-xs"
        >
          <span className="font-medium">Aa Size</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {showSize && (
          <div className="mt-1 bg-background border border-border rounded-md p-2">
            <div className="grid grid-cols-3 gap-1 mb-2">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={guard(() => { onApplySize(s.px); setShowSize(false); })}
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
                min={8} max={200}
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder="px"
                className="w-full px-2 py-1 border border-border rounded bg-background text-foreground text-xs"
                onMouseDown={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onMouseDown={guard(() => {
                  const n = parseInt(customSize, 10);
                  if (!Number.isNaN(n) && n >= 8 && n <= 200) { onApplySize(n); setShowSize(false); }
                })}
                className="px-2 py-1 hover:bg-muted rounded text-foreground border border-border text-xs"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Color picker */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={guard(() => {
            setShowColor((v) => !v);
            setShowFont(false); setShowSize(false); setShowBlock(false);
          })}
          className="w-full px-2 py-1.5 hover:bg-muted rounded text-foreground flex items-center justify-between border border-border/60 text-xs"
        >
          <span className="flex items-center gap-1"><Palette className="h-3.5 w-3.5" />Color</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {showColor && (
          <div className="mt-1 bg-background border border-border rounded-md p-2">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={guard(() => { onApplyColor(c); setShowColor(false); })}
                  className="w-6 h-6 rounded border border-border"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
            <input
              type="color"
              onChange={(e) => onApplyColor(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full h-7 cursor-pointer rounded border border-border bg-background"
            />
          </div>
        )}
      </div>
    </div>
  );
}
