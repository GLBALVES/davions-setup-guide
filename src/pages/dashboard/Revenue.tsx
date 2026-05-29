import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FinancePanelTabs } from "@/components/dashboard/FinancePanelTabs";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStudioCurrency } from "@/hooks/useStudioCurrency";
import {
  DollarSign, TrendingUp, CheckCircle2, Clock, XCircle,
  Search, ArrowUpRight, Wallet, BarChart3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getBillableTaxRate } from "@/lib/tax-utils";
import { usePlatformFee } from "@/hooks/usePlatformFee";
import { fetchInvoiceFinance, sumPaidByMonth, type PaidInvoice } from "@/lib/project-invoices-finance";

interface BookingRow {
  id: string;
  client_name: string;
  client_email: string;
  created_at: string;
  booked_date: string | null;
  payment_status: string;
  status: string;
  session_title: string;
  session_price: number;
  extras_total: number;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  tax_rate: number;
  business_country: string | null;
}

function calcTotal(row: BookingRow) {
  const base = row.session_price + row.extras_total;
  const taxRate = getBillableTaxRate(row.tax_rate, row.business_country);
  const tax = base * (taxRate / 100);
  return base + tax;
}

function calcDepositAmount(row: BookingRow) {
  if (!row.deposit_enabled) return 0;
  const total = calcTotal(row);
  if (row.deposit_type === "percent" || row.deposit_type === "percentage")
    return Math.round(total * (row.deposit_amount / 100));
  return row.deposit_amount;
}

function calcPaid(row: BookingRow) {
  if (row.payment_status !== "paid" && row.payment_status !== "deposit_paid") return 0;
  const total = calcTotal(row);
  if (row.payment_status === "paid") return total;
  return calcDepositAmount(row);
}

function calcBalance(row: BookingRow) {
  return calcTotal(row) - calcPaid(row);
}

function buildMonthlyChart(rows: BookingRow[]) {
  const now = new Date();
  const months = eachMonthOfInterval({
    start: subMonths(startOfMonth(now), 5),
    end: startOfMonth(now),
  });

  return months.map((m) => {
    const label = format(m, "MMM");
    const monthStr = format(m, "yyyy-MM");
    const revenue = rows
      .filter((r) => {
        const d = r.booked_date || r.created_at;
        return d.startsWith(monthStr) && (r.payment_status === "paid" || r.payment_status === "deposit_paid");
      })
      .reduce((sum, r) => sum + calcPaid(r), 0);
    return { label, revenue };
  });
}

