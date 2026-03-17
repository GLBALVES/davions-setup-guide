import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Plus, Trash2, Bot, Send, X, Loader2, BookOpen, Sparkles,
} from "lucide-react";

interface KnowledgeEntry { topic: string; content: string; }

interface Agent {
  id: string; slug: string; name: string; description: string; category: string;
  system_prompt: string; knowledge_base: KnowledgeEntry[]; model: string;
  temperature: number; enabled: boolean; auto_reply: boolean; review_mode: boolean;
  created_at: string; user_id: string; photographer_id: string;
}

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (fast)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (balanced)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (advanced)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (economic)" },
];

export default function AIAgents() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const aa = t.aiAgents;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testMessages, setTestMessages] = useState<{ role: string; content: string }[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("support");

  const CATEGORIES = [
    { value: "support", label: aa.catSupport },
    { value: "sales", label: aa.catSales },
    { value: "onboarding", label: aa.catOnboarding },
    { value: "internal", label: aa.catInternal },
    { value: "other", label: aa.catOther },
  ];

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from("ai_agents" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(aa.errorLoading); return; }
    setAgents(
      ((data as any[]) || []).map((a) => ({
        ...a,
        knowledge_base: Array.isArray(a.knowledge_base) ? a.knowledge_base : [],
        auto_reply: a.auto_reply ?? true,
        review_mode: a.review_mode ?? false,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleCreate = async () => {
    if (!newName || !newSlug) { toast.error(aa.nameRequired); return; }
    const { error } = await supabase.from("ai_agents" as any).insert({
      name: newName,
      slug: newSlug.toLowerCase().replace(/\s+/g, "-"),
      description: newDesc,
      category: newCategory,
      user_id: user?.id,
      photographer_id: user?.id,
    } as any);
    if (error) { toast.error(error.message.includes("duplicate") ? aa.slugExists : error.message); return; }
    toast.success(aa.agentCreated);
    setCreateOpen(false);
    setNewName(""); setNewSlug(""); setNewDesc(""); setNewCategory("support");
    fetchAgents();
  };

  const handleSave = async () => {
    if (!editAgent) return;
    const { error } = await supabase
      .from("ai_agents" as any)
      .update({
        name: editAgent.name, description: editAgent.description,
        system_prompt: editAgent.system_prompt, knowledge_base: editAgent.knowledge_base as any,
        model: editAgent.model, temperature: editAgent.temperature,
        enabled: editAgent.enabled, auto_reply: editAgent.auto_reply,
        review_mode: editAgent.review_mode, category: editAgent.category,
      } as any)
      .eq("id", editAgent.id);
    if (error) { toast.error(aa.errorSaving + error.message); return; }
    toast.success(aa.agentSaved);
    fetchAgents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(aa.deleteConfirm)) return;
    await supabase.from("ai_agents" as any).delete().eq("id", id);
    toast.success(aa.agentDeleted);
    fetchAgents();
    if (editAgent?.id === id) setEditAgent(null);
  };

  const handleToggle = async (agent: Agent) => {
    await supabase.from("ai_agents" as any).update({ enabled: !agent.enabled } as any).eq("id", agent.id);
    fetchAgents();
  };

  const addKnowledge = () => {
    if (!editAgent) return;
    setEditAgent({ ...editAgent, knowledge_base: [...editAgent.knowledge_base, { topic: "", content: "" }] });
  };

  const updateKnowledge = (idx: number, field: "topic" | "content", value: string) => {
    if (!editAgent) return;
    const kb = [...editAgent.knowledge_base];
    kb[idx] = { ...kb[idx], [field]: value };
    setEditAgent({ ...editAgent, knowledge_base: kb });
  };

  const removeKnowledge = (idx: number) => {
    if (!editAgent) return;
    setEditAgent({ ...editAgent, knowledge_base: editAgent.knowledge_base.filter((_, i) => i !== idx) });
  };

  const handleTest = async () => {
    if (!testInput.trim() || !editAgent) return;
    const userMsg = { role: "user", content: testInput };
    setTestMessages((prev) => [...prev, userMsg]);
    setTestInput("");
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { agent_slug: editAgent.slug, messages: [...testMessages, userMsg] },
      });
      if (error) throw error;
      const reply = data?.reply || data?.content || "No response";
      setTestMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error(aa.testError + (e.message || "unknown"));
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">{aa.pageTitle}</h1>
                  <p className="text-sm text-muted-foreground">{aa.pageSubtitle}</p>
                </div>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> {aa.newAgent}
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : agents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <Bot className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">{aa.noAgents}</p>
                  <Button variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> {aa.createFirst}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <Card key={agent.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setEditAgent(agent)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                        </div>
                        <Switch checked={agent.enabled} onCheckedChange={() => handleToggle(agent)} onClick={(e) => e.stopPropagation()} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{agent.description || aa.noDescription}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{CATEGORIES.find((c) => c.value === agent.category)?.label || agent.category}</Badge>
                        <Badge variant="outline" className="text-xs">{agent.knowledge_base.length} {aa.instructions}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{aa.createTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{aa.namLabel}</Label>
              <Input placeholder={aa.namePlaceholder} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{aa.slugLabel}</Label>
              <Input placeholder={aa.slugPlaceholder} value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
            </div>
            <div className="space-y-2">
              <Label>{aa.descLabel}</Label>
              <Input placeholder={aa.descPlaceholder} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{aa.categoryLabel}</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{aa.cancel}</Button>
            <Button onClick={handleCreate}>{aa.createBtn}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit sheet */}
      <Sheet open={!!editAgent} onOpenChange={(open) => !open && setEditAgent(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> {editAgent?.name}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            {editAgent && (
              <div className="space-y-6 pb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{aa.namLabel}</Label>
                    <Input value={editAgent.name} onChange={(e) => setEditAgent({ ...editAgent, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{aa.categoryLabel}</Label>
                    <Select value={editAgent.category} onValueChange={(v) => setEditAgent({ ...editAgent, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{aa.descLabel}</Label>
                  <Input value={editAgent.description} onChange={(e) => setEditAgent({ ...editAgent, description: e.target.value })} />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {aa.systemPromptLabel}</Label>
                  <p className="text-xs text-muted-foreground">{aa.systemPromptDesc}</p>
                  <Textarea className="min-h-[200px] font-mono text-sm" placeholder={aa.systemPromptPlaceholder} value={editAgent.system_prompt} onChange={(e) => setEditAgent({ ...editAgent, system_prompt: e.target.value })} />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {aa.knowledgeBase}</Label>
                    <Button variant="outline" size="sm" onClick={addKnowledge} className="gap-1"><Plus className="h-3 w-3" /> {aa.addKnowledge}</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{aa.knowledgeBaseDesc}</p>
                  {editAgent.knowledge_base.length === 0 && (
                    <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">{aa.noInstructions}</div>
                  )}
                  {editAgent.knowledge_base.map((entry, idx) => (
                    <Card key={idx} className="relative">
                      <button className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => removeKnowledge(idx)}>
                        <X className="h-4 w-4" />
                      </button>
                      <CardContent className="pt-4 space-y-3">
                        <Input placeholder={aa.topicPlaceholder} value={entry.topic} onChange={(e) => updateKnowledge(idx, "topic", e.target.value)} />
                        <Textarea placeholder={aa.contentPlaceholder} className="min-h-[80px] text-sm" value={entry.content} onChange={(e) => updateKnowledge(idx, "content", e.target.value)} />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{aa.modelLabel}</Label>
                    <Select value={editAgent.model} onValueChange={(v) => setEditAgent({ ...editAgent, model: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{aa.temperatureLabel}: {editAgent.temperature}</Label>
                    <Slider min={0} max={1} step={0.1} value={[editAgent.temperature]} onValueChange={([v]) => setEditAgent({ ...editAgent, temperature: v })} />
                    <p className="text-xs text-muted-foreground">{aa.temperatureHint}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={editAgent.enabled} onCheckedChange={(v) => setEditAgent({ ...editAgent, enabled: v })} />
                    <Label>{aa.agentActive}</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={editAgent.auto_reply} onCheckedChange={(v) => setEditAgent({ ...editAgent, auto_reply: v, review_mode: v ? editAgent.review_mode : false })} />
                    <div>
                      <Label>{aa.autoReply}</Label>
                      <p className="text-xs text-muted-foreground">{aa.autoReplyDesc}</p>
                    </div>
                  </div>
                  {editAgent.auto_reply && (
                    <div className="flex items-center gap-3 ml-6">
                      <Switch checked={editAgent.review_mode} onCheckedChange={(v) => setEditAgent({ ...editAgent, review_mode: v })} />
                      <div>
                        <Label>{aa.reviewMode}</Label>
                        <p className="text-xs text-muted-foreground">{aa.reviewModeDesc}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-4 flex items-center gap-2 justify-between">
            <Button variant="destructive" size="sm" onClick={() => editAgent && handleDelete(editAgent.id)} className="gap-1">
              <Trash2 className="h-3.5 w-3.5" /> {aa.deleteBtn}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setTestMessages([]); setTestOpen(true); }} className="gap-1">
                <Send className="h-3.5 w-3.5" /> {aa.testBtn}
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1">{aa.saveBtn}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Test chat dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> {aa.testTitle}{editAgent?.name}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg h-[300px] flex flex-col">
            <ScrollArea className="flex-1 p-3">
              {testMessages.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{aa.testPlaceholder}</p>}
              {testMessages.map((msg, i) => (
                <div key={i} className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="flex justify-start mb-2">
                  <div className="bg-muted rounded-lg px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                </div>
              )}
            </ScrollArea>
            <div className="border-t p-2 flex gap-2">
              <Input placeholder={aa.typeMessage} value={testInput} onChange={(e) => setTestInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleTest()} disabled={testLoading} />
              <Button size="icon" onClick={handleTest} disabled={testLoading || !testInput.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
