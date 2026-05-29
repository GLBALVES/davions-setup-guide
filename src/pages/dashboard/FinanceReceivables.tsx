import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { ArrowDownCircle, Search, AlertCircle, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBillableTaxRate } from "@/lib/tax-utils";
import { fetchInvoiceFinance, type OutstandingInvoice } from "@/lib/project-invoices-finance";
import { FinancePanelTabs } from "@/components/dashboard/FinancePanelTabs";
import { useStudioCurrency } from "@/hooks/useStudioCurrency";

function DateField({
  value,
  onChange,
  locale,
  placeholder,
  allowClear,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  locale: string;
  placeholder?: string;
  allowClear?: boolean;
  compact?: boolean;
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
            "w-full justify-between font-normal",
            compact ? "h-8 text-xs font-light px-2" : "h-10",
            !date && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "opacity-60 shrink-0")} />
            <span className="truncate">{display || placeholder || "—"}</span>
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
              className="opacity-60 hover:opacity-100 shrink-0"
            >
              <X className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
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

interface BookingRow {
  id: string;
  client_name: string;
  client_email: string;
  created_at: string;
  booked_date: string | null;
  payment_status: string;
  session_title: string;
  session_price: number;
  extras_total: number;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  tax_rate: number;
  business_country: string | null;
}

