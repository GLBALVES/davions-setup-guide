import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowDownCircle, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface BookingRow {
  id: string;
  client_name: string;
  client_email: string;
  created_at: string;
  booked_date: string | null;
  payment_status: string;
  session_title: string;
  session_price: number;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  tax_rate: number;
}

function calcTotal(r: BookingRow) {
  return r.session_price + r.session_price * (r.tax_rate / 100);
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
function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Not Paid",
  deposit_paid: "Deposit Only",
};

export default function FinanceReceivables() {
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(`id, client_name, client_email, created_at, booked_date, payment_status, extras_total, sessions(title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate)`)
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
        })));
      }
      setLoading(false);
    })();
  }, [user]);

  const filtered = rows.filter((r) =>
    !search ||
    r.client_name.toLowerCase().includes(search.toLowerCase()) ||
    r.client_email.toLowerCase().includes(search.toLowerCase()) ||
    r.session_title.toLowerCase().includes(search.toLowerCase())
  );

  const totalDue = filtered.reduce((s, r) => s + calcBalance(r), 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">

              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />Finance
                </p>
                <h1 className="text-2xl font-light tracking-wide">Receivables</h1>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-foreground p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Total Balance Due</p>
                    <ArrowDownCircle className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xl font-light tabular-nums">{fmt(totalDue)}</p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Unpaid Bookings</p>
                  <p className="text-xl font-light">{filtered.filter((r) => r.payment_status === "pending").length}</p>
                </div>
                <div className="border border-border p-5 flex flex-col gap-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Deposit Only</p>
                  <p className="text-xl font-light">{filtered.filter((r) => r.payment_status === "deposit_paid").length}</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input placeholder="Search client or session…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs font-light" />
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-20 text-center">Loading…</p>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-border">
                  <ArrowDownCircle className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-light text-muted-foreground">No outstanding receivables</p>
                  <p className="text-[10px] text-muted-foreground/50">All bookings are fully paid</p>
                </div>
              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs font-light">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {["Date", "Client", "Session", "Total", "Paid", "Balance Due", "Status"].map((h) => (
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
