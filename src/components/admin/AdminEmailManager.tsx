import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n/email-i18n";
import {
  Mail, Bell, Settings, PenSquare, Search, Inbox, Star, Users, RefreshCw,
  FolderOpen, Sparkles, BarChart2, Trash2, Reply, Forward,
  ClipboardList, Archive, ChevronLeft, ChevronRight, Send,
  AlertTriangle, ShieldOff, CheckCircle, SendHorizonal, X, Loader2,
  Plus, Pencil, ChevronDown, Save, FolderInput, StarOff,
  MessageSquare, FolderPlus, MailOpen, SearchX, AlertCircle,
  PenLine, Clock, PieChart, Activity, ArrowLeft, BellOff,
  Eye, EyeOff, Wifi, FileText, Briefcase, Tag, BookOpen, Code,
  Globe, ShoppingBag, Heart, Rocket, LucideIcon, Zap,
  XCircle, Play, Pause, Copy, RotateCcw, FileEdit, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { chamarIA } from "@/lib/email-ai-helper";
import ComposeModal from "@/components/admin/AdminComposeModal";
import { useAdminEmailData } from "@/hooks/use-admin-email-data";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─── */
type Prioridade = "urgente" | "alta" | "normal" | "baixa";
type ServerConfig = { ativo: boolean; servidor: string; porta: number; seguranca: "ssl" | "starttls" | "nenhuma"; usuario: string; senha: string };
type Conta = { id: string; nome: string; email: string; cor: string; assinatura: string; padrao: boolean; provedor: "gmail" | "outlook" | "yahoo" | "icloud" | "hotmail" | "hostinger" | "custom"; imap: ServerConfig; smtp: ServerConfig };
type PastaRegra = { tipo: "remetente" | "assunto" | "tag"; valor: string };
type Pasta = { id: string; nome: string; icone: string; cor: string; regras: PastaRegra[]; emailIds: string[] };
type Assinatura = { id: string; nome: string; conteudo: string; contaIds: string[] };
type RegraSegmentacao = { id: string; seTipo: string; seValor: string; entaoTipo: string; entaoValor: string };
type Preferencias = { marcarAoAbrir: boolean; mostrarPreview: boolean; notificacoes: boolean; emailsPorPagina: number; idiomaIA: string };
type RespostaAutomatica = { ativa: boolean; assunto: string; mensagem: string; de: string; ate: string; apenasConhecidos: boolean };
type AcaoIA = { texto: string; prazo: string };

type EmailBase = {
  id: string; assunto: string; preview: string; corpo: string; hora: string; data: string;
  lido: boolean; favorito: boolean; prioridade: Prioridade; tags: string[]; pasta: string | null; contaId: string;
};
type EmailRecebido = EmailBase & { tipo: "recebido"; remetente: string; emailRemetente: string };
type EmailEnviado = EmailBase & { tipo: "enviado"; remetente: string; emailRemetente: string; destinatario: string; emailDestinatario: string; status: "entregue" | "aguardando" };
type EmailSpam = EmailBase & { tipo: "spam"; remetente: string; emailRemetente: string; motivoSpam: string };
type EmailArquivo = EmailBase & { tipo: "arquivo"; remetente: string; emailRemetente: string };
type EmailType = EmailRecebido | EmailEnviado | EmailSpam | EmailArquivo;

type Template = { id: string; nome: string; categoria: string; assunto: string; corpo: string; tom: "formal" | "casual"; criadoPorIA: boolean; criadoEm: Date; usos: number };
type GrupoContato = { nome: string; email: string };
type Grupo = { id: string; nome: string; contatos: GrupoContato[] };
type EnvioStatus = "enviado" | "erro";
type CampanhaStatus = "rascunho" | "enviando" | "pausado" | "concluido";
type CampanhaEnviado = { email: string; status: EnvioStatus; hora: string };
type Campanha = {
  id: string; nome: string; grupoId: string; templateId: string | null;
  assunto: string; corpo: string; status: CampanhaStatus;
  totalDestinatarios: number; loteAtual: number;
  enviados: CampanhaEnviado[]; aEnviar: string[];
  intervaloSegundos: number; inicioEnvio?: number;
};

/* ─── Defaults ─── */
const defaultServerConfig: ServerConfig = { ativo: false, servidor: "", porta: 993, seguranca: "ssl", usuario: "", senha: "" };
const provedorPresets: Record<string, { imap: Partial<ServerConfig>; smtp: Partial<ServerConfig> }> = {
  gmail: { imap: { servidor: "imap.gmail.com", porta: 993, seguranca: "ssl" }, smtp: { servidor: "smtp.gmail.com", porta: 465, seguranca: "ssl" } },
  outlook: { imap: { servidor: "outlook.office365.com", porta: 993, seguranca: "ssl" }, smtp: { servidor: "smtp.office365.com", porta: 587, seguranca: "starttls" } },
  hotmail: { imap: { servidor: "outlook.office365.com", porta: 993, seguranca: "ssl" }, smtp: { servidor: "smtp.office365.com", porta: 587, seguranca: "starttls" } },
  yahoo: { imap: { servidor: "imap.mail.yahoo.com", porta: 993, seguranca: "ssl" }, smtp: { servidor: "smtp.mail.yahoo.com", porta: 465, seguranca: "ssl" } },
  icloud: { imap: { servidor: "imap.mail.me.com", porta: 993, seguranca: "ssl" }, smtp: { servidor: "smtp.mail.me.com", porta: 587, seguranca: "starttls" } },
  hostinger: { imap: { servidor: "imap.hostinger.com", porta: 993, seguranca: "ssl" }, smtp: { servidor: "smtp.hostinger.com", porta: 465, seguranca: "ssl" } },
};

const categoriaTemplateOptions = ["Todas", "Vendas", "Relacionamento", "Onboarding", "Financeiro", "Outro"];
const categoriaColors: Record<string, string> = { Vendas: "bg-blue-100 text-blue-700", Relacionamento: "bg-green-100 text-green-700", Onboarding: "bg-purple-100 text-purple-700", Financeiro: "bg-amber-100 text-amber-700", Outro: "bg-gray-100 text-gray-700" };

const tagColors: Record<string, string> = { Urgente: "bg-red-100 text-red-700", Trabalho: "bg-blue-100 text-blue-700", Financeiro: "bg-amber-100 text-amber-700", Newsletter: "bg-green-100 text-green-700", Dev: "bg-gray-200 text-gray-700", Pessoal: "bg-purple-100 text-purple-700" };
const prioridadeConfigBase: Record<Prioridade, { labelKey: string; cls: string; dotCls: string; pillBg: string }> = {
  urgente: { labelKey: "priority.urgent", cls: "text-red-600", dotCls: "bg-red-500", pillBg: "bg-red-500 text-white" },
  alta: { labelKey: "priority.high", cls: "text-orange-600", dotCls: "bg-amber-500", pillBg: "bg-orange-500 text-white" },
  normal: { labelKey: "priority.normal", cls: "text-green-600", dotCls: "", pillBg: "bg-green-500 text-white" },
  baixa: { labelKey: "priority.low", cls: "text-muted-foreground", dotCls: "", pillBg: "bg-muted text-muted-foreground" },
};
const prioridadeKeys: Prioridade[] = ["urgente", "alta", "normal", "baixa"];
const prazoBadgeColors: Record<string, string> = { hoje: "bg-red-100 text-red-700", amanhã: "bg-amber-100 text-amber-700", "esta semana": "bg-blue-100 text-blue-700", "sem prazo": "bg-muted text-muted-foreground" };
const corPastaMap: Record<string, string> = { blue: "bg-blue-100 text-blue-700", green: "bg-green-100 text-green-700", purple: "bg-purple-100 text-purple-700", amber: "bg-amber-100 text-amber-700", coral: "bg-red-100 text-red-700", gray: "bg-gray-100 text-gray-700" };
const corPastaOptions = ["blue", "green", "purple", "amber", "coral", "gray"];
const iconePastaMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-text": FileText, "rocket": Rocket, "user": Users, "briefcase": Briefcase,
  "bar-chart": BarChart2, "tag": Tag, "clipboard": ClipboardList, "folder-open": FolderOpen,
  "book-open": BookOpen, "bell": Bell, "globe": Globe, "star": Star,
  "heart": Heart, "code": Code, "shopping-bag": ShoppingBag, "mail": Mail,
};
const iconePastaOptions = Object.keys(iconePastaMap);
const renderPastaIcon = (icone: string, className = "w-4 h-4") => {
  const Icon = iconePastaMap[icone] || FolderOpen;
  return <Icon className={className} />;
};

/* ─── Memoized Sub-components ─── */
type EmailListItemProps = {
  email: EmailType;
  isSelected: boolean;
  lido: boolean;
  prio: Prioridade;
  conta: { nome: string; cor: string } | null;
  showUnread?: boolean;
  showPrioDot?: boolean;
  showWarning?: boolean;
  showTags?: boolean;
  extraBadge?: React.ReactNode;
  nameField?: string;
  onSelect: (id: string) => void;
};

