import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, Clock, ArrowDownCircle, ArrowUpCircle,
  BarChart3, FileText, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, startOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from "date-fns";

interface BookingRow {
  id: string;
  client_name: string;
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
  stripe_checkout_session_id: string | null;
}

function calcTotal(r: BookingRow) {
  const base = r.session_price + r.extras_total;
  return base + base * (r.tax_rate / 100);
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

function buildChart(rows: BookingRow[]) {
  const now = new Date();
  const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: startOfMonth(now) });
  return months.map((m) => {
    const ms = format(m, "yyyy-MM");
    const collected = rows.filter((r) => (r.booked_date || r.created_at).startsWith(ms) && (r.payment_status === "paid" || r.payment_status === "deposit_paid")).reduce((s, r) => s + calcPaid(r), 0);
    const outstanding = rows.filter((r) => (r.booked_date || r.created_at).startsWith(ms)).reduce((s, r) => s + calcBalance(r), 0);
    return { label: format(m, "MMM"), collected, outstanding };
  });
}

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-sm space-y-1">
      <p className="text-[10px] tracking-wide uppercase text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-foreground">
          <span className="text-muted-foreground capitalize mr-1">{p.dataKey}:</span>
          {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

const QUICK_LINKS = [
  { label: "Receivables", desc: "Payments still owed", to: "/dashboard/finance/receivables", icon: ArrowDownCircle, color: "text-yellow-600" },
  { label: "Cash Flow",   desc: "Monthly income trend",  to: "/dashboard/finance/cashflow",    icon: TrendingUp,     color: "text-blue-500" },
  { label: "Reports",     desc: "Export & summaries",    to: "/dashboard/finance/reports",     icon: FileText,       color: "text-muted-foreground" },
  { label: "Revenue",     desc: "Full booking table",    to: "/dashboard/revenue",             icon: DollarSign,     color: "text-foreground" },
];

export default function FinanceDashboard() {
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(`id, client_name, created_at, booked_date, payment_status, extras_total, stripe_checkout_session_id, sessions(title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate)`)
        .eq("photographer_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setRows((data as any[]).map((b) => ({
          id: b.id,
          client_name: b.client_name,
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
          stripe_checkout_session_id: b.stripe_checkout_session_id ?? null,
        })));
      }
      setLoading(false);
    })();
  }, [user]);

  const now = new Date();
  const thisMonth = rows.filter((r) => isSameMonth(new Date(r.booked_date || r.created_at), now));
  const lastMonth = rows.filter((r) => isSameMonth(new Date(r.booked_date || r.created_at), subMonths(now, 1)));

  const totalCollected = rows.reduce((s, r) => s + calcPaid(r), 0);
  const totalBalance   = rows.reduce((s, r) => s + calcBalance(r), 0);
  const avgTicket      = rows.length ? rows.reduce((s, r) => s + calcTotal(r), 0) / rows.length : 0;
  const thisMonthRev   = thisMonth.reduce((s, r) => s + calcPaid(r), 0);
  const lastMonthRev   = lastMonth.reduce((s, r) => s + calcPaid(r), 0);
  const monthDelta     = lastMonthRev === 0 ? null : ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100;

  // Deposit breakdown: Stripe-confirmed vs manually recorded
  const depositRows = rows.filter((r) => r.payment_status === "deposit_paid");
  const stripeDeposits = depositRows.filter((r) => !!r.stripe_checkout_session_id);
  const manualDeposits = depositRows.filter((r) => !r.stripe_checkout_session_id);
  const stripeDepositTotal = stripeDeposits.reduce((s, r) => s + calcPaid(r), 0);
  const manualDepositTotal = manualDeposits.reduce((s, r) => s + calcPaid(r), 0);
  const totalDepositAmount = stripeDepositTotal + manualDepositTotal;

  const chartData = buildChart(rows);

  // Top clients by total bookings value
  const clientMap: Record<string, number> = {};
  rows.forEach((r) => { clientMap[r.client_name] = (clientMap[r.client_name] ?? 0) + calcTotal(r); });
  const topClients = Object.entries(clientMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top sessions by revenue
  const sessionMap: Record<string, number> = {};
  rows.forEach((r) => { sessionMap[r.session_title] = (sessionMap[r.session_title] ?? 0) + calcPaid(r); });
  const topSessions = Object.entries(sessionMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">

              {/* Heading */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />Finance
                </p>
                <h1 className="text-2xl font-light tracking-wide">Financial Dashboard</h1>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-20 text-center">Loading…</p>
              ) : (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={DollarSign} label="Total Collected" value={fmt(totalCollected)} highlight />
                    <KpiCard icon={Clock} label="Balance Due" value={fmt(totalBalance)} sub={`${rows.filter((r) => calcBalance(r) > 0).length} bookings pending`} />
                    <KpiCard icon={TrendingUp} label="Avg Ticket" value={fmt(avgTicket)} />
                    <div className="border border-border p-5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">This Month</p>
                        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/30" />
                      </div>
                      <p className="text-xl font-light tabular-nums">{fmt(thisMonthRev)}</p>
                      {monthDelta !== null && (
                        <div className={`flex items-center gap-1 text-[10px] ${monthDelta >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {monthDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(monthDelta).toFixed(1)}% vs last month
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="border border-border p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Revenue — Last 6 Months</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-foreground inline-block" />Collected</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30 inline-block" />Outstanding</span>
                      </div>
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={14} barCategoryGap="30%">
                          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} width={48} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                          <Bar dataKey="collected" fill="hsl(var(--foreground))" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="outstanding" fill="hsl(var(--muted-foreground)/0.25)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top clients + Top sessions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="border border-border p-5 flex flex-col gap-4">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Top 5 Clients by Value</p>
                      {topClients.length === 0 ? (
                        <p className="text-xs text-muted-foreground/50 font-light">No data yet</p>
                      ) : topClients.map(([name, val], i) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground/40 w-4 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-normal truncate">{name}</p>
                            <div className="mt-1 h-0.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-foreground rounded-full" style={{ width: `${(val / (topClients[0][1] || 1)) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-xs tabular-nums shrink-0">{fmt(val)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border border-border p-5 flex flex-col gap-4">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Top 5 Sessions by Revenue</p>
                      {topSessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground/50 font-light">No data yet</p>
                      ) : topSessions.map(([name, val], i) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground/40 w-4 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-normal truncate">{name}</p>
                            <div className="mt-1 h-0.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-foreground rounded-full" style={{ width: `${(val / (topSessions[0][1] || 1)) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-xs tabular-nums shrink-0">{fmt(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {QUICK_LINKS.map((ql) => (
                      <Link key={ql.to} to={ql.to} className="border border-border p-4 flex flex-col gap-2 hover:bg-muted/30 transition-colors group">
                        <ql.icon className={`h-4 w-4 ${ql.color}`} />
                        <p className="text-xs font-normal group-hover:text-foreground transition-colors">{ql.label}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-light">{ql.desc}</p>
                      </Link>
                    ))}
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

function KpiCard({ icon: Icon, label, value, highlight, sub }: { icon: React.ElementType; label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div className={`border p-5 flex flex-col gap-2 ${highlight ? "border-foreground" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/30" />
      </div>
      <p className="text-xl font-light tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
    </div>
  );
}
