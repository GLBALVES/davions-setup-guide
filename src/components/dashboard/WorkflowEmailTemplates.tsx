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
  ChevronDown,
  ChevronRight,
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

const JOURNEY_TRIGGERS = [
  "booking_confirmed",
  "session_completed",
  "proof_gallery_sent",
  "selection_completed",
  "final_gallery_sent",
  "download_reminder_7d",
  "post_delivery_feedback_7d",
] as const;

const REMINDER_TRIGGERS = [
  "reminder_14_days",
  "reminder_7_days",
  "reminder_1_day",
] as const;

const PAYMENT_TRIGGERS = [
  "balance_due_session_day",
] as const;

const ENGAGEMENT_TRIGGERS = [
  "briefing_pending_reminder",
] as const;

const STAGE_TRIGGERS = [...JOURNEY_TRIGGERS, ...REMINDER_TRIGGERS, ...PAYMENT_TRIGGERS, ...ENGAGEMENT_TRIGGERS] as const;

type Trigger = (typeof STAGE_TRIGGERS)[number];

const VARIABLES: { token: string; desc: string }[] = [
  { token: "{{client_name}}", desc: "Nome do cliente" },
  { token: "{{project_title}}", desc: "Título do projeto" },
  { token: "{{session_type}}", desc: "Tipo de sessão" },
  { token: "{{photographer_name}}", desc: "Seu nome" },
  { token: "{{shoot_date}}", desc: "Data do ensaio" },
  { token: "{{gallery_link}}", desc: "Link da galeria" },
  { token: "{{download_link}}", desc: "Link de download" },
  { token: "{{selection_deadline}}", desc: "Prazo p/ seleção" },
  { token: "{{final_delivery_eta}}", desc: "Previsão galeria final" },
  { token: "{{feedback_link}}", desc: "Link de feedback" },
  { token: "{{studio_name}}", desc: "Nome do estúdio" },
  { token: "{{studio_email}}", desc: "Email do estúdio" },
  { token: "{{shoot_time}}", desc: "Horário do ensaio" },
  { token: "{{balance_amount}}", desc: "Valor do saldo restante" },
  { token: "{{payment_link}}", desc: "Link de pagamento do saldo" },
  { token: "{{briefing_link}}", desc: "Link do briefing pendente" },
];

const SAMPLE_PREVIEW: Record<string, string> = {
  "{{client_name}}": "Maria Souza",
  "{{project_title}}": "Ensaio Família Souza",
  "{{session_type}}": "Ensaio Família",
  "{{photographer_name}}": "Você",
  "{{shoot_date}}": new Date().toLocaleDateString("pt-BR"),
  "{{gallery_link}}": "https://davions.com/gallery/exemplo",
  "{{download_link}}": "https://davions.com/gallery/exemplo/download",
  "{{selection_deadline}}": "7 dias",
  "{{final_delivery_eta}}": "30 dias",
  "{{feedback_link}}": "https://davions.com/feedback/exemplo",
  "{{studio_name}}": "Davions Studio",
  "{{studio_email}}": "contato@davions.com",
  "{{shoot_time}}": "14:00",
  "{{balance_amount}}": "R$ 350,00",
  "{{payment_link}}": "https://davions.com/pay/exemplo",
  "{{briefing_link}}": "https://davions.com/briefing/exemplo",
};

function fillSample(html: string): string {
  let out = html || "";
  for (const [k, v] of Object.entries(SAMPLE_PREVIEW)) out = out.split(k).join(v);
  return out;
}

