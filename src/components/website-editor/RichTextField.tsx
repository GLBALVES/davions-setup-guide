import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Field that stores a value as HTML but displays only the plain text
 * in the input. Use anywhere we previously rendered <Input value={props.x} />
 * for editable site copy. Single-line by default; pass `multiline` to render
 * a textarea.
 */

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
  const plainValue = useMemo(() => htmlToPlain(value || ""), [value]);

  const onPlainChange = (nextPlain: string) => {
    if (nextPlain === plainValue) return;
    onChange(nextPlain);
  };

  const commonInputProps = {
    value: plainValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onPlainChange(e.target.value),
    placeholder,
  };

  return (
    <div className={cn("space-y-1.5", className)}>
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

    </div>
  );
}


export default RichTextField;
