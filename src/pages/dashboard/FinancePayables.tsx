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
import {
  ArrowUpCircle,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
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
  category: "other" as CategoryKey,
  amount: "",
  due_date: todayISO(),
  paid_at: "",
  status: "pending" as "pending" | "paid",
  notes: "",
};

export default function FinancePayables() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const studioFmt = useStudioCurrency();

  const CAT_LABEL: Record<CategoryKey, string> = {
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
    };
    const { error } = editing
      ? await supabase.from("expenses").update(payload).eq("id", editing.id)
      : await supabase.from("expenses").insert(payload);
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
                              {due ? format(due, "MMM d, yyyy") : "—"}
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
                              {CAT_LABEL[e.category as CategoryKey] ?? e.category}
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
                onValueChange={(v) => setForm({ ...form, category: v as CategoryKey })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[60]">
                  {CATEGORY_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {CAT_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
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
            {form.status === "paid" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {t.finance.paidAt}
                </Label>
                <Input
                  type="date"
                  value={form.paid_at}
                  onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
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
