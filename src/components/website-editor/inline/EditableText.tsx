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

/**
 * Inline-editable text used inside the live editor preview.
 * - When editMode is false, it renders a plain element with the value.
 * - When editMode is true, it becomes contentEditable. Edits are committed on
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

  // Keep DOM in sync when external value changes and we're not actively typing
  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    if (ref.current.textContent !== value) {
      ref.current.textContent = value || "";
    }
    lastCommittedRef.current = value;
  }, [value]);

  if (!editMode) {
    const Comp: any = Tag;
    return (
      <Comp className={className} style={style}>
        {value || placeholder || ""}
      </Comp>
    );
  }

  const commit = () => {
    const next = ref.current?.textContent ?? "";
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
    // Escape blurs without committing extra
    if (e.key === "Escape") {
      e.preventDefault();
      (ref.current as HTMLElement | null)?.blur();
    }
  };

  const Comp: any = Tag;
  return (
    <Comp
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
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
    >
      {value}
    </Comp>
  );
}
