import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold, Italic, Underline, Eraser, Type, Palette,
  Heading1, Heading2, Heading3, Quote, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import { FONT_PRESETS } from "@/components/website-editor/site-fonts";
import { cn } from "@/lib/utils";
import { SitePaletteColorOptions } from "@/components/website-editor/SitePalettePicker";
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

/** Wrap every text node within the current selection in <span style="..."> so
 * the styling applies across multiple block elements (e.g. several <p>). */
function applyInlineStyle(
  host: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
  explicitRange?: Range | null,
) {
  // On macOS Safari/Chrome, clicking inside a floating popover (e.g. the color
  // picker) blurs the contenteditable and `window.getSelection()` may report a
  // collapsed/empty selection by the time our handler runs. When the caller
  // passes an explicit Range (snapshot of the user's last real selection) we
  // use it directly instead of relying on the live selection.
  const sel = window.getSelection();
  let range: Range | null = null;
  if (explicitRange && !explicitRange.collapsed && host.contains(explicitRange.commonAncestorContainer)) {
    range = explicitRange;
  } else if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const r = sel.getRangeAt(0);
    if (host.contains(r.commonAncestorContainer)) range = r;
  }
  if (!range) return null;

  const applyStyles = (el: HTMLElement) => {
    Object.entries(styles).forEach(([k, v]) => {
      if (v != null) (el.style as any)[k] = v as string;
    });
  };

  // Extract the selection. The browser splits boundary elements as needed so
  // partial paragraphs come out as separate <p> fragments — letting us wrap
  // each text node individually without producing invalid nested blocks.
  const fragment = range.extractContents();

  const wrappedSpans: HTMLSpanElement[] = [];
  const wrapTextNodes = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      if (!text.nodeValue || text.nodeValue.length === 0) return;
      const parent = node.parentNode;
      if (!parent) return;
      const span = document.createElement("span");
      applyStyles(span);
      parent.insertBefore(span, node);
      span.appendChild(node);
      wrappedSpans.push(span);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === "SPAN") applyStyles(el);
      Array.from(node.childNodes).forEach(wrapTextNodes);
    }
  };
  Array.from(fragment.childNodes).forEach(wrapTextNodes);

  // Re-insert at the (now-collapsed) range position.
  range.insertNode(fragment);

  // Re-select the inserted range so subsequent toolbar actions keep working,
  // and return the new range so callers can snapshot it.
  let newRange: Range | null = null;
  if (wrappedSpans.length > 0) {
    newRange = document.createRange();
    newRange.setStartBefore(wrappedSpans[0]);
    newRange.setEndAfter(wrappedSpans[wrappedSpans.length - 1]);
    if (sel) {
      try {
        host.focus({ preventScroll: true } as FocusOptions);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } catch {
        /* macOS Safari may throw if focus didn't transfer — non-fatal */
      }
    }
  }

  host.normalize();
  fireInput(host);
  return newRange;
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
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  // Snapshot of the user's selection range. Updated on every valid selection
  // change so we can restore it before applying a format — important because
  // clicking inside the toolbar (especially the native <input type="color">
  // picker) can collapse or steal the selection from the editable host.
  const savedRangeRef = useRef<Range | null>(null);

  const restoreSelection = useCallback(() => {
    const r = savedRangeRef.current;
    if (!r) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }, []);

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
    // Snapshot for later restoration (the popovers / native pickers can steal
    // focus and collapse the selection before our apply handler runs).
    savedRangeRef.current = range.cloneRange();
    // Reflect the selection's current foreground color in the picker swatch.
    try {
      const node = range.startContainer;
      const el = (node.nodeType === 1 ? node : node.parentElement) as HTMLElement | null;
      if (el) {
        const rgb = getComputedStyle(el).color;
        const m = rgb.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const [r, g, b] = m[1].split(",").map((s) => parseInt(s.trim(), 10));
          const hex =
            "#" +
            [r, g, b]
              .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
              .join("");
          setCurrentColor(hex);
        }
      }
    } catch {
      /* noop */
    }
  }, []);

  // While any popover is open we must NOT close the toolbar from a
  // selectionchange (e.g. while dragging inside the color wheel the host's
  // selection may briefly collapse — closing the toolbar would unmount the
  // picker mid-drag and the new color would never get applied).
  const popoverOpen = showColor || showFont || showSize || showBlock;
  const popoverOpenRef = useRef(popoverOpen);
  useEffect(() => { popoverOpenRef.current = popoverOpen; }, [popoverOpen]);

  useEffect(() => {
    const onSelChange = () => {
      if (popoverOpenRef.current) return;
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
    host.focus({ preventScroll: true } as FocusOptions);
    restoreSelection();
    const r = applyInlineStyle(host, { fontFamily: stack }, savedRangeRef.current);
    if (r) savedRangeRef.current = r.cloneRange();
    setShowFont(false);
  };
  const onApplyColor = (color: string, closePicker = true) => {
    // Use the native `foreColor` execCommand for color application: it handles
    // multi-block selections reliably across browsers (Windows + macOS Safari/
    // Chrome) without the fragile extractContents/insertNode dance that broke
    // on macOS when the popover briefly stole focus from the contenteditable.
    host.focus({ preventScroll: true } as FocusOptions);
    if (!restoreSelection()) {
      if (closePicker) setShowColor(false);
      return;
    }
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* noop */
    }
    document.execCommand("foreColor", false, color);
    setCurrentColor(color);
    // Re-snapshot the live selection so the next pick keeps painting the same
    // text — important while dragging in the color wheel or clicking multiple
    // swatches in sequence.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    fireInput(host);
    if (closePicker) setShowColor(false);
  };
  const onApplySize = (px: number) => {
    host.focus({ preventScroll: true } as FocusOptions);
    restoreSelection();
    const r = applyInlineStyle(host, { fontSize: `${px}px`, lineHeight: "1.2" }, savedRangeRef.current);
    if (r) savedRangeRef.current = r.cloneRange();
    setShowSize(false);
  };

  const onApplyBlock = (key: ElementKey) => {
    const tag = ELEMENT_TO_TAG[key];
    // Two cases:
    // 1) Rich-text host (DIV from EditableRichText): use formatBlock and tag
    //    the resulting block with data-site-typo. Persists via innerHTML.
    // 2) Single-line host (EditableText where the host IS the <p>/<h2>/span):
    //    formatBlock is unreliable AND attributes set on the host itself are
    //    NOT persisted by EditableText.commit (which only stores innerHTML).
    //    So we wrap the entire host content in a <span data-site-typo="X"> —
    //    this lives inside innerHTML and survives commit + re-render.
    const isRichTextHost = host.tagName === "DIV";

    if (isRichTextHost) {
      const sel = window.getSelection();
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

      // Collect every block-level element inside the host that intersects the
      // current selection so we can transform each one individually (the
      // native `formatBlock` command only touches the block at the selection
      // start, which is why multi-paragraph selections only converted the
      // first paragraph).
      const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "DIV", "LI"]);
      const blocks: HTMLElement[] = [];
      if (range) {
        const walker = document.createTreeWalker(host, NodeFilter.SHOW_ELEMENT, {
          acceptNode: (n) => {
            const el = n as HTMLElement;
            if (el === host) return NodeFilter.FILTER_SKIP;
            if (!BLOCK_TAGS.has(el.tagName)) return NodeFilter.FILTER_SKIP;
            return range.intersectsNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
          },
        });
        let n: Node | null;
        // eslint-disable-next-line no-cond-assign
        while ((n = walker.nextNode())) blocks.push(n as HTMLElement);
      }

      // Filter out ancestor blocks when a descendant is also in the list, so
      // we only transform the leaf blocks the user actually selected text in.
      const leaves = blocks.filter(
        (b) => !blocks.some((other) => other !== b && b.contains(other))
      );

      if (leaves.length > 1) {
        const transformed: HTMLElement[] = [];
        leaves.forEach((block) => {
          const replacement = document.createElement(tag);
          while (block.firstChild) replacement.appendChild(block.firstChild);
          replacement.setAttribute("data-site-typo", key);
          replacement.style.removeProperty("font-family");
          replacement.style.removeProperty("font-size");
          replacement.style.removeProperty("font-weight");
          replacement.style.removeProperty("line-height");
          replacement.style.removeProperty("letter-spacing");
          replacement.style.removeProperty("text-transform");
          block.replaceWith(replacement);
          transformed.push(replacement);
        });
        if (sel && transformed.length > 0) {
          const newRange = document.createRange();
          newRange.setStartBefore(transformed[0]);
          newRange.setEndAfter(transformed[transformed.length - 1]);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
        host.normalize();
      } else {
        execSimple(host, "formatBlock", `<${tag}>`);
        const sel2 = window.getSelection();
        if (sel2 && sel2.rangeCount > 0) {
          let n: Node | null = sel2.anchorNode;
          while (n && n.nodeType !== 1) n = n.parentNode;
          let el = n as HTMLElement | null;
          while (el && el !== host) {
            if (el.tagName === tag) {
              el.setAttribute("data-site-typo", key);
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
        }
      }
    } else {

      // Unwrap any prior root-level data-site-typo wrapper.
      const onlyChild =
        host.children.length === 1 && host.childNodes.length === 1
          ? (host.firstElementChild as HTMLElement | null)
          : null;
      let inner = host.innerHTML;
      if (onlyChild && onlyChild.tagName === "SPAN" && onlyChild.hasAttribute("data-site-typo")) {
        inner = onlyChild.innerHTML;
      }
      host.innerHTML = `<span data-site-typo="${key}">${inner || "\u200B"}</span>`;
      // Restore selection inside the new wrapper so the toolbar stays put.
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(host.firstElementChild!);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    fireInput(host);
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
          <div
            className="absolute top-full mt-1 left-0 bg-background border border-border rounded-md shadow-lg p-2 w-64"
            onMouseDown={(e) => {
              // preventDefault stops the contenteditable from losing focus
              // (critical on macOS Safari/Chrome where focus loss collapses
              // the text selection before our color handler runs).
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <SitePaletteColorOptions
              value={currentColor}
              onChange={(v) => onApplyColor(v, false)}
              onCommit={() => setShowColor(false)}
            />
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
