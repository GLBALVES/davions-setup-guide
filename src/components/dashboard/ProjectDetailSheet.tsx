import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimePickerInput } from "@/components/ui/time-picker-input";
import { AddonReviewModal, type AddonItem, type SessionInfo } from "@/components/dashboard/AddonReviewModal";
import { SessionPickerModal, type PickerSession } from "@/components/dashboard/SessionPickerModal";
import { EditOneSessionDialog } from "@/components/dashboard/EditOneSessionDialog";
import { useNavigate } from "react-router-dom";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";
import {
  Trash2, Archive, ArchiveRestore, Camera,
  Pencil, Check, X, AlertTriangle, CalendarIcon, Timer, MapPin, Mail, User, FileText,
  Plus, CreditCard, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, DollarSign,
  Paperclip, Download, File, Image, FileText as FileTextIcon, Loader2, UploadCloud,
  MessageCircle, Send, ExternalLink, AtSign, Share2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useRef } from "react";
import { format, differenceInDays, differenceInHours, isPast, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { checkBookingConflict, syncProjectDateToBooking, timeToMinutes } from "@/lib/booking-conflict";
import { formatCurrencyInput, parseCurrencyInput, currencyPlaceholder, type CurrencyLang } from "@/lib/currency-format";
import { getBillableTaxRate } from "@/lib/tax-utils";
import { BriefingDialog } from "@/components/dashboard/schedule/BookingDetailSheet";

type Stage = "upcoming" | "shot" | "proof_gallery" | "post_production" | "final_gallery" | "archived";

const STAGE_KEYS: Stage[] = ["upcoming", "shot", "proof_gallery", "post_production", "final_gallery"];

const STAGE_COLORS: Record<Stage, string> = {
  upcoming:        "bg-muted/60 text-muted-foreground border-border",
  shot:            "bg-purple-500/10 text-purple-600 border-purple-500/20",
  proof_gallery:   "bg-orange-500/10 text-orange-600 border-orange-500/20",
  post_production: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  final_gallery:   "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  archived:        "bg-muted/40 text-muted-foreground/60 border-border/50",
};

type InvoiceStatus = "pending" | "paid" | "partial" | "overdue" | "cancelled";

interface ProjectInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  fee: number;
}

interface ProjectInvoice {
  id: string;
  project_id: string;
  photographer_id: string;
  description: string;
  amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  paid_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  fee_amount?: number;
  items?: ProjectInvoiceItem[] | null;
  charge_timing?: "end" | "date" | "checkout" | null;
}


// Static style configs — colors only, labels come from translations
const INVOICE_STATUS_STYLES: Record<InvoiceStatus, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending:   { color: "text-amber-600",        bg: "bg-amber-500/10 border-amber-500/20",       icon: Clock },
  paid:      { color: "text-emerald-600",      bg: "bg-emerald-500/10 border-emerald-500/20",   icon: CheckCircle2 },
  partial:   { color: "text-blue-600",         bg: "bg-blue-500/10 border-blue-500/20",         icon: CreditCard },
  overdue:   { color: "text-destructive",      bg: "bg-destructive/10 border-destructive/20",   icon: AlertTriangle },
  cancelled: { color: "text-muted-foreground", bg: "bg-muted/40 border-border/40",              icon: XCircle },
};

// Document category colors only — labels from translations
type DocCategory = "contract" | "invoice" | "reference" | "other";

const DOC_CATEGORY_COLORS: Record<DocCategory, string> = {
  contract:  "text-purple-600 bg-purple-500/10 border-purple-500/20",
  invoice:   "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  reference: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  other:     "text-muted-foreground bg-muted/40 border-border/40",
};

export interface ProjectSheetData {
  id: string;
  photographer_id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  client_phone?: string | null;
  session_type: string | null;
  session_title?: string | null;
  booking_id: string | null;
  stage: Stage;
  notes: string | null;
  shoot_date: string | null;
  shoot_time: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  gallery_deadline?: string | null;
  location?: string | null;
  description?: string | null;
}

interface Props {
  project: ProjectSheetData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: Partial<ProjectSheetData>) => Promise<void>;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onOpenEdit: (p: ProjectSheetData) => void;
  photographerId: string;
  sessionTypes: SessionType[];
  onRefetchSessionTypes: () => void;
}

// Inline editable field
function InlineField({
  label, value, placeholder, onSave, type = "text", icon,
}: {
  label: string; value: string; placeholder?: string;
  onSave: (v: string) => void; type?: string; icon?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };
  if (editing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input type={type} value={draft} onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
            className="h-7 text-sm" autoFocus />
          <button onClick={commit} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><Check className="h-3.5 w-3.5" /></button>
          <button onClick={() => { setDraft(value); setEditing(false); }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setEditing(true)}
      className="group flex items-center gap-2 w-full text-sm text-left border border-transparent hover:border-border rounded-sm px-1 py-0.5 -mx-1 transition-colors">
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <span className={cn("flex-1 min-w-0 truncate", value ? "text-foreground" : "text-muted-foreground/40 italic text-xs")}>
        {value || placeholder || label}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium mb-2">
      {children}
    </p>
  );
}

