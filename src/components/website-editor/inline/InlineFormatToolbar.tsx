import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold, Italic, Underline, Eraser, Type, Palette,
  Heading1, Heading2, Heading3, Quote, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import { FONT_PRESETS } from "@/components/website-editor/site-fonts";
import { cn } from "@/lib/utils";

const BLOCK_PRESETS: { id: string; label: string; tag: string }[] = [
  { id: "h1", label: "Heading 1", tag: "H1" },
  { id: "h2", label: "Heading 2", tag: "H2" },
  { id: "h3", label: "Heading 3", tag: "H3" },
  { id: "p", label: "Body", tag: "P" },
  { id: "blockquote", label: "Quote", tag: "BLOCKQUOTE" },
];

/**
 * Floating selection toolbar that lets users format the currently selected
 * text inside any element marked with `data-inline-editable="true"`.
 *
 * Mounted once at the root of the editor preview. Uses document.execCommand
 * (still the most reliable cross-browser API for contenteditable formatting)
 * and dispatches an `input` event afterwards so the host EditableText /
 * EditableRichText components persist the change.
 */

const SIZE_PRESETS: { id: string; label: string; px: number }[] = [
  { id: "xs", label: "XS", px: 12 },
  { id: "sm", label: "S", px: 14 },
  { id: "md", label: "M", px: 16 },
  { id: "lg", label: "L", px: 20 },
  { id: "xl", label: "XL", px: 28 },
  { id: "2xl", label: "2XL", px: 40 },
];

interface ToolbarPosition {
  top: number;
  left: number;
}

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

