import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  format, startOfDay, startOfWeek, startOfMonth,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  subDays, subWeeks, subMonths, addDays, addWeeks, addMonths,
  endOfDay, endOfWeek, endOfMonth, isBefore, isWithinInterval, isSameDay,
} from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBillableTaxRate } from "@/lib/tax-utils";
import { fetchInvoiceFinance, type PaidInvoice, type OutstandingInvoice } from "@/lib/project-invoices-finance";
import { FinancePanelTabs } from "@/components/dashboard/FinancePanelTabs";
import { useStudioCurrency } from "@/hooks/useStudioCurrency";

type Granularity = "day" | "week" | "month";

interface BookingRow {
  created_at: string;
  booked_date: string | null;
  payment_status: string;
  session_price: number;
  extras_total: number;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  tax_rate: number;
  business_country: string | null;
}

interface ExpenseRow {
  amount_cents: number;
  due_date: string | null;
  paid_at: string | null;
  status: string | null;
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
function calcBalance(r: BookingRow) { return calcTotal(r) - calcPaid(r); }

interface PeriodRow {
  key: string;
  label: string;
  fullLabel: string;
  inflows: number;
  outflows: number;
  net: number;
  balance: number;
  isFuture: boolean;
  isCurrent: boolean;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Treat date-only strings as local to avoid TZ drift
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = new Date(onlyDate ? s + "T00:00:00" : s);
  return isNaN(d.getTime()) ? null : d;
}

function buildPeriods(
  granularity: Granularity,
  rows: BookingRow[],
  paidInv: PaidInvoice[],
  outstandingInv: OutstandingInvoice[],
  expenses: ExpenseRow[],
  pastN: number,
  futureN: number,
): PeriodRow[] {
  const now = new Date();
  let starts: Date[];
  let rangeFor: (d: Date) => { start: Date; end: Date };
  let currentStart: Date;
  let labelFmt: string;
  let fullFmt: string;

  if (granularity === "day") {
    currentStart = startOfDay(now);
    starts = eachDayOfInterval({ start: subDays(currentStart, pastN), end: addDays(currentStart, futureN) });
    rangeFor = (d) => ({ start: startOfDay(d), end: endOfDay(d) });
    labelFmt = "d/MM";
    fullFmt = "MMM d, yyyy";
  } else if (granularity === "week") {
    currentStart = startOfWeek(now, { weekStartsOn: 1 });
    starts = eachWeekOfInterval({ start: subWeeks(currentStart, pastN), end: addWeeks(currentStart, futureN) }, { weekStartsOn: 1 });
    rangeFor = (d) => ({ start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) });
    labelFmt = "d/MM";
    fullFmt = "'Sem.' w · MMM d";
  } else {
    currentStart = startOfMonth(now);
    starts = eachMonthOfInterval({ start: subMonths(currentStart, pastN), end: addMonths(currentStart, futureN) });
    rangeFor = (d) => ({ start: startOfMonth(d), end: endOfMonth(d) });
    labelFmt = "MMM";
    fullFmt = "MMM yyyy";
  }

  let running = 0;
  return starts.map((p) => {
    const { start, end } = rangeFor(p);
    const isCurrent = isWithinInterval(now, { start, end });
    const isFuture = isBefore(currentStart, p) && !isCurrent;
    const inRange = (s: string | null | undefined) => {
      const d = parseDate(s);
      return d ? isWithinInterval(d, { start, end }) : false;
    };

    let inflows = 0;
    let outflows = 0;

    if (!isFuture) {
      inflows += rows
        .filter((r) => inRange(r.booked_date || r.created_at))
        .reduce((s, r) => s + calcPaid(r), 0);
      inflows += paidInv
        .filter((p) => inRange(p.paid_at))
        .reduce((s, p) => s + p.paid_cents, 0);
      outflows += expenses
        .filter((e) => inRange(e.paid_at))
        .reduce((s, e) => s + (e.amount_cents ?? 0), 0);
    } else {
      inflows += rows
        .filter((r) => inRange(r.booked_date))
        .reduce((s, r) => s + calcBalance(r), 0);
      inflows += outstandingInv
        .filter((p) => inRange(p.due_date || p.created_at))
        .reduce((s, p) => s + p.balance_cents, 0);
      outflows += expenses
        .filter((e) => !e.paid_at && inRange(e.due_date))
        .reduce((s, e) => s + (e.amount_cents ?? 0), 0);
    }

    const net = inflows - outflows;
    running += net;
    return {
      key: format(p, "yyyy-MM-dd"),
      label: format(p, labelFmt),
      fullLabel: format(p, fullFmt),
      inflows,
      outflows,
      net,
      balance: running,
      isFuture: isFuture || isCurrent,
      isCurrent,
    };
  });
}