function calcTotal(r: BookingRow) {
  const base = r.session_price + r.extras_total;
  const taxRate = getBillableTaxRate(r.tax_rate, r.business_country);
  return base + base * (taxRate / 100);
}
function calcPaid(r: BookingRow) {
  if (r.payment_status !== "paid" && r.payment_status !== "deposit_paid") return 0;
  const total = calcTotal(r);
  if (r.payment_status === "paid") return total;
  if (!r.deposit_enabled) return 0;
  return (r.deposit_type === "percent" || r.deposit_type === "percentage") ? total * (r.deposit_amount / 100) : r.deposit_amount;
}
function calcBalance(r: BookingRow) {
  return calcTotal(r) - calcPaid(r);
}
export default function FinanceReceivables() {
  const { user, signOut } = useAuth();
  const { t, lang } = useLanguage();
  const langKey: "en" | "pt" | "es" = lang === "pt" ? "pt" : lang === "es" ? "es" : "en";
  const { fmt, locale } = useStudioCurrency();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [invoices, setInvoices] = useState<OutstandingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "deposit_paid">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [fromPreset, setFromPreset] = useState<"none" | "month" | "quarter_back" | "year_start" | "custom">("none");
  const [toPreset, setToPreset] = useState<"none" | "month" | "quarter" | "year_end" | "custom">("none");
  const [pendingPeriod, setPendingPeriod] = useState<"month" | "quarter" | "year" | "all">("month");

  const STATUS_LABEL: Record<string, string> = {
    pending: t.finance.notPaid,
    deposit_paid: t.finance.depositOnly,
    partial: t.finance.depositOnly,
  };

  useEffect(() => {
    const now = new Date();
    if (fromPreset === "month") {
      setFromDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
    } else if (fromPreset === "quarter_back") {
      const d = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    } else if (fromPreset === "year_start") {
      setFromDate(`${now.getFullYear()}-01-01`);
    } else if (fromPreset === "none") {
      setFromDate("");
    }
  }, [fromPreset]);

  useEffect(() => {
    const now = new Date();
    if (toPreset === "month") {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setToDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    } else if (toPreset === "quarter") {
      const d = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      setToDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    } else if (toPreset === "year_end") {
      setToDate(`${now.getFullYear()}-12-31`);
    } else if (toPreset === "none") {
      setToDate("");
    }
  }, [toPreset]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(`id, client_name, client_email, created_at, booked_date, payment_status, extras_total, sessions(title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate), photographers(business_country)`)
        .eq("photographer_id", user.id)
        .in("payment_status", ["pending", "deposit_paid"])
        .order("created_at", { ascending: false });

      if (data) {
        setRows((data as any[]).map((b) => ({
          id: b.id,
          client_name: b.client_name,
          client_email: b.client_email,
          created_at: b.created_at,
          booked_date: b.booked_date,
          payment_status: b.payment_status ?? "pending",
          session_title: b.sessions?.title ?? "—",
          session_price: b.sessions?.price ?? 0,
          extras_total: b.extras_total ?? 0,
          deposit_enabled: b.sessions?.deposit_enabled ?? false,
          deposit_amount: b.sessions?.deposit_amount ?? 0,
          deposit_type: b.sessions?.deposit_type ?? "fixed",
          tax_rate: b.sessions?.tax_rate ?? 0,
          business_country: b.photographers?.business_country ?? null,
        })));
      }
      const inv = await fetchInvoiceFinance(user.id);
      setInvoices(inv.outstanding);
      setLoading(false);
    })();
  }, [user]);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const s = (r.client_name ?? "").trim();
      if (s) set.add(s);
    }
    for (const i of invoices) {
      const s = (i.client_name ?? "").trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, invoices]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter !== "all" && r.payment_status !== statusFilter) return false;
    if (clientFilter !== "all" && r.client_name !== clientFilter) return false;
    const refDate = r.booked_date || r.created_at.slice(0, 10);
    if (fromDate && refDate < fromDate) return false;
    if (toDate && refDate > toDate) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.client_name.toLowerCase().includes(q) &&
        !r.client_email.toLowerCase().includes(q) &&
        !r.session_title.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [rows, statusFilter, clientFilter, fromDate, toDate, search]);

  const filteredInvoices = useMemo(() => invoices.filter((i) => {
    if (statusFilter === "deposit_paid" && i.status !== "partial") return false;
    if (statusFilter === "pending" && i.status !== "pending") return false;
    if (clientFilter !== "all" && (i.client_name ?? "") !== clientFilter) return false;
    const refDate = (i.due_date || i.created_at).slice(0, 10);
    if (fromDate && refDate < fromDate) return false;
    if (toDate && refDate > toDate) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(i.description ?? "").toLowerCase().includes(q) &&
          !(i.client_name ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [invoices, statusFilter, clientFilter, fromDate, toDate, search]);

  const now = new Date();
  const pendingCutoffISO = useMemo(() => {
    if (pendingPeriod === "all") return null;
    let d: Date;
    if (pendingPeriod === "month") d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    else if (pendingPeriod === "quarter") d = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    else d = new Date(now.getFullYear(), 11, 31);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPeriod]);

  const totalDue = useMemo(() => {
    const inPeriod = (iso: string | null) => !pendingCutoffISO || (iso && iso <= pendingCutoffISO);
    const bookingsSum = filtered
      .filter((r) => inPeriod((r.booked_date || r.created_at.slice(0, 10))))
      .reduce((s, r) => s + calcBalance(r), 0);
    const invSum = filteredInvoices
      .filter((i) => inPeriod(((i.due_date || i.created_at) ?? "").slice(0, 10)))
      .reduce((s, i) => s + i.balance_cents, 0);
    return bookingsSum + invSum;
  }, [filtered, filteredInvoices, pendingCutoffISO]);

  const isEmpty = filtered.length === 0 && filteredInvoices.length === 0;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setClientFilter("all");
    setFromDate("");
    setToDate("");
    setFromPreset("none");
    setToPreset("none");
  }

  const hasActiveFilters = !!(search || statusFilter !== "all" || clientFilter !== "all" || fromDate || toDate || fromPreset !== "none" || toPreset !== "none");

  const txt = {
    client: langKey === "pt" ? "Cliente" : langKey === "es" ? "Cliente" : "Client",
    from: langKey === "pt" ? "De" : langKey === "es" ? "Desde" : "From",
    to: langKey === "pt" ? "Até" : langKey === "es" ? "Hasta" : "To",
    all: langKey === "pt" ? "Todos" : langKey === "es" ? "Todos" : "All",
    clear: langKey === "pt" ? "Limpar filtros" : langKey === "es" ? "Limpiar filtros" : "Clear filters",
    thisMonth: langKey === "pt" ? "Este mês" : langKey === "es" ? "Este mes" : "This month",
    threeMonthsAgo: langKey === "pt" ? "3 meses atrás" : langKey === "es" ? "3 meses atrás" : "3 months ago",
    yearStart: langKey === "pt" ? "Início do ano" : langKey === "es" ? "Inicio del año" : "Start of year",
    next3Months: langKey === "pt" ? "Próximos 3 meses" : langKey === "es" ? "Próximos 3 meses" : "Next 3 months",
    yearEnd: langKey === "pt" ? "Até fim do ano" : langKey === "es" ? "Hasta fin de año" : "Until end of year",
    custom: langKey === "pt" ? "Personalizado" : langKey === "es" ? "Personalizado" : "Custom",
    presets: langKey === "pt" ? "Predefinidos" : langKey === "es" ? "Predefinidos" : "Presets",
    pickDate: langKey === "pt" ? "Escolher data" : langKey === "es" ? "Elegir fecha" : "Pick a date",
    allTime: langKey === "pt" ? "Todo o período" : langKey === "es" ? "Todo el período" : "All time",
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">
              <FinancePanelTabs active="receivables" />

              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />{t.finance.sectionLabel}
                </p>
                <h1 className="text-2xl font-light tracking-wide">{t.finance.receivables}</h1>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-foreground p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.finance.totalBalanceDue}</p>
                    <ArrowDownCircle className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xl font-light tabular-nums">{fmt(totalDue)}</p>
                  <Select value={pendingPeriod} onValueChange={(v) => setPendingPeriod(v as any)}>
                    <SelectTrigger className="h-7 text-[10px] tracking-[0.15em] uppercase font-light border-border w-auto gap-2 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="month">{txt.thisMonth}</SelectItem>
                      <SelectItem value="quarter">{txt.next3Months}</SelectItem>
                      <SelectItem value="year">{txt.yearEnd}</SelectItem>
                      <SelectItem value="all">{txt.allTime}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.finance.unpaidBookings}</p>
                  <p className="text-xl font-light">{filtered.filter((r) => r.payment_status === "pending").length}</p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.finance.depositOnly}</p>
                  <p className="text-xl font-light">{filtered.filter((r) => r.payment_status === "deposit_paid").length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative max-w-xs flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input placeholder={t.finance.searchClientOrSession} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs font-light" />
                </div>
                <div className="flex gap-1">
                  {(["all", "pending", "deposit_paid"] as const).map((s) => {
                    const label = s === "all" ? t.finance.filterAll : s === "pending" ? t.finance.notPaid : t.finance.depositOnly;
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

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-col gap-1 min-w-[160px]">
                  <Label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">{txt.client}</Label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="h-8 text-xs font-light"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="all">{txt.all}</SelectItem>
                      {uniqueClients.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 min-w-[160px]">
                  <Label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground h-3">{txt.from}</Label>
                  {fromPreset === "custom" ? (
                    <div className="flex items-stretch gap-1">
                      <div className="flex-1">
                        <DateField value={fromDate} onChange={setFromDate} locale={locale} placeholder={txt.pickDate} allowClear compact />
                      </div>
                      <Select value="custom" onValueChange={(v) => { if (v !== "custom") { setFromDate(""); setFromPreset(v as any); } }}>
                        <SelectTrigger className="h-8 w-8 px-0 justify-center text-xs font-light [&>svg]:opacity-60 [&>span]:hidden" aria-label={txt.presets} />
                        <SelectContent className="z-[60]" align="end">
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="month">{txt.thisMonth}</SelectItem>
                          <SelectItem value="quarter_back">{txt.threeMonthsAgo}</SelectItem>
                          <SelectItem value="year_start">{txt.yearStart}</SelectItem>
                          <SelectItem value="custom">{txt.custom}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Select value={fromPreset} onValueChange={(v) => setFromPreset(v as any)}>
                      <SelectTrigger className="h-8 text-xs font-light"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="month">{txt.thisMonth}</SelectItem>
                        <SelectItem value="quarter_back">{txt.threeMonthsAgo}</SelectItem>
                        <SelectItem value="year_start">{txt.yearStart}</SelectItem>
                        <SelectItem value="custom">{txt.custom}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-[160px]">
                  <Label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground h-3">{txt.to}</Label>
                  {toPreset === "custom" ? (
                    <div className="flex items-stretch gap-1">
                      <div className="flex-1">
                        <DateField value={toDate} onChange={setToDate} locale={locale} placeholder={txt.pickDate} allowClear compact />
                      </div>
                      <Select value="custom" onValueChange={(v) => { if (v !== "custom") { setToDate(""); setToPreset(v as any); } }}>
                        <SelectTrigger className="h-8 w-8 px-0 justify-center text-xs font-light [&>svg]:opacity-60 [&>span]:hidden" aria-label={txt.presets} />
                        <SelectContent className="z-[60]" align="end">
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="month">{txt.thisMonth}</SelectItem>
                          <SelectItem value="quarter">{txt.next3Months}</SelectItem>
                          <SelectItem value="year_end">{txt.yearEnd}</SelectItem>
                          <SelectItem value="custom">{txt.custom}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Select value={toPreset} onValueChange={(v) => setToPreset(v as any)}>
                      <SelectTrigger className="h-8 text-xs font-light"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="month">{txt.thisMonth}</SelectItem>
                        <SelectItem value="quarter">{txt.next3Months}</SelectItem>
                        <SelectItem value="year_end">{txt.yearEnd}</SelectItem>
                        <SelectItem value="custom">{txt.custom}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="self-end h-10 px-3 text-[10px] tracking-[0.15em] uppercase border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors inline-flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> {txt.clear}
                  </button>
                )}
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-20 text-center">{t.common.loading}</p>
              ) : isEmpty ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-border">
                  <ArrowDownCircle className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-light text-muted-foreground">{t.finance.noOutstandingReceivables}</p>
                  <p className="text-[10px] text-muted-foreground/50">{t.finance.allBookingsFullyPaid}</p>
                </div>
              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs font-light">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {[t.finance.date, t.finance.client, t.finance.session, t.finance.total, t.finance.paid, t.finance.balance, t.finance.status].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => {
                        const bal = calcBalance(row);
                        return (
                          <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {format(new Date(row.booked_date || row.created_at), "MMM d, yyyy")}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-normal">{row.client_name}</p>
                              <p className="text-[10px] text-muted-foreground">{row.client_email}</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{row.session_title}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{fmt(calcTotal(row))}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{fmt(calcPaid(row))}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="flex items-center gap-1 font-normal tabular-nums text-yellow-600">
                                <AlertCircle className="h-3 w-3" />{fmt(bal)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px] tracking-wide uppercase font-light">
                                {STATUS_LABEL[row.payment_status] ?? row.payment_status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredInvoices.map((inv) => (
                        <tr key={`inv-${inv.id}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {format(new Date(inv.due_date || inv.created_at), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-normal text-muted-foreground italic">{inv.client_name ?? "Cobrança de projeto"}</p>
                          </td>
                          <td className="px-4 py-3">{inv.description ?? "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums">{fmt(inv.amount_cents)}</td>
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums">{fmt(inv.paid_cents)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="flex items-center gap-1 font-normal tabular-nums text-yellow-600">
                              <AlertCircle className="h-3 w-3" />{fmt(inv.balance_cents)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] tracking-wide uppercase font-light">
                              {STATUS_LABEL[inv.status] ?? inv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
