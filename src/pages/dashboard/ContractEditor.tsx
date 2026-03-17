import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Node, mergeAttributes } from "@tiptap/core";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, Minus,
  LinkIcon, ArrowLeft, ChevronDown, Check, Loader2, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Available smart variables ─────────────────────────────────────────────────
export const CONTRACT_VARIABLES = [
  { key: "client_name",       label: "Client Name" },
  { key: "client_email",      label: "Client Email" },
  { key: "session_title",     label: "Session Title" },
  { key: "session_date",      label: "Session Date" },
  { key: "session_time",      label: "Session Time" },
  { key: "session_duration",  label: "Session Duration" },
  { key: "session_price",     label: "Session Price" },
  { key: "photographer_name", label: "Photographer Name" },
  { key: "studio_name",       label: "Studio Name" },
  { key: "studio_address",    label: "Studio Address" },
] as const;

export type VariableKey = (typeof CONTRACT_VARIABLES)[number]["key"];

// ── Resolve [[key]] tokens in HTML ──────────────────────────────────────────
export function resolveContractVariables(
  html: string,
  data: Partial<Record<VariableKey, string>>
): string {
  return CONTRACT_VARIABLES.reduce((acc, v) => {
    const val = data[v.key] ?? `[${v.label}]`;
    return acc.replace(new RegExp(`\\[\\[${v.key}\\]\\]`, "g"), val);
  }, html);
}

// ── Custom Tiptap Node: Variable chip ────────────────────────────────────────
const VariableNode = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      key:   { default: null },
      label: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-variable]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-variable": HTMLAttributes.key,
        class:
          "inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 cursor-default select-none",
      }),
      `{{${HTMLAttributes.label}}}`,
    ];
  },
  // Serialize to [[key]] tokens for storage
  renderText({ node }) {
    return `[[${node.attrs.key}]]`;
  },
});

