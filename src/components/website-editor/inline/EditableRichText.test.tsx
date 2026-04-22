import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import EditableRichText from "./EditableRichText";

/**
 * Builds a minimal ClipboardEvent-like payload for React's onPaste.
 * jsdom doesn't implement DataTransfer, so we provide a stub.
 */
function makePasteEvent(payload: { html?: string; text?: string }) {
  const data: Record<string, string> = {};
  if (payload.html !== undefined) data["text/html"] = payload.html;
  if (payload.text !== undefined) data["text/plain"] = payload.text;
  return {
    clipboardData: {
      getData: (type: string) => data[type] ?? "",
    },
  };
}

beforeEach(() => {
  // jsdom doesn't implement document.execCommand. Stub it so the paste
  // handler can call insertHTML and we can capture the inserted HTML.
  (document as any).execCommand = vi.fn((cmd: string, _ui: boolean, value: string) => {
    if (cmd === "insertHTML") {
      const sel = window.getSelection();
      const node = sel?.anchorNode as HTMLElement | null;
      const target = node && node.nodeType === 1
        ? (node as HTMLElement)
        : (node?.parentElement as HTMLElement | null);
      if (target) target.innerHTML += value;
    }
    return true;
  });
});

describe("EditableRichText — paste preserves rich formatting", () => {
  it("preserves bold and italic tags pasted as HTML", () => {
    const onChange = vi.fn();
    render(<EditableRichText value="" onChange={onChange} />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement;
    expect(editor).toBeTruthy();

    // Simulate selection inside the editor before paste
    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.paste(
      editor,
      makePasteEvent({ html: "<p>Hello <strong>bold</strong> and <em>italic</em></p>" }),
    );

    expect(editor.innerHTML).toContain("<strong>bold</strong>");
    expect(editor.innerHTML).toContain("<em>italic</em>");
  });

  it("preserves unordered/ordered lists pasted as HTML", () => {
    const onChange = vi.fn();
    render(<EditableRichText value="" onChange={onChange} />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement;

    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.paste(
      editor,
      makePasteEvent({
        html: "<ul><li>One</li><li>Two</li></ul><ol><li>A</li></ol>",
      }),
    );

    expect(editor.innerHTML).toContain("<ul>");
    expect(editor.innerHTML).toContain("<li>One</li>");
    expect(editor.innerHTML).toContain("<ol>");
  });

  it("preserves anchor tags (links) pasted as HTML", () => {
    const onChange = vi.fn();
    render(<EditableRichText value="" onChange={onChange} />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement;

    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.paste(
      editor,
      makePasteEvent({
        html: '<p>Visit <a href="https://example.com">our site</a></p>',
      }),
    );

    const link = editor.querySelector("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.textContent).toBe("our site");
  });

  it("converts plain-text newlines to <br /> when no HTML is provided", () => {
    const onChange = vi.fn();
    render(<EditableRichText value="" onChange={onChange} />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement;

    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.paste(editor, makePasteEvent({ text: "line one\nline two" }));

    expect(editor.innerHTML).toContain("line one");
    expect(editor.innerHTML).toContain("<br>");
    expect(editor.innerHTML).toContain("line two");
  });
});

describe("EditableRichText — sanitizer strips dangerous content", () => {
  it("removes <script> tags from pasted HTML", () => {
    const onChange = vi.fn();
    render(<EditableRichText value="" onChange={onChange} />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement;

    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.paste(
      editor,
      makePasteEvent({
        html: '<p>Safe</p><script>window.__pwn=true</script>',
      }),
    );

    expect(editor.innerHTML).toContain("<p>Safe</p>");
    expect(editor.innerHTML).not.toContain("<script");
    expect((window as any).__pwn).toBeUndefined();
  });

  it("strips inline event handlers like onclick", () => {
    const onChange = vi.fn();
    render(<EditableRichText value="" onChange={onChange} />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement;

    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.paste(
      editor,
      makePasteEvent({
        html: '<p onclick="alert(1)">click</p>',
      }),
    );

    const p = editor.querySelector("p");
    expect(p).toBeTruthy();
    expect(p?.getAttribute("onclick")).toBeNull();
  });
});

describe("EditableRichText — onChange commits HTML to parent", () => {
  it("debounces input and forwards the current HTML to onChange", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<EditableRichText value="" onChange={onChange} />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement;

    editor.innerHTML = "<p><strong>hi</strong></p>";
    fireEvent.input(editor);

    // Debounced at 400ms in the component
    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toContain("<strong>hi</strong>");

    vi.useRealTimers();
  });

  it("commits immediately on blur", () => {
    const onChange = vi.fn();
    render(<EditableRichText value="" onChange={onChange} />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement;

    editor.innerHTML = "<em>italic save</em>";
    fireEvent.blur(editor);

    expect(onChange).toHaveBeenCalledWith("<em>italic save</em>");
  });
});

describe("EditableRichText — render mode", () => {
  it("renders provided HTML in read mode without contentEditable", () => {
    render(
      <EditableRichText
        value="<p><strong>preview</strong></p>"
        onChange={() => {}}
        editMode={false}
      />,
    );
    expect(screen.getByText("preview").tagName).toBe("STRONG");
    expect(document.querySelector('[contenteditable="true"]')).toBeNull();
  });
});