const DEFAULT_CONTENT: Record<string, { name: string; subject: string; html: string }> = {
  booking_confirmed: {
    name: "Boas-vindas",
    subject: "Sua sessão está confirmada, {{client_name}} ✨",
    html: `<p>Olá {{client_name}},</p>
<p>Que alegria ter você com a gente! Sua sessão <strong>{{session_type}}</strong> está confirmada para o dia <strong>{{shoot_date}}</strong>.</p>
<p>Em breve enviaremos mais informações sobre os preparativos. Se tiver qualquer dúvida, é só responder este email.</p>
<p>Com carinho,<br/>{{photographer_name}}<br/>{{studio_name}}</p>`,
  },
  session_completed: {
    name: "Pós-sessão · agradecimento",
    subject: "Obrigado pela sessão, {{client_name}} 💛",
    html: `<p>Olá {{client_name}},</p>
<p>Foi um prazer fotografar você! Espero que tenha gostado da experiência tanto quanto eu.</p>
<p>Agora começa a curadoria das imagens. Em até <strong>{{selection_deadline}}</strong> sua galeria de provas estará disponível para você escolher as fotos favoritas.</p>
<p>Te aviso assim que estiver pronta!</p>
<p>Abraço,<br/>{{photographer_name}}</p>`,
  },
  proof_gallery_sent: {
    name: "Galeria de provas",
    subject: "Sua galeria de provas chegou, {{client_name}} 📸",
    html: `<p>Olá {{client_name}},</p>
<p>Sua galeria de provas do projeto <strong>{{project_title}}</strong> já está disponível!</p>
<p>Acesse o link abaixo para visualizar e selecionar suas fotos favoritas:</p>
<p><a href="{{gallery_link}}">{{gallery_link}}</a></p>
<p>Você tem <strong>{{selection_deadline}}</strong> para fazer sua escolha. Qualquer dúvida, estou à disposição.</p>
<p>{{photographer_name}}</p>`,
  },
  selection_completed: {
    name: "Seleção concluída",
    subject: "Recebemos sua seleção, {{client_name}} ✓",
    html: `<p>Olá {{client_name}},</p>
<p>Recebemos sua seleção de fotos! Elas já entraram na fila de pós-produção.</p>
<p>O prazo estimado para a entrega da galeria final é de <strong>{{final_delivery_eta}}</strong>. Vou te avisar assim que estiver pronta.</p>
<p>Obrigado pela confiança,<br/>{{photographer_name}}</p>`,
  },
  final_gallery_sent: {
    name: "Galeria final entregue",
    subject: "Sua galeria final está pronta, {{client_name}} 🎉",
    html: `<p>Olá {{client_name}},</p>
<p>É com muito carinho que entrego sua galeria final do projeto <strong>{{project_title}}</strong>.</p>
<p>Acesse e baixe suas fotos no link abaixo:</p>
<p><a href="{{gallery_link}}">{{gallery_link}}</a></p>
<p>Espero que você ame cada imagem tanto quanto eu amei criá-las.</p>
<p>Com carinho,<br/>{{photographer_name}}<br/>{{studio_name}}</p>`,
  },
  download_reminder_7d: {
    name: "Lembrete de download",
    subject: "Não esqueça de baixar suas fotos, {{client_name}}",
    html: `<p>Olá {{client_name}},</p>
<p>Notei que você ainda não baixou as fotos da sua galeria. Não deixe para depois — garanta que estão salvas com você!</p>
<p><a href="{{download_link}}">Baixar minhas fotos</a></p>
<p>Qualquer dificuldade, é só me avisar.</p>
<p>{{photographer_name}}</p>`,
  },
  post_delivery_feedback_7d: {
    name: "Pedido de feedback",
    subject: "Como foi sua experiência, {{client_name}}? 💬",
    html: `<p>Olá {{client_name}},</p>
<p>Espero que esteja amando suas fotos! 💛</p>
<p>Sua opinião é muito importante para mim. Você poderia compartilhar como foi sua experiência? Leva menos de 2 minutos:</p>
<p><a href="{{feedback_link}}">Deixar meu depoimento</a></p>
<p>Foi um prazer fotografar você. Até a próxima!</p>
<p>{{photographer_name}}</p>`,
  },
  reminder_14_days: {
    name: "Lembrete · 14 dias",
    subject: "Sua sessão é em 14 dias, {{client_name}} 📅",
    html: `<p>Olá {{client_name}},</p>
<p>Faltam apenas <strong>14 dias</strong> para a sua sessão <strong>{{session_type}}</strong> no dia <strong>{{shoot_date}}</strong>.</p>
<p>Comece a pensar nos looks, acessórios e referências. Se tiver dúvidas sobre o que levar ou vestir, é só me avisar.</p>
<p>Mal posso esperar!<br/>{{photographer_name}}</p>`,
  },
  reminder_7_days: {
    name: "Lembrete · 7 dias",
    subject: "Sua sessão é na próxima semana, {{client_name}}",
    html: `<p>Olá {{client_name}},</p>
<p>Sua sessão <strong>{{session_type}}</strong> está chegando! Será no dia <strong>{{shoot_date}}</strong>.</p>
<p>Confirme que está tudo certo de sua parte e separe os looks com antecedência. Qualquer ajuste, me avise o quanto antes.</p>
<p>Até breve,<br/>{{photographer_name}}</p>`,
  },
  reminder_1_day: {
    name: "Lembrete · 1 dia",
    subject: "É amanhã, {{client_name}}! 🎬",
    html: `<p>Olá {{client_name}},</p>
<p>Passando para lembrar que sua sessão é <strong>amanhã ({{shoot_date}})</strong>.</p>
<p>Dicas finais: durma bem, hidrate-se, e venha leve e tranquilo(a). O resto a gente faz junto!</p>
<p>Até amanhã,<br/>{{photographer_name}}</p>`,
  },
  balance_due_session_day: {
    name: "Pagamento · saldo no dia da sessão",
    subject: "Lembrete de pagamento — sessão {{session_type}}",
    html: `<p>Olá {{client_name}},</p>
<p>Este é um lembrete amigável: o saldo restante da sua sessão <strong>{{session_type}}</strong> ({{shoot_date}} às {{shoot_time}}) é de <strong>{{balance_amount}}</strong>.</p>
<p>Para sua comodidade, você pode efetuar o pagamento de forma segura pelo link abaixo:</p>
<p><a href="{{payment_link}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:4px;">Pagar saldo agora</a></p>
<p>Qualquer dúvida, é só responder este email.</p>
<p>{{photographer_name}}<br/>{{studio_name}}</p>`,
  },
  briefing_pending_reminder: {
    name: "Briefing pendente · lembrete diário",
    subject: "Falta seu briefing para a sessão {{session_type}} 📝",
    html: `<p>Olá {{client_name}},</p>
<p>Notei que o briefing da sua sessão <strong>{{session_type}}</strong> ({{shoot_date}}) ainda não foi preenchido.</p>
<p>Ele é rapidinho e me ajuda muito a preparar tudo do jeito que você imagina. Pode preencher pelo link abaixo:</p>
<p><a href="{{briefing_link}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:4px;">Preencher briefing</a></p>
<p>Qualquer dúvida, é só responder este email.</p>
<p>{{photographer_name}}<br/>{{studio_name}}</p>`,
  },
};