/** Wrap the current selection in <span style="..."> applying the given styles. */
function applyInlineStyle(host: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  // Only apply if the selection is inside our host
  if (!host.contains(range.commonAncestorContainer)) return;

  try {
    document.execCommand("styleWithCSS", false, "true");
  } catch {
    /* noop */
  }

  const span = document.createElement("span");
  Object.entries(styles).forEach(([k, v]) => {
    if (v != null) (span.style as any)[k] = v as string;
  });
  try {
    range.surroundContents(span);
  } catch {
    // Selection crosses element boundaries — fall back to extract+wrap
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  // Restore selection across the wrapped span
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(newRange);
  fireInput(host);
}

function execSimple(host: HTMLElement, command: string, value?: string) {
  try {
    document.execCommand("styleWithCSS", false, "true");
  } catch {
    /* noop */
  }
  document.execCommand(command, false, value);
  fireInput(host);
}

function clearSelectionFormatting(host: HTMLElement) {
  try {
    document.execCommand("removeFormat", false);
    fireInput(host);
  } catch {
    /* noop */
  }
}

export default function InlineFormatToolbar() {
  const [pos, setPos] = useState<ToolbarPosition | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [showColor, setShowColor] = useState(false);
  const [showFont, setShowFont] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [customSize, setCustomSize] = useState<string>("");
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const updateFromSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setPos(null);
      setHost(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const editable = getEditableHost(range.commonAncestorContainer);
    if (!editable) {
      setPos(null);
      setHost(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPos(null);
      setHost(null);
      return;
    }
    setHost(editable);
    setPos({
      top: rect.top + window.scrollY - 48,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    const onSelChange = () => {
      // If the selection moved inside the toolbar itself, ignore.
      const sel = window.getSelection();
      if (!sel) return;
      const anchor = sel.anchorNode as Node | null;
      if (anchor && toolbarRef.current?.contains(anchor)) return;
      updateFromSelection();
    };
    document.addEventListener("selectionchange", onSelChange);
    window.addEventListener("scroll", updateFromSelection, true);
    window.addEventListener("resize", updateFromSelection);
    return () => {
      document.removeEventListener("selectionchange", onSelChange);
      window.removeEventListener("scroll", updateFromSelection, true);
      window.removeEventListener("resize", updateFromSelection);
    };
  }, [updateFromSelection]);

  // Close popovers when toolbar hides
  useEffect(() => {
    if (!pos) {
      setShowColor(false);
      setShowFont(false);
      setShowSize(false);
      setShowBlock(false);
    }
  }, [pos]);

  if (!pos || !host) return null;

  const guard = (fn: () => void) => (e: React.MouseEvent) => {
    // Prevent the selection from collapsing on mousedown
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const onApplyFont = (stack: string) => {
    applyInlineStyle(host, { fontFamily: stack });
    setShowFont(false);
  };
  const onApplyColor = (color: string) => {
    execSimple(host, "foreColor", color);
    window.getSelection()?.removeAllRanges();
    setShowColor(false);
    setPos(null);
    setHost(null);
  };
  const onApplySize = (px: number) => {
    applyInlineStyle(host, { fontSize: `${px}px`, lineHeight: "1.2" });
    setShowSize(false);
  };
  const onApplyBlock = (tag: string) => {
    // formatBlock expects "<H1>", "<P>", "<BLOCKQUOTE>" etc.
    execSimple(host, "formatBlock", `<${tag}>`);
    setShowBlock(false);
  };
  const onApplyLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const url = window.prompt("URL:", "https://");
    if (!url) return;
    execSimple(host, "createLink", url);
  };

  const currentBlockLabel = (() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "Body";
    let n: Node | null = sel.anchorNode;
    while (n && n.nodeType !== 1) n = n.parentNode;
    let el = n as HTMLElement | null;
    while (el && el !== host) {
      const t = el.tagName;
      const found = BLOCK_PRESETS.find((b) => b.tag === t);
      if (found) return found.label;
      el = el.parentElement;
    }
    return "Body";
  })();

  const node = (
    <div
      ref={toolbarRef}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
        zIndex: 9999,
      }}
      className="bg-background border border-border shadow-lg rounded-md flex items-center gap-0.5 p-1 text-xs"
    >
      {/* Block / Heading dropdown */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={guard(() => {
            setShowBlock((v) => !v);
            setShowFont(false);
            setShowSize(false);
            setShowColor(false);
          })}
          className={cn(
            "px-2 py-1.5 hover:bg-muted rounded text-foreground flex items-center gap-1 min-w-[88px]",
            showBlock && "bg-muted"
          )}
          title="Text style"
        >
          <span className="truncate">{currentBlockLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {showBlock && (
          <div className="absolute top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg py-1 min-w-[160px] z-[10000]">
            {BLOCK_PRESETS.map((b) => {
              const Icon =
                b.id === "h1" ? Heading1 :
                b.id === "h2" ? Heading2 :
                b.id === "h3" ? Heading3 :
                b.id === "blockquote" ? Quote : Type;
              return (
                <button
                  key={b.id}
                  type="button"
                  onMouseDown={guard(() => onApplyBlock(b.tag))}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-foreground flex items-center gap-2"
                >
                  <Icon className="h-3.5 w-3.5 opacity-70" />
                  <span>{b.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Bold/Italic/Underline */}
      <button
        type="button"
        onMouseDown={guard(() => execSimple(host, "bold"))}
        className="p-1.5 hover:bg-muted rounded text-foreground"
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={guard(() => execSimple(host, "italic"))}
        className="p-1.5 hover:bg-muted rounded text-foreground"
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={guard(() => execSimple(host, "underline"))}
        className="p-1.5 hover:bg-muted rounded text-foreground"
        title="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Font picker */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={guard(() => {
            setShowFont((v) => !v);
            setShowColor(false);
            setShowSize(false);
          })}
          className={cn(
            "px-2 py-1.5 hover:bg-muted rounded text-foreground flex items-center gap-1",
            showFont && "bg-muted"
          )}
          title="Font family"
        >
          <Type className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Font</span>
        </button>
        {showFont && (
          <div className="absolute top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg py-1 min-w-[180px] max-h-[280px] overflow-y-auto">
            {FONT_PRESETS.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={guard(() => onApplyFont(f.stack))}
                className="w-full text-left px-3 py-1.5 hover:bg-muted text-foreground"
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
            setShowFont(false);
            setShowColor(false);
          })}
          className={cn(
            "px-2 py-1.5 hover:bg-muted rounded text-foreground flex items-center gap-1",
            showSize && "bg-muted"
          )}
          title="Font size"
        >
          <span className="font-medium">Aa</span>
        </button>
        {showSize && (
          <div className="absolute top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg p-2 min-w-[180px]">
            <div className="grid grid-cols-3 gap-1 mb-2">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={guard(() => onApplySize(s.px))}
                  className="px-2 py-1 hover:bg-muted rounded text-foreground border border-border text-center"
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
                onMouseDown={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onMouseDown={guard(() => {
                  const n = parseInt(customSize, 10);
                  if (!Number.isNaN(n) && n >= 8 && n <= 200) onApplySize(n);
                })}
                className="px-2 py-1 hover:bg-muted rounded text-foreground border border-border"
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
            setShowFont(false);
            setShowSize(false);
          })}
          className={cn(
            "px-2 py-1.5 hover:bg-muted rounded text-foreground flex items-center gap-1",
            showColor && "bg-muted"
          )}
          title="Color"
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
        {showColor && (
          <div className="absolute top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg p-2 min-w-[200px]">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {[
                "#000000",
                "#374151",
                "#6B7280",
                "#9CA3AF",
                "#D1D5DB",
                "#FFFFFF",
                "#EF4444",
                "#F97316",
                "#EAB308",
                "#22C55E",
                "#06B6D4",
                "#3B82F6",
                "#8B5CF6",
                "#EC4899",
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={guard(() => onApplyColor(c))}
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

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Clear */}
      <button
        type="button"
        onMouseDown={guard(() => clearSelectionFormatting(host))}
        className="p-1.5 hover:bg-muted rounded text-foreground"
        title="Clear formatting"
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return createPortal(node, document.body);
}
