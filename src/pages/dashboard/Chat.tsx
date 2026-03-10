import { useState, useEffect, useRef, useCallback } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MessageCircle,
  Send,
  X,
  Search,
  Bot,
  User,
  Shield,
  Paperclip,
  Star,
  Check,
  Edit3,
  Trash2,
  RotateCcw,
  Plus,
  Settings2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Ticket = {
  id: string;
  photographer_id: string;
  client_name: string;
  client_email: string;
  subject: string;
  status: string;
  ai_mode: string;
  rating: number | null;
  rating_comment: string | null;
  internal_notes: string | null;
  created_at: string;
  closed_at: string | null;
  updated_at: string;
};

type Message = {
  id: string;
  ticket_id: string;
  role: string;
  content: string;
  attachment_url: string | null;
  created_at: string;
};

type Agent = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  auto_reply: boolean;
  review_mode: boolean;
};

export default function Chat() {
  const { user, signOut } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"open" | "closed" | "all">("open");
  const [loading, setLoading] = useState(false);
  const [sendingAI, setSendingAI] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string>("");
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({ client_name: "", client_email: "", subject: "" });
  const [editingDraft, setEditingDraft] = useState<{ id: string; content: string } | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const photographerId = user?.id;

  // Load tickets
  const loadTickets = useCallback(async () => {
    if (!photographerId) return;
    let q = supabase
      .from("support_tickets")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("updated_at", { ascending: false });
    if (filterStatus !== "all") q = q.eq("status", filterStatus);
    const { data } = await q;
    setTickets((data as Ticket[]) || []);
  }, [photographerId, filterStatus]);

  // Load agents — auto-create default support agent if none exist
  useEffect(() => {
    if (!photographerId) return;
    const loadAgents = async () => {
      const { data } = await supabase
        .from("ai_agents")
        .select("id, name, slug, enabled, auto_reply, review_mode")
        .eq("photographer_id", photographerId);

      const allAgents = ((data as any[]) || []) as Agent[];

      // If no agents exist at all, seed a default Customer Support agent
      if (allAgents.length === 0) {
        const { data: created, error } = await supabase.from("ai_agents" as any).insert({
          name: "Customer Support",
          slug: "customer-support",
          description: "Default AI agent for customer support chat. Handles inquiries about bookings, galleries, sessions, and general questions.",
          category: "support",
          system_prompt: `You are a friendly and professional customer support assistant for a photography business. Your role is to help clients with their inquiries about photo sessions, bookings, galleries, pricing, and general questions.

Guidelines:
- Be warm, polite, and professional at all times
- Provide clear, concise answers
- If you don't know the answer, acknowledge it and suggest the client contact the photographer directly
- Help with booking inquiries, session details, gallery access, and payment questions
- Use a helpful and reassuring tone
- Keep responses focused and relevant`,
          knowledge_base: [
            { topic: "Bookings", content: "Clients can book photo sessions through the online store. Each session has specific availability slots, duration, and pricing. Clients receive a confirmation email after booking." },
            { topic: "Galleries", content: "After a photo session, the photographer creates a gallery with the client's photos. Clients receive a link to view and select their favorite photos. Galleries may have an access code for privacy." },
            { topic: "Sessions", content: "Photo sessions vary in type (portrait, wedding, event, etc.), duration, and pricing. Each session includes a set number of edited photos. Additional photos can be purchased." },
          ] as any,
          model: "google/gemini-3-flash-preview",
          temperature: 0.7,
          enabled: true,
          auto_reply: true,
          review_mode: false,
          user_id: photographerId,
          photographer_id: photographerId,
        } as any).select("*").single();

        if (!error && created) {
          const c = created as any;
          const agent = { ...c, knowledge_base: Array.isArray(c.knowledge_base) ? c.knowledge_base : [] } as unknown as Agent;
          setAgents([agent]);
          setSelectedAgentSlug(agent.slug);
          toast.success("Default Customer Support agent created automatically!");
          return;
        }
      }

      setAgents(allAgents);
      if (allAgents.length > 0 && !selectedAgentSlug) {
        const enabledAgent = allAgents.find(a => a.enabled);
        setSelectedAgentSlug(enabledAgent?.slug || allAgents[0].slug);
      }
    };
    loadAgents();
  }, [photographerId]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Load messages for selected ticket
  const loadMessages = useCallback(async () => {
    if (!selectedTicket) return;
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", selectedTicket.id)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
  }, [selectedTicket]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!selectedTicket) return;
    const channel = supabase
      .channel(`messages-${selectedTicket.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `ticket_id=eq.${selectedTicket.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update internal notes when ticket changes
  useEffect(() => {
    setInternalNotes(selectedTicket?.internal_notes || "");
  }, [selectedTicket]);

  // Send admin message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    setLoading(true);
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: selectedTicket.id,
      role: "admin",
      content: newMessage.trim(),
    });
    if (error) toast.error("Failed to send message");
    else {
      setNewMessage("");
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);
    }
    setLoading(false);
  };

  // Get current AI mode from active agent's state
  const getAgentAIMode = (): string => {
    const activeAgent = agents.find(a => a.slug === selectedAgentSlug);
    if (!activeAgent || !activeAgent.auto_reply) return "manual";
    if (activeAgent.review_mode) return "supervised";
    return "active";
  };

  // Trigger AI response
  const triggerAI = async () => {
    if (!selectedTicket) return;
    const currentMode = getAgentAIMode();
    setSendingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          ticket_id: selectedTicket.id,
          agent_slug: selectedAgentSlug || undefined,
          mode: currentMode,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(currentMode === "supervised" ? "Draft generated" : "AI response sent");
      loadMessages();
    } catch (e: any) {
      toast.error(e.message || "AI error");
    }
    setSendingAI(false);
  };

  // Update agent toggle (Commander)
  const updateAgentToggle = async (field: "auto_reply" | "review_mode", value: boolean) => {
    const activeAgent = agents.find(a => a.slug === selectedAgentSlug);
    if (!activeAgent) return;
    const updates: any = { [field]: value };
    if (field === "auto_reply" && !value) updates.review_mode = false;
    await supabase.from("ai_agents" as any).update(updates).eq("id", activeAgent.id);
    setAgents(prev => prev.map(a => a.id === activeAgent.id ? { ...a, ...updates } : a));
  };

  // Draft count for Commander badge
  const draftCount = messages.filter(m => m.role === "assistant_draft").length;

  // Approve draft
  const approveDraft = async (msg: Message) => {
    await supabase.from("support_messages").update({ role: "assistant" }).eq("id", msg.id);
    loadMessages();
    toast.success("Draft approved");
  };

  // Edit draft
  const saveEditedDraft = async () => {
    if (!editingDraft) return;
    await supabase
      .from("support_messages")
      .update({ role: "assistant", content: editingDraft.content })
      .eq("id", editingDraft.id);
    setEditingDraft(null);
    loadMessages();
    toast.success("Draft edited and approved");
  };

  // Discard draft
  const discardDraft = async (msgId: string) => {
    await supabase.from("support_messages").delete().eq("id", msgId);
    loadMessages();
    toast.success("Draft discarded");
  };

  // Close ticket
  const closeTicket = async () => {
    if (!selectedTicket) return;
    // Send closing message
    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket.id,
      role: "admin",
      content: "This ticket has been closed. Thank you for reaching out!",
    });
    await supabase
      .from("support_tickets")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", selectedTicket.id);
    setSelectedTicket((prev) => prev ? { ...prev, status: "closed", closed_at: new Date().toISOString() } : null);
    loadTickets();
    toast.success("Ticket closed");
  };

  // Reopen ticket
  const reopenTicket = async () => {
    if (!selectedTicket) return;
    await supabase
      .from("support_tickets")
      .update({ status: "open", closed_at: null })
      .eq("id", selectedTicket.id);
    setSelectedTicket((prev) => prev ? { ...prev, status: "open", closed_at: null } : null);
    loadTickets();
    toast.success("Ticket reopened");
  };





  const saveNotes = async () => {
    if (!selectedTicket) return;
    await supabase.from("support_tickets").update({ internal_notes: internalNotes }).eq("id", selectedTicket.id);
    toast.success("Notes saved");
  };

  // Create new ticket
  const createTicket = async () => {
    if (!photographerId || !newTicketForm.subject.trim()) return;
    const { error } = await supabase.from("support_tickets").insert({
      photographer_id: photographerId,
      client_name: newTicketForm.client_name,
      client_email: newTicketForm.client_email,
      subject: newTicketForm.subject,
    });
    if (error) toast.error("Failed to create ticket");
    else {
      setShowNewTicketDialog(false);
      setNewTicketForm({ client_name: "", client_email: "", subject: "" });
      loadTickets();
      toast.success("Ticket created");
    }
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;
    const path = `${selectedTicket.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket.id,
      role: "admin",
      content: `📎 ${file.name}`,
      attachment_url: urlData.publicUrl,
    });
    loadMessages();
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.subject.toLowerCase().includes(q) ||
      t.client_name.toLowerCase().includes(q) ||
      t.client_email.toLowerCase().includes(q)
    );
  });

  const aiModeLabel = (mode: string) => {
    switch (mode) {
      case "active": return "AI Active";
      case "supervised": return "Supervised";
      default: return "Manual";
    }
  };

  const aiModeColor = (mode: string) => {
    switch (mode) {
      case "active": return "bg-green-500/10 text-green-600 border-green-500/30";
      case "supervised": return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Ticket List */}
            <div className="w-80 border-r border-border flex flex-col bg-background">
              <div className="p-3 border-b border-border space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium tracking-wide uppercase">Tickets</h2>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewTicketDialog(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  {(["open", "all", "closed"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={filterStatus === s ? "default" : "ghost"}
                      className="text-[10px] h-6 px-2 flex-1"
                      onClick={() => setFilterStatus(s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <ScrollArea className="flex-1">
                {filteredTickets.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">No tickets found</p>
                ) : (
                  filteredTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full text-left p-3 border-b border-border hover:bg-accent/50 transition-colors ${
                        selectedTicket?.id === ticket.id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{ticket.subject || "No subject"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{ticket.client_name || ticket.client_email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 ${
                              ticket.status === "open" ? "border-green-500/50 text-green-600" : "border-muted"
                            }`}
                          >
                            {ticket.status}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {format(new Date(ticket.updated_at), "MMM d")}
                          </span>
                        </div>
                      </div>
                      {ticket.ai_mode !== "manual" && (
                        <Badge variant="outline" className={`mt-1 text-[9px] px-1 py-0 ${aiModeColor(ticket.ai_mode)}`}>
                          <Bot className="h-2.5 w-2.5 mr-0.5" />
                          {aiModeLabel(ticket.ai_mode)}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Center Panel: Conversation */}
            {selectedTicket ? (
              <div className="flex-1 flex flex-col min-w-0">
                {/* Ticket header */}
                <div className="p-3 border-b border-border flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate">{selectedTicket.subject}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedTicket.client_name} · {selectedTicket.client_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* AI Mode selector */}
                    <Select value={selectedTicket.ai_mode} onValueChange={changeAIMode}>
                      <SelectTrigger className="h-7 w-32 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                        <SelectItem value="active" className="text-xs">AI Active</SelectItem>
                        <SelectItem value="supervised" className="text-xs">Supervised</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Agent selector */}
                    {agents.length > 0 && selectedTicket.ai_mode !== "manual" && (
                      <>
                        <Select value={selectedAgentSlug} onValueChange={setSelectedAgentSlug}>
                          <SelectTrigger className="h-7 w-36 text-[10px]">
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map((a) => (
                              <SelectItem key={a.id} value={a.slug} className="text-xs">{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => window.location.href = "/dashboard/agents"}
                          title="Agent Settings"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {selectedTicket.status === "open" ? (
                      <Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={closeTicket}>
                        <X className="h-3 w-3 mr-1" /> Close
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={reopenTicket}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Reopen
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {messages.map((msg) => {
                      const isUser = msg.role === "user";
                      const isDraft = msg.role === "assistant_draft";
                      const isAI = msg.role === "assistant";
                      const isAdmin = msg.role === "admin";

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                              isUser
                                ? "bg-muted text-foreground"
                                : isDraft
                                ? "bg-amber-500/10 border border-amber-500/30 text-foreground"
                                : isAI
                                ? "bg-primary/10 border border-primary/30 text-foreground"
                                : "bg-foreground text-background"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {isUser && <User className="h-3 w-3" />}
                              {isAI && <Bot className="h-3 w-3" />}
                              {isDraft && <Shield className="h-3 w-3 text-amber-600" />}
                              {isAdmin && <User className="h-3 w-3" />}
                              <span className="text-[9px] opacity-60">
                                {isUser ? "Client" : isDraft ? "AI Draft" : isAI ? "AI" : "You"} ·{" "}
                                {format(new Date(msg.created_at), "HH:mm")}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.attachment_url && (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] underline mt-1 block text-primary"
                              >
                                View attachment
                              </a>
                            )}
                            {isDraft && (
                              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-amber-500/20">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 text-[9px] px-1.5 text-green-600"
                                  onClick={() => approveDraft(msg)}
                                >
                                  <Check className="h-2.5 w-2.5 mr-0.5" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 text-[9px] px-1.5"
                                  onClick={() => setEditingDraft({ id: msg.id, content: msg.content })}
                                >
                                  <Edit3 className="h-2.5 w-2.5 mr-0.5" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 text-[9px] px-1.5 text-destructive"
                                  onClick={() => discardDraft(msg.id)}
                                >
                                  <Trash2 className="h-2.5 w-2.5 mr-0.5" /> Discard
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message input */}
                {selectedTicket.status === "open" && (
                  <div className="p-3 border-t border-border">
                    <div className="flex items-end gap-2 max-w-2xl mx-auto">
                      <div className="flex-1 relative">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="pr-10 text-xs"
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        />
                        <label className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground">
                          <Paperclip className="h-3.5 w-3.5" />
                          <input type="file" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                      <Button size="sm" onClick={sendMessage} disabled={loading || !newMessage.trim()} className="h-10">
                        <Send className="h-4 w-4" />
                      </Button>
                      {selectedTicket.ai_mode !== "manual" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={triggerAI}
                          disabled={sendingAI}
                          className="h-10 text-[10px]"
                        >
                          <Bot className="h-4 w-4 mr-1" />
                          {sendingAI ? "Thinking..." : selectedTicket.ai_mode === "supervised" ? "Generate Draft" : "AI Reply"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Rating display for closed tickets */}
                {selectedTicket.status === "closed" && selectedTicket.rating && (
                  <div className="p-3 border-t border-border text-center">
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= (selectedTicket.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                        />
                      ))}
                    </div>
                    {selectedTicket.rating_comment && (
                      <p className="text-[10px] text-muted-foreground mt-1">{selectedTicket.rating_comment}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <MessageCircle className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-sm">Select a ticket to view the conversation</p>
                </div>
              </div>
            )}

            {/* Right Panel: Client Info */}
            {selectedTicket && (
              <div className="w-72 border-l border-border flex flex-col bg-background">
                <div className="p-3 border-b border-border">
                  <h3 className="text-xs font-medium tracking-wide uppercase">Client Info</h3>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Name</Label>
                      <p className="text-xs mt-0.5">{selectedTicket.client_name || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</Label>
                      <p className="text-xs mt-0.5">{selectedTicket.client_email || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</Label>
                      <p className="text-xs mt-0.5">{format(new Date(selectedTicket.created_at), "MMM d, yyyy HH:mm")}</p>
                    </div>
                    {selectedTicket.closed_at && (
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Closed</Label>
                        <p className="text-xs mt-0.5">{format(new Date(selectedTicket.closed_at), "MMM d, yyyy HH:mm")}</p>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">AI Mode</Label>
                      <Badge variant="outline" className={`mt-1 text-[9px] ${aiModeColor(selectedTicket.ai_mode)}`}>
                        {aiModeLabel(selectedTicket.ai_mode)}
                      </Badge>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Internal Notes</Label>
                      <Textarea
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        className="mt-1 text-xs min-h-[80px]"
                        placeholder="Private notes about this ticket..."
                      />
                      <Button size="sm" variant="outline" className="mt-1 h-6 text-[10px] w-full" onClick={saveNotes}>
                        Save Notes
                      </Button>
                    </div>

                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Client Name</Label>
              <Input
                value={newTicketForm.client_name}
                onChange={(e) => setNewTicketForm((p) => ({ ...p, client_name: e.target.value }))}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Client Email</Label>
              <Input
                value={newTicketForm.client_email}
                onChange={(e) => setNewTicketForm((p) => ({ ...p, client_email: e.target.value }))}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input
                value={newTicketForm.subject}
                onChange={(e) => setNewTicketForm((p) => ({ ...p, subject: e.target.value }))}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTicketDialog(false)}>Cancel</Button>
            <Button onClick={createTicket}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Draft Dialog */}
      <Dialog open={!!editingDraft} onOpenChange={() => setEditingDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editingDraft?.content || ""}
            onChange={(e) => setEditingDraft((prev) => prev ? { ...prev, content: e.target.value } : null)}
            className="min-h-[150px] text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDraft(null)}>Cancel</Button>
            <Button onClick={saveEditedDraft}>Approve & Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