// ── Received payments log component ──
interface ProjectPayment {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

function ReceivedPaymentsLog({
  projectId,
  photographerId,
  showForm,
  onToggleForm,
  taxRate = 0,
}: {
  projectId: string;
  photographerId: string;
  showForm: boolean;
  onToggleForm: () => void;
  taxRate?: number;
}) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState(""); // canonical "1500.50"
  const [fee, setFee] = useState(""); // canonical "10.00"
  const [feeManual, setFeeManual] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editDate, setEditDate] = useState("");

  // Auto-compute fee from session tax rate unless the user edits it manually
  useEffect(() => {
    if (feeManual || !taxRate) return;
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt <= 0) {
      setFee("");
      return;
    }
    setFee((amt * taxRate / 100).toFixed(2));
  }, [amount, taxRate, feeManual]);

  const currencyLang: CurrencyLang = lang === "pt" ? "pt" : lang === "es" ? "es" : "en";

  const L = {
    en: { title: "Received Payments", add: "Add payment", date: "Date", amount: "Amount", fee: "Fee amount", desc: "Description", descPh: "e.g. Legacy payment from another system", save: "Save", cancel: "Cancel", empty: "No payments recorded", added: "Payment added", removed: "Payment removed", updated: "Payment updated", error: "Error saving payment", total: "Total received", edit: "Edit" },
    pt: { title: "Pagamentos Recebidos", add: "Adicionar pagamento", date: "Data", amount: "Valor", fee: "Valor da taxa", desc: "Descrição", descPh: "ex.: Pagamento legado de outro sistema", save: "Salvar", cancel: "Cancelar", empty: "Nenhum pagamento registrado", added: "Pagamento adicionado", removed: "Pagamento removido", updated: "Pagamento atualizado", error: "Erro ao salvar pagamento", total: "Total recebido", edit: "Editar" },
    es: { title: "Pagos Recibidos", add: "Agregar pago", date: "Fecha", amount: "Monto", fee: "Valor de la tarifa", desc: "Descripción", descPh: "ej.: Pago heredado de otro sistema", save: "Guardar", cancel: "Cancelar", empty: "Sin pagos registrados", added: "Pago agregado", removed: "Pago eliminado", updated: "Pago actualizado", error: "Error al guardar pago", total: "Total recibido", edit: "Editar" },
  }[lang as "en" | "pt" | "es"] ?? { title: "Received Payments", add: "Add payment", date: "Date", amount: "Amount", fee: "Fee amount", desc: "Description", descPh: "", save: "Save", cancel: "Cancel", empty: "No payments recorded", added: "Payment added", removed: "Payment removed", updated: "Payment updated", error: "Error saving payment", total: "Total received", edit: "Edit" };

  const qKey = ["project-payments", projectId];

  const { data: payments = [] } = useQuery<ProjectPayment[]>({
    queryKey: qKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_payments")
        .select("*")
        .eq("project_id", projectId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectPayment[];
    },
    enabled: !!projectId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("project_payments").insert({
        project_id: projectId,
        photographer_id: photographerId,
        description: desc.trim(),
        amount: parseFloat(amount) || 0,
        fee_amount: parseFloat(fee) || 0,
        payment_date: date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success(L.added);
      onToggleForm(); setDesc(""); setAmount(""); setFee(""); setFeeManual(false); setDate(new Date().toISOString().slice(0, 10));
    },
    onError: (e: any) => toast.error(`${L.error}${e?.message ? `: ${e.message}` : ""}`),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("project_payments").update({
        description: editDesc.trim(),
        amount: parseFloat(editAmount) || 0,
        fee_amount: parseFloat(editFee) || 0,
        payment_date: editDate,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success(L.updated);
      setEditingId(null);
    },
    onError: (e: any) => toast.error(`${L.error}${e?.message ? `: ${e.message}` : ""}`),
  });

  const startEdit = (p: ProjectPayment) => {
    setEditingId(p.id);
    setEditDesc(p.description ?? "");
    setEditAmount(String(p.amount ?? ""));
    setEditFee(String((p as any).fee_amount ?? ""));
    setEditDate(p.payment_date);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("project_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success(L.removed);
    },
  });

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{L.title}</span>
      </div>

      {showForm && (
        <div className="rounded-md border border-border/60 bg-background p-2.5 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.date}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.amount}</Label>
              <Input
                inputMode="decimal"
                placeholder={currencyPlaceholder(currencyLang)}
                value={formatCurrencyInput(amount, currencyLang)}
                onChange={(e) => setAmount(parseCurrencyInput(e.target.value, currencyLang))}
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.fee}</Label>
            <Input
              inputMode="decimal"
              placeholder={currencyPlaceholder(currencyLang)}
              value={formatCurrencyInput(fee, currencyLang)}
              onChange={(e) => { setFeeManual(true); setFee(parseCurrencyInput(e.target.value, currencyLang)); }}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.desc}</Label>
            <Input placeholder={L.descPh} value={desc} onChange={(e) => setDesc(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => { onToggleForm(); setDesc(""); setAmount(""); setFee(""); setFeeManual(false); }}>
              {L.cancel}
            </Button>
            <Button size="sm" className="h-7 text-xs"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !amount || !date}>
              {L.save}
            </Button>
          </div>
        </div>
      )}

      {payments.length === 0 && !showForm && (
        <p className="text-[11px] text-muted-foreground/60 text-center py-2">{L.empty}</p>
      )}

      {payments.length > 0 && (
        <div className="flex flex-col gap-1">
          {payments.map((p) => editingId === p.id ? (
            <div key={p.id} className="rounded-md border border-border/60 bg-background p-2.5 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.date}</Label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.amount}</Label>
                  <Input
                    inputMode="decimal"
                    placeholder={currencyPlaceholder(currencyLang)}
                    value={formatCurrencyInput(editAmount, currencyLang)}
                    onChange={(e) => setEditAmount(parseCurrencyInput(e.target.value, currencyLang))}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.fee}</Label>
                <Input
                  inputMode="decimal"
                  placeholder={currencyPlaceholder(currencyLang)}
                  value={formatCurrencyInput(editFee, currencyLang)}
                  onChange={(e) => setEditFee(parseCurrencyInput(e.target.value, currencyLang))}
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{L.desc}</Label>
                <Input placeholder={L.descPh} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-7 text-xs" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                  {L.cancel}
                </Button>
                <Button size="sm" className="h-7 text-xs"
                  onClick={() => updateMutation.mutate(p.id)}
                  disabled={updateMutation.isPending || !editAmount || !editDate}>
                  {L.save}
                </Button>
              </div>
            </div>
          ) : (
            <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-background border border-border/40">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">
                  {p.description || L.desc}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {format(parseISO(p.payment_date), "d MMM yyyy")}
                </p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-emerald-600 shrink-0">{fmt(Number(p.amount))}</span>
              <button
                onClick={() => startEdit(p)}
                className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0"
                title={L.edit}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => deleteMutation.mutate(p.id)}
                className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-border/40">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{L.total}</span>
            <span className="text-xs font-semibold tabular-nums text-emerald-600">{fmt(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payments section component ──
function PaymentsSection({ project, photographerId }: { project: ProjectSheetData; photographerId: string }) {
  const { t, lang } = useLanguage();
  const tp = t.projects;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const addPaymentLabel = lang === "pt" ? "Adicionar pagamento" : lang === "es" ? "Agregar pago" : "Add payment";
  const editLabel = lang === "pt" ? "Editar" : lang === "es" ? "Editar" : "Edit";
  const currencyLang: CurrencyLang = lang === "pt" ? "pt" : lang === "es" ? "es" : "en";

  // Form state — multiple line items
  type ChargeItem = { description: string; quantity: string; unit_price: string; fee: string };
  const blankItem = (): ChargeItem => ({ description: "", quantity: "1", unit_price: "", fee: "" });
  const [formItems, setFormItems] = useState<ChargeItem[]>([blankItem()]);
  const [formFeeManual, setFormFeeManual] = useState<Record<number, boolean>>({});
  const [formDue, setFormDue]         = useState("");
  const [formDueMode, setFormDueMode] = useState<"end" | "date" | "checkout">("end");
  const [formStatus, setFormStatus]   = useState<InvoiceStatus>("pending");
  const [formPaid, setFormPaid]       = useState("");
  const [shareInvoice, setShareInvoice] = useState<ProjectInvoice | null>(null);

  const itemLineTotal = (it: ChargeItem) => (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
  const formItemsTotal = formItems.reduce((s, it) => s + itemLineTotal(it), 0);
  const formItemsFeeTotal = formItems.reduce((s, it) => s + (parseFloat(it.fee) || 0), 0);

  // Edit form state



  const qKey = ["project-invoices", project.id];

  const invoiceStatusLabels: Record<InvoiceStatus, string> = {
    pending:   tp.invoiceStatusPending,
    paid:      tp.invoiceStatusPaid,
    partial:   tp.invoiceStatusPartial,
    overdue:   tp.invoiceStatusOverdue,
    cancelled: tp.invoiceStatusCancelled,
  };

  const { data: invoices = [] } = useQuery<ProjectInvoice[]>({
    queryKey: qKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_invoices" as any)
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectInvoice[];
    },
    enabled: !!project.id,
  });

  // ── Fetch booking payment info ───────────────────────────────────────────
  interface BookingPaymentInfo {
    id: string;
    client_name: string;
    payment_status: string;
    extras_total: number;
    booked_date: string | null;
    created_at: string;
    deposit_paid_amount: number | null;
    total_paid_amount: number | null;
    sessions: { title: string; price?: number; tax_rate?: number; deposit_enabled?: boolean; deposit_amount?: number; deposit_type?: string } | null;
    session_availability: { start_time: string; end_time: string; date: string } | null;
  }

  const { data: bookingPayment } = useQuery<BookingPaymentInfo | null>({
    queryKey: ["project-booking-payment", project.booking_id],
    queryFn: async () => {
      if (!project.booking_id) return null;
      const { data, error } = await (supabase as any)
        .from("bookings")
        .select("id, client_name, payment_status, extras_total, booked_date, created_at, deposit_paid_amount, total_paid_amount, sessions ( title, price, tax_rate, deposit_enabled, deposit_amount, deposit_type ), session_availability ( start_time, end_time, date )")
        .eq("id", project.booking_id)
        .single();
      if (error) return null;
      return data as BookingPaymentInfo;
    },
    enabled: !!project.booking_id,
  });

  // For projects without a booking, look up the selected session by title
  // to derive the expected total (price + tax) for the payments summary.
  const projectSessionTitle = project.session_title ?? project.session_type;
  const { data: projectSession } = useQuery<{ price: number; tax_rate: number; title: string } | null>({
    queryKey: ["project-session-by-title", photographerId, projectSessionTitle],
    queryFn: async () => {
      if (!projectSessionTitle) return null;
      const { data, error } = await (supabase as any)
        .from("sessions")
        .select("title, price, tax_rate")
        .eq("photographer_id", photographerId)
        .eq("title", projectSessionTitle)
        .maybeSingle();
      if (error) return null;
      return data as any;
    },
    enabled: !project.booking_id && !!projectSessionTitle,
  });

  // Photographer business defaults (country controls whether tax is billable)
  const { data: photographerTaxSettings } = useQuery<{ business_sales_tax: number; business_country: string | null }>({
    queryKey: ["photographer-business-tax", photographerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("photographers")
        .select("business_sales_tax, business_country")
        .eq("id", photographerId)
        .maybeSingle();
      if (error) return { business_sales_tax: 0, business_country: null };
      return {
        business_sales_tax: Number(data?.business_sales_tax ?? 0) || 0,
        business_country: data?.business_country ?? null,
      };
    },
    enabled: !!photographerId,
  });
  const businessTaxRate = photographerTaxSettings?.business_sales_tax ?? 0;
  const businessCountry = photographerTaxSettings?.business_country ?? null;

  const sessionTaxRate =
    getBillableTaxRate(
      Number((bookingPayment?.sessions as any)?.tax_rate ?? 0) ||
      Number((projectSession as any)?.tax_rate ?? 0) ||
      businessTaxRate,
      businessCountry
    );

  // Auto-compute per-item fee from effective tax rate unless manually edited
  useEffect(() => {
    if (!sessionTaxRate) return;
    setFormItems((prev) => prev.map((it, idx) => {
      if (formFeeManual[idx]) return it;
      const lineTotal = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
      const fee = lineTotal > 0 ? (lineTotal * sessionTaxRate / 100).toFixed(2) : "";
      return it.fee === fee ? it : { ...it, fee };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formItems.map((i) => [i.quantity, i.unit_price])), sessionTaxRate, formFeeManual]);
  const { data: projectPayments = [] } = useQuery<ProjectPayment[]>({
    queryKey: ["project-payments", project.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_payments")
        .select("*")
        .eq("project_id", project.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectPayment[];
    },
    enabled: !!project.id,
  });

  // Compute booking financial breakdown (in major units / currency)
  const bookingFinancials = (() => {
    if (!bookingPayment) return { grandTotal: 0, paid: 0 };
    const ps = bookingPayment.payment_status;
    const isFullPaid = ps === "paid";
    const isDepositPaid = ps === "deposit_paid";
    const sess = bookingPayment.sessions as any;
    const sessionPrice = sess?.price ?? 0;
    const taxRate = getBillableTaxRate(sess?.tax_rate ?? 0, businessCountry);
    const depositEnabled = sess?.deposit_enabled ?? false;
    const depositAmount = sess?.deposit_amount ?? 0;
    const depositType = sess?.deposit_type ?? "fixed";
    const extrasTotal = bookingPayment.extras_total ?? 0;
    const subtotal = sessionPrice + extrasTotal;
    const taxAmount = Math.round(subtotal * taxRate / 100);
    const grandTotalCents = subtotal + taxAmount;
    const isPercentDeposit = depositType === "percent" || depositType === "percentage";
    const computedDeposit = depositEnabled
      ? (isPercentDeposit ? Math.round(grandTotalCents * depositAmount / 100) : depositAmount)
      : 0;
    // Prefer the actual amounts captured at payment time so they don't shift if
    // the photographer later edits the session price.
    const depositPaidCents = bookingPayment.deposit_paid_amount ?? computedDeposit;
    const paidCents = isFullPaid
      ? (bookingPayment.total_paid_amount ?? grandTotalCents)
      : (isDepositPaid ? depositPaidCents : 0);
    return { grandTotal: grandTotalCents / 100, paid: paidCents / 100 };
  })();
  const addMutation = useMutation({
    mutationFn: async () => {
      const cleanItems = formItems
        .map((it) => ({
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 0,
          unit_price: parseFloat(it.unit_price) || 0,
          fee: parseFloat(it.fee) || 0,
        }))
        .filter((it) => it.quantity > 0 && it.unit_price > 0);

      if (cleanItems.length === 0) throw new Error("no_items");

      const totalAmount = cleanItems.reduce((s, it) => s + it.quantity * it.unit_price, 0);
      const totalFee = cleanItems.reduce((s, it) => s + it.fee, 0);
      const summaryDesc = cleanItems.length === 1
        ? (cleanItems[0].description || tp.chargeDescription)
        : `${cleanItems.length} ${(lang === "pt" ? "itens" : lang === "es" ? "ítems" : "items")}`;

      if (editingInvoiceId) {
        const { error } = await supabase.from("project_invoices" as any).update({
          description:   summaryDesc,
          amount:        totalAmount,
          fee_amount:    totalFee,
          items:         cleanItems,
          due_date:      formDueMode === "date" && formDue ? formDue : null,
          charge_timing: formDueMode,
        } as any).eq("id", editingInvoiceId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("project_invoices" as any).insert({
        project_id:      project.id,
        photographer_id: photographerId,
        description:     summaryDesc,
        amount:          totalAmount,
        fee_amount:      totalFee,
        items:           cleanItems,
        due_date:        formDueMode === "date" && formDue ? formDue : null,
        charge_timing:   formDueMode,
        status:          "pending",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success(tp.chargeAdded);
      setShowForm(false);
      setEditingInvoiceId(null);
      setFormItems([blankItem()]);
      setFormFeeManual({});
      setFormDue(""); setFormDueMode("end"); setFormStatus("pending"); setFormPaid("");
    },
    onError: (e: any) => toast.error(e?.message === "no_items"
      ? (lang === "pt" ? "Adicione ao menos um item" : lang === "es" ? "Agrega al menos un ítem" : "Add at least one item")
      : tp.errorAddingCharge),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paid_amount }: { id: string; status: InvoiceStatus; paid_amount?: number }) => {
      const { error } = await supabase.from("project_invoices" as any).update({
        status,
        paid_amount: paid_amount ?? undefined,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const startEditInvoice = (inv: ProjectInvoice) => {
    const items = Array.isArray(inv.items) && inv.items.length > 0
      ? inv.items.map((it) => ({
          description: String(it.description ?? ""),
          quantity: String(it.quantity ?? ""),
          unit_price: String(it.unit_price ?? ""),
          fee: String(it.fee ?? ""),
        }))
      : [{
          description: inv.description ?? "",
          quantity: "1",
          unit_price: String(inv.amount ?? ""),
          fee: String(inv.fee_amount ?? ""),
        }];
    setFormItems(items);
    // Mark all fees as manual so auto-compute doesn't overwrite saved values
    const manual: Record<number, boolean> = {};
    items.forEach((_, i) => { manual[i] = true; });
    setFormFeeManual(manual);
    setFormDueMode((inv.charge_timing as any) ?? (inv.due_date ? "date" : "end"));
    setFormDue(inv.due_date ?? "");
    setEditingInvoiceId(inv.id);
    setShowForm(false);
    setExpandedId(inv.id);
  };

  const cancelEdit = () => {
    setEditingInvoiceId(null);
    setFormItems([blankItem()]);
    setFormFeeManual({});
    setFormDue("");
    setFormDueMode("end");
  };



  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_invoices" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success(tp.chargeRemoved);
    },
  });

  const invoicesTotal     = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const invoicesPaid      = invoices.reduce((s, i) => s + Number(i.paid_amount), 0);
  const manualPaymentsSum = projectPayments.reduce((s, p) => s + Number(p.amount), 0);

  // For projects without a booking, derive a virtual total from the selected
  // session so the payments summary still shows Total / Received / Balance.
  const projectSessionTotal = (() => {
    if (bookingPayment || !projectSession) return 0;
    const price = projectSession.price ?? 0;
    const taxRate = getBillableTaxRate(projectSession.tax_rate ?? 0, businessCountry);
    const taxAmount = Math.round(price * taxRate / 100);
    return (price + taxAmount) / 100;
  })();

  const summaryTotal    = bookingFinancials.grandTotal + projectSessionTotal + invoicesTotal;
  const summaryReceived = bookingFinancials.paid + invoicesPaid + manualPaymentsSum;
  const summaryBalance  = summaryTotal - summaryReceived;

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  // Shared body for both new and edit charge forms (items + due selector)
  const renderInvoiceFormBody = () => (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {lang === "pt" ? "Itens" : lang === "es" ? "Ítems" : "Items"}
          </Label>
          <button
            type="button"
            onClick={() => setFormItems((prev) => [...prev, blankItem()])}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" />
            {lang === "pt" ? "Adicionar item" : lang === "es" ? "Agregar ítem" : "Add item"}
          </button>
        </div>

        {formItems.map((it, idx) => {
          const lineTotal = itemLineTotal(it);
          return (
            <div key={idx} className="rounded-sm border border-border/40 bg-background/60 p-2 flex flex-col gap-1.5">
              <div className="flex items-start gap-1.5">
                <Input
                  placeholder={tp.chargeDescriptionPlaceholder}
                  value={it.description}
                  maxLength={200}
                  onChange={(e) => setFormItems((prev) => prev.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))}
                  className="h-7 text-xs flex-1"
                />
                {formItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormItems((prev) => prev.filter((_, i) => i !== idx));
                      setFormFeeManual((prev) => {
                        const next: Record<number, boolean> = {};
                        Object.entries(prev).forEach(([k, v]) => {
                          const ki = Number(k);
                          if (ki < idx) next[ki] = v;
                          else if (ki > idx) next[ki - 1] = v;
                        });
                        return next;
                      });
                    }}
                    className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-sm border border-border/40 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                    title={lang === "pt" ? "Remover" : lang === "es" ? "Eliminar" : "Remove"}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">
                    {lang === "pt" ? "Qtd." : lang === "es" ? "Cant." : "Qty"}
                  </Label>
                  <Input
                    type="number" min={0} step="1" value={it.quantity}
                    onChange={(e) => setFormItems((prev) => prev.map((p, i) => i === idx ? { ...p, quantity: e.target.value } : p))}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">
                    {lang === "pt" ? "Unitário" : lang === "es" ? "Unitario" : "Unit"}
                  </Label>
                  <Input
                    type="text" placeholder={currencyPlaceholder(currencyLang)} value={formatCurrencyInput(it.unit_price, currencyLang)}
                    onChange={(e) => setFormItems((prev) => prev.map((p, i) => i === idx ? { ...p, unit_price: parseCurrencyInput(e.target.value, currencyLang) } : p))}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">
                    {lang === "pt" ? "Total" : lang === "es" ? "Total" : "Total"}
                  </Label>
                  <Input
                    readOnly value={lineTotal ? lineTotal.toFixed(2) : ""}
                    className="h-7 text-xs bg-muted/30"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">
                    {lang === "pt" ? "Taxa" : lang === "es" ? "Tasa" : "Fee"}
                  </Label>
                  <Input
                    type="text" placeholder={currencyPlaceholder(currencyLang)} value={formatCurrencyInput(it.fee, currencyLang)}
                    onChange={(e) => {
                      setFormFeeManual((prev) => ({ ...prev, [idx]: true }));
                      setFormItems((prev) => prev.map((p, i) => i === idx ? { ...p, fee: parseCurrencyInput(e.target.value, currencyLang) } : p));
                    }}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {formItemsTotal > 0 && (
          <div className="flex justify-end gap-4 text-[10px] text-muted-foreground pt-0.5">
            <span>{lang === "pt" ? "Subtotal" : lang === "es" ? "Subtotal" : "Subtotal"}: <span className="font-semibold text-foreground tabular-nums">{formItemsTotal.toFixed(2)}</span></span>
            <span>{lang === "pt" ? "Taxas" : lang === "es" ? "Tasas" : "Fees"}: <span className="font-semibold text-foreground tabular-nums">{formItemsFeeTotal.toFixed(2)}</span></span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {lang === "pt" ? "Vencimento" : lang === "es" ? "Vencimiento" : "Due"}
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => { setFormDueMode("checkout"); setFormDue(""); }}
            className={cn(
              "text-[10px] px-2 py-1.5 rounded-sm border transition-colors",
              formDueMode === "checkout"
                ? "border-foreground bg-foreground text-background"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground"
            )}
          >
            {lang === "pt" ? "Cobrar no checkout" : lang === "es" ? "Cobrar en checkout" : "Charge at checkout"}
          </button>
          <button
            type="button"
            onClick={() => { setFormDueMode("end"); setFormDue(""); }}
            className={cn(
              "text-[10px] px-2 py-1.5 rounded-sm border transition-colors",
              formDueMode === "end"
                ? "border-foreground bg-foreground text-background"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground"
            )}
          >
            {lang === "pt" ? "Cobrar instantâneo" : lang === "es" ? "Cobrar instantáneo" : "Charge instantly"}
          </button>
          <button
            type="button"
            onClick={() => setFormDueMode("date")}
            className={cn(
              "text-[10px] px-2 py-1.5 rounded-sm border transition-colors",
              formDueMode === "date"
                ? "border-foreground bg-foreground text-background"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground"
            )}
          >
            {lang === "pt" ? "Definir vencimento" : lang === "es" ? "Definir vencimiento" : "Set due date"}
          </button>
        </div>
        {formDueMode === "date" && (
          <Input
            type="date"
            value={formDue}
            onChange={(e) => setFormDue(e.target.value)}
            className="h-7 text-xs mt-1"
          />
        )}
      </div>
    </>
  );

  return (

    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>{tp.paymentsSection}</SectionLabel>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPaymentForm((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" /> {addPaymentLabel}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" /> {tp.newCharge}
          </button>
        </div>
      </div>

      {(summaryTotal > 0 || summaryReceived > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: tp.chargeTotal,    value: summaryTotal,    color: "text-foreground" },
            { label: tp.chargeReceived, value: summaryReceived, color: "text-emerald-600" },
            { label: tp.chargeBalance,  value: summaryBalance,  color: summaryBalance > 0 ? "text-amber-600" : "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-md border border-border/50 bg-muted/20 py-2 px-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.label}</span>
              <span className={cn("text-sm font-semibold tabular-nums mt-0.5", s.color)}>{fmt(s.value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Booking financial breakdown ───────────────────────────────── */}
      {bookingPayment && (() => {
        const ps = bookingPayment.payment_status;
        const isFullPaid    = ps === "paid";
        const isDepositPaid = ps === "deposit_paid";
        const sessionDate   = bookingPayment.session_availability?.date;
        const sessionTitle  = (bookingPayment.sessions as any)?.title ?? project.session_type ?? "—";
        const cfgBg  = isFullPaid ? "bg-emerald-500/10 border-emerald-500/20"
                     : isDepositPaid ? "bg-amber-500/10 border-amber-500/20"
                     : "bg-muted/30 border-border/50";
        const cfgColor = isFullPaid ? "text-emerald-600" : isDepositPaid ? "text-amber-600" : "text-muted-foreground";
        const label    = isFullPaid ? tp.bookingPaymentFull : isDepositPaid ? tp.bookingPaymentDeposit : tp.bookingPaymentPending;
        const Icon     = isFullPaid ? CheckCircle2 : isDepositPaid ? CreditCard : Clock;

        // Financial calculations (all in cents)
        const sess = bookingPayment.sessions as any;
        const sessionPrice = sess?.price ?? 0;
        const taxRate = getBillableTaxRate(sess?.tax_rate ?? 0, businessCountry);
        const depositEnabled = sess?.deposit_enabled ?? false;
        const depositAmount = sess?.deposit_amount ?? 0;
        const depositType = sess?.deposit_type ?? "fixed";
        const extrasTotal = bookingPayment.extras_total ?? 0;
        const subtotal = sessionPrice + extrasTotal;
        const taxAmount = Math.round(subtotal * taxRate / 100);
        const grandTotal = subtotal + taxAmount;
        const isPercentDeposit = depositType === "percent" || depositType === "percentage";
        const depositValue = depositEnabled
          ? (isPercentDeposit ? Math.round(grandTotal * depositAmount / 100) : depositAmount)
          : 0;
        // Honor the actual amounts captured at payment time (locked once paid),
        // so editing the session price later does not retroactively change the
        // displayed deposit / total paid.
        const lockedDeposit = bookingPayment.deposit_paid_amount;
        const lockedTotalPaid = bookingPayment.total_paid_amount;
        const depositPaid = isDepositPaid || isFullPaid
          ? (lockedDeposit ?? depositValue)
          : 0;
        const totalPaidAmount = isFullPaid
          ? (lockedTotalPaid ?? grandTotal)
          : depositPaid;
        const balanceDue = grandTotal - totalPaidAmount;

        return (
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Status header */}
            <div className={cn("px-3 py-2 flex items-center gap-2.5 border-b border-border/50", cfgBg)}>
              <Icon className={cn("h-4 w-4 shrink-0", cfgColor)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">{sessionTitle}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {tp.bookingPaymentSection}
                  {sessionDate && <> · {format(parseISO(sessionDate), "d MMM yyyy")}</>}
                </p>
              </div>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-sm border shrink-0", cfgBg, cfgColor)}>
                {label}
              </span>
            </div>

            {/* Financial details */}
            <div className="px-3 py-2.5 space-y-1.5 bg-muted/5">
              {/* Session price */}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tp.newSessionPrice}</span>
                <span className="tabular-nums font-medium">{fmt(sessionPrice / 100)}</span>
              </div>

              {/* Extras */}
              {extrasTotal > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{tp.extrasTotal}</span>
                  <span className="tabular-nums font-medium">{fmt(extrasTotal / 100)}</span>
                </div>
              )}

              {/* Subtotal (only if extras exist) */}
              {extrasTotal > 0 && (
                <div className="flex justify-between text-xs border-t border-border/30 pt-1">
                  <span className="text-muted-foreground">{tp.subtotal || "Subtotal"}</span>
                  <span className="tabular-nums font-medium">{fmt(subtotal / 100)}</span>
                </div>
              )}

              {/* Tax */}
              {taxRate > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{tp.taxAmount} ({taxRate}%)</span>
                  <span className="tabular-nums font-medium">{fmt(taxAmount / 100)}</span>
                </div>
              )}

              {/* Grand total */}
              <div className="flex justify-between text-xs font-semibold border-t border-border/50 pt-1.5">
                <span>{tp.grandTotal || "Total"}</span>
                <span className="tabular-nums">{fmt(grandTotal / 100)}</span>
              </div>

              {/* Deposit */}
              {depositEnabled && depositValue > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {tp.depositAmount}
                    {isPercentDeposit && ` (${depositAmount}%)`}
                  </span>
                  <span className={cn("tabular-nums font-medium", depositPaid > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                    {depositPaid > 0 ? `−${fmt(depositPaid / 100)}` : fmt(depositValue / 100)}
                  </span>
                </div>
              )}

              {/* Total paid */}
              {totalPaidAmount > 0 && !isFullPaid && (
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600">{tp.totalPaid || "Paid"}</span>
                  <span className="tabular-nums font-medium text-emerald-600">−{fmt(totalPaidAmount / 100)}</span>
                </div>
              )}

              {/* Balance due */}
              {!isFullPaid && (
                <div className={cn("flex justify-between text-xs font-semibold border-t border-border/50 pt-1.5",
                  balanceDue > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
                  <span>{tp.balanceDue}</span>
                  <span className="tabular-nums">{fmt(balanceDue / 100)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Add invoice form */}
      {showForm && (
        <div className="rounded-md border border-border/60 bg-muted/20 p-3 flex flex-col gap-2.5">
          <p className="text-xs font-medium">{tp.newChargeTitle}</p>
          {renderInvoiceFormBody()}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => { setShowForm(false); setFormItems([blankItem()]); setFormFeeManual({}); setFormDue(""); setFormDueMode("end"); }}>
              {tp.chargeCancel}
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || formItemsTotal <= 0 || (formDueMode === "date" && !formDue)}>
              {addMutation.isPending ? tp.chargeSaving : tp.chargeSave}
            </Button>
          </div>
        </div>
      )}


      {/* Empty state */}
      {invoices.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-1.5 py-5 border border-dashed border-border/50 rounded-md">
          <DollarSign className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground/50">{tp.noChargesRecorded}</p>
        </div>
      )}

      {/* ── Received payments log ───────────────────────────────────────── */}
      <ReceivedPaymentsLog
        projectId={project.id}
        photographerId={photographerId}
        showForm={showPaymentForm}
        onToggleForm={() => setShowPaymentForm((v) => !v)}
        taxRate={sessionTaxRate}
      />

      <div className="flex flex-col gap-2">
        {invoices.map((inv) => {
          const cfg    = INVOICE_STATUS_STYLES[inv.status] ?? INVOICE_STATUS_STYLES.pending;
          const Icon   = cfg.icon;
          const isOpen = expandedId === inv.id;
          const balance = Number(inv.amount) - Number(inv.paid_amount);
          const isDue  = inv.due_date && isPast(parseISO(inv.due_date)) && inv.status !== "paid" && inv.status !== "cancelled";

          return (
            <div key={inv.id} className={cn("rounded-md border transition-colors", cfg.bg)}>
              <div className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() => setExpandedId(isOpen ? null : inv.id)}>
                <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{inv.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground tabular-nums">{fmt(Number(inv.amount))}</span>
                    {inv.due_date && (
                      <span className={cn("text-[10px]", isDue ? "text-destructive font-medium" : "text-muted-foreground/60")}>
                        · {isDue ? `${tp.chargeDue} ` : ""}{format(parseISO(inv.due_date), "d MMM")}
                      </span>
                    )}
                  </div>
                </div>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-sm border shrink-0", cfg.bg, cfg.color)}>
                  {invoiceStatusLabels[inv.status]}
                </span>
                {isOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>

              {isOpen && editingInvoiceId === inv.id && (
                <div className="border-t border-border/40 px-3 py-2.5 flex flex-col gap-2.5 bg-background/70 rounded-b-md">
                  {renderInvoiceFormBody()}
                  <div className="flex gap-2 justify-end pt-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>
                      {tp.chargeCancel}
                    </Button>
                    <Button size="sm" className="h-7 text-xs"
                      onClick={() => addMutation.mutate()}
                      disabled={addMutation.isPending || formItemsTotal <= 0 || (formDueMode === "date" && !formDue)}>
                      {addMutation.isPending ? tp.chargeSaving : tp.chargeSave}
                    </Button>
                  </div>
                </div>
              )}


              {isOpen && editingInvoiceId !== inv.id && (
                <div className="border-t border-border/40 px-3 py-2.5 flex flex-col gap-2.5 bg-background/50 rounded-b-md">
                  {Array.isArray(inv.items) && inv.items.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {lang === "pt" ? "Itens" : lang === "es" ? "Ítems" : "Items"}
                      </p>
                      <div className="flex flex-col divide-y divide-border/40 rounded-sm border border-border/40 bg-background/60">
                        {inv.items.map((it, idx) => {
                          const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                          return (
                            <div key={idx} className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                              <span className="text-muted-foreground tabular-nums shrink-0">{it.quantity}×</span>
                              <span className="flex-1 truncate">{it.description || "—"}</span>
                              <span className="text-muted-foreground tabular-nums shrink-0">{fmt(Number(it.unit_price) || 0)}</span>
                              <span className="font-medium tabular-nums shrink-0 w-20 text-right">{fmt(lineTotal)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider mb-0.5">{tp.chargeValue}</p>
                      <p className="font-semibold tabular-nums">{fmt(Number(inv.amount))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider mb-0.5">{tp.chargePaid}</p>
                      <p className="font-semibold tabular-nums text-emerald-600">{fmt(Number(inv.paid_amount))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider mb-0.5">{tp.chargeBalance}</p>
                      <p className={cn("font-semibold tabular-nums", balance > 0 ? "text-amber-600" : "text-muted-foreground")}>
                        {fmt(balance)}
                      </p>
                    </div>
                  </div>

                  {inv.due_date && (
                    <p className="text-[10px] text-muted-foreground">
                      {tp.chargeDueDate}: <span className={cn("font-medium", isDue ? "text-destructive" : "text-foreground")}>
                        {format(parseISO(inv.due_date), "d MMM yyyy")}
                      </span>
                    </p>
                  )}
                  {inv.paid_at && (
                    <p className="text-[10px] text-muted-foreground">
                      {tp.chargeReceived}: <span className="font-medium text-foreground">{format(parseISO(inv.paid_at), "d MMM yyyy")}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => startEditInvoice(inv)}
                      className="text-[10px] px-2 py-0.5 rounded-sm border border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1"
                    >
                      <Pencil className="h-2.5 w-2.5" /> {editLabel}
                    </button>
                    {inv.status !== "paid" && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "paid", paid_amount: Number(inv.amount) })}
                        className="text-[10px] px-2 py-0.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                      >
                        {tp.markAsPaid}
                      </button>
                    )}
                    {inv.status !== "overdue" && inv.status !== "paid" && inv.status !== "cancelled" && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "overdue" })}
                        className="text-[10px] px-2 py-0.5 rounded-sm border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        {tp.markOverdue}
                      </button>
                    )}
                    {inv.status !== "cancelled" && inv.status !== "paid" && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "cancelled" })}
                        className="text-[10px] px-2 py-0.5 rounded-sm border border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {tp.cancelCharge}
                      </button>
                    )}
                    <button
                      onClick={() => setShareInvoice(inv)}
                      className="text-[10px] px-2 py-0.5 rounded-sm border border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1"
                    >
                      <Share2 className="h-2.5 w-2.5" />
                      {lang === "pt" ? "Compartilhar" : lang === "es" ? "Compartir" : "Share"}
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(inv.id)}
                      className="ml-auto text-[10px] text-destructive/60 hover:text-destructive transition-colors"
                    >
                      {tp.deleteCharge}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {shareInvoice && (
        <InvoiceShareDialog
          open={!!shareInvoice}
          onClose={() => setShareInvoice(null)}
          invoice={shareInvoice}
          clientName={project.client_name ?? ""}
          lang={lang}
        />
      )}
    </div>
  );
}

function InvoiceShareDialog({
  open, onClose, invoice, clientName, lang,
}: {
  open: boolean;
  onClose: () => void;
  invoice: ProjectInvoice;
  clientName: string;
  lang: string;
}) {
  const t = {
    pt: {
      title: "Compartilhar cobrança",
      hello: (n: string) => n ? `Olá ${n}!` : "Olá!",
      body: (desc: string, amt: string, due: string) =>
        `Segue a cobrança "${desc}" no valor de ${amt}${due ? ` com vencimento em ${due}` : ""}.`,
      payLine: (link: string) => `Pague com segurança aqui: ${link}`,
      copy: "Copiar mensagem",
      copied: "Mensagem copiada",
      copyError: "Não foi possível copiar",
      whatsapp: "WhatsApp",
      email: "Email",
      sms: "SMS",
      telegram: "Telegram",
      emailSubject: "Cobrança",
      linkLabel: "Link de pagamento",
      copyLink: "Copiar link",
    },
    es: {
      title: "Compartir cobro",
      hello: (n: string) => n ? `¡Hola ${n}!` : "¡Hola!",
      body: (desc: string, amt: string, due: string) =>
        `Aquí está el cobro "${desc}" por ${amt}${due ? ` con vencimiento el ${due}` : ""}.`,
      payLine: (link: string) => `Paga de forma segura aquí: ${link}`,
      copy: "Copiar mensaje",
      copied: "Mensaje copiado",
      copyError: "No se pudo copiar",
      whatsapp: "WhatsApp",
      email: "Email",
      sms: "SMS",
      telegram: "Telegram",
      emailSubject: "Cobro",
      linkLabel: "Enlace de pago",
      copyLink: "Copiar enlace",
    },
    en: {
      title: "Share charge",
      hello: (n: string) => n ? `Hi ${n}!` : "Hi!",
      body: (desc: string, amt: string, due: string) =>
        `Here is the charge "${desc}" for ${amt}${due ? `, due on ${due}` : ""}.`,
      payLine: (link: string) => `Pay securely here: ${link}`,
      copy: "Copy message",
      copied: "Message copied",
      copyError: "Unable to copy",
      whatsapp: "WhatsApp",
      email: "Email",
      sms: "SMS",
      telegram: "Telegram",
      emailSubject: "Charge",
      linkLabel: "Payment link",
      copyLink: "Copy link",
    },
  }[lang === "pt" ? "pt" : lang === "es" ? "es" : "en"];

  const fmtAmt = new Intl.NumberFormat(
    lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US",
    { style: "currency", currency: "BRL" }
  ).format(Number(invoice.amount));
  const dueStr = invoice.due_date ? format(parseISO(invoice.due_date), "d MMM yyyy") : "";

  const { data: customDomain } = useQuery<string | null>({
    queryKey: ["photographer-custom-domain", invoice.photographer_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("photographers")
        .select("custom_domain")
        .eq("id", invoice.photographer_id)
        .maybeSingle();
      return ((data as any)?.custom_domain as string | null) ?? null;
    },
    enabled: !!invoice.photographer_id,
    staleTime: 60_000,
  });

  const payBase = customDomain && customDomain.trim()
    ? `https://${customDomain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
    : window.location.origin;
  const payUrl = `${payBase}/pay/invoice/${invoice.id}`;
  const message = `${t.hello(clientName)} ${t.body(invoice.description, fmtAmt, dueStr)}\n\n${t.payLine(payUrl)}`;


  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-widest uppercase font-light">{t.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.linkLabel}</span>
            <div className="flex items-center gap-2">
              <input
                value={payUrl}
                readOnly
                className="flex-1 h-8 px-2 text-xs rounded-sm border border-border/50 bg-muted/30 truncate"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[10px] tracking-widest uppercase shrink-0"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(payUrl); toast.success(t.copied); }
                  catch { toast.error(t.copyError); }
                }}
              >
                {t.copyLink}
              </Button>
            </div>
          </div>
          <Textarea value={message} readOnly className="text-xs min-h-[110px] resize-none" />
          <Button variant="outline" size="sm" onClick={copy}>{t.copy}</Button>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-10 rounded-sm border border-border/50 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              {t.whatsapp}
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(t.emailSubject + " — " + invoice.description)}&body=${encodeURIComponent(message)}`}
              className="flex items-center justify-center gap-2 h-10 rounded-sm border border-border/50 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              {t.email}
            </a>
            <a
              href={`sms:?&body=${encodeURIComponent(message)}`}
              className="flex items-center justify-center gap-2 h-10 rounded-sm border border-border/50 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              {t.sms}
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(message)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-10 rounded-sm border border-border/50 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              {t.telegram}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectDocument {
  id: string;
  project_id: string;
  photographer_id: string;
  name: string;
  file_url: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  category: DocCategory;
  created_at: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500 shrink-0" />;
  if (fileType === "application/pdf") return <FileTextIcon className="h-4 w-4 text-red-500 shrink-0" />;
  return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function GalleriesSubSection({ project, photographerId }: { project: ProjectSheetData; photographerId: string }) {
  const { t } = useLanguage();
  const tp = t.projects;
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedKey = ["project-linked-galleries", project.id];
  const availableKey = ["photographer-unlinked-galleries", photographerId, project.id];

  const { data: linked = [] } = useQuery<{ id: string; title: string; slug: string | null; cover_image_url: string | null; status: string }[]>({
    queryKey: linkedKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("id, title, slug, cover_image_url, status")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
    enabled: !!project.id,
  });

  const { data: available = [] } = useQuery<{ id: string; title: string; cover_image_url: string | null; status: string }[]>({
    queryKey: availableKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("id, title, cover_image_url, status, project_id")
        .eq("photographer_id", photographerId)
        .is("project_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
    enabled: pickerOpen && !!photographerId,
  });

  const linkMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      const { error } = await supabase
        .from("galleries")
        .update({ project_id: project.id } as any)
        .eq("id", galleryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linkedKey });
      queryClient.invalidateQueries({ queryKey: availableKey });
      toast.success(tp.galleryLinked);
      setPickerOpen(false);
    },
    onError: () => toast.error(tp.errorLinkingGallery),
  });

  const unlinkMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      const { error } = await supabase
        .from("galleries")
        .update({ project_id: null } as any)
        .eq("id", galleryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linkedKey });
      queryClient.invalidateQueries({ queryKey: availableKey });
      toast.success(tp.galleryUnlinked);
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">{tp.galleriesSubsection}</p>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" /> {tp.linkGallery}
        </button>
      </div>

      {linked.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/50 italic pl-1">{tp.noGalleries}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {linked.map((gal) => (
            <div
              key={gal.id}
              className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2 group"
            >
              {gal.cover_image_url ? (
                <img src={gal.cover_image_url} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
              ) : (
                <Image className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
              <a
                href={`/dashboard/galleries/${gal.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 flex items-center gap-1.5 hover:text-foreground"
              >
                <span className="text-xs font-medium truncate">{gal.title || "Untitled Gallery"}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
              <button
                onClick={() => unlinkMutation.mutate(gal.id)}
                disabled={unlinkMutation.isPending}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5"
                title={tp.unlinkGallery}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{tp.linkGallery}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-1.5 pr-1">
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-6">{tp.noGalleriesAvailable}</p>
            ) : (
              available.map((gal) => (
                <button
                  key={gal.id}
                  onClick={() => linkMutation.mutate(gal.id)}
                  disabled={linkMutation.isPending}
                  className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/10 hover:bg-muted/40 px-3 py-2 text-left transition-colors disabled:opacity-50"
                >
                  {gal.cover_image_url ? (
                    <img src={gal.cover_image_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                  ) : (
                    <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{gal.title || "Untitled Gallery"}</p>
                    <p className="text-[10px] text-muted-foreground/60 capitalize">{gal.status}</p>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentsSection({ project, photographerId }: { project: ProjectSheetData; photographerId: string }) {
  const { t } = useLanguage();
  const tp = t.projects;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>("other");
  const [dragOver, setDragOver] = useState(false);

  const docCategoryLabels: Record<DocCategory, string> = {
    contract:  tp.docCategoryContract,
    invoice:   tp.docCategoryInvoice,
    reference: tp.docCategoryReference,
    other:     tp.docCategoryOther,
  };

  const qKey = ["project-documents", project.id];

  // Fetch the signed contract snapshot from the booking linked to this project
  const bookingId = (project as any).booking_id ?? null;
  const [contractOpen, setContractOpen] = useState(false);
  const projectId = project.id;
  const { data: contractSnapshot, refetch: refetchContractSnapshot } = useQuery<{ html: string | null; signedAt: string | null; signature: string | null } | null>({
    queryKey: ["project-contract-snapshot", projectId, bookingId],
    queryFn: async () => {
      // Always read signature from the booking (only stored there)
      let signature: string | null = null;
      if (bookingId) {
        const { data: sigRow } = await supabase
          .from("bookings")
          .select("contract_signature_data")
          .eq("id", bookingId)
          .maybeSingle();
        signature = (sigRow as any)?.contract_signature_data ?? null;
      }

      // Prefer the signed copy stored on the project itself
      const { data: proj } = await supabase
        .from("client_projects" as any)
        .select("signed_contract_html, contract_signed_at")
        .eq("id", projectId)
        .maybeSingle();
      const projHtml = (proj as any)?.signed_contract_html ?? null;
      const projSignedAt = (proj as any)?.contract_signed_at ?? null;
      if (projHtml) return { html: projHtml, signedAt: projSignedAt, signature };

      // Fallback: read from the linked booking (legacy / pre-payment snapshots)
      if (!bookingId) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("contract_html_snapshot, contract_signed_at")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      const html = (data as any)?.contract_html_snapshot ?? null;
      const signedAt = (data as any)?.contract_signed_at ?? null;

      // Auto-recover legacy bookings: rebuild snapshot from template if missing
      if (!html && bookingId) {
        try {
          const { data: rebuilt } = await supabase.functions.invoke("backfill-contract-snapshot", {
            body: { booking_id: bookingId },
          });
          if ((rebuilt as any)?.ok) {
            const { data: again } = await supabase
              .from("bookings")
              .select("contract_html_snapshot, contract_signed_at")
              .eq("id", bookingId)
              .maybeSingle();
            return {
              html: (again as any)?.contract_html_snapshot ?? null,
              signedAt: (again as any)?.contract_signed_at ?? null,
              signature,
            };
          }
        } catch (e) {
          console.error("backfill-contract-snapshot error:", e);
        }
      }

      return { html, signedAt, signature };
    },
    enabled: !!projectId,
  });

  // Fetch briefings
  const { data: briefings = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["project-briefings-list", photographerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("id, name")
        .eq("photographer_id", photographerId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!photographerId,
  });

  const { data: documents = [] } = useQuery<ProjectDocument[]>({
    queryKey: qKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents" as any)
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectDocument[];
    },
    enabled: !!project.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      await supabase.storage.from("project-documents").remove([doc.storage_path]);
      const { error } = await supabase.from("project_documents" as any).delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success(tp.docRemoved);
    },
    onError: () => toast.error(tp.errorRemovingDoc),
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${photographerId}/${project.id}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(storagePath, file, { upsert: false });

        if (uploadError) { toast.error(tp.errorUploadingFile(file.name)); continue; }

        const { data: urlData } = supabase.storage.from("project-documents").getPublicUrl(storagePath);

        const { error: dbError } = await supabase.from("project_documents" as any).insert({
          project_id:      project.id,
          photographer_id: photographerId,
          name:            file.name,
          file_url:        urlData.publicUrl,
          storage_path:    storagePath,
          file_type:       file.type || "application/octet-stream",
          file_size:       file.size,
          category:        selectedCategory,
        } as any);

        if (dbError) toast.error(tp.errorRegisteringFile(file.name));
      }
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success(files.length === 1 ? tp.docAdded : tp.docsAdded(files.length));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Contracts sub-section ────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">{tp.contractsSubsection}</p>
        {!contractSnapshot?.html ? (
          <p className="text-[11px] text-muted-foreground/50 italic pl-1">{tp.noContracts}</p>
        ) : (
          <button
            type="button"
            onClick={() => setContractOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 bg-muted/10 hover:bg-muted/30 transition text-left"
          >
            <FileTextIcon className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <span className="text-xs flex-1 truncate">{tp.contractsSubsection}</span>
            <span className="text-[10px] text-muted-foreground/60">{(tp as any).readOnly ?? "Read-only"}</span>
          </button>
        )}
      </div>

      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <FileTextIcon className="h-4 w-4 text-purple-500" />
              {tp.contractsSubsection}
              <span className="ml-2 text-[10px] font-normal text-muted-foreground/60 uppercase tracking-widest">{(tp as any).readOnly ?? "Read-only"}</span>
              {contractSnapshot?.signedAt && (
                <span className="text-[10px] font-normal text-muted-foreground/60">
                  · {(tp as any).signedOn ?? "Signed on"} {new Date(contractSnapshot.signedAt).toLocaleString()}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div
              className="prose prose-sm max-w-none text-sm select-text"
              dangerouslySetInnerHTML={{ __html: contractSnapshot?.html ?? "" }}
            />
            {contractSnapshot?.signature && (
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground mb-2">
                  Client signature
                </p>
                <img
                  src={contractSnapshot.signature}
                  alt="Client signature"
                  className="h-24 object-contain object-left bg-white border border-border p-2"
                />
                {contractSnapshot.signedAt && (
                  <p className="text-[10px] font-light text-muted-foreground/60 mt-2">
                    Signed on {new Date(contractSnapshot.signedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Briefings sub-section ────────────────────────────────────────── */}
      <ProjectBriefingSubsection
        projectId={project.id}
        bookingId={(project as any).booking_id ?? null}
        sessionType={(project as any).session_type ?? null}
        photographerId={photographerId}
        briefings={briefings}
        labelTitle={tp.briefingsSubsection}
        emptyText={tp.noBriefings}
      />

      {/* ── Galleries sub-section ────────────────────────────────────────── */}
      <GalleriesSubSection project={project} photographerId={photographerId} />

      <Separator className="opacity-50" />

      {/* ── Attached files ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{tp.documentsSection}</SectionLabel>
          <div className="flex items-center gap-1.5">
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocCategory)}>
              <SelectTrigger className="h-6 text-[10px] w-28 px-2 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DOC_CATEGORY_COLORS) as DocCategory[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">{docCategoryLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {tp.attach}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed py-4 cursor-pointer transition-colors",
            dragOver ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border hover:bg-muted/20",
            documents.length > 0 && "py-2.5",
          )}
        >
          {uploading ? (
            <><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><p className="text-[11px] text-muted-foreground">{tp.uploading}</p></>
          ) : documents.length === 0 ? (
            <>
              <UploadCloud className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-[11px] text-muted-foreground/60">{tp.dragFilesHere}</p>
              <p className="text-[10px] text-muted-foreground/40">{tp.supportedFormats}</p>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Paperclip className="h-3 w-3" /> {tp.clickOrDragMore}
            </div>
          )}
        </div>

        {/* Document list */}
        {documents.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {documents.map((doc) => {
              const catColor = DOC_CATEGORY_COLORS[doc.category] ?? DOC_CATEGORY_COLORS.other;
              return (
                <div key={doc.id} className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2 group">
                  {getFileIcon(doc.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-sm border font-medium", catColor)}>
                        {docCategoryLabels[doc.category] ?? doc.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">{formatBytes(doc.file_size)}</span>
                      <span className="text-[10px] text-muted-foreground/40">{format(new Date(doc.created_at), "d MMM")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.name}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={tp.download}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={tp.removeDocument}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{tp.removeDocument}</AlertDialogTitle>
                          <AlertDialogDescription>{tp.removeDocumentConfirm(doc.name)}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tp.chargeCancel}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(doc)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {tp.remove}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Client Communications section ──
function ClientCommsSection({ project, photographerId }: { project: ProjectSheetData; photographerId: string }) {
  const { t } = useLanguage();
  const tp = t.projects;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"chat" | "emails">("chat");
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [creating, setCreating] = useState(false);

  // Email compose state
  const [showCompose, setShowCompose] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: tickets = [], refetch: refetchTickets } = useQuery<{
    id: string; subject: string; status: string; updated_at: string;
    message_count?: number;
  }[]>({
    queryKey: ["client-comms-tickets", project.client_email, photographerId],
    queryFn: async () => {
      if (!project.client_email) return [];
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("id, subject, status, updated_at, ai_mode")
        .eq("photographer_id", photographerId)
        .eq("client_email", project.client_email)
        .order("updated_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as any[];
    },
    enabled: !!project.client_email && !!photographerId,
  });

  // Sent emails query
  const { data: sentEmails = [] } = useQuery<{
    id: string; subject: string; created_at: string; status: string;
  }[]>({
    queryKey: ["project-emails", project.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_emails")
        .select("id, subject, created_at, status")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as any[];
    },
    enabled: !!project.id,
  });

  const createTicket = async () => {
    if (!project.client_email || !newTicketSubject.trim()) return;
    setCreating(true);
    const { error } = await (supabase as any).from("support_tickets").insert({
      photographer_id: photographerId,
      client_name: project.client_name,
      client_email: project.client_email,
      subject: newTicketSubject.trim(),
    });
    if (error) { toast.error(tp.commsTicketFailed); }
    else {
      toast.success(tp.commsTicketCreated);
      setNewTicketSubject("");
      refetchTickets();
    }
    setCreating(false);
  };

  const sendEmail = async () => {
    if (!emailSubject.trim()) {
      toast.error(tp.commsEmailNoSubject);
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("send-client-email", {
        body: {
          projectId: project.id,
          clientEmail: project.client_email,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
        },
      });
      if (res.error) throw res.error;
      toast.success(tp.commsEmailSentSuccess);
      setEmailSubject("");
      setEmailBody("");
      setShowCompose(false);
      queryClient.invalidateQueries({ queryKey: ["project-emails", project.id] });
    } catch {
      toast.error(tp.commsEmailSentError);
    }
    setSending(false);
  };

  const statusColors: Record<string, string> = {
    open:   "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    closed: "bg-muted/40 text-muted-foreground border-border/40",
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>{tp.commsSection}</SectionLabel>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "emails")}>
        <TabsList className="w-full h-8">
          <TabsTrigger value="chat" className="flex-1 text-xs gap-1.5">
            <MessageCircle className="h-3 w-3" /> {tp.commsChat}
            {tickets.length > 0 && (
              <Badge variant="secondary" className="h-4 text-[9px] px-1 ml-0.5">{tickets.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex-1 text-xs gap-1.5">
            <AtSign className="h-3 w-3" /> {tp.commsEmails}
            {sentEmails.length > 0 && (
              <Badge variant="secondary" className="h-4 text-[9px] px-1 ml-0.5">{sentEmails.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Chat tab ── */}
        <TabsContent value="chat" className="mt-3 flex flex-col gap-2">
          {!project.client_email ? (
            <p className="text-xs text-muted-foreground text-center py-4 italic">{tp.addEmailPlaceholder}</p>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3 italic">{tp.commsNoTickets}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2 group">
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">{ticket.subject}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(new Date(ticket.updated_at), "d MMM yyyy · HH:mm")}
                    </p>
                  </div>
                  <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-sm border shrink-0", statusColors[ticket.status] ?? statusColors.open)}>
                    {ticket.status}
                  </span>
                  <a
                    href="/dashboard/chat"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground"
                    title={tp.commsOpenTicket}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* New ticket form */}
          <div className="flex gap-2 mt-1">
            <Input
              placeholder={tp.commsNewTicket + "…"}
              value={newTicketSubject}
              onChange={(e) => setNewTicketSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTicket()}
              className="h-7 text-xs flex-1"
              disabled={!project.client_email}
            />
            <Button
              size="sm" className="h-7 text-xs px-2 gap-1"
              onClick={createTicket}
              disabled={creating || !newTicketSubject.trim() || !project.client_email}
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </Button>
          </div>
        </TabsContent>

        {/* ── Emails tab ── */}
        <TabsContent value="emails" className="mt-3 flex flex-col gap-2">
          {!project.client_email ? (
            <p className="text-xs text-muted-foreground text-center py-4 italic">{tp.addEmailPlaceholder}</p>
          ) : (
            <>
              {/* Sent emails list */}
              {sentEmails.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
                  {sentEmails.map((email) => (
                    <div key={email.id} className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                      <Send className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate leading-tight">{email.subject}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {format(new Date(email.created_at), "d MMM yyyy · HH:mm")}
                        </p>
                      </div>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-sm border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
                        {tp.commsEmailSent}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {sentEmails.length === 0 && !showCompose && (
                <p className="text-xs text-muted-foreground text-center py-3 italic">{tp.commsNoEmails}</p>
              )}

              {/* Compose form */}
              {showCompose ? (
                <div className="flex flex-col gap-2 border border-border rounded-md p-3 bg-muted/10">
                  <Input
                    placeholder={tp.commsEmailSubject}
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Textarea
                    placeholder={tp.commsEmailBody}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={4}
                    className="text-xs resize-none min-h-[80px]"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => { setShowCompose(false); setEmailSubject(""); setEmailBody(""); }}
                      disabled={sending}
                    >
                      <X className="h-3 w-3 mr-1" />
                      {tp.cancel}
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs px-3 gap-1.5"
                      onClick={sendEmail}
                      disabled={sending || !emailSubject.trim()}
                    >
                      {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      {sending ? tp.commsEmailSending : tp.commsEmailSendBtn}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline" size="sm"
                  className="h-7 text-xs gap-1.5 w-full"
                  onClick={() => setShowCompose(true)}
                  disabled={!project.client_email}
                >
                  <Mail className="h-3 w-3" />
                  {tp.commsComposeEmail}
                </Button>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


export function ProjectDetailSheet({
  project, open, onOpenChange, onUpdate, onDelete, onArchive, onUnarchive,
  photographerId, sessionTypes, onRefetchSessionTypes,
}: Props) {
  const { t } = useLanguage();
  const tp = t.projects;
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<ProjectSheetData>>({});
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addonReviewOpen, setAddonReviewOpen] = useState(false);
  const [addonItems, setAddonItems] = useState<AddonItem[]>([]);
  const [pendingNewSession, setPendingNewSession] = useState<SessionInfo | null>(null);
  const [changingSession, setChangingSession] = useState(false);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemQty, setEditItemQty] = useState("1");
  const [editItemPrice, setEditItemPrice] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [oneSessionDialogOpen, setOneSessionDialogOpen] = useState(false);
  const [oneSessionId, setOneSessionId] = useState<string | null>(null);
  const [creatingOneSession, setCreatingOneSession] = useState(false);

  const { data: projectTaxSettings } = useQuery<{ business_country: string | null }>({
    queryKey: ["project-detail-tax-settings", photographerId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("photographers")
        .select("business_country")
        .eq("id", photographerId)
        .maybeSingle();
      return { business_country: data?.business_country ?? null };
    },
    enabled: !!photographerId && open,
  });
  const businessCountry = projectTaxSettings?.business_country ?? null;

  // Fetch sessions for this photographer
  const { data: photographerSessions = [] } = useQuery({
    queryKey: ["photographer-sessions-for-project", photographerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, title, price, tax_rate, deposit_enabled, deposit_amount, deposit_type, duration_minutes, cover_image_url, session_type_id, session_types ( name )")
        .eq("photographer_id", photographerId)
        .eq("status", "active")
        .order("title");
      return (data ?? []).map((s: any) => ({
        id: s.id as string,
        title: s.title as string,
        price: s.price as number,
        tax_rate: s.tax_rate as number,
        deposit_enabled: s.deposit_enabled as boolean,
        deposit_amount: s.deposit_amount as number,
        deposit_type: s.deposit_type as string,
        duration_minutes: s.duration_minutes as number,
        cover_image_url: (s.cover_image_url as string | null),
        session_type_name: (s.session_types as any)?.name as string | null,
      }));
    },
    enabled: !!photographerId && open,
  });

  // Get current booking's session_id + full payment context (for change-session calculations)
  const { data: bookingData } = useQuery({
    queryKey: ["project-booking-session", project?.booking_id],
    queryFn: async () => {
      if (!project?.booking_id) return null;
      const { data } = await (supabase as any)
        .from("bookings")
        .select("session_id, payment_status, extras_total, deposit_paid_amount, total_paid_amount, sessions ( price, tax_rate, deposit_enabled, deposit_amount, deposit_type )")
        .eq("id", project.booking_id)
        .single();
      return data as {
        session_id: string;
        payment_status: string;
        extras_total: number;
        deposit_paid_amount: number | null;
        total_paid_amount: number | null;
        sessions: { price: number; tax_rate: number; deposit_enabled: boolean; deposit_amount: number; deposit_type: string } | null;
      } | null;
    },
    enabled: !!project?.booking_id && open,
  });

  // Compute total amount already paid by client (in cents) — based on CURRENT session,
  // plus manual project payments and paid invoices. Used to honor paid amounts when
  // changing session, ignoring the new session's deposit configuration.
  const { data: amountAlreadyPaidCents = 0 } = useQuery({
    queryKey: ["project-amount-paid", project?.id, project?.booking_id, bookingData?.payment_status, bookingData?.extras_total, bookingData?.deposit_paid_amount, bookingData?.total_paid_amount],
    queryFn: async () => {
      let bookingPaid = 0;
      if (bookingData?.sessions) {
        const sess = bookingData.sessions;
        const sessionPrice = sess.price ?? 0;
        const taxRate = getBillableTaxRate(sess.tax_rate ?? 0, businessCountry);
        const extrasTotal = bookingData.extras_total ?? 0;
        const subtotal = sessionPrice + extrasTotal;
        const taxAmount = Math.round(subtotal * taxRate / 100);
        const grandTotal = subtotal + taxAmount;
        const isPercent = sess.deposit_type === "percent" || sess.deposit_type === "percentage";
        const depositValue = sess.deposit_enabled
          ? (isPercent ? Math.round(grandTotal * sess.deposit_amount / 100) : sess.deposit_amount)
          : 0;
        const ps = bookingData.payment_status;
        // Prefer locked-at-payment values so price edits don't shift what was paid.
        if (ps === "paid") bookingPaid = bookingData.total_paid_amount ?? grandTotal;
        else if (ps === "deposit_paid") bookingPaid = bookingData.deposit_paid_amount ?? depositValue;
      }
      const [{ data: pays }, { data: invs }] = await Promise.all([
        (supabase as any).from("project_payments").select("amount").eq("project_id", project!.id),
        (supabase as any).from("project_invoices").select("paid_amount").eq("project_id", project!.id),
      ]);
      const manualSum = (pays ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const invoicePaidSum = (invs ?? []).reduce((s: number, i: any) => s + Number(i.paid_amount || 0), 0);
      // project_payments.amount and project_invoices.paid_amount are in major units → convert to cents
      return bookingPaid + Math.round((manualSum + invoicePaidSum) * 100);
    },
    enabled: !!project?.id && !!project?.booking_id && open,
  });

  // Fetch session bonuses/includes for the current booking session
  const currentBookingSessionId = bookingData?.session_id;
  const { data: sessionIncludes = [] } = useQuery({
    queryKey: ["session-bonuses", currentBookingSessionId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("session_bonuses")
        .select("id, text, position")
        .eq("session_id", currentBookingSessionId)
        .order("position");
      return (data ?? []) as { id: string; text: string; position: number }[];
    },
    enabled: !!currentBookingSessionId && open,
  });

  // Fetch booking invoice items (add-ons)
  const { data: bookingInvoiceItems = [], refetch: refetchInvoiceItems } = useQuery({
    queryKey: ["booking-invoice-items", project?.booking_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_invoice_items")
        .select("id, description, quantity, unit_price")
        .eq("booking_id", project!.booking_id!)
        .order("created_at");
      return (data ?? []) as { id: string; description: string; quantity: number; unit_price: number }[];
    },
    enabled: !!project?.booking_id && open,
  });

  // Sync extras_total on bookings when invoice items change
  const syncExtrasTotal = async (items: { quantity: number; unit_price: number }[]) => {
    if (!project?.booking_id) return;
    const newExtras = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    await (supabase as any)
      .from("bookings")
      .update({ extras_total: newExtras })
      .eq("id", project.booking_id);
    queryClient.invalidateQueries({ queryKey: ["project-booking-payment"] });
    queryClient.invalidateQueries({ queryKey: ["project-booking-session"] });
  };

  const addInvoiceItem = async () => {
    if (!project?.booking_id || !newItemDesc.trim()) return;
    const priceInCents = Math.round(parseFloat(newItemPrice || "0") * 100);
    const qty = parseInt(newItemQty) || 1;
    await supabase.from("booking_invoice_items").insert({
      booking_id: project.booking_id,
      photographer_id: photographerId,
      description: newItemDesc.trim(),
      quantity: qty,
      unit_price: priceInCents,
    });
    setNewItemDesc(""); setNewItemQty("1"); setNewItemPrice(""); setShowAddItem(false);
    const { data: updated } = await supabase.from("booking_invoice_items")
      .select("id, description, quantity, unit_price").eq("booking_id", project.booking_id);
    await syncExtrasTotal(updated ?? []);
    refetchInvoiceItems();
  };

  const updateInvoiceItem = async (itemId: string) => {
    if (!project?.booking_id) return;
    const priceInCents = Math.round(parseFloat(editItemPrice || "0") * 100);
    const qty = parseInt(editItemQty) || 1;
    await supabase.from("booking_invoice_items")
      .update({ description: editItemDesc.trim(), quantity: qty, unit_price: priceInCents })
      .eq("id", itemId);
    setEditingItemId(null);
    const { data: updated } = await supabase.from("booking_invoice_items")
      .select("id, description, quantity, unit_price").eq("booking_id", project.booking_id);
    await syncExtrasTotal(updated ?? []);
    refetchInvoiceItems();
  };

  const deleteInvoiceItem = async (itemId: string) => {
    if (!project?.booking_id) return;
    await supabase.from("booking_invoice_items").delete().eq("id", itemId);
    const { data: updated } = await supabase.from("booking_invoice_items")
      .select("id, description, quantity, unit_price").eq("booking_id", project.booking_id);
    await syncExtrasTotal(updated ?? []);
    refetchInvoiceItems();
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Build STAGES from translations
  const STAGES: { key: Stage; label: string }[] = [
    { key: "upcoming",        label: tp.upcoming },
    { key: "shot",            label: tp.shot },
    { key: "proof_gallery",   label: tp.proof_gallery },
    { key: "post_production", label: tp.post_production },
    { key: "final_gallery",   label: tp.final_gallery },
  ];

  useEffect(() => {
    if (!project) return;
    const matched = sessionTypes.find((t) => t.name === project.session_type);
    setSessionTypeId(matched?.id ?? null);
  }, [project?.id, project?.session_type, sessionTypes]);

  // Reset pending changes when project changes
  useEffect(() => {
    setPendingChanges({});
    setConflictWarning(null);
  }, [project?.id]);

  if (!project) return null;

  const isArchived = project.stage === "archived";

  // Get the effective value: pending overrides project
  const effective = { ...project, ...pendingChanges };

  const queueChange = (data: Partial<ProjectSheetData>) => {
    setPendingChanges((prev) => ({ ...prev, ...data }));
  };

  const commitSave = async () => {
    if (!hasPendingChanges) return;
    setSaving(true);

    // If date/time changed, validate conflicts & sync
    const dateChanged = "shoot_date" in pendingChanges || "shoot_time" in pendingChanges;
    if (dateChanged) {
      const shootDate = pendingChanges.shoot_date ?? project.shoot_date;
      const rawShootTime = pendingChanges.shoot_time ?? project.shoot_time ?? null;
      const shootTime = rawShootTime ?? "09:00";

      if (rawShootTime && !shootDate) {
        const msg = "Selecione uma data antes de salvar o horário.";
        setConflictWarning(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }

      if (shootDate && project.booking_id) {
        const { data: bookingData } = await (supabase as any)
          .from("bookings")
          .select("session_id")
          .eq("id", project.booking_id)
          .single();

        if (bookingData) {
          const { data: sessionData } = await (supabase as any)
            .from("sessions")
            .select("duration_minutes")
            .eq("id", bookingData.session_id)
            .single();

          const duration = sessionData?.duration_minutes ?? 60;
          const totalMins = timeToMinutes(shootTime) + duration;
          const endTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;

          const conflictResult = await checkBookingConflict(
            photographerId,
            shootDate,
            shootTime,
            endTime,
            project.booking_id,
            project.id,
          );

          if (conflictResult.hasConflict) {
            const msg = conflictResult.conflictDetails || "Time conflict detected";
            setConflictWarning(msg);
            toast.error(msg);
            setSaving(false);
            return;
          }
        }

        const syncResult = await syncProjectDateToBooking(
          project.booking_id,
          shootDate,
          shootTime,
        );

        if (!syncResult.success) {
          toast.error(syncResult.error || "Failed to sync booking");
          setSaving(false);
          return;
        }
      } else if (shootDate) {
        // Project without a booking — still validate conflicts against existing
        // bookings and blocked times. Use the linked session's duration when
        // available, otherwise fall back to 60min.
        const sessTitle = project.session_title ?? project.session_type;
        let duration = 60;
        if (sessTitle) {
          const { data: linkedSession } = await (supabase as any)
            .from("sessions")
            .select("duration_minutes")
            .eq("photographer_id", photographerId)
            .eq("title", sessTitle)
            .maybeSingle();
          if (linkedSession?.duration_minutes) duration = linkedSession.duration_minutes;
        }
        const totalMins = timeToMinutes(shootTime) + duration;
        const endTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;

        const conflictResult = await checkBookingConflict(
          photographerId,
          shootDate,
          shootTime,
          endTime,
          undefined,
          project.id,
        );

        if (conflictResult.hasConflict) {
          const msg = conflictResult.conflictDetails || "Time conflict detected";
          setConflictWarning(msg);
          toast.error(msg);
          setSaving(false);
          return;
        }
      }
    }

    setConflictWarning(null);
    await onUpdate(project.id, pendingChanges);
    setPendingChanges({});
    setSaving(false);
    toast.success(tp.projectUpdated || "Saved");
  };

  const save = async (data: Partial<ProjectSheetData>) => { queueChange(data); };

  const queueDateTime = (newDate: string | null | undefined, newTime: string | null | undefined) => {
    const updates: Partial<ProjectSheetData> = {};
    if (newDate !== undefined && newDate !== null) updates.shoot_date = newDate;
    if (newTime !== undefined && newTime !== null) {
      const effectiveDate = newDate ?? pendingChanges.shoot_date ?? project.shoot_date;
      if (!effectiveDate) {
        const msg = "Selecione uma data antes de definir o horário.";
        setConflictWarning(msg);
        toast.error(msg);
        return;
      }
      updates.shoot_time = newTime;
    }
    if (Object.keys(updates).length === 0) return;
    queueChange(updates);
    setConflictWarning(null);
  };

  const handleSessionTypeChange = async (id: string | null) => {
    setSessionTypeId(id);
    const name = sessionTypes.find((t) => t.id === id)?.name ?? null;
    await save({ session_type: name });
  };

  const handleSessionChange = async (newSessionId: string) => {
    const newSess = photographerSessions.find((s) => s.id === newSessionId);
    if (!newSess) return;

    if (!project.booking_id) {
      // Project without booking — persist session reference directly
      await onUpdate(project.id, { session_type: newSess.title } as any);
      toast.success(tp.projectUpdated || "Session updated");
      setSessionPickerOpen(false);
      return;
    }

    const sessInfo: SessionInfo = {
      id: newSess.id,
      title: newSess.title,
      price: newSess.price,
      tax_rate: newSess.tax_rate,
      deposit_enabled: newSess.deposit_enabled,
      deposit_amount: newSess.deposit_amount,
      deposit_type: newSess.deposit_type,
    };

    // Fetch existing invoice items (addons)
    const { data: invoiceItems } = await supabase
      .from("booking_invoice_items")
      .select("id, description, quantity, unit_price")
      .eq("booking_id", project.booking_id);

    const items = (invoiceItems ?? []) as AddonItem[];

    if (items.length > 0) {
      setAddonItems(items);
      setPendingNewSession(sessInfo);
      setAddonReviewOpen(true);
    } else {
      await applySessionChange(sessInfo, []);
    }
  };

  const getCurrentBookingPaymentSnapshot = () => {
    if (!bookingData?.sessions) return {};
    const sess = bookingData.sessions;
    const extrasTotal = bookingData.extras_total ?? 0;
    const subtotal = (sess.price ?? 0) + extrasTotal;
    const taxRate = getBillableTaxRate(sess.tax_rate ?? 0, businessCountry);
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const grandTotal = subtotal + taxAmount;
    const isPercent = sess.deposit_type === "percent" || sess.deposit_type === "percentage";
    const computedDeposit = sess.deposit_enabled
      ? (isPercent ? Math.round(grandTotal * ((sess.deposit_amount ?? 0) / 100)) : (sess.deposit_amount ?? 0))
      : 0;

    if (bookingData.payment_status === "deposit_paid" && bookingData.deposit_paid_amount == null) {
      return { deposit_paid_amount: computedDeposit };
    }
    if (bookingData.payment_status === "paid" && bookingData.total_paid_amount == null) {
      return { total_paid_amount: grandTotal };
    }
    return {};
  };

  const applySessionChange = async (newSess: SessionInfo, keptItems: AddonItem[]) => {
    if (!project.booking_id) return;
    setChangingSession(true);

    try {
      // 1. Delete removed items
      const { data: existingItems } = await supabase
        .from("booking_invoice_items")
        .select("id")
        .eq("booking_id", project.booking_id);
      const existingIds = (existingItems ?? []).map((i: any) => i.id);
      const keptIds = keptItems.map((i) => i.id);
      const toDelete = existingIds.filter((id: string) => !keptIds.includes(id));

      for (const id of toDelete) {
        await supabase.from("booking_invoice_items").delete().eq("id", id);
      }

      // 2. Update edited items
      for (const item of keptItems) {
        await supabase.from("booking_invoice_items")
          .update({ quantity: item.quantity, unit_price: item.unit_price })
          .eq("id", item.id);
      }

      // 3. Calculate new extras_total
      const newExtras = keptItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);

      // 4. Update booking session_id + extras_total, preserving the payment
      // amount captured before the session is swapped.
      const paymentSnapshot = getCurrentBookingPaymentSnapshot();
      await (supabase as any)
        .from("bookings")
        .update({ session_id: newSess.id, extras_total: newExtras, ...paymentSnapshot })
        .eq("id", project.booking_id);

      // 5. Update session_availability session_id + duration
      const sess = photographerSessions.find((s) => s.id === newSess.id);
      if (sess) {
        const { data: avail } = await (supabase as any)
          .from("bookings")
          .select("availability_id")
          .eq("id", project.booking_id)
          .single();
        if (avail?.availability_id) {
          // recalculate end_time based on new session duration
          const { data: availData } = await (supabase as any)
            .from("session_availability")
            .select("start_time")
            .eq("id", avail.availability_id)
            .single();
          if (availData?.start_time) {
            const totalMins = timeToMinutes(availData.start_time) + sess.duration_minutes;
            const endTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;
            await (supabase as any)
              .from("session_availability")
              .update({ session_id: newSess.id, end_time: endTime })
              .eq("id", avail.availability_id);
          }
        }
      }

      // 6. Update client_projects session_type
      await save({ session_type: newSess.title } as any);

      // 7. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["project-booking-payment"] });
      queryClient.invalidateQueries({ queryKey: ["project-booking-session"] });
      queryClient.invalidateQueries({ queryKey: ["project-amount-paid"] });

      toast.success(tp.projectUpdated || "Session updated");
    } catch (err) {
      toast.error("Failed to change session");
    } finally {
      setChangingSession(false);
      setAddonReviewOpen(false);
      setPendingNewSession(null);
    }
  };

  const isOverdue = (() => {
    if (!project.shoot_date || isArchived) return false;
    // Combine date + time so a session scheduled later today isn't flagged
    // as overdue at midnight.
    const time = project.shoot_time && /^\d{2}:\d{2}/.test(project.shoot_time)
      ? project.shoot_time.slice(0, 5)
      : "23:59";
    return new Date(`${project.shoot_date}T${time}:00`) < new Date();
  })();

  const renderDeadlineSection = () => {
    if (project.stage !== "shot" && project.stage !== "post_production") return null;
    const label = project.stage === "shot" ? tp.deadlineProofGallery : tp.deadlineFinalDelivery;

    // gallery_deadline may be stored as "yyyy-MM-dd" or "yyyy-MM-dd HH:mm"
    const rawDeadline = project.gallery_deadline ?? null;
    const deadlineDateStr = rawDeadline ? rawDeadline.substring(0, 10) : null;
    const deadlineTimeStr = rawDeadline && rawDeadline.length > 10 ? rawDeadline.substring(11, 16) : "09:00";
    const deadline = deadlineDateStr ? parseISO(`${deadlineDateStr}T${deadlineTimeStr}:00`) : undefined;

    const now = new Date();
    const urgencyBadge = (() => {
      if (!deadline) return null;
      if (isPast(deadline)) return (
        <span className="flex items-center gap-0.5 text-[10px] text-destructive font-medium shrink-0">
          <AlertTriangle className="h-2.5 w-2.5" /> {tp.deadlineOverdue}
        </span>
      );
      const h = differenceInHours(deadline, now);
      if (h < 24) return <span className="text-[10px] text-destructive font-medium shrink-0">{tp.hoursRemaining(h)}</span>;
      const d = differenceInDays(deadline, now);
      const color = d <= 3 ? "text-orange-500" : d <= 7 ? "text-yellow-600" : "text-emerald-500";
      return <span className={cn("text-[10px] font-medium shrink-0", color)}>{tp.daysRemaining(d)}</span>;
    })();

    const saveDeadline = (dateStr: string | null, timeStr: string) => {
      const val = dateStr ? `${dateStr} ${timeStr}` : null;
      save({ gallery_deadline: val } as any);
    };

    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] tracking-widest uppercase text-muted-foreground flex items-center gap-1">
          <Timer className="h-2.5 w-2.5" /> {label}
        </Label>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={cn(
                "flex items-center gap-1.5 h-7 px-2 rounded-md border text-sm transition-colors flex-1 text-left",
                deadline ? isPast(deadline) ? "border-destructive/50 text-destructive" : "border-input text-foreground hover:border-foreground/40" : "border-input text-muted-foreground/60 hover:border-foreground/40"
              )}>
                <CalendarIcon className="h-3 w-3 shrink-0" />
                <span className="text-xs">
                  {deadline
                    ? `${format(deadline, "d MMM yyyy")} · ${format(deadline, "h:mm aa")}`
                    : tp.setDeadline}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
              <Calendar mode="single" selected={deadline}
                onSelect={(d) => saveDeadline(d ? format(d, "yyyy-MM-dd") : null, deadlineTimeStr)}
                initialFocus className={cn("p-3 pointer-events-auto")} />
              {deadlineDateStr && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 border border-border rounded-sm p-2">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <TimePickerInput
                      value={deadlineTimeStr}
                      onChange={(t) => saveDeadline(deadlineDateStr, t)}
                      minuteStep={15}
                    />
                  </div>
                  <button onClick={() => save({ gallery_deadline: null } as any)}
                    className="w-full text-[11px] text-destructive/70 hover:text-destructive transition-colors py-1 border border-dashed border-destructive/20 rounded-sm">
                    {tp.removeDeadline2}
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          {urgencyBadge}
        </div>
        {deadline && !isPast(deadline) && project.shoot_date && (
          <p className="text-[10px] text-muted-foreground/60 italic">
            {differenceInDays(deadline, parseISO(project.shoot_date))}{tp.daysAfterSessionSuffix}
          </p>
        )}
      </div>
    );
  };

  const deadlineSection = renderDeadlineSection();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full p-0 flex flex-col overflow-hidden" style={{ maxHeight: "88vh" }}>

        {/* Header */}
        <DialogHeader className="p-5 pb-3 pr-14 shrink-0 border-b border-border/50">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <input
                defaultValue={project.title}
                key={project.id + "-title"}
                onChange={(e) => { const v = e.target.value.trim(); if (v && v !== project.title) queueChange({ title: v }); }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="text-lg font-semibold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/40 outline-none w-full py-0.5 transition-colors leading-tight"
                placeholder={tp.title_field}
              />
            </div>
            {hasPendingChanges && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 shrink-0"
                onClick={commitSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                {tp.save || "Save"}
              </Button>
            )}
            {isArchived ? (
              <button
                type="button"
                onClick={() => { onUnarchive(project.id); onOpenChange(false); }}
                title={tp.restore}
                className={cn(
                  "self-start group inline-flex items-center gap-1 border rounded-sm px-2 py-1 text-[10px] tracking-wider uppercase shrink-0 transition-colors hover:border-foreground/40 hover:text-foreground hover:bg-muted",
                  STAGE_COLORS.archived,
                )}
              >
                <Archive className="h-2.5 w-2.5 group-hover:hidden" />
                <ArchiveRestore className="h-2.5 w-2.5 hidden group-hover:inline" />
                <span className="group-hover:hidden">{tp.archivedLabel}</span>
                <span className="hidden group-hover:inline">{tp.restore}</span>
              </button>
            ) : (
              <Select value={effective.stage} onValueChange={(v) => save({ stage: v as Stage })}>
                <SelectTrigger className={cn("h-7 text-[10px] tracking-wider uppercase border rounded-sm w-auto gap-1.5 shrink-0 px-2", STAGE_COLORS[effective.stage])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-5">

              {/* LEFT column */}
              <div className="flex flex-col gap-5 min-w-0">

                {/* Session */}
                <div>
                  <SectionLabel>{tp.sessionSection}</SectionLabel>
                  <div className="flex flex-col gap-3">
                    {project.booking_id ? (
                      <>
                        {(() => {
                          const currentSess = photographerSessions.find((s) => s.id === bookingData?.session_id);
                          if (!currentSess) return (
                            <button
                              type="button"
                              onClick={() => setSessionPickerOpen(true)}
                              className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg p-4 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                            >
                              <Camera className="h-4 w-4" />
                              {tp.selectSession}
                            </button>
                          );
                          return (
                            <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                              <div className="flex gap-3">
                                {/* Cover thumbnail */}
                                <div className="w-20 h-16 shrink-0 bg-muted/40 overflow-hidden">
                                  {currentSess.cover_image_url ? (
                                    <img src={currentSess.cover_image_url} alt={currentSess.title}
                                      className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                      <Camera className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center gap-0.5">
                                  <p className="text-xs font-medium truncate leading-tight">{currentSess.title}</p>
                                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-0.5 font-semibold text-foreground">
                                      <DollarSign className="h-2.5 w-2.5" />
                                      {(currentSess.price / 100).toFixed(2)}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5" />
                                      {currentSess.duration_minutes}min
                                    </span>
                                    {currentSess.session_type_name && (
                                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                                        {currentSess.session_type_name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Change button */}
                              <button
                                type="button"
                                onClick={() => setSessionPickerOpen(true)}
                                className="w-full border-t border-border py-1.5 text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                              >
                                {tp.changeSessionBtn}
                              </button>
                            </div>
                          );
                        })()}
                        {/* Session includes */}
                        {sessionIncludes.length > 0 && (
                          <div className="mt-2 rounded-md border border-border bg-muted/10 px-3 py-2">
                            <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">{tp.sessionIncludes}</p>
                            <ul className="space-y-1">
                              {sessionIncludes.map((item) => (
                                <li key={item.id} className="flex items-start gap-1.5 text-xs text-foreground">
                                  <Check className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                                  <span>{item.text}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* Invoice items (add-ons) */}
                        {project.booking_id && (
                          <div className="mt-2 rounded-md border border-border bg-muted/10 px-3 py-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[10px] tracking-widest uppercase text-muted-foreground">{tp.invoiceItems || "Add-ons"}</p>
                              <button
                                type="button"
                                onClick={() => setShowAddItem(true)}
                                className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
                              >
                                <Plus className="h-3 w-3" /> {tp.addItem || "Add"}
                              </button>
                            </div>

                            {bookingInvoiceItems.length > 0 && (
                              <ul className="space-y-1.5 mb-2">
                                {bookingInvoiceItems.map((item) => {
                                  if (editingItemId === item.id) {
                                    return (
                                      <li key={item.id} className="flex flex-col gap-1.5 rounded-md border border-primary/20 bg-muted/20 p-2">
                                        <Input value={editItemDesc} onChange={(e) => setEditItemDesc(e.target.value)}
                                          placeholder={tp.itemDescription || "Description"} className="h-6 text-[11px]" />
                                        <div className="flex gap-1.5">
                                          <Input type="number" value={editItemQty} onChange={(e) => setEditItemQty(e.target.value)}
                                            placeholder="Qty" min={1} className="h-6 text-[11px] w-14" />
                                          <Input type="number" value={editItemPrice} onChange={(e) => setEditItemPrice(e.target.value)}
                                            placeholder="0.00" min={0} step="0.01" className="h-6 text-[11px] flex-1" />
                                          <button type="button" onClick={() => updateInvoiceItem(item.id)}
                                            className="h-6 px-2 rounded-md bg-primary text-primary-foreground text-[10px] hover:bg-primary/90 transition-colors">
                                            <Check className="h-3 w-3" />
                                          </button>
                                          <button type="button" onClick={() => setEditingItemId(null)}
                                            className="h-6 px-2 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </li>
                                    );
                                  }
                                  return (
                                    <li key={item.id} className="flex items-center gap-2 group">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs truncate">{item.description}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {item.quantity} × ${(item.unit_price / 100).toFixed(2)}
                                          <span className="ml-1.5 font-medium text-foreground">
                                            = ${((item.quantity * item.unit_price) / 100).toFixed(2)}
                                          </span>
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => {
                                          setEditingItemId(item.id);
                                          setEditItemDesc(item.description);
                                          setEditItemQty(String(item.quantity));
                                          setEditItemPrice((item.unit_price / 100).toFixed(2));
                                        }} className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                                          <Pencil className="h-2.5 w-2.5" />
                                        </button>
                                        <button type="button" onClick={() => deleteInvoiceItem(item.id)}
                                          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors">
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            {bookingInvoiceItems.length > 0 && (
                              <div className="border-t border-border pt-1.5">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-muted-foreground uppercase tracking-wider">{tp.extrasTotal || "Extras"}</span>
                                  <span className="font-semibold tabular-nums text-foreground">
                                    ${(bookingInvoiceItems.reduce((s, i) => s + i.quantity * i.unit_price, 0) / 100).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}

                            {showAddItem && (
                              <div className="mt-1.5 flex flex-col gap-1.5 rounded-md border border-primary/20 bg-muted/20 p-2">
                                <Input value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)}
                                  placeholder={tp.itemDescription || "Description"} className="h-6 text-[11px]" />
                                <div className="flex gap-1.5">
                                  <Input type="number" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)}
                                    placeholder="Qty" min={1} className="h-6 text-[11px] w-14" />
                                  <Input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}
                                    placeholder="0.00" min={0} step="0.01" className="h-6 text-[11px] flex-1" />
                                  <button type="button" onClick={addInvoiceItem}
                                    disabled={!newItemDesc.trim()}
                                    className="h-6 px-2 rounded-md bg-primary text-primary-foreground text-[10px] hover:bg-primary/90 disabled:opacity-50 transition-colors">
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button type="button" onClick={() => { setShowAddItem(false); setNewItemDesc(""); setNewItemQty("1"); setNewItemPrice(""); }}
                                    className="h-6 px-2 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (() => {
                      const currentSess = photographerSessions.find((s) => s.title === (project.session_title ?? project.session_type));
                      if (!currentSess) {
                        return (
                          <button
                            type="button"
                            onClick={() => setSessionPickerOpen(true)}
                            className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg p-4 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                          >
                            <Camera className="h-4 w-4" />
                            {tp.selectSession}
                          </button>
                        );
                      }
                      return (
                        <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                          <div className="flex gap-3">
                            <div className="w-20 h-16 shrink-0 bg-muted/40 overflow-hidden">
                              {currentSess.cover_image_url ? (
                                <img src={currentSess.cover_image_url} alt={currentSess.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                  <Camera className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center gap-0.5">
                              <p className="text-xs font-medium truncate leading-tight">{currentSess.title}</p>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-0.5 font-semibold text-foreground">
                                  <DollarSign className="h-2.5 w-2.5" />
                                  {(currentSess.price / 100).toFixed(2)}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {currentSess.duration_minutes}min
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSessionPickerOpen(true)}
                            className="w-full border-t border-border py-1.5 text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                          >
                            {tp.changeSessionBtn}
                          </button>
                        </div>
                      );
                    })()}
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">{tp.dateTime}</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(project.stage === "shot" || project.stage === "post_production" || project.stage === "proof_gallery" || project.stage === "final_gallery") ? (
                          <span className="text-xs text-muted-foreground">
                            {project.shoot_date ? format(new Date(project.shoot_date + "T00:00:00"), "MMM d, yyyy") : "—"}
                            {project.shoot_time && (() => {
                              const [h, m] = (project.shoot_time).split(":").map(Number);
                              const p = h < 12 ? "AM" : "PM";
                              const h12 = h % 12 === 0 ? 12 : h % 12;
                              return ` · ${h12}:${String(m).padStart(2,"0")} ${p}`;
                            })()}
                          </span>
                        ) : (
                          <>
                            <input type="date" defaultValue={effective.shoot_date ?? ""} key={project.id + "-date"}
                              onChange={(e) => queueDateTime(e.target.value || null, null)}
                              className="h-7 text-sm bg-transparent border border-input rounded-md px-2 focus:outline-none focus:border-foreground/40 transition-colors" />
                            <TimePickerInput value={effective.shoot_time ?? "09:00"} onChange={(v) => queueDateTime(null, v)} className="shrink-0" />
                            {project.shoot_date && (
                              <span className={cn("text-[10px] shrink-0", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                {isOverdue ? tp.overdue : format(new Date(project.shoot_date + "T00:00:00"), "MMM d, yyyy")}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {conflictWarning && (
                        <div className="flex items-center gap-1.5 text-destructive text-[11px] mt-1 p-1.5 rounded-md bg-destructive/10 border border-destructive/20">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{conflictWarning}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">{tp.locationLabel}</Label>
                      <InlineField label={tp.location} value={project.location ?? ""} placeholder={tp.addLocation}
                        icon={<MapPin className="h-3.5 w-3.5" />} onSave={(v) => save({ location: v || null } as any)} />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Deadline */}
                {deadlineSection && (
                  <>
                    {deadlineSection}
                    <Separator />
                  </>
                )}

                {/* Payments */}
                <PaymentsSection project={project} photographerId={photographerId} />

                <Separator />

                {/* Documents */}
                <DocumentsSection project={project} photographerId={photographerId} />

                <Separator />

                {/* Communications */}
                <ClientCommsSection project={project} photographerId={photographerId} />

                <Separator />

                {/* Notes */}
                <div>
                  <SectionLabel>{tp.notes}</SectionLabel>
                  <textarea
                    key={project.id + "-notes"} defaultValue={project.notes ?? ""}
                    onBlur={(e) => { const v = e.target.value; if (v !== (project.notes ?? "")) save({ notes: v || null }); }}
                    rows={5} placeholder={tp.notesPlaceholder}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <SectionLabel>{tp.description}</SectionLabel>
                  <textarea
                    key={project.id + "-desc"} defaultValue={project.description ?? ""}
                    onBlur={(e) => { const v = e.target.value; if (v !== (project.description ?? "")) save({ description: v || null } as any); }}
                    rows={3} placeholder={tp.addDescription}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>

              {/* RIGHT column — Project Details panel */}
              <div className="flex flex-col gap-0 bg-muted/30 rounded-md border border-border/50 overflow-hidden self-start">
                <div className="px-3 py-2.5 border-b border-border/50 bg-muted/40">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">{tp.projectDetails}</p>
                </div>

                <div className="flex flex-col divide-y divide-border/40">
                  <div className="px-3 py-2.5">
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">{tp.clientLabel}</p>
                    <InlineField label={tp.clientName} value={project.client_name} placeholder={tp.addClientPlaceholder}
                      icon={<User className="h-3.5 w-3.5" />} onSave={(v) => save({ client_name: v })} />
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">{tp.emailLabel}</p>
                    <InlineField label={tp.email} value={project.client_email ?? ""} placeholder={tp.addEmailPlaceholder}
                      type="email" icon={<Mail className="h-3.5 w-3.5" />} onSave={(v) => save({ client_email: v || null })} />
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">{tp.phoneLabel}</p>
                    <InlineField label={tp.phone} value={project.client_phone ?? ""} placeholder={tp.addPhonePlaceholder}
                      type="tel" icon={<FileText className="h-3.5 w-3.5" />} onSave={(v) => save({ client_phone: v || null } as any)} />
                  </div>
                  {(project.session_type || bookingData?.session_id) && (() => {
                    const sessTitle = bookingData?.session_id
                      ? photographerSessions.find((s) => s.id === bookingData.session_id)?.title ?? project.session_type
                      : project.session_type;
                    return (
                      <div className="px-3 py-2.5">
                        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">{tp.sessionLabel}</p>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{sessTitle}</span>
                        </div>
                      </div>
                    );
                  })()}
                  {project.shoot_date && (
                    <div className="px-3 py-2.5">
                      <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">{tp.shootDateLabel}</p>
                      <div className={cn("flex items-center gap-2 text-sm", isOverdue ? "text-destructive" : "text-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {format(new Date(project.shoot_date + "T00:00:00"), "d MMM yyyy")}
                          {project.shoot_time && (() => {
                            const [h, m] = project.shoot_time.split(":").map(Number);
                            const period = h < 12 ? "AM" : "PM";
                            const h12 = h % 12 === 0 ? 12 : h % 12;
                            return ` · ${h12}:${String(m).padStart(2, "0")} ${period}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                  {project.location && (
                    <div className="px-3 py-2.5">
                      <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">{tp.locationLabel}</p>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </div>
                    </div>
                  )}
                  <div className="px-3 py-2.5">
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">{tp.createdAtLabel}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>{format(new Date(project.created_at), "d MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="mt-5" />

            {/* Actions footer */}
            <div className="flex items-center justify-between gap-2 pt-4">
              {isArchived ? (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => { onUnarchive(project.id); onOpenChange(false); }}>
                  <ArchiveRestore className="h-3.5 w-3.5" /> {tp.restore}
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => { onArchive(project.id); onOpenChange(false); }}>
                  <Archive className="h-3.5 w-3.5" /> {tp.archive}
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" /> {tp.deleteProject}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{tp.deleteProjectTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {tp.deleteProjectDesc(project.title)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tp.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { onDelete(project.id); onOpenChange(false); }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {tp.deleteProject}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {pendingNewSession && (
        <AddonReviewModal
          open={addonReviewOpen}
          onOpenChange={(v) => { if (!v) { setAddonReviewOpen(false); setPendingNewSession(null); } }}
          items={addonItems}
          newSession={pendingNewSession}
          amountAlreadyPaid={amountAlreadyPaidCents}
          businessCountry={businessCountry}
          onConfirm={(keptItems) => applySessionChange(pendingNewSession, keptItems)}
          confirming={changingSession}
        />
      )}

      <SessionPickerModal
        open={sessionPickerOpen}
        onOpenChange={setSessionPickerOpen}
        sessions={photographerSessions as PickerSession[]}
        currentSessionId={bookingData?.session_id ?? photographerSessions.find((s) => s.title === (project.session_title ?? project.session_type))?.id ?? null}
        onSelect={handleSessionChange}
        onCreateNewSession={() => {
          setSessionPickerOpen(false);
          navigate("/dashboard/sessions/new");
        }}
        onCreateOneSession={async () => {
          if (creatingOneSession || !photographerId) return;
          setCreatingOneSession(true);
          try {
            const { data, error } = await (supabase as any)
              .from("sessions")
              .insert({
                photographer_id: photographerId,
                title: "One Session",
                duration_minutes: 60,
                session_model: "one_session",
                hide_from_store: true,
                status: "active",
                price: 0,
              })
              .select("id")
              .single();
            if (error) throw error;
            setOneSessionId(data.id as string);
            setSessionPickerOpen(false);
            setOneSessionDialogOpen(true);
          } catch (err: any) {
            toast.error(err?.message ?? "Failed to create one session");
          } finally {
            setCreatingOneSession(false);
          }
        }}
      />

      <EditOneSessionDialog
        open={oneSessionDialogOpen}
        onOpenChange={(o) => {
          setOneSessionDialogOpen(o);
          if (!o) setOneSessionId(null);
        }}
        sessionId={oneSessionId}
        onSaved={async () => {
          if (oneSessionId) {
            queryClient.invalidateQueries({ queryKey: ["photographer-sessions-for-project", photographerId] });
            await handleSessionChange(oneSessionId);
          }
          setOneSessionDialogOpen(false);
          setOneSessionId(null);
        }}
      />
    </Dialog>
  );
}

function ProjectBriefingSubsection({
  projectId,
  bookingId,
  sessionType,
  photographerId,
  briefings,
  labelTitle,
  emptyText,
}: {
  projectId: string;
  bookingId: string | null;
  sessionType?: string | null;
  photographerId: string;
  briefings: { id: string; name: string }[];
  labelTitle: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedBriefingId, setSelectedBriefingId] = useState<string>("");
  const queryClient = useQueryClient();

  const queryKey = ["project-briefing-status", bookingId, sessionType, photographerId];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      let sessionId: string | null = null;

      if (bookingId) {
        const { data: booking } = await (supabase as any)
          .from("bookings")
          .select("session_id")
          .eq("id", bookingId)
          .maybeSingle();
        sessionId = booking?.session_id ?? null;
      }

      if (!sessionId && sessionType && photographerId) {
        const { data: sess } = await (supabase as any)
          .from("sessions")
          .select("id")
          .eq("photographer_id", photographerId)
          .eq("title", sessionType)
          .limit(1)
          .maybeSingle();
        sessionId = sess?.id ?? null;
      }

      if (!sessionId) return { sessionId: null as string | null, briefing: null as null | { id: string; name: string; answered: boolean } };

      const { data: session } = await (supabase as any)
        .from("sessions")
        .select("briefing_id")
        .eq("id", sessionId)
        .maybeSingle();

      if (!session?.briefing_id) return { sessionId, briefing: null };

      const briefPromise = (supabase as any).from("briefings").select("id, name").eq("id", session.briefing_id).maybeSingle();
      const respPromise = bookingId
        ? (supabase as any)
            .from("booking_briefing_responses")
            .select("submitted_at")
            .eq("booking_id", bookingId)
            .eq("briefing_id", session.briefing_id)
            .maybeSingle()
        : Promise.resolve({ data: null });
      const [{ data: brief }, { data: resp }] = await Promise.all([briefPromise, respPromise]);
      if (!brief) return { sessionId, briefing: null };
      return {
        sessionId,
        briefing: { id: brief.id as string, name: brief.name as string, answered: !!resp },
      };
    },
    enabled: !!photographerId && (!!bookingId || !!sessionType),
  });

  const sessionId = data?.sessionId ?? null;
  const briefing = data?.briefing ?? null;

  const { data: photographerSiteBase } = useQuery<string | null>({
    queryKey: ["photographer-public-site-base", photographerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("photographers")
        .select("custom_domain, store_slug")
        .eq("id", photographerId)
        .maybeSingle();
      if (error) throw error;

      const customDomain = ((data as any)?.custom_domain as string | null)?.trim();
      if (customDomain) {
        const clean = customDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
        return `https://${clean}`;
      }

      const storeSlug = ((data as any)?.store_slug as string | null)?.trim();
      if (storeSlug) return `${window.location.origin}/vitrine/${storeSlug}`;
      return window.location.origin;
    },
    enabled: !!photographerId,
    staleTime: 60_000,
  });

  const ensureBookingMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (bookingId) return bookingId;
      if (!sessionId) throw new Error("Sessão não encontrada");

      // Load project + session info
      const [projRes, sessRes] = await Promise.all([
        (supabase as any).from("client_projects").select("client_name, client_email, shoot_date, shoot_time").eq("id", projectId).single(),
        (supabase as any).from("sessions").select("duration_minutes").eq("id", sessionId).single(),
      ]);
      const project = projRes.data;
      const session = sessRes.data;
      if (!project) throw new Error("Projeto não encontrado");

      const today = new Date().toISOString().slice(0, 10);
      const date = (project.shoot_date as string) || today;
      const startTime = (project.shoot_time as string) || "09:00";
      const duration = (session?.duration_minutes as number) || 60;
      const [h, m] = startTime.split(":").map(Number);
      const endMinutes = h * 60 + (m || 0) + duration;
      const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

      const { data: avail, error: aErr } = await (supabase as any)
        .from("session_availability")
        .insert({ session_id: sessionId, photographer_id: photographerId, date, start_time: startTime, end_time: endTime, is_booked: true, spots: 1 })
        .select("id")
        .single();
      if (aErr) throw aErr;

      const { data: booking, error: bErr } = await (supabase as any)
        .from("bookings")
        .insert({
          session_id: sessionId,
          availability_id: avail.id,
          photographer_id: photographerId,
          client_name: project.client_name || "Cliente",
          client_email: project.client_email || "cliente@sem-email.local",
          booked_date: date,
          status: "confirmed",
        })
        .select("id")
        .single();
      if (bErr) throw bErr;

      await (supabase as any).from("client_projects").update({ booking_id: booking.id }).eq("id", projectId);
      return booking.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const [pendingShareBookingId, setPendingShareBookingId] = useState<string | null>(null);
  const effectiveBookingId = bookingId ?? pendingShareBookingId;
  const briefingShareUrl = effectiveBookingId
    ? `${photographerSiteBase ?? window.location.origin}/booking/${effectiveBookingId}/confirm?step=briefing`
    : "";

  const attachMutation = useMutation({
    mutationFn: async (briefingId: string) => {
      if (!sessionId) throw new Error("Session not found");
      const { error } = await (supabase as any)
        .from("sessions")
        .update({ briefing_id: briefingId })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Briefing vinculado");
      setPickerOpen(false);
      setSelectedBriefingId("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao vincular briefing"),
  });

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">{labelTitle}</p>
      {!briefing ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground/50 italic pl-1">{emptyText}</p>
          {sessionId && briefings.length > 0 && (
            pickerOpen ? (
              <div className="flex items-center gap-2">
                <Select value={selectedBriefingId} onValueChange={setSelectedBriefingId}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Selecionar briefing" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    {briefings.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] tracking-widest uppercase"
                  disabled={!selectedBriefingId || attachMutation.isPending}
                  onClick={() => attachMutation.mutate(selectedBriefingId)}
                >
                  Vincular
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[10px] tracking-widest uppercase"
                  onClick={() => { setPickerOpen(false); setSelectedBriefingId(""); }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                className="self-start inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border/50 rounded-sm"
              >
                <Plus className="h-3 w-3" /> Adicionar briefing
              </button>
            )
          )}
          {sessionId && briefings.length === 0 && (
            <p className="text-[10px] text-muted-foreground/60 pl-1">Nenhum briefing criado ainda.</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="flex-1 text-xs font-medium truncate">{briefing.name || "Untitled Briefing"}</span>
          {briefing.answered ? (
            <>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Respondido
              </span>
              <button
                onClick={() => setOpen(true)}
                className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border/50 rounded-sm"
              >
                Visualizar
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
              <Clock className="h-3 w-3" /> Pendente
            </span>
          )}
          <button
            onClick={async () => {
              try {
                if (!bookingId) {
                  const id = await ensureBookingMutation.mutateAsync();
                  setPendingShareBookingId(id);
                }
                setShareOpen(true);
              } catch (e: any) {
                toast.error(e?.message || "Erro ao preparar compartilhamento");
              }
            }}
            disabled={ensureBookingMutation.isPending}
            title="Compartilhar briefing"
            className="inline-flex items-center justify-center h-7 w-7 rounded-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {briefing && effectiveBookingId && (
        <BriefingDialog
          open={open}
          onClose={() => setOpen(false)}
          bookingId={effectiveBookingId}
          briefingId={briefing.id}
        />
      )}
      {briefing && sessionId && effectiveBookingId && (
        <BriefingShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={briefingShareUrl}
          briefingName={briefing.name}
        />
      )}
    </div>
  );
}

function BriefingShareDialog({
  open,
  onClose,
  url,
  briefingName,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  briefingName: string;
}) {
  const message = `Olá! Por favor preencha o briefing "${briefingName}": ${url}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-widest uppercase font-light">
            Compartilhar briefing
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <img src={qrUrl} alt="QR Code do briefing" className="border border-border/50 rounded-md" />
          </div>

          <div className="flex items-center gap-2">
            <Input value={url} readOnly className="text-xs flex-1" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
              Copiar
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-10 rounded-sm border border-border/50 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent("Briefing — " + briefingName)}&body=${encodeURIComponent(message)}`}
              className="flex items-center justify-center gap-2 h-10 rounded-sm border border-border/50 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Email
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-10 rounded-sm border border-border/50 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Telegram
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-10 rounded-sm border border-border/50 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Abrir
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