function emptyTpl(trigger: string): TemplateRow {
  const def = DEFAULT_CONTENT[trigger];
  return {
    stage_trigger: trigger,
    name: def?.name || "",
    subject: def?.subject || "",
    html_content: def?.html || "",
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
  const [activeTrigger, setActiveTrigger] = useState<Trigger>("booking_confirmed");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [logsSearch, setLogsSearch] = useState("");
  const [tab, setTab] = useState<"editor" | "logs">("editor");
  const [editorOpen, setEditorOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const triggerMeta: Record<Trigger, { label: string; desc: string }> = {
    booking_confirmed: { label: "1 · Boas-vindas (sessão fechada)", desc: "Enviado quando o cliente confirma e paga a sessão." },
    session_completed: { label: "2 · Pós-sessão (agradecimento)", desc: "Enviado após a data e hora do ensaio terminarem, agradecendo e informando a próxima etapa." },
    proof_gallery_sent: { label: "3 · Galeria de provas enviada", desc: "Enviado quando você publica a galeria de provas para seleção." },
    selection_completed: { label: "4 · Seleção concluída", desc: "Enviado quando o cliente finaliza a escolha; informa fila de pós-produção e prazo." },
    final_gallery_sent: { label: "5 · Galeria final enviada", desc: "Enviado quando você publica a galeria final para download." },
    download_reminder_7d: { label: "6 · Lembrete de download (7d)", desc: "Enviado 7 dias após o envio da galeria final, se o cliente ainda não baixou as fotos." },
    post_delivery_feedback_7d: { label: "7 · Pós-entrega · feedback (7d)", desc: "Enviado 7 dias após o cliente baixar as fotos, agradecendo e pedindo feedback." },
    reminder_14_days: { label: "Pré-sessão · 14 dias antes", desc: "Enviado 14 dias antes do ensaio (se ativado na sessão)." },
    reminder_7_days: { label: "Pré-sessão · 7 dias antes", desc: "Enviado 7 dias antes do ensaio (se ativado na sessão)." },
    reminder_1_day: { label: "Pré-sessão · 1 dia antes", desc: "Enviado 1 dia antes do ensaio (se ativado na sessão)." },
    balance_due_session_day: { label: "Pagamento · saldo no dia da sessão", desc: "Enviado conforme o offset configurado em Sessions → Payment → On the session day, com link de pagamento do saldo restante." },
    briefing_pending_reminder: { label: "Briefing · lembrete diário", desc: "Enviado uma vez por dia até que o cliente preencha o briefing da sessão (para ensaios futuros)." },
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
        <div className="space-y-4">
          {[
            { title: "Jornada do cliente", desc: "7 etapas automáticas do início ao fim do projeto", keys: [...JOURNEY_TRIGGERS] as Trigger[] },
            { title: "Lembretes pré-sessão", desc: "Disparados antes da data do ensaio (se ativados na sessão)", keys: [...REMINDER_TRIGGERS] as Trigger[] },
            { title: "Pagamento", desc: "Lembrete + link Stripe para o saldo restante (quando 'On the session day' está ativo)", keys: [...PAYMENT_TRIGGERS] as Trigger[] },
            { title: "Engajamento", desc: "Lembretes recorrentes para ações pendentes do cliente", keys: [...ENGAGEMENT_TRIGGERS] as Trigger[] },
          ].map((group) => {
            const isCollapsed = !!collapsedGroups[group.title];
            return (
              <div key={group.title} className="border border-border">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
                >
                  <div>
                    <p className="text-[11px] tracking-[0.25em] uppercase font-light">{group.title}</p>
                    <p className="text-[10px] text-muted-foreground">{group.desc}</p>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 pt-0">
                    {group.keys.map((trigger) => {
                      const tpl = templates[trigger];
                      const meta = triggerMeta[trigger];
                      return (
                        <button
                          key={trigger}
                          onClick={() => {
                            setActiveTrigger(trigger);
                            setEditorOpen(true);
                          }}
                          className="group text-left border border-border bg-background hover:border-foreground transition-colors p-4 flex flex-col gap-3 min-h-[140px]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span
                              className={`inline-flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase ${
                                tpl?.enabled ? "text-emerald-600" : "text-muted-foreground"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  tpl?.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                                }`}
                              />
                              {tpl?.enabled ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-light leading-tight mb-1">{meta.label}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-2">
                              {tpl?.subject || meta.desc}
                            </p>
                          </div>
                          {tpl?.auto_send && (
                            <span className="text-[9px] tracking-wider uppercase text-muted-foreground">
                              Envio automático
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-wider uppercase font-light">
              {current ? triggerMeta[activeTrigger].label : ""}
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground">
              {current ? triggerMeta[activeTrigger].desc : ""}
            </p>
          </DialogHeader>

          {current && (
            <div className="flex flex-col gap-5">
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

              {/* Variables */}
              <div className="border border-border bg-muted/20 p-3">
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
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
