import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold, Italic, Underline, Eraser, Type, Palette,
  Heading1, Heading2, Heading3, Quote, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import { FONT_PRESETS } from "@/components/website-editor/site-fonts";
import { cn } from "@/lib/utils";
import { SitePalettePicker } from "@/components/website-editor/SitePalettePicker";
import { ELEMENT_GROUPS, type ElementKey } from "@/components/website-editor/font-templates";

/**
 * Map each design-system element key to the block tag we should produce via
 * `formatBlock`. After the command runs we also tag the resulting block with
 * `data-site-typo="<key>"` so the CSS injected by `useSiteTypography` (matching
 * `[data-site-typo='paragraph_2']` etc.) applies the exact typography the
 * photographer configured in the Design → Fonts panel.
 */
const ELEMENT_TO_TAG: Record<ElementKey, string> = {
  banner_heading: "H1",
  banner_subtitle: "P",
  h1: "H1",
  h2: "H2",
  h3: "H3",
  h4: "H4",
  h5: "H5",
  h6: "H6",
  paragraph_1: "P",
  paragraph_2: "P",
  paragraph_3: "P",
  logo_text: "P",
  navigation: "P",
  sub_navigation: "P",
  overlay_navigation: "P",
  overlay_sub_navigation: "P",
  button: "P",
  form_label: "P",
  pullquote: "BLOCKQUOTE",
};

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

/** Site palette tokens reflected in the color picker. Read live from CSS vars
 *  injected by `useSiteColors`. */
const SITE_COLOR_TOKENS: { var: string; label: string }[] = [
  { var: "--site-bg", label: "Background" },
  { var: "--site-headings", label: "Headings" },
  { var: "--site-paragraphs", label: "Paragraphs" },
  { var: "--site-lines", label: "Lines" },
  { var: "--site-secondary-bg", label: "Secondary BG" },
  { var: "--site-secondary-headings", label: "Secondary H" },
  { var: "--site-button-bg", label: "Button BG" },
  { var: "--site-button-text", label: "Button Text" },
];

function cssToHex(value: string): string | null {
  if (!value) return null;
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) return value;
  try {
    const probe = document.createElement("div");
    probe.style.color = value;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    const m = rgb.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b] = m[1].split(",").map((s) => parseInt(s.trim(), 10));
    return "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function readSitePaletteHexes(): { var: string; label: string; hex: string }[] {
  const styles = getComputedStyle(document.documentElement);
  return SITE_COLOR_TOKENS
    .map((t) => {
      const raw = styles.getPropertyValue(t.var).trim();
      const hex = raw ? cssToHex(raw) : null;
      return hex ? { ...t, hex } : null;
    })
    .filter(Boolean) as { var: string; label: string; hex: string }[];
}

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
  const onApplyBlock = (key: ElementKey) => {
    const tag = ELEMENT_TO_TAG[key];
    // formatBlock expects "<H1>", "<P>", "<BLOCKQUOTE>" etc.
    execSimple(host, "formatBlock", `<${tag}>`);
    // After the block conversion, find the resulting block element that
    // contains the current selection and tag it with `data-site-typo` so the
    // typography injected by the design system applies.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let n: Node | null = sel.anchorNode;
      while (n && n.nodeType !== 1) n = n.parentNode;
      let el = n as HTMLElement | null;
      while (el && el !== host) {
        if (el.tagName === tag) {
          el.setAttribute("data-site-typo", key);
          // Strip any inline font styles so the design-system rule wins.
          el.style.removeProperty("font-family");
          el.style.removeProperty("font-size");
          el.style.removeProperty("font-weight");
          el.style.removeProperty("line-height");
          el.style.removeProperty("letter-spacing");
          el.style.removeProperty("text-transform");
          break;
        }
        el = el.parentElement;
      }
      fireInput(host);
    }
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
      const typoKey = el.getAttribute?.("data-site-typo") as ElementKey | null;
      if (typoKey) {
        for (const g of ELEMENT_GROUPS) {
          const item = g.items.find((i) => i.key === typoKey);
          if (item) return item.label;
        }
      }
      const t = el.tagName;
      if (t === "H1") return "Heading 1";
      if (t === "H2") return "Heading 2";
      if (t === "H3") return "Heading 3";
      if (t === "H4") return "Heading 4";
      if (t === "H5") return "Heading 5";
      if (t === "H6") return "Heading 6";
      if (t === "BLOCKQUOTE") return "Pullquote";
      if (t === "P") return "Paragraph 1";
      el = el.parentElement;
    }
    return "Paragraph 1";
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
          <div className="absolute top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg py-1 min-w-[200px] max-h-[340px] overflow-y-auto z-[10000]">
            {ELEMENT_GROUPS.map((group) => (
              <div key={group.key} className="py-1">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const Icon =
                    item.key === "h1" ? Heading1 :
                    item.key === "h2" ? Heading2 :
                    item.key === "h3" ? Heading3 :
                    item.key === "pullquote" ? Quote : Type;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onMouseDown={guard(() => onApplyBlock(item.key))}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted text-foreground flex items-center gap-2"
                    >
                      <Icon className="h-3.5 w-3.5 opacity-70" />
                      <span data-site-typo={item.key}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
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
          <div className="absolute top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg p-2 min-w-[220px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Site palette
            </p>
            <div className="grid grid-cols-8 gap-1 mb-2">
              {readSitePaletteHexes().map((c) => (
                <button
                  key={c.var}
                  type="button"
                  onMouseDown={guard(() => onApplyColor(c.hex))}
                  className="w-6 h-6 rounded border border-border"
                  style={{ background: c.hex }}
                  title={`${c.label} · ${c.hex}`}
                />
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Neutrals
            </p>
            <div className="grid grid-cols-8 gap-1 mb-2">
              {["#000000", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#FFFFFF"].map((c) => (
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
            <div className="pt-1" onMouseDown={(e) => e.stopPropagation()}>
              <SitePalettePicker
                value="#000000"
                onChange={(v) => onApplyColor(v)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Lists */}
      <button type="button" onMouseDown={guard(() => execSimple(host, "insertUnorderedList"))} className="p-1.5 hover:bg-muted rounded text-foreground" title="Bullet list">
        <List className="h-3.5 w-3.5" />
      </button>
      <button type="button" onMouseDown={guard(() => execSimple(host, "insertOrderedList"))} className="p-1.5 hover:bg-muted rounded text-foreground" title="Numbered list">
        <ListOrdered className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Align */}
      <button type="button" onMouseDown={guard(() => execSimple(host, "justifyLeft"))} className="p-1.5 hover:bg-muted rounded text-foreground" title="Align left">
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
      <button type="button" onMouseDown={guard(() => execSimple(host, "justifyCenter"))} className="p-1.5 hover:bg-muted rounded text-foreground" title="Align center">
        <AlignCenter className="h-3.5 w-3.5" />
      </button>
      <button type="button" onMouseDown={guard(() => execSimple(host, "justifyRight"))} className="p-1.5 hover:bg-muted rounded text-foreground" title="Align right">
        <AlignRight className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Link */}
      <button type="button" onMouseDown={guard(onApplyLink)} className="p-1.5 hover:bg-muted rounded text-foreground" title="Insert link">
        <LinkIcon className="h-3.5 w-3.5" />
      </button>

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
