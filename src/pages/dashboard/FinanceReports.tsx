import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { format, startOfMonth, startOfYear, subMonths } from "date-fns";

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

type Period = "this_month" | "last_month" | "this_year" | "all_time";

function filterByPeriod(rows: BookingRow[], period: Period) {
  const now = new Date();
  return rows.filter((r) => {
    const d = new Date(r.booked_date || r.created_at);
    if (period === "this_month") return d >= startOfMonth(now);
    if (period === "last_month") {
      const prev = subMonths(startOfMonth(now), 1);
      return d >= prev && d < startOfMonth(now);
    }
    if (period === "this_year") return d >= startOfYear(now);
    return true;
  });
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "this_month",  label: "This Month" },
  { key: "last_month",  label: "Last Month" },
  { key: "this_year",   label: "This Year" },
  { key: "all_time",    label: "All Time" },
];

function exportCSV(rows: BookingRow[]) {
  const header = ["Date", "Client", "Email", "Session", "Total", "Paid", "Balance", "Payment Status", "Booking Status"];
  const csvRows = rows.map((r) => [
    format(new Date(r.booked_date || r.created_at), "yyyy-MM-dd"),
    `"${r.client_name}"`,
    r.client_email,
    `"${r.session_title}"`,
    (calcTotal(r) / 100).toFixed(2),
    (calcPaid(r) / 100).toFixed(2),
    (calcBalance(r) / 100).toFixed(2),
    r.payment_status,
    r.status,
  ]);
  const csv = [header, ...csvRows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanceReports() {
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("this_month");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(`id, client_name, client_email, created_at, booked_date, payment_status, status, sessions(title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate)`)
        .eq("photographer_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setRows((data as any[]).map((b) => ({
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
        })));
      }
      setLoading(false);
    })();
  }, [user]);

  const filtered = filterByPeriod(rows, period);
  const totalCollected = filtered.reduce((s, r) => s + calcPaid(r), 0);
  const totalPending   = filtered.reduce((s, r) => s + calcBalance(r), 0);
  const totalBookings  = filtered.length;
  const avgTicket      = totalBookings ? filtered.reduce((s, r) => s + calcTotal(r), 0) / totalBookings : 0;

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
                  <h1 className="text-2xl font-light tracking-wide">Reports</h1>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => exportCSV(filtered)}
                  disabled={filtered.length === 0}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </div>

              {/* Period selector */}
              <div className="flex items-center border border-border w-fit">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`px-4 py-2 text-[10px] tracking-widest uppercase font-light transition-colors border-r border-border last:border-r-0 ${period === p.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* KPI summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Collected",    value: fmt(totalCollected) },
                  { label: "Outstanding",  value: fmt(totalPending) },
                  { label: "Bookings",     value: String(totalBookings) },
                  { label: "Avg Ticket",   value: fmt(avgTicket) },
                ].map((item) => (
                  <div key={item.label} className="border border-border p-5 flex flex-col gap-2">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{item.label}</p>
                    <p className="text-xl font-light tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-20 text-center">Loading…</p>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-border">
                  <FileText className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-light text-muted-foreground">No bookings in this period</p>
                </div>
              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs font-light">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {["Date", "Client", "Session", "Total", "Collected", "Balance", "Status"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
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
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums font-normal">{fmt(calcPaid(row))}</td>
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                            {calcBalance(row) > 0
                              ? <span className="text-yellow-600">{fmt(calcBalance(row))}</span>
                              : <span className="text-muted-foreground/40">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{row.payment_status}</span>
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
