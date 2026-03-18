import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Bot, Loader2, RotateCcw, Sparkles, History, ChevronLeft, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type Msg = { role: "user" | "assistant"; content: string };

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const STARTERS = [
  "How do I create a session?",
  "How do I connect a custom domain?",
  "How does the Lightroom plugin work?",
  "How do I set up payments?",
];

async function streamChat(
  messages: Msg[],
  onDelta: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal
) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/help-assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to reach assistant");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const text = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (text) onDelta(text);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

export function HelpAssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await (supabase as any)
      .from("help_conversations")
      .select("id, title, updated_at")
      .eq("photographer_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);
    setConversations(data || []);
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => {
    if (open && user) loadConversations();
  }, [open, user, loadConversations]);

  const loadConversation = useCallback(async (convId: string) => {
    const { data } = await (supabase as any)
      .from("help_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setConversationId(convId);
    setShowHistory(false);
    setError(null);
  }, []);

  const deleteConversation = useCallback(async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await (supabase as any).from("help_conversations").delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (conversationId === convId) {
      setMessages([]);
      setConversationId(null);
    }
  }, [conversationId]);

  const saveMessage = useCallback(async (convId: string, role: "user" | "assistant", content: string) => {
    await (supabase as any).from("help_messages").insert({ conversation_id: convId, role, content });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setInput("");
      setError(null);

      const userMsg: Msg = { role: "user", content: trimmed };
      const next = [...messages, userMsg];
      setMessages(next);
      setLoading(true);

      // Create or reuse conversation
      let convId = conversationId;
      if (!convId && user) {
        const title = trimmed.length > 50 ? trimmed.slice(0, 50) + "…" : trimmed;
        const { data: newConv } = await (supabase as any)
          .from("help_conversations")
          .insert({ photographer_id: user.id, title })
          .select("id")
          .single();
        if (newConv) {
          convId = newConv.id;
          setConversationId(convId);
        }
      } else if (convId) {
        // bump updated_at
        await (supabase as any)
          .from("help_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
      }

      if (convId) await saveMessage(convId, "user", trimmed);

      abortRef.current = new AbortController();
      let assistantText = "";

      try {
        await streamChat(
          next,
          (chunk) => {
            assistantText += chunk;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantText } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantText }];
            });
          },
          async () => {
            setLoading(false);
            if (convId && assistantText) {
              await saveMessage(convId, "assistant", assistantText);
              loadConversations();
            }
          },
          abortRef.current.signal
        );
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Something went wrong.");
        }
        setLoading(false);
      }
    },
    [messages, loading, conversationId, user, saveMessage, loadConversations]
  );

  const startNewConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setError(null);
    setLoading(false);
    setConversationId(null);
    setShowHistory(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed right-4 top-16 z-50 flex flex-col w-[380px] max-h-[calc(100vh-5rem)] bg-background border border-border shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                {showHistory ? (
                  <button
                    onClick={() => setShowHistory(false)}
                    className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-foreground flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-background" />
                  </div>
                )}
                <div>
                  <p className="text-[11px] tracking-[0.25em] uppercase font-light">
                    {showHistory ? "Conversation History" : "Davions Assistant"}
                  </p>
                  {!showHistory && (
                    <p className="text-[9px] text-muted-foreground tracking-wide">Ask anything about the platform</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!showHistory && (
                  <>
                    {messages.length > 0 && (
                      <button
                        onClick={startNewConversation}
                        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
                        title="New conversation"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => { setShowHistory(true); loadConversations(); }}
                      className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
                      title="History"
                    >
                      <History className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {showHistory && (
                  <button
                    onClick={startNewConversation}
                    className="h-7 px-2 flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 transition-colors rounded-sm"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* History View */}
            <AnimatePresence mode="wait">
              {showHistory ? (
                <motion.div
                  key="history"
                  className="flex-1 overflow-y-auto min-h-0"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.15 }}
                >
                  {historyLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center px-6 gap-2">
                      <p className="text-[11px] text-muted-foreground">No past conversations yet.</p>
                      <p className="text-[10px] text-muted-foreground/60">Start a chat to see it saved here.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => loadConversation(conv.id)}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start justify-between gap-2 group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-light text-foreground truncate">{conv.title}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteConversation(conv.id, e)}
                            className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-8">
                        <div className="h-10 w-10 rounded-full bg-foreground/5 border border-border flex items-center justify-center">
                          <Bot className="h-4.5 w-4.5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-light">How can I help?</p>
                          <p className="text-[11px] text-muted-foreground">Ask me anything about Davions features</p>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 w-full">
                          {STARTERS.map((s) => (
                            <button
                              key={s}
                              onClick={() => send(s)}
                              className="text-left text-[11px] text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 px-3 py-2 transition-colors bg-card"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "assistant" && (
                          <div className="h-6 w-6 rounded-full bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="h-3 w-3 text-background" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] text-[12px] leading-relaxed px-3 py-2 font-light ${
                            msg.role === "user"
                              ? "bg-foreground text-background whitespace-pre-wrap"
                              : "bg-muted/50 border border-border text-foreground"
                          }`}
                        >
                          {msg.role === "user" ? (
                            msg.content
                          ) : (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1.5">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1.5">{children}</ol>,
                                li: ({ children }) => <li className="text-[12px]">{children}</li>,
                                a: ({ href, children }) => (
                                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
                                    {children}
                                  </a>
                                ),
                                code: ({ children }) => (
                                  <code className="bg-foreground/10 px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>
                                ),
                                h1: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                                h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                                h3: ({ children }) => <p className="font-medium mb-1">{children}</p>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          )}
                          {msg.role === "assistant" && loading && i === messages.length - 1 && (
                            <span className="inline-block w-1.5 h-3.5 bg-muted-foreground/50 animate-pulse ml-0.5 align-middle" />
                          )}
                        </div>
                      </div>
                    ))}

                    {error && (
                      <p className="text-[11px] text-destructive text-center">{error}</p>
                    )}

                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-border px-3 py-3 shrink-0">
                    <div className="flex items-end gap-2 border border-input bg-background focus-within:ring-1 focus-within:ring-ring px-3 py-2">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Ask a question…"
                        rows={1}
                        className="flex-1 resize-none bg-transparent text-[12px] font-light text-foreground placeholder:text-muted-foreground/50 outline-none min-h-[20px] max-h-[80px]"
                        style={{ lineHeight: "1.5" }}
                      />
                      <button
                        onClick={() => send(input)}
                        disabled={!input.trim() || loading}
                        className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
                      >
                        {loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground/40 mt-1.5 text-center tracking-wide">
                      Press Enter to send · Shift+Enter for new line
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
