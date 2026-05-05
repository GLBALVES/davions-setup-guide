import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  Info,
  Eye,
  Send,
  Save,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Settings2,
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface TemplateRow {
  id?: string;
  stage_trigger: string;
  name: string;
  subject: string;
  html_content: string;
  enabled: boolean;
  auto_send: boolean;
  from_name: string;
  delay_minutes: number;
  bcc_email: string;
}

interface LogRow {
  id: string;
  stage_trigger: string;
  recipient_email: string;
  subject: string;
  status: string;
  is_test: boolean;
  error_message: string | null;
  created_at: string;
}

const STAGE_TRIGGERS = [
  "reminder_14_days",
  "reminder_7_days",
  "reminder_1_day",
  "shot_to_editing",
  "editing_to_review",
  "review_to_delivered",
  "delivered_to_done",
  "gallery_linked",
] as const;

type Trigger = (typeof STAGE_TRIGGERS)[number];

const VARIABLES: { token: string; desc: string }[] = [
  { token: "{{client_name}}", desc: "Nome do cliente" },
  { token: "{{project_title}}", desc: "Título do projeto" },
  { token: "{{session_type}}", desc: "Tipo de sessão" },
  { token: "{{photographer_name}}", desc: "Seu nome" },
  { token: "{{shoot_date}}", desc: "Data do ensaio" },
  { token: "{{gallery_link}}", desc: "Link da galeria" },
  { token: "{{studio_name}}", desc: "Nome do estúdio" },
  { token: "{{studio_email}}", desc: "Email do estúdio" },
];

const SAMPLE_PREVIEW: Record<string, string> = {
  "{{client_name}}": "Maria Souza",
  "{{project_title}}": "Ensaio Família Souza",
  "{{session_type}}": "Ensaio Família",
  "{{photographer_name}}": "Você",
  "{{shoot_date}}": new Date().toLocaleDateString("pt-BR"),
  "{{gallery_link}}": "https://davions.com/gallery/exemplo",
  "{{studio_name}}": "Davions Studio",
  "{{studio_email}}": "contato@davions.com",
};

function fillSample(html: string): string {
  let out = html || "";
  for (const [k, v] of Object.entries(SAMPLE_PREVIEW)) out = out.split(k).join(v);
  return out;
}

function emptyTpl(trigger: string): TemplateRow {
  return {
    stage_trigger: trigger,
    name: "",
    subject: "",
    html_content: "",
    enabled: false,
    auto_send: false,
    from_name: "",
    delay_minutes: 0,
    bcc_email: "",
  };
}