const EmailListItem = React.memo<EmailListItemProps>(({ email, isSelected, lido, prio, conta, showUnread = false, showPrioDot = false, showWarning = false, showTags = true, extraBadge, nameField, onSelect }) => {
  const name = nameField || email.remetente;
  const visibleTags = showTags && email.tags.length > 0 ? email.tags.slice(0, 2) : [];
  const extraTagCount = showTags && email.tags.length > 2 ? email.tags.length - 2 : 0;
  return (
    <button onClick={() => onSelect(email.id)} className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors duration-150 h-[72px] ${isSelected ? "bg-secondary" : "hover:bg-secondary/50"}`}>
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {conta && <span className="w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center text-white shrink-0" style={{ backgroundColor: conta.cor }}>{conta.nome[0]}</span>}
          {showUnread && !lido && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
          {showWarning && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
          <span className={`text-xs truncate ${showUnread && !lido ? "font-medium" : "font-normal"}`}>{name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {showPrioDot && (prio === "urgente" || prio === "alta") && <span className={`w-2 h-2 rounded-full ${prioridadeConfigBase[prio].dotCls}`} />}
          <span className="text-[11px] text-muted-foreground">{email.hora}</span>
        </div>
      </div>
      <p className={`text-xs truncate ${showUnread && !lido ? "font-medium" : "font-normal"}`}>{email.assunto}</p>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email.preview}</p>
      <div className="flex gap-1 mt-1 flex-wrap items-center">
        {extraBadge}
        {visibleTags.map(tag => (<span key={tag} className={`text-[9px] px-1.5 py-0 rounded-full leading-4 font-medium ${tagColors[tag] || "bg-muted text-muted-foreground"}`}>{tag}</span>))}
        {extraTagCount > 0 && <span className="text-[9px] text-muted-foreground">+{extraTagCount}</span>}
      </div>
    </button>
  );
}, (prev, next) =>
  prev.email.id === next.email.id &&
  prev.isSelected === next.isSelected &&
  prev.lido === next.lido &&
  prev.prio === next.prio &&
  prev.showUnread === next.showUnread
);
EmailListItem.displayName = "EmailListItem";

type PastaItemProps = {
  pasta: Pasta;
  isActive: boolean;
  onSelect: (id: string) => void;
  onEdit: (pasta: Pasta) => void;
  onDelete: (id: string) => void;
};

const PastaItem = React.memo<PastaItemProps>(({ pasta, isActive, onSelect, onEdit, onDelete }) => (
  <div className={`group flex items-center justify-between px-3 py-2.5 border-b border-border cursor-pointer transition-colors duration-150 ${isActive ? "bg-secondary" : "hover:bg-secondary/50"}`} onClick={() => onSelect(pasta.id)}>
    <div className="flex items-center gap-2 min-w-0">
      {renderPastaIcon(pasta.icone)}
      <span className="text-xs truncate">{pasta.nome}</span>
      <span className="text-[10px] text-muted-foreground">{pasta.emailIds.length}</span>
    </div>
    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
      <button onClick={e => { e.stopPropagation(); onEdit(pasta); }} className="text-muted-foreground hover:text-foreground p-0.5"><Pencil className="w-3 h-3" /></button>
      <button onClick={e => { e.stopPropagation(); onDelete(pasta.id); }} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 className="w-3 h-3" /></button>
    </div>
  </div>
), (prev, next) =>
  prev.pasta.id === next.pasta.id &&
  prev.isActive === next.isActive &&
  prev.pasta.emailIds.length === next.pasta.emailIds.length &&
  prev.pasta.nome === next.pasta.nome &&
  prev.pasta.icone === next.pasta.icone
);
PastaItem.displayName = "PastaItem";

type InsightCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle: React.ReactNode;
};

const InsightCard = React.memo<InsightCardProps>(({ icon, label, value, subtitle }) => (
  <div className="rounded-lg border border-border p-4">
    <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-[10px] uppercase tracking-wider font-medium">{label}</span></div>
    <p className="text-2xl font-semibold">{value}</p>
    {subtitle}
  </div>
));
InsightCard.displayName = "InsightCard";

const tabsDef = [
  { id: "entrada", labelKey: "tabs.entrada", Icon: Inbox, badge: true },
  { id: "enviados", labelKey: "tabs.enviados", Icon: Send },
  { id: "favoritos", labelKey: "tabs.favoritos", Icon: Star },
  { id: "remetente", labelKey: "tabs.remetente", Icon: Users },
  { id: "pastas", labelKey: "tabs.pastas", Icon: FolderOpen },
  { id: "spam", labelKey: "tabs.spam", Icon: ShieldOff },
  { id: "compor", labelKey: "tabs.compor", Icon: PenLine },
  { id: "insights", labelKey: "tabs.insights", Icon: BarChart2 },
  { id: "config", labelKey: "tabs.config", Icon: Settings },
  { id: "arquivo", labelKey: "tabs.arquivo", Icon: Archive },
];

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2);

/* ═══════════ NOTIFICATION DROPDOWN ═══════════ */
const NotificationDropdown = React.forwardRef<HTMLDivElement, {
  recebidos: EmailRecebido[];
  enviados: EmailEnviado[];
  emails: EmailType[];
  emailAcoes: Record<string, AcaoIA[]>;
  isEmailLido: (e: EmailType) => boolean;
  getEmailPrioridade: (e: EmailType) => Prioridade;
  notificacoesVistas: Set<string>;
  onClose: () => void;
  onSelectEmail: (id: string) => void;
  onReplyEmail: (email: EmailRecebido) => void;
  onMarkAllRead: () => void;
  onFilterUrgent: () => void;
}>(({ recebidos, enviados, emails, emailAcoes, isEmailLido, getEmailPrioridade, notificacoesVistas, onClose, onSelectEmail, onReplyEmail, onMarkAllRead, onFilterUrgent }, ref) => {
  const { t } = useTranslation("email");
  const innerRef = useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => innerRef.current!);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (innerRef.current && !innerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const urgentes = recebidos.filter(e => !isEmailLido(e) && getEmailPrioridade(e) === "urgente");
  const threadsSemResposta = recebidos.filter(e => {
    const emailDate = new Date(e.data + "T" + e.hora);
    const diff = Date.now() - emailDate.getTime();
    return diff > 48 * 60 * 60 * 1000 && !enviados.some(env => env.assunto.includes(e.assunto));
  });
  const emailsComAcao = Object.entries(emailAcoes).map(([eid, acoes]) => {
    const email = emails.find(e => e.id === eid);
    return email ? { email, acoes } : null;
  }).filter(Boolean) as { email: EmailType; acoes: AcaoIA[] }[];
  const totalNotifs = urgentes.length + threadsSemResposta.length + emailsComAcao.length;

  const diasAtras = (data: string, hora: string) => {
    const d = new Date(data + "T" + hora);
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 0 ? t('notifications.today') : diff === 1 ? t('notifications.daysAgo_one') : t('notifications.daysAgo_other', { count: diff });
  };

  return (
    <div ref={innerRef} className="absolute right-0 top-full mt-1 w-[280px] bg-popover border border-border rounded-lg z-50" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[13px] font-medium">{t('notifications.title')}</span>
        <button onClick={onMarkAllRead} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{t('notifications.markAllRead')}</button>
      </div>
      <Separator />
      {totalNotifs === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <BellOff className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('notifications.noPending')}</span>
        </div>
      ) : (
        <ScrollArea className="max-h-[320px]">
          {urgentes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[11px] font-medium text-red-600">{t('notifications.urgent')}</span>
              </div>
              {urgentes.map(e => {
                const nid = "urg-" + e.id;
                const visto = notificacoesVistas.has(nid);
                return (
                  <button key={nid} onClick={() => onSelectEmail(e.id)} className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary cursor-pointer transition-colors ${!visto ? "bg-secondary/50" : ""}`}>
                    {!visto && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">{getInitials(e.remetente)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate">De: {e.remetente}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{e.assunto}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {threadsSemResposta.length > 0 && (
            <div>
              {urgentes.length > 0 && <Separator />}
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-medium text-amber-600">{t('notifications.awaitingReply')}</span>
              </div>
              {threadsSemResposta.map(e => {
                const nid = "thread-" + e.id;
                const visto = notificacoesVistas.has(nid);
                return (
                  <button key={nid} onClick={() => onReplyEmail(e)} className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary cursor-pointer transition-colors ${!visto ? "bg-secondary/50" : ""}`}>
                    {!visto && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate">{e.remetente} · {e.assunto}</div>
                      <div className="text-[10px] text-red-500">{diasAtras(e.data, e.hora)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {emailsComAcao.length > 0 && (
            <div>
              {(urgentes.length > 0 || threadsSemResposta.length > 0) && <Separator />}
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-[11px] font-medium text-purple-600">{t('notifications.pendingActions')}</span>
              </div>
              {emailsComAcao.map(({ email, acoes }) => {
                const nid = "acao-" + email.id;
                const visto = notificacoesVistas.has(nid);
                const acao = acoes[0];
                const prazoColor = prazoBadgeColors[acao?.prazo] || "bg-muted text-muted-foreground";
                return (
                  <button key={nid} onClick={() => onSelectEmail(email.id)} className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary cursor-pointer transition-colors ${!visto ? "bg-secondary/50" : ""}`}>
                    {!visto && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${prazoColor}`}>{acao?.prazo}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] truncate">{acao?.texto}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{"remetente" in email ? (email as any).remetente : ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      )}
      {totalNotifs > 0 && (
        <>
          <Separator />
          <div className="px-3 py-2">
            <button onClick={onFilterUrgent} className="text-[11px] text-primary hover:underline">{t('notifications.viewAllUrgent')}</button>
          </div>
        </>
      )}
    </div>
  );
});
NotificationDropdown.displayName = "NotificationDropdown";

/* ═══════════ COMPONENT ═══════════ */
const AdminEmailManager: React.FC = () => {
  const { t, i18n } = useTranslation("email");

  const prioridadeConfig = useMemo(() => {
    const result: Record<Prioridade, { label: string; cls: string; dotCls: string; pillBg: string }> = {} as any;
    for (const k of prioridadeKeys) {
      const base = prioridadeConfigBase[k];
      result[k] = { ...base, label: t(base.labelKey) };
    }
    return result;
  }, [t]);

  const tabs = useMemo(() => tabsDef.map(tab => ({ ...tab, label: t(tab.labelKey) })), [t]);
  const { toast } = useToast();

  const {
    loading: dataLoading,
    contas, setContas,
    emails, setEmails,
    pastas, setPastas,
    assinaturas, setAssinaturas,
    templates, setTemplates,
    grupos, setGrupos,
    regrasSegmentacao, setRegrasSegmentacao,
    preferencias, setPreferencias,
    respostaAutomatica, setRespostaAutomatica,
    bloqueados, setBloqueados,
    persistEmailUpdate, persistEmailInsert, persistEmailDelete,
    persistContaUpsert, persistContaDelete,
    persistPastaUpsert, persistPastaDelete,
    persistAssinaturaUpsert,
    persistTemplateUpsert, persistTemplateDelete,
    persistGrupoUpsert, persistGrupoDelete,
    persistRegraUpsert, persistRegraDelete,
    persistPreferencias,
    persistBloqueado,
  } = useAdminEmailData();

  /* ─── Sync i18n language from saved preferences ─── */
  useEffect(() => {
    if (!dataLoading && preferencias.idiomaIA) {
      const langMap: Record<string, string> = { "Português": "pt", "English": "en", "Español": "es", "Inglês": "en", "Espanhol": "es" };
      const lng = langMap[preferencias.idiomaIA] || "pt";
      if (i18n.language !== lng) i18n.changeLanguage(lng);
    }
  }, [dataLoading, preferencias.idiomaIA, i18n]);

  /* ─── Core state ─── */
  const [activeTab, setActiveTab] = useState("entrada");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [filtroTextoInput, setFiltroTextoInput] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<Prioridade | "todos">("todos");
  const [emailsLidos, setEmailsLidos] = useState<Set<string>>(new Set());
  const [emailsFavoritos, setEmailsFavoritos] = useState<Set<string>>(new Set());
  const [prioridades, setPrioridades] = useState<Record<string, Prioridade>>({});
  const [expandedRemetente, setExpandedRemetente] = useState<string | null>(null);
  const [contaAtiva, setContaAtiva] = useState<string>("todas");
  const [pastaAtiva, setPastaAtiva] = useState<string | null>(null);
  const [modalPastaAberto, setModalPastaAberto] = useState(false);
  const [pastaSendoEditada, setPastaSendoEditada] = useState<Pasta | null>(null);
  const [resumoPasta, setResumoPasta] = useState<Record<string, string>>({});
  const [carregandoResumoPasta, setCarregandoResumoPasta] = useState(false);
  const [sugestoesDismissed, setSugestoesDismissed] = useState<Set<string>>(new Set());
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [contaSendoEditada, setContaSendoEditada] = useState<Conta | null>(null);
  const [modalAssinaturaAberto, setModalAssinaturaAberto] = useState(false);
  const [assinaturaSendoEditada, setAssinaturaSendoEditada] = useState<Assinatura | null>(null);
  const [showNovaRegra, setShowNovaRegra] = useState(false);
  const [novaRegra, setNovaRegra] = useState({ seTipo: "remetente", seValor: "", entaoTipo: "tag", entaoValor: "" });
  const [resumoIA, setResumoIA] = useState("");
  const [chipsIA, setChipsIA] = useState<string[]>([]);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [acoesIA, setAcoesIA] = useState<AcaoIA[]>([]);
  const [carregandoAcoes, setCarregandoAcoes] = useState(false);
  const [resumoRemetente, setResumoRemetente] = useState<Record<string, string>>({});
  const [carregandoResumoRemetente, setCarregandoResumoRemetente] = useState<Record<string, boolean>>({});
  const [modalAberto, setModalAberto] = useState(false);
  const [modalMinimizado, setModalMinimizado] = useState(false);
  const [modoModal, setModoModal] = useState<"responder" | "encaminhar" | "novo">("responder");
  const [syncing, setSyncing] = useState(false);
  const [modalInitial, setModalInitial] = useState({ para: [] as string[], assunto: "", corpo: "", autoAI: false });
  const [modalKey, setModalKey] = useState(0);
  const [insightsPeriodo, setInsightsPeriodo] = useState<"semana" | "mes" | "trimestre">("mes");
  const [mobileShowPanel, setMobileShowPanel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sinoAberto, setSinoAberto] = useState(false);
  const [notificacoesVistas, setNotificacoesVistas] = useState<Set<string>>(new Set());
  const [emailAcoes, setEmailAcoes] = useState<Record<string, AcaoIA[]>>({});
  const sinoRef = useRef<HTMLButtonElement>(null);
  const sinoDropdownRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [comporSubTab, setComporSubTab] = useState<"templates" | "massa">("templates");
  const [templateBusca, setTemplateBusca] = useState("");
  const [templateCategoria, setTemplateCategoria] = useState("Todas");
  const [modalTemplateAberto, setModalTemplateAberto] = useState(false);
  const [templateSendoEditado, setTemplateSendoEditado] = useState<Template | null>(null);
  const [gerandoTemplate, setGerandoTemplate] = useState(false);
  const [templateModalTab, setTemplateModalTab] = useState<"manual" | "ia">("manual");
  const [formTemplate, setFormTemplate] = useState({ nome: "", categoria: "Vendas", tom: "formal" as "formal" | "casual", assunto: "", corpo: "" });
  const [formTemplateIA, setFormTemplateIA] = useState({ briefing: "", categoria: "Vendas", tom: "formal" as "formal" | "casual", tamanho: "medio" as "curto" | "medio" | "longo" });
  const [templateGerado, setTemplateGerado] = useState<{ nome: string; assunto: string; corpo: string } | null>(null);
  const [templateVisualizando, setTemplateVisualizando] = useState<Template | null>(null);
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);
  const [modalGrupoAberto, setModalGrupoAberto] = useState(false);
  const [grupoSendoEditado, setGrupoSendoEditado] = useState<Grupo | null>(null);
  const [formGrupo, setFormGrupo] = useState({ nome: "", contatos: [] as GrupoContato[] });
  const [grupoBuscaContato, setGrupoBuscaContato] = useState("");
  const [campanhaAtiva, setCampanhaAtiva] = useState<Campanha | null>(null);
  const [formCampanha, setFormCampanha] = useState({ nome: "", grupoId: "", templateId: "" as string, usarTemplate: true, assunto: "", corpo: "", intervalo: 30 });
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const campanhaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [campanhaCountdown, setCampanhaCountdown] = useState(0);

  useEffect(() => {
    if (!dataLoading && emails.length > 0) {
      setEmailsFavoritos(new Set(emails.filter(e => e.favorito).map(e => e.id)));
      setEmailsLidos(new Set(emails.filter(e => e.lido).map(e => e.id)));
    }
  }, [dataLoading, emails.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) setIsCompact(containerRef.current.offsetWidth < 600);
    };
    checkWidth();
    const obs = new ResizeObserver(checkWidth);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const cacheIA = useRef<Record<string, { resumo: string; chips: string[]; prioridade: string; timestamp: number }>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const abasInicializadas = useRef<Set<string>>(new Set(["entrada"]));
  const emailListRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setFiltroTexto(filtroTextoInput), 200);
    return () => clearTimeout(timer);
  }, [filtroTextoInput]);

  const [formPasta, setFormPasta] = useState({ nome: "", icone: "file-text", cor: "blue", regras: [] as PastaRegra[] });
  const [formPastaRegra, setFormPastaRegra] = useState({ tipo: "remetente" as PastaRegra["tipo"], valor: "" });
  const [formConta, setFormConta] = useState<{ nome: string; email: string; cor: string; assinatura: string; padrao: boolean; provedor: Conta["provedor"]; imap: ServerConfig; smtp: ServerConfig }>({ nome: "", email: "", cor: "#378ADD", assinatura: "", padrao: false, provedor: "custom", imap: { ...defaultServerConfig }, smtp: { ...defaultServerConfig, porta: 465 } });
  const [contaModalTab, setContaModalTab] = useState<"geral" | "servidor">("geral");
  const [showImapPassword, setShowImapPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [formAssinatura, setFormAssinatura] = useState({ nome: "", conteudo: "", contaIds: [] as string[] });
  const tabsRef = useRef<HTMLDivElement>(null);

  /* ═══ Derived ═══ */
  const getEmailPrioridade = useCallback((email: EmailType): Prioridade => prioridades[email.id] || email.prioridade, [prioridades]);
  const isEmailLido = useCallback((email: EmailType): boolean => email.lido || emailsLidos.has(email.id), [emailsLidos]);
  const filterByAccount = useCallback(<T extends EmailType>(list: T[]): T[] => contaAtiva === "todas" ? list : list.filter(e => e.contaId === contaAtiva), [contaAtiva]);

  const sortDesc = useCallback(<T extends EmailType>(list: T[]): T[] => [...list].sort((a, b) => {
    const dateA = `${a.data} ${a.hora}`;
    const dateB = `${b.data} ${b.hora}`;
    return dateB.localeCompare(dateA);
  }), []);
  const recebidos = useMemo(() => sortDesc(filterByAccount(emails.filter(e => e.tipo === "recebido") as EmailRecebido[])), [emails, filterByAccount, sortDesc]);
  const enviados = useMemo(() => sortDesc(filterByAccount(emails.filter(e => e.tipo === "enviado") as EmailEnviado[])), [emails, filterByAccount, sortDesc]);
  const spamEmails = useMemo(() => sortDesc(filterByAccount(emails.filter(e => e.tipo === "spam") as EmailSpam[])), [emails, filterByAccount, sortDesc]);
  const arquivoEmails = useMemo(() => sortDesc(filterByAccount(emails.filter(e => e.tipo === "arquivo") as EmailArquivo[])), [emails, filterByAccount, sortDesc]);
  const unreadCount = useMemo(() => recebidos.filter(e => !isEmailLido(e)).length, [recebidos, isEmailLido]);
  const selectedEmail = useMemo(() => emails.find(e => e.id === selectedEmailId) || null, [emails, selectedEmailId]);
  const contaAtivaObj = useMemo(() => contas.find(c => c.id === contaAtiva), [contas, contaAtiva]);

  const filteredRecebidos = useMemo(() => recebidos.filter(e => {
    const q = filtroTexto.toLowerCase();
    const matchSearch = !q || e.remetente.toLowerCase().includes(q) || e.assunto.toLowerCase().includes(q) || e.preview.toLowerCase().includes(q);
    const matchPrio = prioridadeFiltro === "todos" || getEmailPrioridade(e) === prioridadeFiltro;
    return matchSearch && matchPrio;
  }), [recebidos, filtroTexto, prioridadeFiltro, getEmailPrioridade]);

  const favoritoEmails = useMemo(() => recebidos.filter(e => emailsFavoritos.has(e.id)), [recebidos, emailsFavoritos]);

  const suggestPasta = useMemo(() => {
    if (!selectedEmail) return null;
    if (sugestoesDismissed.has(selectedEmail.id)) return null;
    const isInAny = pastas.some(p => p.emailIds.includes(selectedEmail.id));
    if (isInAny) return null;
    for (const p of pastas) {
      const words = p.nome.toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length < 3) continue;
        if (selectedEmail.assunto.toLowerCase().includes(w) || selectedEmail.tags.some(t => t.toLowerCase().includes(w))) return p;
      }
    }
    return null;
  }, [selectedEmail, pastas, sugestoesDismissed]);

  const dadosInsights = useMemo(() => {
    const totalRecebidos = recebidos.length;
    const totalEnviados = enviados.length;
    const naoLidos = unreadCount;
    const pctNaoLidos = totalRecebidos > 0 ? Math.round((naoLidos / totalRecebidos) * 100) : 0;
    const senderMap = new Map<string, { nome: string; email: string; count: number }>();
    recebidos.forEach(e => { const existing = senderMap.get(e.emailRemetente); if (existing) existing.count++; else senderMap.set(e.emailRemetente, { nome: e.remetente, email: e.emailRemetente, count: 1 }); });
    const topSenders = Array.from(senderMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    const maxSenderCount = topSenders[0]?.count || 1;
    const tagMap = new Map<string, number>();
    recebidos.forEach(e => e.tags.forEach(t => tagMap.set(t, (tagMap.get(t) || 0) + 1)));
    const tagDist = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
    const totalTags = tagDist.reduce((s, [, c]) => s + c, 0);
    const maxTagCount = tagDist[0]?.[1] || 1;
    const sentAssuntos = new Set(enviados.map(e => e.assunto.replace(/^Re:\s*/i, "").toLowerCase()));
    const unanswered = recebidos.filter(e => !sentAssuntos.has(e.assunto.toLowerCase()));
    const hourCounts = new Array(24).fill(0);
    recebidos.forEach(e => { const h = parseInt(e.hora.split(":")[0], 10); if (!isNaN(h)) hourCounts[h]++; });
    const maxHour = Math.max(...hourCounts, 1);
    return { totalRecebidos, totalEnviados, naoLidos, pctNaoLidos, topSenders, maxSenderCount, tagDist, totalTags, maxTagCount, unanswered, hourCounts, maxHour };
  }, [recebidos, enviados, unreadCount]);

  /* ═══ AI Effect with cache + abort ═══ */
  useEffect(() => {
    if (!selectedEmailId || !selectedEmail) { setResumoIA(""); setChipsIA([]); setErroIA(null); setFromCache(false); return; }
    const cached = cacheIA.current[selectedEmailId];
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      setResumoIA(cached.resumo); setChipsIA(cached.chips); setCarregandoResumo(false); setErroIA(null); setFromCache(true);
      const validPrios: Prioridade[] = ["urgente", "alta", "normal", "baixa"];
      if (cached.prioridade && validPrios.includes(cached.prioridade as Prioridade) && cached.prioridade !== getEmailPrioridade(selectedEmail))
        setPrioridades(prev => ({ ...prev, [selectedEmail.id]: cached.prioridade as Prioridade }));
      return;
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setFromCache(false);
    const go = async () => {
      setResumoIA(""); setChipsIA([]); setErroIA(null); setCarregandoResumo(true);
      try {
        const raw = await chamarIA(
          `Você é um assistente de email executivo. Responda APENAS em JSON válido, sem markdown, sem explicações. Formato exato:\n{"resumo": "máximo 2 frases diretas em português destacando a ação necessária e prazo se houver", "chips": ["opção curta 1", "opção curta 2", "opção curta 3"], "prioridade": "urgente|alta|normal|baixa"}`,
          `Email de: ${selectedEmail.remetente}\nAssunto: ${selectedEmail.assunto}\nCorpo: ${selectedEmail.corpo}`
        );
        if (controller.signal.aborted) return;
        try {
          const parsed = JSON.parse((raw.match(/\{[\s\S]*\}/) || [raw])[0]);
          const resumo = parsed.resumo || raw;
          const chips = Array.isArray(parsed.chips) ? parsed.chips.slice(0, 3) : [];
          setResumoIA(resumo); setChipsIA(chips);
          cacheIA.current[selectedEmailId] = { resumo, chips, prioridade: parsed.prioridade || "normal", timestamp: Date.now() };
          const validPrios: Prioridade[] = ["urgente", "alta", "normal", "baixa"];
          if (parsed.prioridade && validPrios.includes(parsed.prioridade) && parsed.prioridade !== getEmailPrioridade(selectedEmail))
            setPrioridades(prev => ({ ...prev, [selectedEmail.id]: parsed.prioridade }));
        } catch { setResumoIA(raw); cacheIA.current[selectedEmailId] = { resumo: raw, chips: [], prioridade: "normal", timestamp: Date.now() }; }
      } catch (err) {
        if (controller.signal.aborted) return;
        setErroIA(err instanceof Error ? err.message : "Erro desconhecido");
      } finally { if (!controller.signal.aborted) setCarregandoResumo(false); }
    };
    go();
    return () => { controller.abort(); };
  }, [selectedEmailId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ═══ Handlers ═══ */
  const scrollTabs = (dir: number) => { tabsRef.current?.scrollBy({ left: dir * 150, behavior: "smooth" }); };
  const handleSelectEmail = useCallback((id: string) => { setSelectedEmailId(id); setEmailsLidos(prev => new Set(prev).add(id)); persistEmailUpdate(id, { lido: true }); if (isCompact) setMobileShowPanel(true); }, [isCompact, persistEmailUpdate]);
  const toggleFavorito = useCallback((id: string) => { setEmailsFavoritos(prev => { const n = new Set(prev); const isFav = n.has(id); isFav ? n.delete(id) : n.add(id); persistEmailUpdate(id, { favorito: !isFav }); return n; }); }, [persistEmailUpdate]);
  const updatePrioridade = useCallback((emailId: string, p: Prioridade) => { setPrioridades(prev => ({ ...prev, [emailId]: p })); persistEmailUpdate(emailId, { prioridade: p }); }, [persistEmailUpdate]);

  const openComposeModal = useCallback((mode: "responder" | "encaminhar" | "novo", opts?: { para?: string[]; assunto?: string; corpo?: string; autoAI?: boolean }) => {
    const email = selectedEmail;
    let defaults = { para: [] as string[], assunto: "", corpo: "", autoAI: false };
    if (email && mode === "responder") defaults = { para: [email.emailRemetente], assunto: `Re: ${email.assunto}`, corpo: "", autoAI: false };
    else if (email && mode === "encaminhar") defaults = { para: [], assunto: `Fwd: ${email.assunto}`, corpo: `\n\n---------- Mensagem encaminhada ----------\nDe: ${email.remetente} <${email.emailRemetente}>\nAssunto: ${email.assunto}\n\n${email.corpo}`, autoAI: false };
    setModoModal(mode); setModalInitial({ ...defaults, ...opts }); setModalAberto(true); setModalMinimizado(false); setModalKey(k => k + 1);
  }, [selectedEmail]);

  const handleResponder = useCallback(() => openComposeModal("responder"), [openComposeModal]);
  const handleEncaminhar = useCallback(() => { if (selectedEmail) openComposeModal("encaminhar"); }, [openComposeModal, selectedEmail]);
  const handleRespostaIA = useCallback(() => openComposeModal("responder", { autoAI: true }), [openComposeModal]);
  const handleEnviarFromModal = useCallback(async (data: { para: string[]; cc: string[]; cco: string[]; assunto: string; corpo: string; contaId: string }) => {
    const conta = contas.find(c => c.id === data.contaId) || contas[0];
    if (!conta) { toast({ title: "Nenhuma conta configurada", variant: "destructive" }); return; }
    // Let the server handle SMTP validation with fallback to IMAP credentials
    const now = new Date();
    const novoEmail = {
      id: crypto.randomUUID(),
      tipo: "enviado" as const,
      remetente: conta.nome,
      emailRemetente: conta.email,
      destinatario: data.para.join(", "),
      emailDestinatario: data.para.join(", "),
      assunto: data.assunto,
      preview: data.corpo.replace(/<[^>]*>/g, "").slice(0, 100),
      corpo: data.corpo,
      hora: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      data: now.toISOString().slice(0, 10),
      lido: true,
      favorito: false,
      prioridade: "normal" as const,
      tags: [] as string[],
      pasta: null,
      contaId: data.contaId,
      status: "aguardando" as const,
    };
    setEmails(prev => [novoEmail, ...prev]);
    await persistEmailInsert(novoEmail);
    setModalAberto(false);
    setModalMinimizado(false);
    toast({ title: "Enviando email...", duration: 3000 });

    try {
      const { data: result, error } = await supabase.functions.invoke("admin-send-email", {
        body: { contaId: data.contaId, para: data.para, cc: data.cc, cco: data.cco, assunto: data.assunto, corpo: data.corpo },
      });
      if (error || result?.error) {
        const errMsg = result?.error || error?.message || "Falha ao enviar";
        setEmails(prev => prev.map(e => e.id === novoEmail.id && e.tipo === "enviado" ? { ...e, status: "aguardando" as const } : e));
        await persistEmailUpdate(novoEmail.id, { status: "erro" });
        toast({ title: "Erro ao enviar email", description: errMsg, variant: "destructive" });
      } else {
        setEmails(prev => prev.map(e => e.id === novoEmail.id && e.tipo === "enviado" ? { ...e, status: "entregue" as const } : e));
        await persistEmailUpdate(novoEmail.id, { status: "entregue" });
        toast({ title: t('toast.emailSent'), duration: 3000 });
      }
    } catch (err: any) {
      setEmails(prev => prev.map(e => e.id === novoEmail.id && e.tipo === "enviado" ? { ...e, status: "aguardando" as const } : e));
      await persistEmailUpdate(novoEmail.id, { status: "aguardando" });
      toast({ title: "Erro ao enviar email", description: err.message, variant: "destructive" });
    }
  }, [contas, toast, t, setEmails, persistEmailInsert, persistEmailUpdate]);
  const handleCloseModal = useCallback(() => { setModalAberto(false); setModalMinimizado(false); }, []);

  const handleSyncEmails = useCallback(async () => {
    setSyncing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("admin-sync-email", {
        body: { contaId: contaAtiva !== "todas" ? contaAtiva : undefined },
      });
      if (error || result?.error) {
        toast({ title: "Erro ao sincronizar", description: result?.error || error?.message, variant: "destructive" });
      } else {
        const imported = result?.imported || 0;
        if (imported > 0) {
          const { data: emailsRes } = await supabase.from("email_emails").select("*").order("created_at", { ascending: false });
          if (emailsRes) {
            const mapRow = (row: any) => {
              const base = { id: row.id, assunto: row.assunto, preview: row.preview, corpo: row.corpo, hora: row.hora, data: row.data, lido: row.lido, favorito: row.favorito, prioridade: row.prioridade, tags: row.tags || [], pasta: row.pasta, contaId: row.conta_id || "" };
              if (row.tipo === "enviado") return { ...base, tipo: "enviado" as const, remetente: row.remetente, emailRemetente: row.email_remetente, destinatario: row.destinatario || "", emailDestinatario: row.email_destinatario || "", status: row.status || "entregue" };
              if (row.tipo === "spam") return { ...base, tipo: "spam" as const, remetente: row.remetente, emailRemetente: row.email_remetente, motivoSpam: row.motivo_spam || "" };
              if (row.tipo === "arquivo") return { ...base, tipo: "arquivo" as const, remetente: row.remetente, emailRemetente: row.email_remetente };
              return { ...base, tipo: "recebido" as const, remetente: row.remetente, emailRemetente: row.email_remetente };
            };
            setEmails(emailsRes.map(mapRow));
          }
        }
        toast({ title: "Sincronização concluída", description: `${imported} novo(s) email(s) importado(s)${result?.errors?.length ? `. Erros: ${result.errors.join("; ")}` : ""}`, duration: 5000 });
      }
    } catch (err: any) {
      toast({ title: "Erro ao sincronizar", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [contaAtiva, toast, setEmails]);

  const handleMoverParaPasta = useCallback((pastaId: string) => {
    if (!selectedEmailId) return;
    setPastas(prev => {
      const updated = prev.map(p => p.id === pastaId && !p.emailIds.includes(selectedEmailId) ? { ...p, emailIds: [...p.emailIds, selectedEmailId] } : p);
      const updatedPasta = updated.find(p => p.id === pastaId);
      if (updatedPasta) persistPastaUpsert(updatedPasta);
      return updated;
    });
    const pasta = pastas.find(p => p.id === pastaId);
    toast({ title: `Movido para ${pasta?.nome}`, duration: 3000 });
  }, [selectedEmailId, pastas, toast, persistPastaUpsert]);

  const handleExcluir = useCallback((emailId: string) => { setEmails(prev => prev.filter(e => e.id !== emailId)); persistEmailDelete(emailId); if (selectedEmailId === emailId) setSelectedEmailId(null); toast({ title: t('toast.emailDeleted'), duration: 3000 }); }, [selectedEmailId, toast, persistEmailDelete, t]);
  const handleNaoESpam = useCallback(() => {
    if (!selectedEmailId) return;
    setEmails(prev => prev.map(e => {
      if (e.id !== selectedEmailId) return e;
      const { motivoSpam, ...rest } = e as any;
      return { ...rest, tipo: "recebido" } as EmailRecebido;
    }));
    persistEmailUpdate(selectedEmailId, { tipo: "recebido", motivo_spam: null });
    setSelectedEmailId(null);
    toast({ title: t('toast.movedToInbox'), duration: 3000 });
  }, [selectedEmailId, toast, persistEmailUpdate, t]);
  const handleBloquear = useCallback(() => {
    if (!selectedEmail || !("emailRemetente" in selectedEmail)) return;
    const remetente = (selectedEmail as EmailSpam).emailRemetente;
    setBloqueados(prev => prev.includes(remetente) ? prev : [...prev, remetente]);
    persistBloqueado(remetente);
    setEmails(prev => prev.filter(e => !("emailRemetente" in e) || (e as any).emailRemetente !== remetente));
    setSelectedEmailId(null);
    toast({ title: t('toast.senderBlocked'), duration: 3000 });
  }, [selectedEmail, toast, persistBloqueado, t]);
  const handleRestaurar = useCallback(() => {
    if (!selectedEmailId) return;
    setEmails(prev => prev.map(e => e.id === selectedEmailId ? { ...e, tipo: "recebido" as const } as EmailRecebido : e));
    persistEmailUpdate(selectedEmailId, { tipo: "recebido" });
    setSelectedEmailId(null);
    toast({ title: t('toast.restoredToInbox'), duration: 3000 });
  }, [selectedEmailId, toast, persistEmailUpdate, t]);
  const handleExcluirDefinitivo = useCallback((emailId: string) => { setEmails(prev => prev.filter(e => e.id !== emailId)); persistEmailDelete(emailId); if (selectedEmailId === emailId) setSelectedEmailId(null); toast({ title: t('toast.permanentlyDeleted'), duration: 3000 }); }, [selectedEmailId, toast, persistEmailDelete, t]);

  const handleAcoesIA = useCallback(async () => {
    if (!selectedEmail || carregandoAcoes) return;
    setAcoesIA([]); setCarregandoAcoes(true);
    try {
      const raw = await chamarIA(`Você é um assistente de produtividade. Analise o email e extraia ações concretas necessárias. Responda APENAS em JSON:\n{"acoes": [{"texto": "descrição da ação", "prazo": "hoje|amanhã|esta semana|sem prazo"}]}`, `Email de: ${selectedEmail.remetente}\nAssunto: ${selectedEmail.assunto}\nCorpo: ${selectedEmail.corpo}`);
      try {
        const parsed = JSON.parse((raw.match(/\{[\s\S]*\}/) || [raw])[0]);
        if (Array.isArray(parsed.acoes)) {
          setAcoesIA(parsed.acoes);
          setEmailAcoes(prev => ({ ...prev, [selectedEmail.id]: parsed.acoes }));
        }
      } catch {
        setAcoesIA([{ texto: raw, prazo: "sem prazo" }]);
        setEmailAcoes(prev => ({ ...prev, [selectedEmail.id]: [{ texto: raw, prazo: "sem prazo" }] }));
      }
    } catch { toast({ title: "Erro ao detectar ações", variant: "destructive", duration: 3000 }); } finally { setCarregandoAcoes(false); }
  }, [selectedEmail, carregandoAcoes, toast]);

  const handleResumoRemetente = useCallback(async (emailAddr: string, nome: string, groupEmails: EmailRecebido[]) => {
    if (carregandoResumoRemetente[emailAddr]) return;
    setCarregandoResumoRemetente(prev => ({ ...prev, [emailAddr]: true }));
    try {
      const historico = groupEmails.map(e => `${e.data} - ${e.assunto} - ${e.preview}`).join("\n");
      const resumo = await chamarIA(`Você é um assistente executivo. Analise o histórico de emails com este contato e gere um resumo de relacionamento em português. Máximo 3 frases.`, `Contato: ${nome} (${emailAddr})\nHistórico:\n${historico}`);
      setResumoRemetente(prev => ({ ...prev, [emailAddr]: resumo }));
    } catch { toast({ title: "Erro ao gerar resumo", variant: "destructive", duration: 3000 }); } finally { setCarregandoResumoRemetente(prev => ({ ...prev, [emailAddr]: false })); }
  }, [carregandoResumoRemetente, toast]);

  const retryResumo = useCallback(() => { if (selectedEmailId) { delete cacheIA.current[selectedEmailId]; const id = selectedEmailId; setSelectedEmailId(null); setTimeout(() => setSelectedEmailId(id), 10); } }, [selectedEmailId]);

  const handleSalvarPasta = useCallback(() => {
    if (!formPasta.nome.trim()) return;
    if (pastaSendoEditada) {
      const updated = { ...pastaSendoEditada, ...formPasta };
      setPastas(prev => prev.map(p => p.id === pastaSendoEditada.id ? updated : p));
      persistPastaUpsert(updated);
    } else {
      const nova = { id: crypto.randomUUID(), ...formPasta, emailIds: [] };
      setPastas(prev => [...prev, nova]);
      persistPastaUpsert(nova);
    }
    setModalPastaAberto(false); setPastaSendoEditada(null);
    toast({ title: t('toast.folderSaved'), duration: 3000 });
  }, [formPasta, pastaSendoEditada, toast, persistPastaUpsert, t]);

  const handleExcluirPasta = useCallback((id: string) => {
    setPastas(prev => prev.filter(p => p.id !== id));
    persistPastaDelete(id);
    if (pastaAtiva === id) setPastaAtiva(null);
    toast({ title: t('toast.folderDeleted'), duration: 3000 });
  }, [pastaAtiva, toast, persistPastaDelete, t]);

  const handleSelectPasta = useCallback((id: string) => { setPastaAtiva(id); setSelectedEmailId(null); }, []);
  const handleEditPastaItem = useCallback((pasta: Pasta) => { setPastaSendoEditada(pasta); setFormPasta({ nome: pasta.nome, icone: pasta.icone, cor: pasta.cor, regras: [...pasta.regras] }); setModalPastaAberto(true); }, []);

  const handleResumoPastaIA = useCallback(async (pastaId: string) => {
    const pasta = pastas.find(p => p.id === pastaId);
    if (!pasta || carregandoResumoPasta) return;
    setCarregandoResumoPasta(true);
    try {
      const emailsDaPasta = emails.filter(e => pasta.emailIds.includes(e.id));
      const lista = emailsDaPasta.map(e => `Assunto: ${e.assunto} | De: ${e.remetente} | Preview: ${e.preview}`).join("\n");
      const resumo = await chamarIA(`Analise estes emails e gere um resumo executivo em português em 3 frases.`, lista || "Pasta vazia");
      setResumoPasta(prev => ({ ...prev, [pastaId]: resumo }));
    } catch { toast({ title: "Erro ao gerar resumo", variant: "destructive", duration: 3000 }); } finally { setCarregandoResumoPasta(false); }
  }, [pastas, emails, carregandoResumoPasta, toast]);

  const handleSalvarConta = useCallback(() => {
    if (!formConta.nome.trim() || !formConta.email.trim()) return;
    const smtpData = { ...formConta.smtp };
    if (!smtpData.usuario && formConta.imap.usuario) smtpData.usuario = formConta.imap.usuario;
    if (!smtpData.senha && formConta.imap.senha) smtpData.senha = formConta.imap.senha;
    const contaData = { nome: formConta.nome, email: formConta.email, cor: formConta.cor, assinatura: formConta.assinatura, padrao: formConta.padrao, provedor: formConta.provedor, imap: { ...formConta.imap }, smtp: smtpData };
    const isNew = !contaSendoEditada;
    let savedConta: Conta;
    if (contaSendoEditada) {
      savedConta = { ...contaSendoEditada, ...contaData };
      setContas(prev => {
        let list = prev.map(c => c.id === contaSendoEditada.id ? savedConta : c);
        if (formConta.padrao) list = list.map(c => ({ ...c, padrao: c.id === contaSendoEditada.id }));
        return list;
      });
      persistContaUpsert(savedConta);
    } else {
      const newId = crypto.randomUUID();
      savedConta = { id: newId, ...contaData };
      setContas(prev => {
        let list = [...prev, savedConta];
        if (formConta.padrao) list = list.map(c => ({ ...c, padrao: c.id === newId }));
        return list;
      });
      persistContaUpsert(savedConta);
    }
    toast({ title: t('toast.accountSaved'), duration: 3000 });
    if (isNew) {
      // After creating, stay in modal and switch to Server tab
      setContaSendoEditada(savedConta);
      setContaModalTab("servidor");
      abasInicializadas.current.add("config");
      setActiveTab("config");
    } else {
      setModalContaAberto(false); setContaSendoEditada(null);
      setActiveTab("config");
    }
  }, [formConta, contaSendoEditada, toast, persistContaUpsert, t]);

  const handleExcluirConta = useCallback((id: string) => {
    if (contas.length <= 1) return;
    setContas(prev => prev.filter(c => c.id !== id));
    persistContaDelete(id);
    if (contaAtiva === id) setContaAtiva("todas");
    toast({ title: t('toast.accountRemoved'), duration: 3000 });
  }, [contas.length, contaAtiva, toast, persistContaDelete, t]);

  const handleSalvarAssinatura = useCallback(() => {
    if (!formAssinatura.nome.trim()) return;
    if (assinaturaSendoEditada) {
      const updated = { ...assinaturaSendoEditada, ...formAssinatura };
      setAssinaturas(prev => prev.map(a => a.id === assinaturaSendoEditada.id ? updated : a));
      persistAssinaturaUpsert(updated);
    } else {
      const nova = { id: crypto.randomUUID(), ...formAssinatura };
      setAssinaturas(prev => [...prev, nova]);
      persistAssinaturaUpsert(nova);
    }
    setModalAssinaturaAberto(false); setAssinaturaSendoEditada(null);
    toast({ title: t('toast.signatureSaved'), duration: 3000 });
  }, [formAssinatura, assinaturaSendoEditada, toast, persistAssinaturaUpsert, t]);

  /* ═══ Render helpers ═══ */
  const renderEmptyPanel = () => (<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2"><MailOpen className="w-8 h-8" /><p className="text-sm">{t('emailList.selectEmail')}</p></div>);

  const renderEmailListItem = useCallback((email: EmailType, options: { showUnread?: boolean; showPrioDot?: boolean; extraBadge?: React.ReactNode; nameField?: string; showWarning?: boolean; showTags?: boolean; showAccountBadge?: boolean } = {}) => {
    const { showUnread = false, showPrioDot = false, extraBadge, nameField, showWarning = false, showTags = true, showAccountBadge = false } = options;
    const isSelected = selectedEmailId === email.id;
    const lido = isEmailLido(email);
    const prio = getEmailPrioridade(email);
    const conta = showAccountBadge ? contas.find(c => c.id === email.contaId) : null;
    return (
      <EmailListItem key={email.id} email={email} isSelected={isSelected} lido={lido} prio={prio}
        conta={conta ? { nome: conta.nome, cor: conta.cor } : null}
        showUnread={showUnread} showPrioDot={showPrioDot} showWarning={showWarning} showTags={showTags}
        extraBadge={extraBadge} nameField={nameField} onSelect={handleSelectEmail}
      />
    );
  }, [selectedEmailId, isEmailLido, getEmailPrioridade, contas, handleSelectEmail]);

  const renderMoverDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5"><FolderInput className="w-3.5 h-3.5" /> {t('emailActions.move')}</Button></DropdownMenuTrigger>
      <DropdownMenuContent>{pastas.map(p => (<DropdownMenuItem key={p.id} onClick={() => handleMoverParaPasta(p.id)} className="gap-2">{renderPastaIcon(p.icone, "w-3.5 h-3.5")} {p.nome}</DropdownMenuItem>))}</DropdownMenuContent>
    </DropdownMenu>
  );

  const renderPrioBadge = (p: typeof prioridadeConfig[Prioridade], prio: Prioridade) => {
    const dotColor = prio === "urgente" ? "bg-red-500" : prio === "alta" ? "bg-amber-500" : prio === "normal" ? "bg-green-500" : "bg-muted-foreground";
    return (<span className={`flex items-center gap-1 text-xs ${p.cls}`}><span className={`w-2 h-2 rounded-full ${dotColor}`} /> {p.label}</span>);
  };

  const renderRightPanel = (email: EmailType, options: { actions: React.ReactNode; showAiPanel?: boolean; showPrioDropdown?: boolean }) => {
    const { actions, showAiPanel = false, showPrioDropdown = false } = options;
    const p = prioridadeConfig[getEmailPrioridade(email)];
    const prio = getEmailPrioridade(email);
    const ini = getInitials(email.remetente);

    if (isCompact && !mobileShowPanel) return null;

    return (
      <div className={`flex-1 flex flex-col min-w-0 ${isCompact ? "absolute inset-0 z-10 bg-background" : ""}`}>
        {isCompact && (
          <button onClick={() => setMobileShowPanel(false)} className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground border-b border-border">
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>
        )}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-start justify-between">
            <h2 className="text-[15px] font-medium">{email.assunto}</h2>
            <div className="shrink-0 ml-2">
              {showPrioDropdown ? (
                <DropdownMenu><DropdownMenuTrigger asChild><button className="cursor-pointer hover:opacity-80">{renderPrioBadge(p, prio)}</button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">{prioridadeKeys.map(k => (<DropdownMenuItem key={k} onClick={() => updatePrioridade(email.id, k)}>{renderPrioBadge(prioridadeConfig[k], k)}</DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
              ) : renderPrioBadge(p, prio)}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium shrink-0">{ini}</div>
            <div>
              <span className="text-xs font-medium">{email.remetente}</span>
              <span className="text-xs text-muted-foreground ml-1.5">&lt;{email.emailRemetente}&gt;</span>
              <span className="text-xs text-muted-foreground ml-2">{email.hora}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0 flex-wrap">{actions}</div>
        <ScrollArea className="flex-1">
          <div className="px-4 py-3.5 pb-6">
            {email.corpo && email.corpo.trim().startsWith("<") ? (
              <div className="text-[13px] leading-[1.8] text-secondary-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: email.corpo }} />
            ) : (
              email.corpo.split("\n").map((line, i) => (<p key={i} className="text-[13px] leading-[1.8] text-secondary-foreground min-h-[1.4em]">{line || "\u00A0"}</p>))
            )}
          </div>
        </ScrollArea>
        {showAiPanel && (
          <div className="shrink-0 bg-secondary border-t border-border px-4 py-2.5" style={{ borderTopWidth: "0.5px" }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {t('ai.summary')}
              {fromCache && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-1 normal-case tracking-normal font-normal"><Zap className="w-3 h-3" /> {t('ai.cache')}</span>}
            </p>
            {carregandoResumo ? (<div className="space-y-1.5 mb-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /><Skeleton className="h-3 w-3/5" /></div>)
              : erroIA ? (<div className="bg-background rounded-md px-3 py-2 text-xs text-destructive mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {t('ai.couldNotGenerate')} <button onClick={retryResumo} className="underline ml-1 hover:opacity-80">{t('ai.tryAgain')}</button></div>)
              : (<div className="bg-background rounded-md px-3 py-2 text-xs text-muted-foreground mb-2">{resumoIA || t('ai.selectEmailForSummary')}</div>)}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> {t('ai.quickReplies')}</p>
            {carregandoResumo ? (<div className="flex gap-2"><Skeleton className="h-6 w-28 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /><Skeleton className="h-6 w-26 rounded-full" /></div>)
              : (<div className="flex gap-2 flex-wrap">{(chipsIA.length > 0 ? chipsIA : [t('ai.confirmReceipt'), t('ai.scheduleMeeting'), t('ai.requestMoreInfo')]).map(txt => (<button key={txt} onClick={() => openComposeModal("responder", { corpo: txt })} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors">{txt}</button>))}</div>)}
            {suggestPasta && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                <span>{t('ai.suggestMoveToFolder')} {renderPastaIcon(suggestPasta.icone, "w-3.5 h-3.5 inline")} {suggestPasta.nome}?</span>
                <button onClick={() => { handleMoverParaPasta(suggestPasta.id); setSugestoesDismissed(prev => new Set(prev).add(selectedEmail!.id)); }} className="text-primary underline text-[11px]">{t('common.yes')}</button>
                <button onClick={() => setSugestoesDismissed(prev => new Set(prev).add(selectedEmail!.id))} className="text-muted-foreground underline text-[11px]">{t('common.ignore')}</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEntradaActions = (email: EmailType) => (
    <>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleResponder}><Reply className="w-3.5 h-3.5" /> {t('emailActions.reply')}</Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleEncaminhar}><Forward className="w-3.5 h-3.5" /> {t('emailActions.forward')}</Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleRespostaIA}><Sparkles className="w-3.5 h-3.5" /> {t('emailActions.aiReply')}</Button>
      <Popover><PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleAcoesIA}><ClipboardList className="w-3.5 h-3.5" /> {t('emailActions.action')}</Button></PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <p className="text-xs font-medium mb-2 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> {t('emailActions.detectedActions')}</p>
          {carregandoAcoes ? <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            : acoesIA.length === 0 ? <p className="text-xs text-muted-foreground">{t('emailActions.noDetectedActions')}</p>
            : <div className="space-y-2">{acoesIA.map((a, i) => (<div key={i} className="flex items-start gap-2"><p className="text-xs flex-1">{a.texto}</p><span className={`text-[9px] px-1.5 py-0 rounded-full leading-4 font-medium shrink-0 ${prazoBadgeColors[a.prazo] || prazoBadgeColors["sem prazo"]}`}>{a.prazo}</span></div>))}</div>}
        </PopoverContent></Popover>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavorito(email.id)}>
        {emailsFavoritos.has(email.id) ? <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> : <Star className="w-3.5 h-3.5" />}
      </Button>
      {renderMoverDropdown()}
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExcluir(email.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
    </>
  );

  /* ═══ Tab: Entrada ═══ */
  const renderEntrada = () => {
    const ITEM_HEIGHT = 72;
    const VISIBLE_COUNT = Math.ceil(460 / ITEM_HEIGHT) + 2;
    const useVirtual = filteredRecebidos.length > 20;
    const startIdx = useVirtual ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 1) : 0;
    const endIdx = useVirtual ? Math.min(filteredRecebidos.length, startIdx + VISIBLE_COUNT) : filteredRecebidos.length;
    const visibleEmails = filteredRecebidos.slice(startIdx, endIdx);

    return (
      <div className="flex h-full relative">
        <div className={`${isCompact && mobileShowPanel ? "hidden" : ""} ${isCompact ? "w-full" : "w-[260px]"} border-r border-border flex flex-col shrink-0`}>
          <div className="p-2 border-b border-border flex gap-1.5 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder={t('emailList.searchEmails')} value={filtroTextoInput} onChange={e => setFiltroTextoInput(e.target.value)} className="pl-8 pr-7 h-8 text-xs" />
              {filtroTextoInput && <button onClick={() => { setFiltroTextoInput(""); setFiltroTexto(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSyncEmails} disabled={syncing} title="Sincronizar emails">
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <div className="flex gap-1 px-2 py-1.5 border-b border-border flex-wrap">
            <button onClick={() => setPrioridadeFiltro("todos")} className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${prioridadeFiltro === "todos" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{t('common.all')}</button>
            {prioridadeKeys.map(k => (<button key={k} onClick={() => setPrioridadeFiltro(k)} className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors flex items-center gap-1 ${prioridadeFiltro === k ? prioridadeConfig[k].pillBg : "bg-muted text-muted-foreground hover:bg-muted/80"}`}><span className={`w-1.5 h-1.5 rounded-full ${prioridadeConfig[k].dotCls || "bg-current"}`} /> {prioridadeConfig[k].label}</button>))}
          </div>
          {filteredRecebidos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-muted-foreground gap-1"><SearchX className="w-8 h-8" /><p className="text-xs">{t('emailList.noEmailFound')}</p></div>
          ) : useVirtual ? (
            <div className="flex-1 overflow-y-auto" ref={emailListRef} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
              <div style={{ height: filteredRecebidos.length * ITEM_HEIGHT, position: 'relative' }}>
                <div style={{ position: 'absolute', top: startIdx * ITEM_HEIGHT, left: 0, right: 0 }}>
                  {visibleEmails.map(email => renderEmailListItem(email, { showUnread: true, showPrioDot: true, showTags: true, showAccountBadge: contaAtiva === "todas" }))}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              {visibleEmails.map(email => renderEmailListItem(email, { showUnread: true, showPrioDot: true, showTags: true, showAccountBadge: contaAtiva === "todas" }))}
            </ScrollArea>
          )}
        </div>
        {selectedEmail && selectedEmail.tipo === "recebido" ? renderRightPanel(selectedEmail, { showAiPanel: true, showPrioDropdown: true, actions: renderEntradaActions(selectedEmail) }) : (!isCompact || !mobileShowPanel) && renderEmptyPanel()}
      </div>
    );
  };

  /* ═══ Tab: Enviados ═══ */
  const renderEnviados = () => {
    const sel = enviados.find(e => e.id === selectedEmailId) || null;
    return (<div className="flex h-full relative">
      <div className={`${isCompact && mobileShowPanel ? "hidden" : ""} ${isCompact ? "w-full" : "w-[260px]"} border-r border-border flex flex-col shrink-0`}><ScrollArea className="flex-1">
        {enviados.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1"><Send className="w-8 h-8" /><p className="text-xs">{t('emailList.noSent')}</p></div>)
          : enviados.map(email => renderEmailListItem(email, { nameField: email.destinatario, showAccountBadge: contaAtiva === "todas", extraBadge: <span className={`text-[9px] px-1.5 py-0 rounded-full leading-4 font-medium flex items-center gap-1 ${email.status === "entregue" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{email.status === "entregue" ? <><CheckCircle className="w-2.5 h-2.5" /> {t('emailList.delivered')}</> : <><Clock className="w-2.5 h-2.5" /> {t('emailList.waiting')}</>}</span> }))}
      </ScrollArea></div>
      {sel ? renderRightPanel(sel, { actions: (<><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleEncaminhar}><Forward className="w-3.5 h-3.5" /> {t('emailActions.forward')}</Button>{renderMoverDropdown()}<Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleExcluir(sel.id)}><Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}</Button></>) }) : (!isCompact || !mobileShowPanel) && renderEmptyPanel()}
    </div>);
  };

  /* ═══ Tab: Favoritos ═══ */
  const renderFavoritos = () => {
    const sel = favoritoEmails.find(e => e.id === selectedEmailId) || null;
    return (<div className="flex h-full relative">
      <div className={`${isCompact && mobileShowPanel ? "hidden" : ""} ${isCompact ? "w-full" : "w-[260px]"} border-r border-border flex flex-col shrink-0`}><ScrollArea className="flex-1">
        {favoritoEmails.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2"><Star className="w-8 h-8" /><p className="text-xs">{t('emailList.noFavorites')}</p></div>)
          : favoritoEmails.map(email => renderEmailListItem(email, { showUnread: true, showPrioDot: true, showTags: true, showAccountBadge: contaAtiva === "todas" }))}
      </ScrollArea></div>
      {sel ? renderRightPanel(sel, { showAiPanel: true, showPrioDropdown: true, actions: (<><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleResponder}><Reply className="w-3.5 h-3.5" /> {t('emailActions.reply')}</Button><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleEncaminhar}><Forward className="w-3.5 h-3.5" /> {t('emailActions.forward')}</Button><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleRespostaIA}><Sparkles className="w-3.5 h-3.5" /> {t('emailActions.aiReply')}</Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavorito(sel.id)}>{emailsFavoritos.has(sel.id) ? <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> : <Star className="w-3.5 h-3.5" />}</Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExcluir(sel.id)}><Trash2 className="w-3.5 h-3.5" /></Button></>) }) : (!isCompact || !mobileShowPanel) && renderEmptyPanel()}
    </div>);
  };

  /* ═══ Tab: Por Remetente ═══ */
  const remetenteGroups = useMemo(() => {
    const map = new Map<string, EmailRecebido[]>();
    recebidos.forEach(e => { if (!map.has(e.emailRemetente)) map.set(e.emailRemetente, []); map.get(e.emailRemetente)!.push(e); });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [recebidos]);

  const renderPorRemetente = () => (<div className="flex h-full relative">
    <div className={`${isCompact && mobileShowPanel ? "hidden" : ""} ${isCompact ? "w-full" : "w-[260px]"} border-r border-border flex flex-col shrink-0`}><ScrollArea className="flex-1">
      {remetenteGroups.map(([emailAddr, groupEmails]) => {
        const first = groupEmails[0]; const isExpanded = expandedRemetente === emailAddr;
        const sorted = [...groupEmails].sort((a, b) => b.hora.localeCompare(a.hora));
        return (<div key={emailAddr}>
          <button onClick={() => setExpandedRemetente(isExpanded ? null : emailAddr)} className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors duration-150 hover:bg-secondary/50 ${isExpanded ? "bg-secondary" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-medium shrink-0">{getInitials(first.remetente)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between"><span className="text-xs font-medium truncate">{first.remetente}</span><span className="text-[10px] text-muted-foreground shrink-0">{groupEmails.length}</span></div>
                <p className="text-[10px] text-muted-foreground truncate">{emailAddr}</p>
                <p className="text-[10px] text-muted-foreground">{t('emailList.last')}: {sorted[0]?.hora}</p>
              </div>
            </div>
          </button>
          {isExpanded && (<>
            {sorted.map(email => renderEmailListItem(email, { showUnread: true, showPrioDot: true, showTags: true }))}
            <div className="px-3 py-2 border-b border-border">
              {resumoRemetente[emailAddr] ? (<div className="bg-secondary rounded-md px-3 py-2 text-xs">{resumoRemetente[emailAddr]}</div>)
                : (<Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 w-full" onClick={() => handleResumoRemetente(emailAddr, first.remetente, groupEmails)} disabled={carregandoResumoRemetente[emailAddr]}>
                  {carregandoResumoRemetente[emailAddr] ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('ai.analyzing')}</> : <><Sparkles className="w-3.5 h-3.5" /> {t('ai.summary')}</>}
                </Button>)}
            </div>
          </>)}
        </div>);
      })}
    </ScrollArea></div>
    {selectedEmail && selectedEmail.tipo === "recebido" ? renderRightPanel(selectedEmail, { showAiPanel: true, showPrioDropdown: true, actions: (<><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleResponder}><Reply className="w-3.5 h-3.5" /> {t('emailActions.reply')}</Button><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleEncaminhar}><Forward className="w-3.5 h-3.5" /> {t('emailActions.forward')}</Button><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleRespostaIA}><Sparkles className="w-3.5 h-3.5" /> {t('emailActions.aiReply')}</Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavorito(selectedEmail.id)}>{emailsFavoritos.has(selectedEmail.id) ? <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> : <Star className="w-3.5 h-3.5" />}</Button></>) }) : (!isCompact || !mobileShowPanel) && renderEmptyPanel()}
  </div>);

  /* ═══ Tab: Pastas ═══ */
  const renderPastas = () => {
    const pastaObj = pastas.find(p => p.id === pastaAtiva);
    const pastaEmails = pastaObj ? emails.filter(e => pastaObj.emailIds.includes(e.id)) : [];
    const pastaSelEmail = pastaObj && selectedEmail && pastaObj.emailIds.includes(selectedEmail.id) ? selectedEmail : null;

    return (<div className="flex h-full">
      <div className="w-[220px] border-r border-border flex flex-col shrink-0">
        <div className="p-2 border-b border-border">
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5" onClick={() => { setPastaSendoEditada(null); setFormPasta({ nome: "", icone: "file-text", cor: "blue", regras: [] }); setModalPastaAberto(true); }}>
            <Plus className="w-3.5 h-3.5" /> {t('folders.newFolder')}
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {pastas.map(p => (
            <PastaItem key={p.id} pasta={p} isActive={pastaAtiva === p.id} onSelect={handleSelectPasta} onEdit={handleEditPastaItem} onDelete={handleExcluirPasta} />
          ))}
        </ScrollArea>
      </div>
      {pastaObj ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderPastaIcon(pastaObj.icone, "w-5 h-5")}
                <h2 className="text-[15px] font-medium">{pastaObj.nome}</h2>
                <span className="text-[10px] text-muted-foreground">{pastaObj.emailIds.length} {t('folders.emails')}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleResumoPastaIA(pastaObj.id)} disabled={carregandoResumoPasta}>
                {carregandoResumoPasta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {t('ai.summary')}
              </Button>
            </div>
            {carregandoResumoPasta && <div className="mt-2 space-y-1"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>}
            {resumoPasta[pastaObj.id] && <div className="mt-2 bg-secondary rounded-md px-3 py-2 text-xs">{resumoPasta[pastaObj.id]}</div>}
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-[240px] border-r border-border flex flex-col shrink-0">
              <ScrollArea className="flex-1">
                {pastaEmails.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1"><FolderOpen className="w-8 h-8" /><p className="text-xs">{t('folders.emptyFolder')}</p></div>)
                  : pastaEmails.map(email => renderEmailListItem(email, { showUnread: true, showPrioDot: true, showAccountBadge: contaAtiva === "todas" }))}
              </ScrollArea>
            </div>
            {pastaSelEmail ? renderRightPanel(pastaSelEmail, { showAiPanel: true, showPrioDropdown: true, actions: renderEntradaActions(pastaSelEmail) }) : renderEmptyPanel()}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <FolderOpen className="w-8 h-8" />
          <p className="text-sm">{t('folders.selectFolder')}</p>
        </div>
      )}
    </div>);
  };

  /* ═══ Tab: Spam ═══ */
  const renderSpam = () => {
    const sel = spamEmails.find(e => e.id === selectedEmailId) || null;
    return (<div className="flex h-full relative">
      <div className={`${isCompact && mobileShowPanel ? "hidden" : ""} ${isCompact ? "w-full" : "w-[260px]"} border-r border-border flex flex-col shrink-0`}><ScrollArea className="flex-1">
        {spamEmails.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1"><ShieldOff className="w-8 h-8" /><p className="text-xs">{t('emailList.noSpam')}</p></div>)
          : spamEmails.map(email => renderEmailListItem(email, { showWarning: true, showTags: false, extraBadge: <span className="text-[9px] px-1.5 py-0 rounded-full leading-4 font-medium bg-red-100 text-red-700">{email.motivoSpam}</span> }))}
      </ScrollArea></div>
      {sel ? renderRightPanel(sel, { actions: (<><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleNaoESpam}><CheckCircle className="w-3.5 h-3.5" /> {t('emailActions.notSpam')}</Button><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleBloquear}><ShieldOff className="w-3.5 h-3.5" /> {t('emailActions.block')}</Button><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleExcluir(sel.id)}><Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}</Button></>) }) : (!isCompact || !mobileShowPanel) && renderEmptyPanel()}
    </div>);
  };

  /* ═══ Tab: Arquivo ═══ */
  const renderArquivo = () => {
    const sel = arquivoEmails.find(e => e.id === selectedEmailId) || null;
    return (<div className="flex h-full relative">
      <div className={`${isCompact && mobileShowPanel ? "hidden" : ""} ${isCompact ? "w-full" : "w-[260px]"} border-r border-border flex flex-col shrink-0`}><ScrollArea className="flex-1">
        {arquivoEmails.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1"><Archive className="w-8 h-8" /><p className="text-xs">{t('emailList.noArchived')}</p></div>)
          : arquivoEmails.map(email => renderEmailListItem(email, { extraBadge: <span className="text-[9px] px-1.5 py-0 rounded-full leading-4 font-medium bg-muted text-muted-foreground">{t('emailList.archived')}</span> }))}
      </ScrollArea></div>
      {sel ? renderRightPanel(sel, { actions: (<><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleRestaurar}><Reply className="w-3.5 h-3.5" /> {t('emailActions.restoreToInbox')}</Button><Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleExcluirDefinitivo(sel.id)}><Trash2 className="w-3.5 h-3.5" /> {t('emailActions.deletePermanently')}</Button></>) }) : (!isCompact || !mobileShowPanel) && renderEmptyPanel()}
    </div>);
  };

  /* ═══ Tab: Insights ═══ */
  const renderInsights = () => {
    const { totalRecebidos, totalEnviados, naoLidos, pctNaoLidos, topSenders, maxSenderCount, tagDist, totalTags, maxTagCount, unanswered, hourCounts, maxHour } = dadosInsights;
    const periodPills: { key: "semana" | "mes" | "trimestre"; label: string }[] = [
      { key: "semana", label: t('insights.thisWeek') },
      { key: "mes", label: t('insights.thisMonth') },
      { key: "trimestre", label: t('insights.last3Months') },
    ];
    return (
      <ScrollArea className="h-full">
        <div className="p-5 space-y-5 max-w-4xl mx-auto">
          <div className="flex gap-2">
            {periodPills.map(p => (
              <button key={p.key} onClick={() => setInsightsPeriodo(p.key)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${insightsPeriodo === p.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{p.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <InsightCard icon={<Inbox className="w-4 h-4" />} label={t('insights.totalReceived')} value={totalRecebidos} subtitle={<p className="text-[11px] text-green-600 mt-1">{t('insights.vsLastPeriodUp')}</p>} />
            <InsightCard icon={<MailOpen className="w-4 h-4" />} label={t('insights.unread')} value={naoLidos} subtitle={<><Progress value={pctNaoLidos} className="h-1.5 mt-2" /><p className="text-[10px] text-muted-foreground mt-1">{pctNaoLidos}% {t('insights.ofTotal')}</p></>} />
            <InsightCard icon={<Clock className="w-4 h-4" />} label={t('insights.avgResponseTime')} value="4h 32min" subtitle={<p className="text-[10px] text-muted-foreground mt-1">{t('insights.target')}</p>} />
            <InsightCard icon={<Send className="w-4 h-4" />} label={t('insights.emailsSent')} value={totalEnviados} subtitle={<p className="text-[11px] text-red-600 mt-1">{t('insights.vsLastPeriodDown')}</p>} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {t('insights.topSenders')}</p>
              <div className="space-y-2.5">
                {topSenders.map(s => (
                  <button key={s.email} onClick={() => { setActiveTab("remetente"); setExpandedRemetente(s.email); }} className="w-full flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-medium shrink-0">{getInitials(s.nome)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5"><span className="text-xs truncate group-hover:underline">{s.nome}</span><span className="text-[10px] text-muted-foreground shrink-0">{s.count}</span></div>
                      <div className="w-full bg-muted rounded-full h-1.5"><div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(s.count / maxSenderCount) * 100}%` }} /></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium mb-3 flex items-center gap-1.5"><PieChart className="w-3.5 h-3.5" /> {t('insights.segmentDistribution')}</p>
              <div className="space-y-2">
                {tagDist.map(([tag, count]) => (
                  <div key={tag} className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0 rounded-full leading-4 font-medium shrink-0 ${tagColors[tag] || "bg-muted text-muted-foreground"}`}>{tag}</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5"><div className="h-1.5 rounded-full bg-primary/60 transition-all" style={{ width: `${(count / maxTagCount) * 100}%` }} /></div>
                    <span className="text-[10px] text-muted-foreground shrink-0 w-12 text-right">{count} ({totalTags > 0 ? Math.round((count / totalTags) * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-medium mb-3 flex items-center gap-1.5 text-amber-600"><AlertTriangle className="w-3.5 h-3.5" /> {t('insights.unansweredThreads')}</p>
            <p className="text-[10px] text-muted-foreground mb-3">{t('insights.unansweredDesc')}</p>
            {unanswered.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-green-600 gap-2"><CheckCircle className="w-6 h-6" /><span className="text-sm font-medium">{t('insights.allCaughtUp')}</span></div>
            ) : (
              <div className="space-y-2">
                {unanswered.slice(0, 5).map(email => (
                  <div key={email.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1"><span className="text-xs font-medium">{email.remetente}</span><span className="text-xs text-muted-foreground ml-2 truncate">{email.assunto}</span></div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => { setSelectedEmailId(email.id); openComposeModal("responder", { para: [email.emailRemetente], assunto: `Re: ${email.assunto}` }); }}><Reply className="w-3 h-3" /> {t('emailActions.reply')}</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-medium mb-3 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {t('insights.activityByHour')}</p>
            <TooltipProvider>
              <div className="flex items-end gap-0.5 h-24">
                {hourCounts.map((count: number, h: number) => (
                  <Tooltip key={h}>
                    <TooltipTrigger asChild>
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-full rounded-t transition-all" style={{ height: `${Math.max((count / maxHour) * 100, 4)}%`, backgroundColor: `hsl(var(--primary) / ${0.2 + (count / maxHour) * 0.8})` }} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{h}h · {count} emails</p></TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </ScrollArea>
    );
  };

  /* ═══ Tab: Configurações ═══ */
  const renderConfig = () => (
    <ScrollArea className="h-full">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <section>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Mail className="w-4 h-4" /> {t('settings.emailAccounts')}</h3>
          <div className="space-y-2">
            {contas.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                  <div>
                    <div className="flex items-center flex-wrap gap-1">
                      <span className="text-xs font-medium">{c.nome}</span>
                      <span className="text-xs text-muted-foreground">{c.email}</span>
                      {c.padrao && <span className="text-[9px] px-1.5 py-0 rounded-full leading-4 font-medium bg-primary text-primary-foreground">{t('settings.defaultAccount')}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${c.imap.ativo ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>IMAP {c.imap.ativo ? "✓" : "✗"}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${c.smtp.ativo ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>SMTP {c.smtp.ativo ? "✓" : "✗"}</span>
                      <span className="text-[9px] text-muted-foreground">{c.provedor}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => { setContaSendoEditada(c); setFormConta({ nome: c.nome, email: c.email, cor: c.cor, assinatura: c.assinatura, padrao: c.padrao, provedor: c.provedor, imap: { ...c.imap }, smtp: { ...c.smtp } }); setContaModalTab("servidor"); setTestResult(null); setModalContaAberto(true); }}><Wifi className="w-3 h-3" /> {t('accounts.server') || 'Servidor'}</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setContaSendoEditada(c); setFormConta({ nome: c.nome, email: c.email, cor: c.cor, assinatura: c.assinatura, padrao: c.padrao, provedor: c.provedor, imap: { ...c.imap }, smtp: { ...c.smtp } }); setContaModalTab("geral"); setTestResult(null); setModalContaAberto(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExcluirConta(c.id)} disabled={contas.length <= 1}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1.5" onClick={() => { setContaSendoEditada(null); setFormConta({ nome: "", email: "", cor: "#378ADD", assinatura: "", padrao: false, provedor: "custom", imap: { ...defaultServerConfig }, smtp: { ...defaultServerConfig, porta: 465 } }); setContaModalTab("geral"); setTestResult(null); setModalContaAberto(true); }}><Plus className="w-4 h-4" /> {t('settings.addAccount')}</Button>
        </section>
        <Separator />
        <section>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><PenLine className="w-4 h-4" /> {t('settings.signatures')}</h3>
          <div className="space-y-2">
            {assinaturas.map(a => (
              <div key={a.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{a.nome}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAssinaturaSendoEditada(a); setFormAssinatura({ nome: a.nome, conteudo: a.conteudo, contaIds: [...a.contaIds] }); setModalAssinaturaAberto(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAssinaturas(prev => prev.filter(x => x.id !== a.id)); toast({ title: t('toast.signatureDeleted'), duration: 3000 }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground whitespace-pre-line line-clamp-2">{a.conteudo}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1.5" onClick={() => { setAssinaturaSendoEditada(null); setFormAssinatura({ nome: "", conteudo: "", contaIds: [] }); setModalAssinaturaAberto(true); }}><Plus className="w-4 h-4" /> {t('settings.newSignature')}</Button>
        </section>
        <Separator />
        <section>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Settings className="w-4 h-4" /> {t('settings.preferences')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label className="text-xs">{t('settings.markAsReadOnOpen')}</Label><Switch checked={preferencias.marcarAoAbrir} onCheckedChange={v => setPreferencias(prev => ({ ...prev, marcarAoAbrir: v }))} /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">{t('settings.showBodyPreview')}</Label><Switch checked={preferencias.mostrarPreview} onCheckedChange={v => setPreferencias(prev => ({ ...prev, mostrarPreview: v }))} /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">{t('settings.urgentNotifications')}</Label><Switch checked={preferencias.notificacoes} onCheckedChange={v => setPreferencias(prev => ({ ...prev, notificacoes: v }))} /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">{t('settings.emailsPerPage')}</Label><Select value={String(preferencias.emailsPorPagina)} onValueChange={v => setPreferencias(prev => ({ ...prev, emailsPorPagina: Number(v) }))}><SelectTrigger className="h-7 text-xs w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select></div>
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => { persistPreferencias(preferencias, respostaAutomatica); toast({ title: t('toast.preferencesSaved'), duration: 3000 }); }}><Save className="w-3.5 h-3.5" /> {t('settings.savePreferences')}</Button>
          </div>
        </section>
      </div>
    </ScrollArea>
  );

  /* ═══ Tab: Compor IA (simplified - templates + compose) ═══ */
  const renderCompor = () => (
    <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-3">
      <PenSquare className="w-10 h-10" />
      <p className="text-sm font-medium">{t('tabs.compor')}</p>
      <Button variant="outline" size="sm" onClick={() => openComposeModal("novo")}><PenSquare className="w-3.5 h-3.5 mr-1.5" /> {t('compose.newMessage')}</Button>
    </div>
  );

  /* ═══ Placeholder ═══ */
  const renderPlaceholder = () => {
    const tab = tabs.find(t => t.id === activeTab)!;
    const TabIcon = tab.Icon;
    return (<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3"><TabIcon className="w-10 h-10" /><p className="text-sm font-medium">{tab.label}</p></div>);
  };

  const tabContentMap: Record<string, () => React.ReactNode> = {
    entrada: renderEntrada, enviados: renderEnviados, favoritos: renderFavoritos, remetente: renderPorRemetente, pastas: renderPastas, spam: renderSpam, compor: renderCompor, insights: renderInsights, config: renderConfig, arquivo: renderArquivo,
  };

  /* ═══════════ RETURN ═══════════ */
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background text-foreground gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background text-foreground">
      {/* ═══ HEADER (integrated into admin layout) ═══ */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary"><Mail className="w-5 h-5 text-foreground" /></div>
          <div>
            <h1 className="text-[15px] font-medium leading-tight">{t('header.title')}</h1>
            <p className="text-xs text-muted-foreground">
              {contaAtiva === "todas" ? `${t('header.allAccounts')} · ${unreadCount} ${t('header.unread')}` : `${contaAtivaObj?.nome} · ${contaAtivaObj?.email} · ${unreadCount} ${t('header.unread')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors">
                {contaAtiva === "todas" ? (<><Inbox className="w-3.5 h-3.5" /><span>{t('header.all')}</span></>) : (<><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: contaAtivaObj?.cor }} /><span>{contaAtivaObj?.nome}</span></>)}
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setContaAtiva("todas"); setSelectedEmailId(null); }}><Inbox className="w-3.5 h-3.5 mr-2" /> {t('header.allAccounts')}</DropdownMenuItem>
              {contas.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => { setContaAtiva(c.id); setSelectedEmailId(null); }}>
                  <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: c.cor }} />
                  <span className="font-medium mr-1">{c.nome}</span>
                  <span className="text-muted-foreground text-[10px]">{c.email}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative">
            <Button ref={sinoRef} variant="outline" size="icon" className="h-8 w-8 relative" onClick={() => {
              if (!sinoAberto) {
                setSinoAberto(true);
                const ids: string[] = [];
                recebidos.filter(e => !isEmailLido(e) && getEmailPrioridade(e) === "urgente").forEach(e => ids.push("urg-" + e.id));
                recebidos.filter(e => {
                  const emailDate = new Date(e.data + "T" + e.hora);
                  return Date.now() - emailDate.getTime() > 48 * 60 * 60 * 1000 && !enviados.some(env => env.assunto.includes(e.assunto));
                }).forEach(e => ids.push("thread-" + e.id));
                Object.keys(emailAcoes).forEach(eid => ids.push("acao-" + eid));
                setNotificacoesVistas(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });
              } else { setSinoAberto(false); }
            }}>
              <Bell className="w-4 h-4" />
              {(() => {
                const urgentesNaoLidos = recebidos.filter(e => !isEmailLido(e) && getEmailPrioridade(e) === "urgente");
                const tsr = recebidos.filter(e => {
                  const emailDate = new Date(e.data + "T" + e.hora);
                  return Date.now() - emailDate.getTime() > 48 * 60 * 60 * 1000 && !enviados.some(env => env.assunto.includes(e.assunto));
                });
                const naoVistas = [
                  ...urgentesNaoLidos.map(e => "urg-" + e.id),
                  ...tsr.map(e => "thread-" + e.id),
                  ...Object.keys(emailAcoes).map(id => "acao-" + id),
                ].filter(id => !notificacoesVistas.has(id)).length;
                const totalN = urgentesNaoLidos.length + tsr.length + Object.keys(emailAcoes).length;
                if (totalN > 0 && naoVistas > 0 && !sinoAberto)
                  return <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{naoVistas}</span>;
                return null;
              })()}
            </Button>
            {sinoAberto && (
              <NotificationDropdown
                ref={sinoDropdownRef}
                recebidos={recebidos} enviados={enviados} emails={emails} emailAcoes={emailAcoes}
                isEmailLido={isEmailLido} getEmailPrioridade={getEmailPrioridade} notificacoesVistas={notificacoesVistas}
                onClose={() => setSinoAberto(false)}
                onSelectEmail={(id) => { setSinoAberto(false); handleSelectEmail(id); abasInicializadas.current.add("entrada"); setActiveTab("entrada"); }}
                onReplyEmail={(email) => { setSinoAberto(false); setSelectedEmailId(email.id); openComposeModal("responder", { para: [email.emailRemetente], assunto: `Re: ${email.assunto}`, corpo: "" }); }}
                onMarkAllRead={() => {
                  const ids: string[] = [];
                  recebidos.filter(e => !isEmailLido(e) && getEmailPrioridade(e) === "urgente").forEach(e => ids.push("urg-" + e.id));
                  recebidos.filter(e => {
                    const emailDate = new Date(e.data + "T" + e.hora);
                    return Date.now() - emailDate.getTime() > 48 * 60 * 60 * 1000 && !enviados.some(env => env.assunto.includes(e.assunto));
                  }).forEach(e => ids.push("thread-" + e.id));
                  Object.keys(emailAcoes).forEach(eid => ids.push("acao-" + eid));
                  setNotificacoesVistas(new Set(ids));
                }}
                onFilterUrgent={() => { setSinoAberto(false); abasInicializadas.current.add("entrada"); setActiveTab("entrada"); setPrioridadeFiltro("urgente"); }}
              />
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleSyncEmails} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8"><Globe className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { i18n.changeLanguage("pt"); setPreferencias(prev => ({ ...prev, idiomaIA: "Português" })); persistPreferencias({ ...preferencias, idiomaIA: "Português" }, respostaAutomatica); }}>
                🇧🇷 {t('languages.portuguese')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { i18n.changeLanguage("en"); setPreferencias(prev => ({ ...prev, idiomaIA: "English" })); persistPreferencias({ ...preferencias, idiomaIA: "English" }, respostaAutomatica); }}>
                🇺🇸 {t('languages.english')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { i18n.changeLanguage("es"); setPreferencias(prev => ({ ...prev, idiomaIA: "Español" })); persistPreferencias({ ...preferencias, idiomaIA: "Español" }, respostaAutomatica); }}>
                🇪🇸 {t('languages.spanish')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
            abasInicializadas.current.add("config"); setActiveTab("config"); setSelectedEmailId(null); setMobileShowPanel(false);
          }}><Settings className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openComposeModal("novo")}><PenSquare className="w-4 h-4" /></Button>
        </div>
      </header>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center border-b border-border shrink-0">
        <button onClick={() => scrollTabs(-1)} className="px-1 text-muted-foreground hover:text-foreground shrink-0"><ChevronLeft className="w-4 h-4" /></button>
        <div ref={tabsRef} className="flex overflow-x-auto no-scrollbar gap-0 flex-1" style={{ scrollBehavior: "smooth" }}>
          {tabs.map(tab => {
            const TabIcon = tab.Icon;
            return (
              <button key={tab.id} data-tab-id={tab.id} onClick={() => { abasInicializadas.current.add(tab.id); setActiveTab(tab.id); setSelectedEmailId(null); setMobileShowPanel(false); }} className={`flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap shrink-0 border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <TabIcon className="w-4 h-4" /><span>{tab.label}</span>
                {tab.badge && unreadCount > 0 && <span className="ml-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0 leading-4">{unreadCount}</span>}
              </button>
            );
          })}
        </div>
        <button onClick={() => scrollTabs(1)} className="px-1 text-muted-foreground hover:text-foreground shrink-0"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="flex-1 overflow-hidden">
        {(() => {
          abasInicializadas.current.add(activeTab);
          return Array.from(abasInicializadas.current).map(aba => (
            <div key={aba} className="h-full" style={{ display: activeTab === aba ? "flex" : "none", flexDirection: "column" }}>
              {(tabContentMap[aba] || renderPlaceholder)()}
            </div>
          ));
        })()}
      </div>

      {/* ═══ COMPOSE MODAL ═══ */}
      <ComposeModal
        key={modalKey} isOpen={modalAberto} isMinimized={modalMinimizado} mode={modoModal}
        initialPara={modalInitial.para} initialAssunto={modalInitial.assunto} initialCorpo={modalInitial.corpo}
        autoGenerateAI={modalInitial.autoAI} selectedEmail={selectedEmail}
        contas={contas.map(c => ({ id: c.id, nome: c.nome, email: c.email, cor: c.cor, assinatura: c.assinatura }))}
        contaAtiva={contaAtiva}
        onClose={handleCloseModal} onMinimize={() => setModalMinimizado(true)} onExpand={() => setModalMinimizado(false)}
        onSend={handleEnviarFromModal} onSaveDraft={() => { setModalAberto(false); setModalMinimizado(false); }}
        assinaturas={assinaturas}
        onSelecionarAssinatura={(conteudo) => {
          const contaId = contaAtiva !== "todas" ? contaAtiva : contas.find(c => c.padrao)?.id || contas[0]?.id;
          if (contaId) setContas(prev => prev.map(c => c.id === contaId ? { ...c, assinatura: conteudo } : c));
        }}
        onEditarAssinatura={(a) => {
          setAssinaturaSendoEditada(a as Assinatura);
          setFormAssinatura({ nome: a.nome, conteudo: a.conteudo, contaIds: [...a.contaIds] });
          setModalAssinaturaAberto(true);
        }}
        onCriarAssinatura={() => {
          setAssinaturaSendoEditada(null);
          setFormAssinatura({ nome: "", conteudo: "", contaIds: [] });
          setModalAssinaturaAberto(true);
        }}
      />

      {/* ═══ FOLDER MODAL ═══ */}
      <Dialog open={modalPastaAberto} onOpenChange={setModalPastaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{pastaSendoEditada ? t('folders.editFolder') : t('folders.newFolder')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">{t('folders.folderName')}</Label><Input value={formPasta.nome} onChange={e => setFormPasta(prev => ({ ...prev, nome: e.target.value }))} className="h-8 text-xs mt-1" /></div>
            <div><Label className="text-xs">{t('common.icon')}</Label><div className="grid grid-cols-8 gap-1 mt-1">{iconePastaOptions.map(key => { const Icon = iconePastaMap[key]; return (<button key={key} onClick={() => setFormPasta(prev => ({ ...prev, icone: key }))} className={`w-8 h-8 flex items-center justify-center rounded hover:bg-secondary ${formPasta.icone === key ? "bg-secondary ring-2 ring-primary" : ""}`}><Icon className="w-4 h-4" /></button>); })}</div></div>
            <div><Label className="text-xs">{t('common.color')}</Label><div className="flex gap-2 mt-1">{corPastaOptions.map(c => (<button key={c} onClick={() => setFormPasta(prev => ({ ...prev, cor: c }))} className={`w-7 h-7 rounded-full ${corPastaMap[c]?.split(" ")[0]} ${formPasta.cor === c ? "ring-2 ring-primary ring-offset-2" : ""}`} />))}</div></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setModalPastaAberto(false)}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleSalvarPasta}>{t('folders.saveFolder')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ACCOUNT MODAL ═══ */}
      <Dialog open={modalContaAberto} onOpenChange={setModalContaAberto}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{contaSendoEditada ? t('accounts.editAccount') : t('accounts.addAccount')}</DialogTitle></DialogHeader>
          {/* Provider selector — always visible */}
          <div className="space-y-1 pb-3 border-b border-border">
            <Label className="text-xs">{t('accounts.provider') || 'Provedor'}</Label>
            <Select value={formConta.provedor} onValueChange={(v: Conta["provedor"]) => {
              const preset = provedorPresets[v];
              if (preset) {
                setFormConta(prev => ({
                  ...prev, provedor: v,
                  imap: { ...prev.imap, ...preset.imap, ativo: true },
                  smtp: { ...prev.smtp, ...preset.smtp, ativo: true },
                }));
              } else {
                setFormConta(prev => ({ ...prev, provedor: v }));
              }
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="outlook">Outlook</SelectItem>
                <SelectItem value="hotmail">Hotmail</SelectItem>
                <SelectItem value="yahoo">Yahoo</SelectItem>
                <SelectItem value="icloud">iCloud</SelectItem>
                <SelectItem value="hostinger">Hostinger</SelectItem>
                <SelectItem value="custom">{t('accounts.custom') || 'Personalizado'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Tab switcher */}
          <div className="flex gap-1 border-b border-border pb-1">
            <button onClick={() => setContaModalTab("geral")} className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${contaModalTab === "geral" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t('accounts.general') || 'Geral'}</button>
            <button onClick={() => setContaModalTab("servidor")} className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${contaModalTab === "servidor" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t('accounts.server') || 'Servidor'}</button>
          </div>
          <ScrollArea className="flex-1 pr-2">
            {contaModalTab === "geral" ? (
              <div className="space-y-4 py-2">
                <div><Label className="text-xs">{t('accounts.accountName')}</Label><Input value={formConta.nome} onChange={e => setFormConta(prev => ({ ...prev, nome: e.target.value }))} className="h-8 text-xs mt-1" /></div>
                <div><Label className="text-xs">{t('accounts.emailAddress')}</Label><Input value={formConta.email} onChange={e => setFormConta(prev => ({ ...prev, email: e.target.value }))} className="h-8 text-xs mt-1" /></div>
                <div><Label className="text-xs">{t('common.color')}</Label><div className="flex gap-2 mt-1">{["#378ADD", "#1D9E75", "#D85A30", "#9333EA", "#EAB308", "#6B7280"].map(c => (<button key={c} onClick={() => setFormConta(prev => ({ ...prev, cor: c }))} className={`w-7 h-7 rounded-full ${formConta.cor === c ? "ring-2 ring-primary ring-offset-2" : ""}`} style={{ backgroundColor: c }} />))}</div></div>
                <div><Label className="text-xs">{t('accounts.signature')}</Label><Textarea value={formConta.assinatura} onChange={e => setFormConta(prev => ({ ...prev, assinatura: e.target.value }))} className="text-xs min-h-[80px] mt-1" /></div>
                <div className="flex items-center gap-2"><Switch checked={formConta.padrao} onCheckedChange={v => setFormConta(prev => ({ ...prev, padrao: v }))} /><Label className="text-xs">{t('accounts.setAsDefault')}</Label></div>
              </div>
            ) : (
              <div className="space-y-6 py-2">
                {/* IMAP */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={formConta.imap.ativo} onCheckedChange={v => setFormConta(prev => ({ ...prev, imap: { ...prev.imap, ativo: v } }))} />
                    <Label className="text-xs font-semibold">IMAP</Label>
                  </div>
                  {formConta.imap.ativo && (
                    <div className="space-y-3 pl-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">{t('accounts.server') || 'Servidor'}</Label><Input value={formConta.imap.servidor} onChange={e => setFormConta(prev => ({ ...prev, imap: { ...prev.imap, servidor: e.target.value } }))} className="h-8 text-xs mt-1" /></div>
                        <div><Label className="text-xs">{t('accounts.port') || 'Porta'}</Label><Input type="number" value={formConta.imap.porta} onChange={e => setFormConta(prev => ({ ...prev, imap: { ...prev.imap, porta: Number(e.target.value) } }))} className="h-8 text-xs mt-1" /></div>
                      </div>
                      <div>
                        <Label className="text-xs">{t('accounts.security') || 'Segurança'}</Label>
                        <Select value={formConta.imap.seguranca} onValueChange={(v: ServerConfig["seguranca"]) => setFormConta(prev => ({ ...prev, imap: { ...prev.imap, seguranca: v } }))}>
                          <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ssl">SSL/TLS</SelectItem>
                            <SelectItem value="starttls">STARTTLS</SelectItem>
                            <SelectItem value="nenhuma">{t('accounts.none') || 'Nenhuma'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">{t('accounts.username') || 'Usuário'}</Label><Input value={formConta.imap.usuario} onChange={e => setFormConta(prev => ({ ...prev, imap: { ...prev.imap, usuario: e.target.value } }))} className="h-8 text-xs mt-1" /></div>
                      <div className="relative">
                        <Label className="text-xs">{t('accounts.password') || 'Senha'}</Label>
                        <div className="relative mt-1">
                          <Input type={showImapPassword ? "text" : "password"} value={formConta.imap.senha} onChange={e => setFormConta(prev => ({ ...prev, imap: { ...prev.imap, senha: e.target.value } }))} className="h-8 text-xs pr-8" />
                          <button type="button" onClick={() => setShowImapPassword(!showImapPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showImapPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
                {/* SMTP */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={formConta.smtp.ativo} onCheckedChange={v => setFormConta(prev => ({ ...prev, smtp: { ...prev.smtp, ativo: v } }))} />
                    <Label className="text-xs font-semibold">SMTP</Label>
                  </div>
                  {formConta.smtp.ativo && (
                    <div className="space-y-3 pl-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">{t('accounts.server') || 'Servidor'}</Label><Input value={formConta.smtp.servidor} onChange={e => setFormConta(prev => ({ ...prev, smtp: { ...prev.smtp, servidor: e.target.value } }))} className="h-8 text-xs mt-1" /></div>
                        <div><Label className="text-xs">{t('accounts.port') || 'Porta'}</Label><Input type="number" value={formConta.smtp.porta} onChange={e => setFormConta(prev => ({ ...prev, smtp: { ...prev.smtp, porta: Number(e.target.value) } }))} className="h-8 text-xs mt-1" /></div>
                      </div>
                      <div>
                        <Label className="text-xs">{t('accounts.security') || 'Segurança'}</Label>
                        <Select value={formConta.smtp.seguranca} onValueChange={(v: ServerConfig["seguranca"]) => setFormConta(prev => ({ ...prev, smtp: { ...prev.smtp, seguranca: v } }))}>
                          <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ssl">SSL/TLS</SelectItem>
                            <SelectItem value="starttls">STARTTLS</SelectItem>
                            <SelectItem value="nenhuma">{t('accounts.none') || 'Nenhuma'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">{t('accounts.username') || 'Usuário'}</Label><Input value={formConta.smtp.usuario} onChange={e => setFormConta(prev => ({ ...prev, smtp: { ...prev.smtp, usuario: e.target.value } }))} className="h-8 text-xs mt-1" /></div>
                      <div className="relative">
                        <Label className="text-xs">{t('accounts.password') || 'Senha'}</Label>
                        <div className="relative mt-1">
                          <Input type={showSmtpPassword ? "text" : "password"} value={formConta.smtp.senha} onChange={e => setFormConta(prev => ({ ...prev, smtp: { ...prev.smtp, senha: e.target.value } }))} className="h-8 text-xs pr-8" />
                          <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Test connection */}
                {(formConta.imap.ativo || formConta.smtp.ativo) && (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 w-full" disabled={testingConnection} onClick={() => {
                      setTestingConnection(true); setTestResult(null);
                      setTimeout(() => { setTestResult("success"); setTestingConnection(false); }, 1500);
                    }}>
                      {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                      {t('accounts.testConnection') || 'Testar conexão'}
                    </Button>
                    {testResult === "success" && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {t('accounts.connectionSuccess') || 'Conexão bem-sucedida'}</p>}
                    {testResult === "error" && <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {t('accounts.connectionError') || 'Erro na conexão'}</p>}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setModalContaAberto(false)}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleSalvarConta}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ SIGNATURE MODAL ═══ */}
      <Dialog open={modalAssinaturaAberto} onOpenChange={setModalAssinaturaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{assinaturaSendoEditada ? t('settings.editSignature') : t('settings.newSignature')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">{t('common.name')}</Label><Input value={formAssinatura.nome} onChange={e => setFormAssinatura(prev => ({ ...prev, nome: e.target.value }))} className="h-8 text-xs mt-1" /></div>
            <div><Label className="text-xs">{t('settings.content')}</Label><Textarea value={formAssinatura.conteudo} onChange={e => setFormAssinatura(prev => ({ ...prev, conteudo: e.target.value }))} className="text-xs min-h-[100px] mt-1" /></div>
            <div>
              <Label className="text-xs">{t('settings.useInAccount')}:</Label>
              <div className="mt-1 space-y-1">{contas.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={formAssinatura.contaIds.includes(c.id)} onChange={e => { setFormAssinatura(prev => ({ ...prev, contaIds: e.target.checked ? [...prev.contaIds, c.id] : prev.contaIds.filter(x => x !== c.id) })); }} className="rounded" />
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />{c.nome}
                </label>
              ))}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setModalAssinaturaAberto(false)}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleSalvarAssinatura}>{t('signaturesModal.saveSignature')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailManager;
