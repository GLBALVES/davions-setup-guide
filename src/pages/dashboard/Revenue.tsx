import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Badge } from "@/components/ui/badge";
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
}

function calcTotal(row: BookingRow) {
  const base = row.session_price + row.extras_total;
  const tax = base * (row.tax_rate / 100);
  return base + tax;
}

function calcPaid(row: BookingRow) {
  if (row.payment_status !== "paid" && row.payment_status !== "deposit_paid") return 0;
  const total = calcTotal(row);
  if (row.payment_status === "paid") return total;
  if (!row.deposit_enabled) return 0;
  if (row.deposit_type === "percentage") return total * (row.deposit_amount / 100);
  return row.deposit_amount;
}

function calcBalance(row: BookingRow) {
  return calcTotal(row) - calcPaid(row);
}

const STATUS_CONFIG: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ElementType;
}> = {
  paid:         { label: "Paid",         variant: "default",     icon: CheckCircle2 },
  deposit_paid: { label: "Deposit Paid", variant: "secondary",   icon: Clock },
  pending:      { label: "Pending",      variant: "outline",     icon: Clock },
  failed:       { label: "Failed",       variant: "destructive", icon: XCircle },
  refunded:     { label: "Refunded",     variant: "outline",     icon: XCircle },
};

const BOOKING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "text-green-600" },
  pending:   { label: "Pending",   color: "text-yellow-600" },
  cancelled: { label: "Cancelled", color: "text-destructive" },
};

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

// Custom tooltip for the chart
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
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, client_name, client_email, created_at, booked_date,
          payment_status, status,
          sessions ( title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate )
        `)
        .eq("photographer_id", user.id)
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
          deposit_enabled: b.sessions?.deposit_enabled ?? false,
          deposit_amount: b.sessions?.deposit_amount ?? 0,
          deposit_type: b.sessions?.deposit_type ?? "fixed",
          tax_rate: b.sessions?.tax_rate ?? 0,
        }));
        setRows(mapped);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.client_name.toLowerCase().includes(search.toLowerCase()) ||
      r.client_email.toLowerCase().includes(search.toLowerCase()) ||
      r.session_title.toLowerCase().includes(search.toLowerCase());
    const matchPayment = paymentFilter === "all" || r.payment_status === paymentFilter;
    return matchSearch && matchPayment;
  });

  const totalRevenue     = rows.reduce((s, r) => s + calcPaid(r), 0);
  const totalBalance     = rows.reduce((s, r) => s + calcBalance(r), 0);
  const paidCount        = rows.filter((r) => r.payment_status === "paid").length;
  const pendingCount     = rows.filter((r) => r.payment_status === "pending").length;
  const avgBookingValue  = rows.length ? rows.reduce((s, r) => s + calcTotal(r), 0) / rows.length : 0;
  const chartData        = buildMonthlyChart(rows);

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">

              {/* Page heading */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  Finance
                </p>
                <h1 className="text-2xl font-light tracking-wide">Revenue</h1>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard icon={DollarSign}    label="Total Collected"   value={fmt(totalRevenue)}    highlight />
                <KpiCard icon={Wallet}         label="Balance Due"       value={fmt(totalBalance)} />
                <KpiCard icon={TrendingUp}     label="Avg Booking Value" value={fmt(avgBookingValue)} />
                <KpiCard icon={CheckCircle2}   label="Fully Paid"        value={String(paidCount)} />
                <KpiCard icon={Clock}          label="Pending Payment"   value={String(pendingCount)} />
              </div>

              {/* Chart + mini-summary row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Monthly Revenue Chart */}
                <div className="lg:col-span-2 border border-border p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Monthly Revenue</p>
                      <p className="text-lg font-light mt-0.5">{fmt(totalRevenue)}</p>
                    </div>
                    <BarChart3 className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barSize={20}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                          width={48}
                        />
                        <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                        <Bar dataKey="revenue" fill="hsl(var(--foreground))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Summary breakdown */}
                <div className="border border-border p-5 flex flex-col gap-5 justify-center">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Payment Breakdown</p>
                  {[
                    { label: "Fully Paid",    val: rows.filter((r) => r.payment_status === "paid").reduce((s, r) => s + calcPaid(r), 0),    dot: "bg-foreground" },
                    { label: "Deposit Paid",  val: rows.filter((r) => r.payment_status === "deposit_paid").reduce((s, r) => s + calcPaid(r), 0), dot: "bg-muted-foreground" },
                    { label: "Pending",       val: rows.filter((r) => r.payment_status === "pending").reduce((s, r) => s + calcTotal(r), 0),   dot: "bg-border" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                        <span className="text-xs font-light text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-xs font-normal tabular-nums">{fmt(item.val)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-light text-muted-foreground">Total Bookings</span>
                      <span className="text-xs font-normal">{rows.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search client or session…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs font-light"
                  />
                </div>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="h-8 text-xs font-light w-44">
                    <SelectValue placeholder="Payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"          className="text-xs">All statuses</SelectItem>
                    <SelectItem value="paid"         className="text-xs">Paid</SelectItem>
                    <SelectItem value="deposit_paid" className="text-xs">Deposit Paid</SelectItem>
                    <SelectItem value="pending"      className="text-xs">Pending</SelectItem>
                    <SelectItem value="failed"       className="text-xs">Failed</SelectItem>
                    <SelectItem value="refunded"     className="text-xs">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground ml-auto hidden sm:block">
                  {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Table */}
              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-12 text-center">
                  Loading…
                </p>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-border">
                  <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-light text-muted-foreground">No bookings found</p>
                  <p className="text-[10px] text-muted-foreground/50">
                    Bookings will appear here once clients start booking sessions
                  </p>
                </div>
              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs font-light">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {["Date", "Client", "Session", "Total", "Paid", "Balance", "Payment", "Booking"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => {
                        const payConf  = STATUS_CONFIG[row.payment_status] ?? STATUS_CONFIG["pending"];
                        const bookConf = BOOKING_STATUS_CONFIG[row.status]  ?? BOOKING_STATUS_CONFIG["pending"];
                        const PayIcon  = payConf.icon;
                        const balance  = calcBalance(row);
                        return (
                          <tr
                            key={row.id}
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {format(
                                new Date(row.booked_date || row.created_at),
                                "MMM d, yyyy",
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-normal">{row.client_name}</p>
                              <p className="text-[10px] text-muted-foreground">{row.client_email}</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{row.session_title}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-normal tabular-nums">
                              {fmt(calcTotal(row))}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-normal tabular-nums text-foreground">
                              {fmt(calcPaid(row))}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                              {balance > 0 ? (
                                <span className="flex items-center gap-1 text-yellow-600">
                                  <ArrowUpRight className="h-3 w-3" />
                                  {fmt(balance)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge
                                variant={payConf.variant}
                                className="gap-1 text-[10px] tracking-wide uppercase font-light"
                              >
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
                      })}
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
    <div
      className={`border border-border p-4 flex flex-col gap-2 ${
        highlight ? "bg-foreground text-background" : ""
      }`}
    >
      <div className={`flex items-center gap-2 ${highlight ? "text-background/60" : "text-muted-foreground"}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-light">{label}</span>
      </div>
      <span className="text-2xl font-light">{value}</span>
    </div>
  );
}