export default function WorkflowEmailTemplates() {
  const { photographerId, user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Record<string, TemplateRow>>({});
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrigger, setActiveTrigger] = useState<Trigger>("shot_to_editing");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [logsSearch, setLogsSearch] = useState("");
  const [tab, setTab] = useState<"editor" | "logs">("editor");

  const triggerMeta: Record<string, { label: string; desc: string }> = {
    reminder_14_days: { label: "Lembrete · 14 dias antes", desc: "Enviado automaticamente 14 dias antes do ensaio (se ativado na sessão)." },
    reminder_7_days: { label: "Lembrete · 7 dias antes", desc: "Enviado automaticamente 7 dias antes do ensaio (se ativado na sessão)." },
    reminder_1_day: { label: "Lembrete · 1 dia antes", desc: "Enviado automaticamente 1 dia antes do ensaio (se ativado na sessão)." },
    shot_to_editing: { label: t.personalize.shotToEditing, desc: t.personalize.shotToEditingDesc },
    editing_to_review: { label: t.personalize.editingToReview, desc: t.personalize.editingToReviewDesc },
    review_to_delivered: { label: t.personalize.reviewToDelivered, desc: t.personalize.reviewToDeliveredDesc },
    delivered_to_done: { label: t.personalize.deliveredToDone, desc: t.personalize.deliveredToDoneDesc },
    gallery_linked: { label: t.personalize.galleryLinked, desc: t.personalize.galleryLinkedDesc },
  };

  const fetchTemplates = useCallback(async () => {
    if (!photographerId) return;
    const { data } = await (supabase as any)
      .from("workflow_email_templates")
      .select("*")
      .eq("photographer_id", photographerId);
    const map: Record<string, TemplateRow> = {};
    STAGE_TRIGGERS.forEach((trigger) => {
      const existing = data?.find((d: any) => d.stage_trigger === trigger);
      map[trigger] = existing
        ? { ...emptyTpl(trigger), ...existing }
        : emptyTpl(trigger);
    });
    setTemplates(map);
    setLoading(false);
  }, [photographerId]);

  const fetchLogs = useCallback(async () => {
    if (!photographerId) return;
    const { data } = await (supabase as any)
      .from("workflow_email_logs")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data || []);
  }, [photographerId]);

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, [fetchTemplates, fetchLogs]);

  const current = templates[activeTrigger];

  const updateField = <K extends keyof TemplateRow>(field: K, value: TemplateRow[K]) => {
    setTemplates((prev) => ({
      ...prev,
      [activeTrigger]: { ...prev[activeTrigger], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!photographerId || !current) return;
    setSaving(true);
    const payload = {
      photographer_id: photographerId,
      stage_trigger: activeTrigger,
      name: current.name,
      subject: current.subject,
      html_content: current.html_content,
      enabled: current.enabled,
      auto_send: current.auto_send,
      from_name: current.from_name,
      delay_minutes: current.delay_minutes,
      bcc_email: current.bcc_email,
    };
    const { data, error } = await (supabase as any)
      .from("workflow_email_templates")
      .upsert(payload, { onConflict: "photographer_id,stage_trigger" })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      return;
    }
    if (data) {
      setTemplates((prev) => ({ ...prev, [activeTrigger]: { ...prev[activeTrigger], id: data.id } }));
    }
    toast({ title: t.personalize.templateSaved });
  };

  const insertVariable = (token: string) => {
    updateField("html_content", (current?.html_content || "") + " " + token);
  };

  const handleSendTest = async () => {
    if (!testEmail || !current) return;
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("send-workflow-email-test", {
        body: {
          to: testEmail,
          subject: current.subject || "Teste",
          html: current.html_content || "<p>Conteúdo vazio</p>",
          fromName: current.from_name,
          templateId: current.id,
          stageTrigger: activeTrigger,
        },
      });
      if (error) throw error;
      toast({ title: "Email de teste enviado" });
      setTestOpen(false);
      fetchLogs();
    } catch (e: any) {
      toast({ title: "Falha ao enviar teste", description: e?.message, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  const filteredLogs = useMemo(() => {
    const q = logsSearch.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.recipient_email.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.stage_trigger.toLowerCase().includes(q),
    );
  }, [logs, logsSearch]);

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">
        {t.personalize.loading}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">
            {t.personalize.workflowEmailTemplates}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t.personalize.workflowEmailTemplatesDesc}
          </p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="editor" className="text-[10px] tracking-wider uppercase gap-1.5">
              <Settings2 className="h-3 w-3" /> Editor
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-[10px] tracking-wider uppercase gap-1.5">
              <History className="h-3 w-3" /> Histórico
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "editor" && (
        <div className="grid grid-cols-12 gap-6">
          {/* Triggers list */}
          <aside className="col-span-12 md:col-span-4 lg:col-span-3">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
              Gatilhos
            </p>
            <div className="border border-border divide-y divide-border">
              {STAGE_TRIGGERS.map((trigger) => {
                const tpl = templates[trigger];
                const meta = triggerMeta[trigger];
                const isActive = activeTrigger === trigger;
                return (
                  <button
                    key={trigger}
                    onClick={() => setActiveTrigger(trigger)}
                    className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors ${
                      isActive ? "bg-foreground text-background" : "hover:bg-accent/30"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-light truncate">{meta.label}</p>
                      <p className={`text-[10px] truncate ${isActive ? "opacity-70" : "text-muted-foreground"}`}>
                        {tpl?.name || meta.desc}
                      </p>
                    </div>
                    <span
                      className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                        tpl?.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Variables */}
            <div className="mt-6 border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] tracking-wider uppercase font-light text-muted-foreground">
                  Variáveis (clique para inserir)
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    onClick={() => insertVariable(v.token)}
                    title={v.desc}
                    className="text-[10px] px-2 py-0.5 bg-background border border-border text-muted-foreground hover:border-foreground hover:text-foreground font-mono transition-colors"
                  >
                    {v.token}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Editor */}
          {current && (
            <section className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-light">{triggerMeta[activeTrigger].label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {triggerMeta[activeTrigger].desc}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTestEmail(user?.email || "");
                      setTestOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Enviar teste
                  </Button>
                  <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Salvar
                  </Button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 border border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Switch checked={current.enabled} onCheckedChange={(v) => updateField("enabled", v)} />
                  <Label className="text-[11px] tracking-wider uppercase font-light">
                    {current.enabled ? "Ativo" : "Inativo"}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={current.auto_send}
                    onCheckedChange={(v) => updateField("auto_send", v)}
                    disabled={!current.enabled}
                  />
                  <Label className="text-[11px] tracking-wider uppercase font-light">
                    Envio automático
                  </Label>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    value={current.delay_minutes}
                    onChange={(e) => updateField("delay_minutes", Number(e.target.value) || 0)}
                    className="h-7 w-20 text-xs"
                  />
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                    min de atraso
                  </Label>
                </div>
              </div>

              {/* Meta fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-wider uppercase font-light text-muted-foreground">
                    Nome interno
                  </Label>
                  <Input
                    value={current.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Ex: Aviso de edição"
                    className="h-9 text-sm font-light"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-wider uppercase font-light text-muted-foreground">
                    Nome do remetente
                  </Label>
                  <Input
                    value={current.from_name}
                    onChange={(e) => updateField("from_name", e.target.value)}
                    placeholder="Davions Studio"
                    className="h-9 text-sm font-light"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-wider uppercase font-light text-muted-foreground">
                    Cópia oculta (BCC)
                  </Label>
                  <Input
                    value={current.bcc_email}
                    onChange={(e) => updateField("bcc_email", e.target.value)}
                    placeholder="opcional@dominio.com"
                    className="h-9 text-sm font-light"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-wider uppercase font-light text-muted-foreground">
                  Assunto
                </Label>
                <Input
                  value={current.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  placeholder={t.personalize.templateSubjectPlaceholder}
                  className="h-9 text-sm font-light"
                />
              </div>

              {/* Content */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-wider uppercase font-light text-muted-foreground">
                  Conteúdo
                </Label>
                <div className="border border-input min-h-[260px]">
                  <RichTextEditor
                    content={current.html_content}
                    onChange={(val) => updateField("html_content", val)}
                    placeholder={t.personalize.noTemplateContent}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="border border-border">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              placeholder="Buscar por destinatário, assunto ou gatilho"
              className="h-8 text-sm border-0 shadow-none focus-visible:ring-0 px-0"
            />
            <Button variant="ghost" size="sm" onClick={fetchLogs}>
              Atualizar
            </Button>
          </div>
          <ScrollArea className="max-h-[480px]">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-12 tracking-wider uppercase">
                Nenhum envio registrado
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-[10px] tracking-wider uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-light">Status</th>
                    <th className="text-left px-4 py-2 font-light">Quando</th>
                    <th className="text-left px-4 py-2 font-light">Gatilho</th>
                    <th className="text-left px-4 py-2 font-light">Destinatário</th>
                    <th className="text-left px-4 py-2 font-light">Assunto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="border-t border-border hover:bg-accent/20">
                      <td className="px-4 py-2">
                        {l.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {l.is_test ? "Teste" : "Enviado"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive" title={l.error_message || ""}>
                            <XCircle className="h-3 w-3" /> Erro
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {format(new Date(l.created_at), "dd/MM HH:mm")}
                      </td>
                      <td className="px-4 py-2 font-mono text-[10px]">{l.stage_trigger}</td>
                      <td className="px-4 py-2">{l.recipient_email}</td>
                      <td className="px-4 py-2 truncate max-w-xs">{l.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-wider uppercase font-light">
              Preview · {current ? triggerMeta[activeTrigger].label : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="border border-border">
            <div className="bg-muted/30 px-4 py-2 border-b border-border text-xs">
              <p>
                <span className="text-muted-foreground">De: </span>
                {current?.from_name || "Davions Studio"}
              </p>
              <p>
                <span className="text-muted-foreground">Assunto: </span>
                {fillSample(current?.subject || "")}
              </p>
            </div>
            <div
              className="p-5 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: fillSample(current?.html_content || "<p>Vazio</p>") }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-wider uppercase font-light">
              Enviar email de teste
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
              Destinatário
            </Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="voce@email.com"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              As variáveis serão substituídas por dados de exemplo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendTest} disabled={sendingTest || !testEmail} className="gap-1.5">
              {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