function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-sm">
      <p className="text-muted-foreground mb-1 tracking-wide uppercase text-[10px]">{label}</p>
      <p className="font-normal text-foreground">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function Revenue() {
  const { user, signOut, photographerId } = useAuth();
  const { t } = useLanguage();
  const { fmt: studioFmt, symbol: studioSymbol } = useStudioCurrency();
  const { feePercent } = usePlatformFee();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<PaidInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const calcFee = (paid: number) => Math.round(paid * (feePercent / 100));
  const calcNet = (paid: number) => paid - calcFee(paid);

  const STATUS_CONFIG: Record<string, {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ElementType;
  }> = {
    paid:         { label: t.finance.paid,        variant: "default",     icon: CheckCircle2 },
    deposit_paid: { label: t.finance.depositPaid,  variant: "secondary",   icon: Clock },
    pending:      { label: t.finance.pending,      variant: "outline",     icon: Clock },
    failed:       { label: t.finance.failed,       variant: "destructive", icon: XCircle },
    refunded:     { label: t.finance.refunded,     variant: "outline",     icon: XCircle },
  };

  const BOOKING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Confirmed", color: "text-green-600" },
    pending:   { label: t.finance.pending, color: "text-yellow-600" },
    cancelled: { label: "Cancelled", color: "text-destructive" },
  };

  useEffect(() => {
    if (!user || !photographerId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, client_name, client_email, created_at, booked_date,
          payment_status, status, extras_total,
          sessions ( title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate ),
          photographers ( business_country )
        `)
        .eq("photographer_id", photographerId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped: BookingRow[] = (data as any[]).map((b) => ({
          id: b.id,
          client_name: b.client_name,
          client_email: b.client_email,
          created_at: b.created_at,
          booked_date: b.booked_date,
          payment_status: b.payment_status ?? "pending",
          status: b.status ?? "pending",
          session_title: b.sessions?.title ?? "—",
          session_price: b.sessions?.price ?? 0,
          extras_total: b.extras_total ?? 0,
          deposit_enabled: b.sessions?.deposit_enabled ?? false,
          deposit_amount: b.sessions?.deposit_amount ?? 0,
          deposit_type: b.sessions?.deposit_type ?? "fixed",
          tax_rate: b.sessions?.tax_rate ?? 0,
          business_country: b.photographers?.business_country ?? null,
        }));
        setRows(mapped);
      }
      const inv = await fetchInvoiceFinance(photographerId);
      setPaidInvoices(inv.paid);
      setLoading(false);
    };
    fetchData();
  }, [user, photographerId]);

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.client_name.toLowerCase().includes(search.toLowerCase()) ||
      r.client_email.toLowerCase().includes(search.toLowerCase()) ||
      r.session_title.toLowerCase().includes(search.toLowerCase());
    const matchPayment = paymentFilter === "all" || r.payment_status === paymentFilter;
    return matchSearch && matchPayment;
  });

  const invoicesPaidTotal = paidInvoices.reduce((s, p) => s + p.paid_cents, 0);
  const totalRevenue     = rows.reduce((s, r) => s + calcPaid(r), 0) + invoicesPaidTotal;
  const totalBalance     = rows.reduce((s, r) => s + calcBalance(r), 0);
  const totalPlatformFee = calcFee(totalRevenue);
  const totalNet         = totalRevenue - totalPlatformFee;
  const paidCount        = rows.filter((r) => r.payment_status === "paid").length;
  const pendingCount     = rows.filter((r) => r.payment_status === "pending").length;
  const avgBookingValue  = rows.length ? rows.reduce((s, r) => s + calcTotal(r), 0) / rows.length : 0;
  const chartData        = buildMonthlyChart(rows).map((m, idx, arr) => {
    // Add paid invoices for the same month bucket
    const monthStr = (() => {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() - (arr.length - 1 - idx), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();
    return { ...m, revenue: m.revenue + sumPaidByMonth(paidInvoices, monthStr) };
  });

  const fmt = studioFmt;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">
              <FinancePanelTabs active="revenue" />


              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  {t.finance.sectionLabel}
                </p>
                <h1 className="text-2xl font-light tracking-wide">{t.finance.revenue}</h1>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard icon={DollarSign}    label={t.finance.totalCollected}   value={fmt(totalRevenue)}    highlight />
                <KpiCard icon={Wallet}         label={t.finance.balanceDue}       value={fmt(totalBalance)} />
                <KpiCard icon={TrendingUp}     label={t.finance.avgBookingValue}  value={fmt(avgBookingValue)} />
                <KpiCard icon={CheckCircle2}   label={t.finance.fullyPaid}        value={String(paidCount)} />
                <KpiCard icon={Clock}          label={t.finance.pendingPayment}   value={String(pendingCount)} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 border border-border p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.finance.monthlyRevenue}</p>
                      <p className="text-lg font-light mt-0.5">{fmt(totalRevenue)}</p>
                    </div>
                    <BarChart3 className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barSize={20}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${studioSymbol}${(v / 100).toFixed(0)}`} width={48} />
                        <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                        <Bar dataKey="revenue" fill="hsl(var(--foreground))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border border-border p-5 flex flex-col gap-5 justify-center">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.finance.paymentBreakdown}</p>
                  {[
                    { label: t.finance.fullyPaid,   val: rows.filter((r) => r.payment_status === "paid").reduce((s, r) => s + calcPaid(r), 0),          dot: "bg-foreground" },
                    { label: t.finance.depositPaid, val: rows.filter((r) => r.payment_status === "deposit_paid").reduce((s, r) => s + calcPaid(r), 0),   dot: "bg-muted-foreground" },
                    { label: t.finance.pending,     val: rows.filter((r) => r.payment_status === "pending").reduce((s, r) => s + calcTotal(r), 0),       dot: "bg-border" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                        <span className="text-xs font-light text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-xs font-normal tabular-nums">{fmt(item.val)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-light text-muted-foreground">Platform fee ({feePercent}%)</span>
                      <span className="text-xs font-normal tabular-nums text-amber-600">−{fmt(totalPlatformFee)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-normal">Net to receive</span>
                      <span className="text-xs font-normal tabular-nums">{fmt(totalNet)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-xs font-light text-muted-foreground">{t.finance.totalBookings}</span>
                      <span className="text-xs font-normal">{rows.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t.finance.searchClientOrSession}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs font-light"
                  />
                </div>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="h-8 text-xs font-light w-44">
                    <SelectValue placeholder={t.finance.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"          className="text-xs">{t.finance.allStatuses}</SelectItem>
                    <SelectItem value="paid"         className="text-xs">{t.finance.paid}</SelectItem>
                    <SelectItem value="deposit_paid" className="text-xs">{t.finance.depositPaid}</SelectItem>
                    <SelectItem value="pending"      className="text-xs">{t.finance.pending}</SelectItem>
                    <SelectItem value="failed"       className="text-xs">{t.finance.failed}</SelectItem>
                    <SelectItem value="refunded"     className="text-xs">{t.finance.refunded}</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground ml-auto hidden sm:block">
                  {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-12 text-center">
                  {t.common.loading}
                </p>
              ) : filtered.length === 0 && paidInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-border">
                  <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-light text-muted-foreground">{t.finance.noBookingsFound}</p>
                  <p className="text-[10px] text-muted-foreground/50">{t.finance.bookingsWillAppear}</p>
                </div>

              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs font-light">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {[t.finance.date, t.finance.client, t.finance.session, t.finance.total, t.finance.deposit, t.finance.paid, `Fee (${feePercent}%)`, "Net", t.finance.balance, "Payment", "Booking"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        type Row =
                          | { kind: "booking"; date: string; data: BookingRow }
                          | { kind: "invoice"; date: string; data: PaidInvoice };
                        const bookingRows: Row[] = filtered.map((r) => ({
                          kind: "booking",
                          date: r.booked_date || r.created_at,
                          data: r,
                        }));
                        const invoiceRows: Row[] =
                          paymentFilter === "all" || paymentFilter === "paid"
                            ? paidInvoices
                                .filter((inv) => {
                                  if (!search) return true;
                                  const q = search.toLowerCase();
                                  return (
                                    (inv.description ?? "").toLowerCase().includes(q) ||
                                    (inv.client_name ?? "").toLowerCase().includes(q) ||
                                    (inv.client_email ?? "").toLowerCase().includes(q)
                                  );
                                })
                                .map((inv) => ({ kind: "invoice", date: inv.paid_at, data: inv }))
                            : [];
                        const all = [...bookingRows, ...invoiceRows].sort(
                          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                        );
                        return all.map((row) => {
                          if (row.kind === "invoice") {
                            const inv = row.data;
                            const fee = calcFee(inv.paid_cents);
                            const net = inv.paid_cents - fee;
                            return (
                              <tr key={`inv-${inv.id}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                  {format(new Date(inv.paid_at), "MMM d, yyyy")}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-normal">{inv.client_name || "—"}</p>
                                  {inv.client_email && (
                                    <p className="text-[10px] text-muted-foreground">{inv.client_email}</p>
                                  )}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  {inv.items.length > 0 ? (
                                    <ul className="space-y-0.5">
                                      {inv.items.map((it, idx) => (
                                        <li key={idx} className="flex gap-2 text-[11px]">
                                          <span className="text-muted-foreground tabular-nums">{it.quantity}×</span>
                                          <span>{it.description || "—"}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    inv.description ?? "—"
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-normal tabular-nums">{fmt(inv.paid_cents)}</td>
                                <td className="px-4 py-3 whitespace-nowrap"><span className="text-muted-foreground/40">—</span></td>
                                <td className="px-4 py-3 whitespace-nowrap font-normal tabular-nums text-foreground">{fmt(inv.paid_cents)}</td>
                                <td className="px-4 py-3 whitespace-nowrap tabular-nums text-amber-600">−{fmt(fee)}</td>
                                <td className="px-4 py-3 whitespace-nowrap tabular-nums font-normal">{fmt(net)}</td>
                                <td className="px-4 py-3 whitespace-nowrap"><span className="text-muted-foreground/50">—</span></td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Badge variant="default" className="gap-1 text-[10px] tracking-wide uppercase font-light">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    {t.finance.paid}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-[10px] tracking-wider uppercase text-green-600">Project</span>
                                </td>
                              </tr>
                            );
                          }
                          const r = row.data;
                          const payConf = STATUS_CONFIG[r.payment_status] ?? STATUS_CONFIG["pending"];
                          const bookConf = BOOKING_STATUS_CONFIG[r.status] ?? BOOKING_STATUS_CONFIG["pending"];
                          const PayIcon = payConf.icon;
                          const depositAmt = calcDepositAmount(r);
                          const balance = calcBalance(r);
                          return (
                            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                {format(new Date(r.booked_date || r.created_at), "MMM d, yyyy")}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-normal">{r.client_name}</p>
                                <p className="text-[10px] text-muted-foreground">{r.client_email}</p>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">{r.session_title}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-normal tabular-nums">{fmt(calcTotal(r))}</td>
                              <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                                {r.deposit_enabled ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-normal">{fmt(depositAmt)}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {(r.deposit_type === "percent" || r.deposit_type === "percentage")
                                        ? `${r.deposit_amount}%`
                                        : t.finance.fixed}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-normal tabular-nums text-foreground">{fmt(calcPaid(r))}</td>
                              <td className="px-4 py-3 whitespace-nowrap tabular-nums text-amber-600">
                                {calcPaid(r) > 0 ? `−${fmt(calcFee(calcPaid(r)))}` : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap tabular-nums font-normal">
                                {calcPaid(r) > 0 ? fmt(calcNet(calcPaid(r))) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                                {balance > 0 ? (
                                  <span className="flex items-center gap-1 text-amber-600">
                                    <ArrowUpRight className="h-3 w-3" />
                                    {fmt(balance)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge variant={payConf.variant} className="gap-1 text-[10px] tracking-wide uppercase font-light">
                                  <PayIcon className="h-2.5 w-2.5" />
                                  {payConf.label}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`text-[10px] tracking-wider uppercase ${bookConf.color}`}>
                                  {bookConf.label}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
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

function KpiCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border border-border p-4 flex flex-col gap-2 ${highlight ? "bg-foreground text-background" : ""}`}>
      <div className={`flex items-center gap-2 ${highlight ? "text-background/60" : "text-muted-foreground"}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-light">{label}</span>
      </div>
      <span className="text-2xl font-light">{value}</span>
    </div>
  );
}
