import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Loader2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  bug_report_id: string;
  sender_id: string;
  sender_email: string;
  is_admin: boolean;
  content: string;
  created_at: string;
}

interface UserBugThreadProps {
  bugReportId: string;
}

export function UserBugThread({ bugReportId }: UserBugThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const addMessage = (msg: Message) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  };

  useEffect(() => {
    seenIds.current.clear();

    (async () => {
      const { data } = await (supabase as any)
        .from("bug_report_messages")
        .select("*")
        .eq("bug_report_id", bugReportId)
        .order("created_at", { ascending: true });

      (data || []).forEach((m: Message) => {
        seenIds.current.add(m.id);
      });
      setMessages(data || []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`user-bug-thread-${bugReportId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "bug_report_messages",
          filter: `bug_report_id=eq.${bugReportId}`,
        },
        (payload: any) => {
          addMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bugReportId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);

    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      bug_report_id: bugReportId,
      sender_id: user.id,
      sender_email: user.email ?? "",
      is_admin: false,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    const content = newMessage.trim();
    setNewMessage("");
    addMessage(optimisticMsg);

    try {
      const { data, error } = await (supabase as any)
        .from("bug_report_messages")
        .insert({
          bug_report_id: bugReportId,
          sender_id: user.id,
          sender_email: user.email ?? "",
          is_admin: false,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        seenIds.current.add(data.id);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? (data as Message) : m))
        );
      }
    } catch {
      toast.error("Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      seenIds.current.delete(optimisticMsg.id);
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Messages with Support</p>

      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 italic text-center py-3">No replies yet.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-0.5 rounded-md px-3 py-2 max-w-[90%]",
                !msg.is_admin
                  ? "self-end bg-foreground text-background"
                  : "self-start bg-muted text-foreground border border-border"
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {msg.is_admin ? (
                  <ShieldCheck size={10} className="opacity-70 text-primary" />
                ) : (
                  <User size={10} className="opacity-70" />
                )}
                <span
                  className={cn(
                    "text-[10px] font-medium tracking-wide",
                    !msg.is_admin ? "opacity-70" : "text-muted-foreground"
                  )}
                >
                  {msg.is_admin ? "Support Team" : "You"}
                </span>
                <span
                  className={cn(
                    "text-[9px] ml-auto",
                    !msg.is_admin ? "opacity-50" : "text-muted-foreground/50"
                  )}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 items-end">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a message… (Enter to send)"
          className="min-h-[56px] resize-none text-xs"
          maxLength={2000}
        />
        <Button
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </Button>
      </div>
    </div>
  );
}
