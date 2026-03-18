import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Bot, Loader2, RotateCcw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          () => setLoading(false),
          abortRef.current.signal
        );
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Something went wrong.");
        }
        setLoading(false);
      }
    },
    [messages, loading]
  );

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setError(null);
    setLoading(false);
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
                <div className="h-6 w-6 rounded-full bg-foreground flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-background" />
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.25em] uppercase font-light">Davions Assistant</p>
                  <p className="text-[9px] text-muted-foreground tracking-wide">Ask anything about the platform</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={reset}
                    className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
                    title="New conversation"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
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
                    className={`max-w-[80%] text-[12px] leading-relaxed px-3 py-2 font-light whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-muted/50 border border-border text-foreground"
                    }`}
                  >
                    {msg.content}
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
        </>
      )}
    </AnimatePresence>
  );
}
