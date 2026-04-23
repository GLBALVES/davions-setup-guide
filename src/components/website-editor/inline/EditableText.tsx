import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  style?: React.CSSProperties;
  editMode?: boolean;
}

/** Detects if a string contains any HTML tags (e.g. inline <span style="..">). */
function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

/**
 * Inline-editable text used inside the live editor preview.
 * - When editMode is false, renders the value (as HTML if it contains tags so
 *   inline formatting from the InlineFormatToolbar — font/color/size — is
 *   preserved on the public site).
 * - When editMode is true, becomes contentEditable. Edits are committed on
 *   blur (and a 400ms debounce while typing).
 */
export default function EditableText({
  value,
  onChange,
  as: Tag = "span",
  className,
  placeholder,
  multiline = false,
  style,
  editMode = true,
}: EditableTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastCommittedRef = useRef<string>(value);

  // Keep DOM in sync when external value changes and we're not actively typing.
  // Important: never re-write the DOM while focused — doing so resets the
  // caret to the start, causing an "autofocus loop" when paired with a
  // debounced commit.
  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    const isHtml = looksLikeHtml(value || "");
    if (isHtml) {
      if (ref.current.innerHTML !== (value || "")) {
        ref.current.innerHTML = value || "";
      }
    } else {
      if (ref.current.textContent !== (value || "")) {
        ref.current.textContent = value || "";
      }
    }
    lastCommittedRef.current = value;
  }, [value]);

  if (!editMode) {
    const Comp: any = Tag;
    if (looksLikeHtml(value || "")) {
      return (
        <Comp
          className={className}
          style={style}
          dangerouslySetInnerHTML={{ __html: value || "" }}
        />
      );
    }
    return (
      <Comp className={className} style={style}>
        {value || placeholder || ""}
      </Comp>
    );
  }

  const commit = () => {
    if (!ref.current) return;
    // If the DOM picked up any inline formatting tags, persist as HTML so the
    // formatting survives. Otherwise stick with plain text for cleanliness.
    const html = ref.current.innerHTML ?? "";
    const text = ref.current.textContent ?? "";
    const next = looksLikeHtml(html) ? html : text;
    if (next !== lastCommittedRef.current) {
      lastCommittedRef.current = next;
      onChange(next);
    }
  };

  const handleInput = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(commit, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (ref.current as HTMLElement | null)?.blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      (ref.current as HTMLElement | null)?.blur();
    }
  };

  const Comp: any = Tag;
  return (
    <Comp
      ref={(el: HTMLElement | null) => {
        ref.current = el;
        // Initialise content on mount only — never on re-render — so React
        // doesn't reconcile children and clobber the caret while typing.
        if (el && document.activeElement !== el) {
          const isHtml = looksLikeHtml(value || "");
          if (isHtml && el.innerHTML !== (value || "")) {
            el.innerHTML = value || "";
          } else if (!isHtml && el.textContent !== (value || "")) {
            el.textContent = value || "";
          }
        }
      }}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      data-inline-editable="true"
      onInput={handleInput}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      className={cn(
        "outline-none focus:ring-2 focus:ring-primary/40 rounded-sm transition-all",
        "hover:ring-1 hover:ring-primary/30",
        "empty:before:content-[attr(data-placeholder)] empty:before:opacity-40",
        "cursor-text",
        className
      )}
      style={style}
    />
  );
}