// ── Main component ─────────────────────────────────────────────────────────────
const ContractEditor = () => {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const ce = t.contractEditor;

  const [contractId, setContractId] = useState<string | null>(isNew ? null : id ?? null);
  const [contractName, setContractName] = useState(ce.untitledContract);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [loading, setLoading] = useState(!isNew);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tiptap editor ─────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Placeholder.configure({ placeholder: "Start writing your contract…" }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      VariableNode,
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[600px] px-12 py-10 text-foreground",
      },
    },
    onUpdate: () => {
      setSaveStatus("unsaved");
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => handleSave("auto"), 1800);
    },
  });

  // ── Load existing contract ─────────────────────────────────────────────────
  useEffect(() => {
    if (isNew || !id) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("contracts")
        .select("id, name, body")
        .eq("id", id)
        .single();
      if (data) {
        setContractId(data.id);
        setContractName(data.name || "Untitled Contract");
        if (editor && data.body) {
          // body is HTML with [[key]] tokens — convert them back to VariableNode for editing
          const restored = restoreVariableNodes(data.body);
          editor.commands.setContent(restored);
        }
      }
      setLoading(false);
    })();
  }, [id, isNew, editor]);

  // Convert stored [[key]] tokens back into VariableNode HTML for the editor
  function restoreVariableNodes(html: string): string {
    return CONTRACT_VARIABLES.reduce((acc, v) => {
      const chip = `<span data-variable="${v.key}" data-label="${v.label}">${v.label}</span>`;
      return acc.replace(new RegExp(`\\[\\[${v.key}\\]\\]`, "g"), chip);
    }, html);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (mode: "manual" | "auto" = "manual") => {
      if (!user || !editor) return;
      setSaving(true);
      setSaveStatus("saving");

      // Serialize: variables must become [[key]] tokens
      // We rely on renderText from VariableNode for getText, but for HTML storage
      // we capture innerHTML and replace chip HTML with [[key]] tokens
      const rawHtml = editor.getHTML();
      const serialized = serializeVariables(rawHtml);

      let newId = contractId;
      if (!newId) {
        const { data } = await (supabase as any)
          .from("contracts")
          .insert({ photographer_id: user.id, name: contractName.trim() || "Untitled Contract", body: serialized })
          .select("id")
          .single();
        if (data?.id) {
          newId = data.id;
          setContractId(newId);
          // Update URL without reloading
          window.history.replaceState({}, "", `/dashboard/contracts/${newId}/edit`);
        }
      } else {
        await (supabase as any)
          .from("contracts")
          .update({ name: contractName.trim() || "Untitled Contract", body: serialized, updated_at: new Date().toISOString() })
          .eq("id", newId);
      }

      setSaving(false);
      setSaveStatus("saved");
      if (mode === "manual") toast({ title: "Contract saved" });
    },
    [user, editor, contractId, contractName, toast]
  );

  // Convert chip HTML to [[key]] tokens for storage
  function serializeVariables(html: string): string {
    return CONTRACT_VARIABLES.reduce((acc, v) => {
      // Match <span data-variable="key" ...>...</span>
      const re = new RegExp(
        `<span[^>]*data-variable="${v.key}"[^>]*>[^<]*<\\/span>`,
        "g"
      );
      return acc.replace(re, `[[${v.key}]]`);
    }, html);
  }

  // ── Insert variable ───────────────────────────────────────────────────────
  const insertVariable = useCallback(
    (key: string, label: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent({
        type: "variable",
        attrs: { key, label },
      }).run();
    },
    [editor]
  );

  // ── Add link ──────────────────────────────────────────────────────────────
  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = prompt("URL:", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  // ── Toolbar button ────────────────────────────────────────────────────────
  const TB = ({
    onClick, active, children, title,
  }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded transition-colors text-sm",
        active
          ? "bg-foreground text-background"
          : "text-foreground/70 hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex flex-col border-b border-border bg-background shrink-0">
        {/* Row 1: Nav + name + status + done */}
        <div className="flex items-center gap-4 px-4 h-12">
          <button
            onClick={() => navigate("/dashboard/personalize")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase font-light"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <Separator orientation="vertical" className="h-5" />

          {/* Editable contract name */}
          <input
            value={contractName}
            onChange={(e) => {
              setContractName(e.target.value);
              setSaveStatus("unsaved");
            }}
            className="flex-1 min-w-0 bg-transparent text-sm font-light tracking-wide focus:outline-none placeholder:text-muted-foreground/50"
            placeholder="Contract name…"
          />

          <span className={cn(
            "text-[10px] tracking-wider uppercase shrink-0 transition-colors",
            saveStatus === "saved" && "text-muted-foreground/60",
            saveStatus === "unsaved" && "text-muted-foreground",
            saveStatus === "saving" && "text-muted-foreground animate-pulse"
          )}>
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "All changes saved" : "Unsaved changes"}
          </span>

          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-xs tracking-wider uppercase font-light h-8 px-4"
            disabled={saving}
            onClick={() => handleSave("manual")}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Done
          </Button>
        </div>

        {/* Row 2: Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-t border-border/60">
          {editor && (
            <>
              <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
                <Bold className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
                <Italic className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
                <UnderlineIcon className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
                <Strikethrough className="h-3.5 w-3.5" />
              </TB>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
                <AlignLeft className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
                <AlignCenter className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
                <AlignRight className="h-3.5 w-3.5" />
              </TB>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
                <List className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
                <ListOrdered className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
                <Quote className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
                <Minus className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={addLink} active={editor.isActive("link")} title="Link">
                <LinkIcon className="h-3.5 w-3.5" />
              </TB>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <TB onClick={() => editor.chain().focus().undo().run()} title="Undo">
                <Undo className="h-3.5 w-3.5" />
              </TB>
              <TB onClick={() => editor.chain().focus().redo().run()} title="Redo">
                <Redo className="h-3.5 w-3.5" />
              </TB>

              <Separator orientation="vertical" className="h-4 mx-1.5" />

              {/* Insert Field dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium tracking-wide text-primary bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
                  >
                    Insert field
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {CONTRACT_VARIABLES.map((v) => (
                    <DropdownMenuItem
                      key={v.key}
                      onClick={() => insertVariable(v.key, v.label)}
                      className="text-xs gap-2 cursor-pointer"
                    >
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                        {"{{"}{v.label}{"}}"}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      {/* ── Body: sidebar + document ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <aside className="w-64 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-5">
            {/* Document info */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-[10px] tracking-widest uppercase font-light">Document</span>
              </div>
              <Input
                value={contractName}
                onChange={(e) => {
                  setContractName(e.target.value);
                  setSaveStatus("unsaved");
                }}
                className="text-xs font-light h-8"
                placeholder="Contract name…"
              />
            </div>

            <Separator />

            {/* Variable reference */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">Smart Fields</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Click "Insert field" to add dynamic content that gets replaced when a client books.
              </p>
              <div className="flex flex-col gap-1.5 mt-1">
                {CONTRACT_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key, v.label)}
                    className="flex items-center gap-2 text-left hover:bg-muted/60 rounded px-1.5 py-1 transition-colors group"
                  >
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap group-hover:bg-primary/15 transition-colors">
                      {"{{"}{v.label}{"}}"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tips */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">Tips</p>
              <ul className="text-[10px] text-muted-foreground space-y-1.5 leading-relaxed">
                <li>• Fields are replaced automatically when a client books.</li>
                <li>• If a field has no value it shows as [Field Name].</li>
                <li>• Use bold for section headings inside the document.</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Document canvas */}
        <main className="flex-1 overflow-y-auto bg-muted/40">
          <div className="max-w-3xl mx-auto my-10 px-4">
            <div className="bg-background shadow-md border border-border/50 min-h-[800px]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContractEditor;
