import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStudioCurrency } from "@/hooks/useStudioCurrency";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  ArrowUpCircle,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  CalendarIcon,
  X,
} from "lucide-react";

function DateField({
  value,
  onChange,
  locale,
  placeholder,
  allowClear,
}: {
  value: string;
  onChange: (v: string) => void;
  locale: string;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const date = value ? new Date(`${value}T00:00:00`) : undefined;
  const display = date ? date.toLocaleDateString(locale) : "";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between font-normal h-10",
            !date && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 opacity-60" />
            {display || placeholder || "—"}
          </span>
          {allowClear && date && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }}
              className="opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[60]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (!d) return;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            onChange(`${y}-${m}-${day}`);
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

import { useLanguage } from "@/contexts/LanguageContext";
import { FinancePanelTabs } from "@/components/dashboard/FinancePanelTabs";
import { toast } from "@/hooks/use-toast";

interface Expense {
  id: string;
  description: string;
  supplier: string | null;
  category: string;
  amount_cents: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  status: "pending" | "paid";
  notes: string | null;
  recurrence_interval: RecurrenceInterval;
  recurrence_until: string | null;
  created_at: string;
}

const CATEGORY_KEYS = [
  "supplier",
  "equipment",
  "contractor",
  "rent",
  "software",
  "marketing",
  "tax",
  "travel",
  "other",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

const RECURRENCE_KEYS = ["none", "weekly", "monthly", "quarterly", "yearly"] as const;
type RecurrenceInterval = (typeof RECURRENCE_KEYS)[number];

const RECURRENCE_LABELS: Record<"en" | "pt" | "es", Record<RecurrenceInterval, string>> = {
  en: { none: "No recurrence", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" },
  pt: { none: "Sem recorrência", weekly: "Semanal", monthly: "Mensal", quarterly: "Trimestral", yearly: "Anual" },
  es: { none: "Sin recurrencia", weekly: "Semanal", monthly: "Mensual", quarterly: "Trimestral", yearly: "Anual" },
};

const RECURRENCE_FIELD_LABELS: Record<"en" | "pt" | "es", { recurrence: string; until: string; nextCreated: string }> = {
  en: { recurrence: "Recurrence", until: "Repeat until (optional)", nextCreated: "Next occurrence created" },
  pt: { recurrence: "Recorrência", until: "Repetir até (opcional)", nextCreated: "Próxima ocorrência criada" },
  es: { recurrence: "Recurrencia", until: "Repetir hasta (opcional)", nextCreated: "Próxima ocurrencia creada" },
};

function addRecurrence(dateISO: string, interval: RecurrenceInterval): string | null {
  if (interval === "none" || !dateISO) return null;
  const d = new Date(`${dateISO}T00:00:00`);
  if (interval === "weekly") d.setDate(d.getDate() + 7);
  else if (interval === "monthly") d.setMonth(d.getMonth() + 1);
  else if (interval === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (interval === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function parseLocal(d: string | null) {
  if (!d) return null;
  return new Date(`${d}T00:00:00`);
}

const emptyForm = {
  description: "",
  supplier: "",
  category: "other" as string,
  amount: "",
  due_date: todayISO(),
  paid_at: "",
  status: "pending" as "pending" | "paid",
  notes: "",
  recurrence_interval: "none" as RecurrenceInterval,
  recurrence_until: "",
};

export default function FinancePayables() {
  const { user, signOut } = useAuth();
  const { t, lang } = useLanguage();
  const langKey: "en" | "pt" | "es" = lang === "pt" ? "pt" : lang === "es" ? "es" : "en";
  const recLabels = RECURRENCE_LABELS[langKey];
  const recFields = RECURRENCE_FIELD_LABELS[langKey];
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const studioFmt = useStudioCurrency();

  const customCatsKey = user ? `expense_custom_cats_${user.id}` : "";
  useEffect(() => {
    if (!customCatsKey) return;
    try {
      const raw = localStorage.getItem(customCatsKey);
      if (raw) setCustomCats(JSON.parse(raw));
    } catch {}
  }, [customCatsKey]);
  function persistCats(next: string[]) {
    setCustomCats(next);
    try { localStorage.setItem(customCatsKey, JSON.stringify(next)); } catch {}
  }

  const BASE_CAT_LABEL: Record<CategoryKey, string> = {
    supplier: t.finance.catSupplier,
    equipment: t.finance.catEquipment,
    contractor: t.finance.catContractor,
    rent: t.finance.catRent,
    software: t.finance.catSoftware,
    marketing: t.finance.catMarketing,
    tax: t.finance.catTax,
    travel: t.finance.catTravel,
    other: t.finance.catOther,
  };
  // Merge custom categories discovered from existing items so old data still shows a label
  const allCustomCats = useMemo(() => {
    const fromItems = items
      .map((it) => it.category)
      .filter((c) => c && !CATEGORY_KEYS.includes(c as CategoryKey));
    const merged = Array.from(new Set([...customCats, ...fromItems]));
    return merged;
  }, [customCats, items]);
  const labelForCategory = (c: string) =>
    (BASE_CAT_LABEL as Record<string, string>)[c] ?? c;
  const addCatLabel =
    langKey === "pt" ? "Adicionar categoria"
    : langKey === "es" ? "Agregar categoría"
    : "Add category";

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("photographer_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (!error && data) setItems(data as any);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, due_date: todayISO() });
    setDialogOpen(true);
  }
  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      description: e.description,
      supplier: e.supplier ?? "",
      category: (CATEGORY_KEYS.includes(e.category as CategoryKey) ? e.category : "other") as CategoryKey,
      amount: String(e.amount_cents || 0),
      due_date: e.due_date ?? "",
      paid_at: e.paid_at ?? "",
      status: e.status,
      notes: e.notes ?? "",
      recurrence_interval: (RECURRENCE_KEYS.includes(e.recurrence_interval) ? e.recurrence_interval : "none") as RecurrenceInterval,
      recurrence_until: e.recurrence_until ?? "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!user) return;
    if (!form.description.trim() || !form.amount) {
      toast({ title: "Error", description: t.finance.expenseDescription, variant: "destructive" });
      return;
    }
    setSaving(true);
    const amount_cents = parseInt(form.amount, 10) || 0;
    const payload = {
      photographer_id: user.id,
      description: form.description.trim(),
      supplier: form.supplier.trim() || null,
      category: form.category,
      amount_cents,
      currency: studioFmt.currency,
      due_date: form.due_date || null,
      paid_at: form.status === "paid" ? (form.paid_at || todayISO()) : null,
      status: form.status,
      notes: form.notes.trim() || null,
      recurrence_interval: form.recurrence_interval,
      recurrence_until: form.recurrence_until || null,
      recurring: form.recurrence_interval !== "none",
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("expenses").update(payload).eq("id", editing.id));
    } else if (
      form.recurrence_interval !== "none" &&
      form.recurrence_until &&
      form.due_date &&
      form.recurrence_until >= form.due_date
    ) {
      // Generate ALL occurrences upfront when an end date is set.
      const rows: any[] = [];
      let cursor: string | null = form.due_date;
      let guard = 0;
      while (cursor && cursor <= form.recurrence_until && guard < 500) {
        rows.push({
          ...payload,
          due_date: cursor,
          // Children are independent entries — don't keep spawning
          recurrence_interval: "none",
          recurrence_until: null,
          recurring: false,
        });
        cursor = addRecurrence(cursor, form.recurrence_interval);
        guard++;
      }
      console.log("[FinancePayables] bulk insert rows:", rows.length, {
        from: form.due_date,
        until: form.recurrence_until,
        interval: form.recurrence_interval,
      });
      if (rows.length === 0) {
        ({ error } = await supabase.from("expenses").insert(payload));
      } else {
        ({ error } = await supabase.from("expenses").insert(rows));
      }
    } else {
      ({ error } = await supabase.from("expenses").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t.finance.expenseSaved });
    setDialogOpen(false);
    load();
  }

  async function togglePaid(e: Expense) {
    const next = e.status === "paid" ? "pending" : "paid";
    const { error } = await supabase
      .from("expenses")
      .update({ status: next, paid_at: next === "paid" ? todayISO() : null })
      .eq("id", e.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    // When marking a recurring expense as paid, spawn the next occurrence.
    if (next === "paid" && e.recurrence_interval && e.recurrence_interval !== "none" && e.due_date) {
      const nextDue = addRecurrence(e.due_date, e.recurrence_interval);
      const untilOk = !e.recurrence_until || (nextDue && nextDue <= e.recurrence_until);
      if (nextDue && untilOk && user) {
        // Avoid duplicating: only create if no pending occurrence already exists for this due date.
        const { data: existing } = await supabase
          .from("expenses")
          .select("id")
          .eq("photographer_id", user.id)
          .eq("description", e.description)
          .eq("due_date", nextDue)
          .limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from("expenses").insert({
            photographer_id: user.id,
            description: e.description,
            supplier: e.supplier,
            category: e.category,
            amount_cents: e.amount_cents,
            currency: e.currency,
            due_date: nextDue,
            paid_at: null,
            status: "pending",
            notes: e.notes,
            recurrence_interval: e.recurrence_interval,
            recurrence_until: e.recurrence_until,
            recurring: true,
          });
          toast({ title: recFields.nextCreated });
        }
      }
    }
    load();
  }

  async function remove(e: Expense) {
    if (!confirm(t.finance.deleteExpenseConfirm)) return;
    const { error } = await supabase.from("expenses").delete().eq("id", e.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t.finance.expenseDeleted });
    load();
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const enriched = useMemo(
    () =>
      items.map((e) => {
        const due = parseLocal(e.due_date);
        const isOverdue = e.status === "pending" && due && due < new Date(now.toDateString());
        return { ...e, isOverdue: !!isOverdue };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  );

  const filtered = enriched.filter((e) => {
    if (statusFilter === "pending" && e.status !== "pending") return false;
    if (statusFilter === "paid" && e.status !== "paid") return false;
    if (statusFilter === "overdue" && !e.isOverdue) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.description.toLowerCase().includes(q) &&
        !(e.supplier ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const totals = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let paidMonth = 0;
    for (const e of enriched) {
      if (e.status === "pending") {
        pending += e.amount_cents;
        if (e.isOverdue) overdue += e.amount_cents;
      } else if (e.status === "paid" && e.paid_at) {
        const p = parseLocal(e.paid_at);
        if (p && p >= startOfMonth) paidMonth += e.amount_cents;
      }
    }
    return { pending, overdue, paidMonth };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">
              <FinancePanelTabs active="payables" />

              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                    <span className="inline-block w-6 h-px bg-border" />
                    {t.finance.sectionLabel}
                  </p>
                  <h1 className="text-2xl font-light tracking-wide">{t.finance.payables}</h1>
                </div>
                <Button onClick={openNew} className="gap-2 h-9 text-xs tracking-wider uppercase font-light">
                  <Plus className="h-3.5 w-3.5" /> {t.finance.newExpense}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-foreground p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      {t.finance.totalPending}
                    </p>
                    <ArrowUpCircle className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xl font-light tabular-nums">{studioFmt.fmt(totals.pending)}</p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    {t.finance.totalOverdue}
                  </p>
                  <p className="text-xl font-light tabular-nums text-yellow-600">
                    {studioFmt.fmt(totals.overdue)}
                  </p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    {t.finance.totalPaidMonth}
                  </p>
                  <p className="text-xl font-light tabular-nums">{studioFmt.fmt(totals.paidMonth)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative max-w-xs flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t.finance.searchExpense}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs font-light"
                  />
                </div>
                <div className="flex gap-1">
                  {(["all", "pending", "overdue", "paid"] as const).map((s) => {
                    const label =
                      s === "all"
                        ? t.finance.filterAll
                        : s === "pending"
                        ? t.finance.pending
                        : s === "overdue"
                        ? t.finance.overdue
                        : t.finance.paidStatus;
                    const active = statusFilter === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 h-8 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-20 text-center">
                  {t.common.loading}
                </p>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border">
                  <ArrowUpCircle className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-light text-muted-foreground">{t.finance.noExpenses}</p>
                  <p className="text-[10px] text-muted-foreground/50">{t.finance.addFirstExpense}</p>
                </div>
              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs font-light">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {[
                          t.finance.dueDate,
                          t.finance.expenseDescription,
                          t.finance.supplier,
                          t.finance.category,
                          t.finance.amount,
                          t.finance.status,
                          "",
                        ].map((h, i) => (
                          <th
                            key={i}
                            className="text-left px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e) => {
                        const due = parseLocal(e.due_date);
                        return (
                          <tr
                            key={e.id}
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {due ? due.toLocaleDateString(studioFmt.locale) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-normal">{e.description}</p>
                              {e.notes && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{e.notes}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {e.supplier ?? "—"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {labelForCategory(e.category)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums font-normal">
                              {studioFmt.fmt(e.amount_cents)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {e.status === "paid" ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] tracking-wide uppercase font-light gap-1"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> {t.finance.paidStatus}
                                </Badge>
                              ) : e.isOverdue ? (
                                <Badge className="text-[10px] tracking-wide uppercase font-light gap-1 bg-yellow-500/10 text-yellow-700 border border-yellow-500/30 hover:bg-yellow-500/10">
                                  <AlertCircle className="h-3 w-3" /> {t.finance.overdue}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] tracking-wide uppercase font-light"
                                >
                                  {t.finance.pending}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[10px] tracking-wider uppercase font-light"
                                  onClick={() => togglePaid(e)}
                                >
                                  {e.status === "paid" ? t.finance.markAsPending : t.finance.markAsPaid}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEdit(e)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => remove(e)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">
              {editing ? t.finance.editExpense : t.finance.newExpense}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t.finance.payables}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {t.finance.expenseDescription}
              </Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {t.finance.supplier}
              </Label>
              <Input
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {t.finance.category}
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[60]">
                  {CATEGORY_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {BASE_CAT_LABEL[k]}
                    </SelectItem>
                  ))}
                  {allCustomCats.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addingCat ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    autoFocus
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    placeholder={addCatLabel}
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = newCatInput.trim();
                        if (!v) return;
                        if (!allCustomCats.includes(v) && !CATEGORY_KEYS.includes(v as CategoryKey)) {
                          persistCats([...customCats, v]);
                        }
                        setForm({ ...form, category: v as any });
                        setNewCatInput("");
                        setAddingCat(false);
                      } else if (e.key === "Escape") {
                        setNewCatInput("");
                        setAddingCat(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const v = newCatInput.trim();
                      if (!v) { setAddingCat(false); return; }
                      if (!allCustomCats.includes(v) && !CATEGORY_KEYS.includes(v as CategoryKey)) {
                        persistCats([...customCats, v]);
                      }
                      setForm({ ...form, category: v as any });
                      setNewCatInput("");
                      setAddingCat(false);
                    }}
                  >
                    {langKey === "pt" ? "Adicionar" : langKey === "es" ? "Agregar" : "Add"}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCat(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground self-start mt-1 inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> {addCatLabel}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {t.finance.amount}
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                value={form.amount ? studioFmt.fmt(parseInt(form.amount, 10) || 0) : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, amount: digits });
                }}
                placeholder={studioFmt.fmt(0)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {t.finance.dueDate}
              </Label>
              <DateField
                value={form.due_date}
                onChange={(v) => setForm({ ...form, due_date: v })}
                locale={studioFmt.locale}
              />
            </div>
            {editing && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {t.finance.status}
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      status: v as "pending" | "paid",
                      paid_at: v === "paid" && !form.paid_at ? todayISO() : form.paid_at,
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="pending">{t.finance.pending}</SelectItem>
                    <SelectItem value="paid">{t.finance.paidStatus}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {recFields.recurrence}
              </Label>
              <Select
                value={form.recurrence_interval}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    recurrence_interval: v as RecurrenceInterval,
                    recurrence_until: v === "none" ? "" : form.recurrence_until,
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[60]">
                  {RECURRENCE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>{recLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.recurrence_interval !== "none" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {recFields.until}
                </Label>
                <DateField
                  value={form.recurrence_until}
                  onChange={(v) => setForm({ ...form, recurrence_until: v })}
                  locale={studioFmt.locale}
                  allowClear
                />
              </div>
            )}
            {form.status === "paid" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {t.finance.paidAt}
                </Label>
                <DateField
                  value={form.paid_at}
                  onChange={(v) => setForm({ ...form, paid_at: v })}
                  locale={studioFmt.locale}
                />
              </div>
            )}
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                {t.finance.notes}
              </Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t.common.cancel ?? "Cancel"}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "..." : t.common.save ?? "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