function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-sm space-y-1 min-w-[180px]">
      <p className="text-[10px] tracking-wide uppercase text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-foreground flex justify-between gap-4">
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="tabular-nums">{fmt(Math.abs(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

const txt = {
  en: { inflows: "Inflows", outflows: "Outflows", balance: "Balance", projected: "Projected", realized: "Realized", endBalance: "Projected end balance", today: "Today", daily: "Daily", weekly: "Weekly", monthly: "Monthly", period: "Period", days: "days", weeks: "weeks", months: "months" },
  "pt-BR": { inflows: "Entradas", outflows: "Saídas", balance: "Saldo", projected: "Previsto", realized: "Realizado", endBalance: "Saldo final projetado", today: "Hoje", daily: "Diário", weekly: "Semanal", monthly: "Mensal", period: "Período", days: "dias", weeks: "semanas", months: "meses" },
  es: { inflows: "Ingresos", outflows: "Salidas", balance: "Saldo", projected: "Previsto", realized: "Realizado", endBalance: "Saldo final proyectado", today: "Hoy", daily: "Diario", weekly: "Semanal", monthly: "Mensual", period: "Período", days: "días", weeks: "semanas", months: "meses" },
} as const;

const RANGE_OPTIONS: Record<Granularity, { short: number; long: number; unitKey: "days" | "weeks" | "months" }> = {
  day: { short: 14, long: 30, unitKey: "days" },
  week: { short: 8, long: 16, unitKey: "weeks" },
  month: { short: 6, long: 12, unitKey: "months" },
};

export default function FinanceCashFlow() {
  const { user, signOut } = useAuth();
  const { t, lang } = useLanguage();
  const L = lang === "pt" ? txt["pt-BR"] : lang === "es" ? txt.es : txt.en;
  const { fmt, symbol } = useStudioCurrency();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<PaidInvoice[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [rangeMode, setRangeMode] = useState<"short" | "long">("short");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data }, inv, { data: exp }] = await Promise.all([
        supabase
          .from("bookings")
          .select(`created_at, booked_date, payment_status, extras_total, sessions(price, deposit_enabled, deposit_amount, deposit_type, tax_rate), photographers(business_country)`)
          .eq("photographer_id", user.id),
        fetchInvoiceFinance(user.id),
        supabase
          .from("expenses")
          .select("amount_cents, due_date, paid_at, status")
          .eq("photographer_id", user.id),
      ]);
      if (data) {
        setRows((data as any[]).map((b) => ({
          created_at: b.created_at,
          booked_date: b.booked_date,
          payment_status: b.payment_status ?? "pending",
          session_price: b.sessions?.price ?? 0,
          extras_total: b.extras_total ?? 0,
          deposit_enabled: b.sessions?.deposit_enabled ?? false,
          deposit_amount: b.sessions?.deposit_amount ?? 0,
          deposit_type: b.sessions?.deposit_type ?? "fixed",
          tax_rate: b.sessions?.tax_rate ?? 0,
          business_country: b.photographers?.business_country ?? null,
        })));
      }
      setPaidInvoices(inv.paid);
      setOutstandingInvoices(inv.outstanding);
      setExpenses((exp as ExpenseRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const opt = RANGE_OPTIONS[granularity];
  const rangeN = rangeMode === "short" ? opt.short : opt.long;
  const periods = buildPeriods(granularity, rows, paidInvoices, outstandingInvoices, expenses, rangeN, rangeN);
  const totalInflows = periods.reduce((s, m) => s + m.inflows, 0);
  const totalOutflows = periods.reduce((s, m) => s + m.outflows, 0);
  const endBalance = periods[periods.length - 1]?.balance ?? 0;

  const chartData = periods.map((m) => ({ ...m, outflowsNeg: -m.outflows }));
  const todayPeriod = periods.find((m) => m.isCurrent);
  const todayLabel = todayPeriod?.label ?? "";

  const GRANULARITIES: { key: Granularity; label: string }[] = [
    { key: "day", label: L.daily },
    { key: "week", label: L.weekly },
    { key: "month", label: L.monthly },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">
              <FinancePanelTabs active="cashflow" />

              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                    <span className="inline-block w-6 h-px bg-border" />{t.finance.sectionLabel}
                  </p>
                  <h1 className="text-2xl font-light tracking-wide">{t.finance.cashFlow}</h1>
                  <p className="text-xs text-muted-foreground/70 mt-1 font-light">±{rangeN} {L[opt.unitKey]}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center border border-border">
                    {GRANULARITIES.map((g) => (
                      <button
                        key={g.key}
                        onClick={() => { setGranularity(g.key); setRangeMode("short"); }}
                        className={`px-4 py-1.5 text-[10px] tracking-widest uppercase font-light transition-colors border-r border-border last:border-r-0 ${granularity === g.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center border border-border">
                    {(["short", "long"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRangeMode(r)}
                        className={`px-4 py-1.5 text-[10px] tracking-widest uppercase font-light transition-colors border-r border-border last:border-r-0 ${rangeMode === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        ±{r === "short" ? opt.short : opt.long}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border border-border p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{L.inflows}</p>
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xl font-light tabular-nums">{fmt(totalInflows)}</p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{L.outflows}</p>
                    <TrendingDown className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xl font-light tabular-nums">{fmt(totalOutflows)}</p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.finance.net}</p>
                  <p className={`text-xl font-light tabular-nums ${totalInflows - totalOutflows < 0 ? "text-red-600" : ""}`}>{fmt(totalInflows - totalOutflows)}</p>
                </div>
                <div className="border border-foreground p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{L.endBalance}</p>
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <p className={`text-xl font-light tabular-nums ${endBalance < 0 ? "text-red-600" : ""}`}>{fmt(endBalance)}</p>
                </div>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-20 text-center">{t.common.loading}</p>
              ) : (
                <>
                  <div className="border border-border p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.finance.monthlyCashFlow}</p>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-foreground inline-block" />{L.inflows}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/40 inline-block" />{L.outflows}</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-yellow-600 inline-block" />{L.balance}</span>
                      </div>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} barSize={granularity === "day" ? 6 : 10} barCategoryGap="25%">
                          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${symbol}${(v / 100).toFixed(0)}`} width={56} />
                          <ReferenceLine y={0} stroke="hsl(var(--border))" />
                          {todayLabel && <ReferenceLine x={todayLabel} stroke="hsl(var(--muted-foreground)/0.5)" strokeDasharray="2 4" label={{ value: L.today, fontSize: 9, fill: "hsl(var(--muted-foreground))", position: "insideTopRight" }} />}
                          <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                          <Bar dataKey="inflows" name={L.inflows} fill="hsl(var(--foreground))" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="outflowsNeg" name={L.outflows} fill="hsl(var(--muted-foreground)/0.45)" radius={[0, 0, 2, 2]} />
                          <Line type="monotone" dataKey="balance" name={L.balance} stroke="hsl(45 90% 45%)" strokeWidth={2} dot={{ r: granularity === "day" ? 1.5 : 3, fill: "hsl(45 90% 45%)" }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="border border-border overflow-x-auto">
                    <table className="w-full text-xs font-light">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          {[L.period, L.inflows, L.outflows, t.finance.net, L.balance, ""].map((h, i) => (
                            <th key={i} className="text-left px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((m) => (
                          <tr key={m.key} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${m.isFuture && !m.isCurrent ? "text-muted-foreground" : ""}`}>
                            <td className="px-4 py-3 font-normal">{m.fullLabel}</td>
                            <td className="px-4 py-3 tabular-nums">{m.inflows > 0 ? fmt(m.inflows) : <span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-4 py-3 tabular-nums">{m.outflows > 0 ? fmt(m.outflows) : <span className="text-muted-foreground/40">—</span>}</td>
                            <td className={`px-4 py-3 tabular-nums ${m.net < 0 ? "text-red-600" : ""}`}>{fmt(m.net)}</td>
                            <td className={`px-4 py-3 tabular-nums font-normal ${m.balance < 0 ? "text-red-600" : "text-foreground"}`}>{fmt(m.balance)}</td>
                            <td className="px-4 py-3 text-[10px] tracking-widest uppercase">
                              <span className={m.isFuture ? "text-muted-foreground/60" : "text-foreground/60"}>{m.isFuture ? L.projected : L.realized}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
