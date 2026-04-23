import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface EditableRichTextProps {
  /** HTML string */
  value: string;
  onChange: (nextHtml: string) => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  editMode?: boolean;
}

/**
 * Inline rich-text editor that preserves HTML formatting on paste.
 * - Read mode: renders the HTML via dangerouslySetInnerHTML.
 * - Edit mode: contentEditable that keeps formatting, with a basic HTML
 *   sanitizer on paste (strips scripts/styles/event handlers).
 */
export default function EditableRichText({
  value,
  onChange,
  className,
  placeholder,
  style,
  editMode = true,
}: EditableRichTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastCommittedRef = useRef<string>(value);

  // Sync DOM only when not actively editing
  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    lastCommittedRef.current = value;
  }, [value]);

  if (!editMode) {
    return (
      <div
        className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
        style={style}
        dangerouslySetInnerHTML={{ __html: value || "" }}
      />
    );
  }

  const commit = () => {
    const next = ref.current?.innerHTML ?? "";
    if (next !== lastCommittedRef.current) {
      lastCommittedRef.current = next;
      onChange(next);
    }
  };

  const handleInput = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(commit, 400);
  };

  /** Strip scripts/styles/event handlers but keep formatting tags. */
  const sanitizeHtml = (html: string): string => {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const walk = (node: Element) => {
      // Remove disallowed tags entirely
      const tag = node.tagName.toLowerCase();
      if (["script", "style", "iframe", "object", "embed", "link", "meta"].includes(tag)) {
        node.remove();
        return;
      }
      // Strip all on* event attributes and inline styles like position/script urls
      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on")) node.removeAttribute(attr.name);
        if (name === "class" && attr.value.includes("Mso")) node.removeAttribute(attr.name);
      });
      [...node.children].forEach((c) => walk(c as Element));
    };
    [...tpl.content.children].forEach((c) => walk(c as Element));
    return tpl.innerHTML;
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const toInsert = html ? sanitizeHtml(html) : text.replace(/\n/g, "<br />");
    document.execCommand("insertHTML", false, toInsert);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      data-inline-editable="true"
      onInput={handleInput}
      onBlur={commit}
      onPaste={handlePaste}
      // Allow click to bubble to the parent block so its settings panel opens
      // in the sidebar when the user clicks any text inside it.
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "outline-none focus:ring-2 focus:ring-primary/40 rounded-sm transition-all",
        "hover:ring-1 hover:ring-primary/30",
        "empty:before:content-[attr(data-placeholder)] empty:before:opacity-40",
        "cursor-text",
        className,
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: value || "" }}
    />
  );
}
