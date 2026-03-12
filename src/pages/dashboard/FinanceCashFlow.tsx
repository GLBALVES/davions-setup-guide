import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";

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
  return r.deposit_type === "percentage" ? total * (r.deposit_amount / 100) : r.deposit_amount;
}
function calcBalance(r: BookingRow) { return calcTotal(r) - calcPaid(r); }
function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function buildMonths(rows: BookingRow[], n: number) {
  const now = new Date();
  const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), n - 1), end: startOfMonth(now) });
  return months.map((m) => {
    const ms = format(m, "yyyy-MM");
    const monthRows = rows.filter((r) => (r.booked_date || r.created_at).startsWith(ms));
    const collected = monthRows.reduce((s, r) => s + calcPaid(r), 0);
    const outstanding = monthRows.reduce((s, r) => s + calcBalance(r), 0);
    const net = collected; // net cash in
    return { month: format(m, "MMM yyyy"), label: format(m, "MMM"), collected, outstanding, net };
  });
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-sm space-y-1">
      <p className="text-[10px] tracking-wide uppercase text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-foreground flex justify-between gap-4">
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span>{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function FinanceCashFlow() {
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<6 | 12>(12);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(`created_at, booked_date, payment_status, extras_total, sessions(price, deposit_enabled, deposit_amount, deposit_type, tax_rate)`)
        .eq("photographer_id", user.id);
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
        })));
      }
      setLoading(false);
    })();
  }, [user]);

  const months = buildMonths(rows, range);
  const totalCollected = months.reduce((s, m) => s + m.collected, 0);
  const totalOutstanding = months.reduce((s, m) => s + m.outstanding, 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">

              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                    <span className="inline-block w-6 h-px bg-border" />Finance
                  </p>
                  <h1 className="text-2xl font-light tracking-wide">Cash Flow</h1>
                </div>
                <div className="flex items-center gap-1 border border-border">
                  {([6, 12] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-4 py-1.5 text-[10px] tracking-widest uppercase font-light transition-colors ${range === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {r}M
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-foreground p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Collected</p>
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xl font-light tabular-nums">{fmt(totalCollected)}</p>
                  <p className="text-[10px] text-muted-foreground/60">Last {range} months</p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Outstanding</p>
                  <p className="text-xl font-light tabular-nums">{fmt(totalOutstanding)}</p>
                  <p className="text-[10px] text-muted-foreground/60">Balance not yet paid</p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Collection Rate</p>
                  <p className="text-xl font-light tabular-nums">
                    {totalCollected + totalOutstanding === 0 ? "—" : `${((totalCollected / (totalCollected + totalOutstanding)) * 100).toFixed(0)}%`}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">Paid ÷ Total booked</p>
                </div>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-20 text-center">Loading…</p>
              ) : (
                <>
                  {/* Stacked bar chart */}
                  <div className="border border-border p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Monthly Cash Flow</p>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-foreground inline-block" />Collected</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30 inline-block" />Outstanding</span>
                      </div>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={months} barSize={12} barCategoryGap="30%">
                          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} width={52} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                          <Bar dataKey="collected" name="Collected" stackId="a" fill="hsl(var(--foreground))" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="outstanding" name="Outstanding" stackId="a" fill="hsl(var(--muted-foreground)/0.25)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Monthly table */}
                  <div className="border border-border overflow-x-auto">
                    <table className="w-full text-xs font-light">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          {["Month", "Collected", "Outstanding", "Net"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...months].reverse().map((m) => (
                          <tr key={m.month} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-normal">{m.month}</td>
                            <td className="px-4 py-3 tabular-nums">{fmt(m.collected)}</td>
                            <td className="px-4 py-3 tabular-nums text-yellow-600">{m.outstanding > 0 ? fmt(m.outstanding) : <span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-4 py-3 tabular-nums font-normal">{fmt(m.net)}</td>
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
