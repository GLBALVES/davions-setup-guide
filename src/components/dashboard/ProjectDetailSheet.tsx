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
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";
import {
  Trash2, Archive, ArchiveRestore, Camera,
  Pencil, Check, X, AlertTriangle, CalendarIcon, Timer, MapPin, Mail, User, FileText,
  Plus, CreditCard, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, DollarSign,
  Paperclip, Download, File, Image, FileText as FileTextIcon, Loader2, UploadCloud,
  MessageCircle, Send, ExternalLink, AtSign,
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

// ── Payments section component ──
function PaymentsSection({ project, photographerId }: { project: ProjectSheetData; photographerId: string }) {
  const { t } = useLanguage();
  const tp = t.projects;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formDesc, setFormDesc]       = useState("");
  const [formAmount, setFormAmount]   = useState("");
  const [formDue, setFormDue]         = useState("");
  const [formStatus, setFormStatus]   = useState<InvoiceStatus>("pending");
  const [formPaid, setFormPaid]       = useState("");

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
    sessions: { title: string; price?: number } | null;
    session_availability: { start_time: string; end_time: string; date: string } | null;
  }

  const { data: bookingPayment } = useQuery<BookingPaymentInfo | null>({
    queryKey: ["project-booking-payment", project.booking_id],
    queryFn: async () => {
      if (!project.booking_id) return null;
      const { data, error } = await (supabase as any)
        .from("bookings")
        .select("id, client_name, payment_status, extras_total, booked_date, created_at, sessions ( title, price ), session_availability ( start_time, end_time, date )")
        .eq("id", project.booking_id)
        .single();
      if (error) return null;
      return data as BookingPaymentInfo;
    },
    enabled: !!project.booking_id,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_invoices" as any).insert({
        project_id:      project.id,
        photographer_id: photographerId,
        description:     formDesc.trim() || tp.chargeDescription,
        amount:          parseFloat(formAmount) || 0,
        status:          formStatus,
        due_date:        formDue || null,
        paid_amount:     parseFloat(formPaid) || 0,
        paid_at:         formStatus === "paid" ? new Date().toISOString() : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success(tp.chargeAdded);
      setShowForm(false);
      setFormDesc(""); setFormAmount(""); setFormDue(""); setFormStatus("pending"); setFormPaid("");
    },
    onError: () => toast.error(tp.errorAddingCharge),
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

  const totalAmount  = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid    = invoices.reduce((s, i) => s + Number(i.paid_amount), 0);
  const totalBalance = totalAmount - totalPaid;

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>{tp.paymentsSection}</SectionLabel>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" /> {tp.newCharge}
        </button>
      </div>

      {/* ── Booking payment card ───────────────────────────────────────── */}
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
        return (
          <div className={cn("rounded-md border px-3 py-2 flex items-center gap-2.5", cfgBg)}>
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
        );
      })()}


      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: tp.chargeTotal,    value: totalAmount,  color: "text-foreground" },
            { label: tp.chargeReceived, value: totalPaid,    color: "text-emerald-600" },
            { label: tp.chargeBalance,  value: totalBalance, color: totalBalance > 0 ? "text-amber-600" : "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-md border border-border/50 bg-muted/20 py-2 px-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.label}</span>
              <span className={cn("text-sm font-semibold tabular-nums mt-0.5", s.color)}>{fmt(s.value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add invoice form */}
      {showForm && (
        <div className="rounded-md border border-border/60 bg-muted/20 p-3 flex flex-col gap-2.5">
          <p className="text-xs font-medium">{tp.newChargeTitle}</p>

          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{tp.chargeDescription}</Label>
            <Input placeholder={tp.descriptionPlaceholder} value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)} className="h-7 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{tp.chargeAmount}</Label>
              <Input type="number" placeholder="0,00" min={0} value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)} className="h-7 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{tp.chargeDueDate}</Label>
              <Input type="date" value={formDue} onChange={(e) => setFormDue(e.target.value)} className="h-7 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{tp.chargeStatus}</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as InvoiceStatus)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(INVOICE_STATUS_STYLES) as InvoiceStatus[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">{invoiceStatusLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{tp.chargePaidAmount}</Label>
              <Input type="number" placeholder="0,00" min={0} value={formPaid}
                onChange={(e) => setFormPaid(e.target.value)} className="h-7 text-xs" />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => { setShowForm(false); setFormDesc(""); setFormAmount(""); setFormDue(""); setFormStatus("pending"); setFormPaid(""); }}>
              {tp.chargeCancel}
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !formAmount}>
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

              {isOpen && (
                <div className="border-t border-border/40 px-3 py-2.5 flex flex-col gap-2.5 bg-background/50 rounded-b-md">
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
    </div>
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

  // Fetch contracts
  const { data: contracts = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["project-contracts-list", photographerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, name")
        .eq("photographer_id", photographerId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!photographerId,
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
        {contracts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/50 italic pl-1">{tp.noContracts}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {contracts.map((c) => (
              <a
                key={c.id}
                href={`/dashboard/contracts/${c.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors group"
              >
                <FileTextIcon className="h-4 w-4 text-purple-500 shrink-0" />
                <span className="flex-1 text-xs font-medium truncate">{c.name || "Untitled Contract"}</span>
                <span className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">{tp.openInEditor}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Briefings sub-section ────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">{tp.briefingsSubsection}</p>
        {briefings.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/50 italic pl-1">{tp.noBriefings}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {briefings.map((b) => (
              <a
                key={b.id}
                href={`/dashboard/sessions`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors group"
              >
                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="flex-1 text-xs font-medium truncate">{b.name || "Untitled Briefing"}</span>
                <span className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">{tp.openInEditor}</span>
              </a>
            ))}
          </div>
        )}
      </div>

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
  const queryClient = useQueryClient();

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

  // Get current booking's session_id
  const { data: bookingData } = useQuery({
    queryKey: ["project-booking-session", project?.booking_id],
    queryFn: async () => {
      if (!project?.booking_id) return null;
      const { data } = await (supabase as any)
        .from("bookings")
        .select("session_id, payment_status, extras_total")
        .eq("id", project.booking_id)
        .single();
      return data as { session_id: string; payment_status: string; extras_total: number } | null;
    },
    enabled: !!project?.booking_id && open,
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
      const shootTime = pendingChanges.shoot_time ?? project.shoot_time ?? "09:00";

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
        const { data: blockedTimes } = await (supabase as any)
          .from("blocked_times")
          .select("start_time, end_time, all_day, reason")
          .eq("photographer_id", photographerId)
          .eq("date", shootDate);

        if (blockedTimes) {
          for (const bt of blockedTimes) {
            if (bt.all_day) {
              toast.error(bt.reason || "This day is blocked");
              setSaving(false);
              return;
            }
          }
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

  const queueDateTime = (newDate: string | null, newTime: string | null) => {
    const updates: Partial<ProjectSheetData> = {};
    if (newDate !== undefined) updates.shoot_date = newDate;
    if (newTime !== undefined) updates.shoot_time = newTime;
    queueChange(updates);
    setConflictWarning(null);
  };

  const handleSessionTypeChange = async (id: string | null) => {
    setSessionTypeId(id);
    const name = sessionTypes.find((t) => t.id === id)?.name ?? null;
    await save({ session_type: name });
  };

  const handleSessionChange = async (newSessionId: string) => {
    if (!project.booking_id) return;
    const newSess = photographerSessions.find((s) => s.id === newSessionId);
    if (!newSess) return;

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

      // 4. Update booking session_id + extras_total
      await (supabase as any)
        .from("bookings")
        .update({ session_id: newSess.id, extras_total: newExtras })
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
      await save({ session_type: newSess.title, session_title: newSess.title } as any);

      // 7. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["project-booking-payment"] });
      queryClient.invalidateQueries({ queryKey: ["project-booking-session"] });

      toast.success(tp.projectUpdated || "Session updated");
    } catch (err) {
      toast.error("Failed to change session");
    } finally {
      setChangingSession(false);
      setAddonReviewOpen(false);
      setPendingNewSession(null);
    }
  };

  const isOverdue = project.shoot_date && new Date(project.shoot_date + "T00:00:00") < new Date() && !isArchived;

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
              <span className={cn("self-start inline-flex items-center gap-1 border rounded-sm px-2 py-1 text-[10px] tracking-wider uppercase shrink-0", STAGE_COLORS.archived)}>
                <Archive className="h-2.5 w-2.5" /> {tp.archivedLabel}
              </span>
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
                      </>
                    ) : (
                      <SessionTypeManager
                        photographerId={photographerId} sessionTypes={sessionTypes}
                        selectedTypeId={sessionTypeId} onSelect={handleSessionTypeChange}
                        onRefetch={onRefetchSessionTypes} mode="select"
                      />
                    )}
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
          depositAlreadyPaid={bookingData?.payment_status === "deposit_paid" || bookingData?.payment_status === "paid"}
          onConfirm={(keptItems) => applySessionChange(pendingNewSession, keptItems)}
          confirming={changingSession}
        />
      )}

      <SessionPickerModal
        open={sessionPickerOpen}
        onOpenChange={setSessionPickerOpen}
        sessions={photographerSessions as PickerSession[]}
        currentSessionId={bookingData?.session_id ?? null}
        onSelect={handleSessionChange}
      />
    </Dialog>
  );
}
