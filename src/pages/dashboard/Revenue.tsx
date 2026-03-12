import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

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
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  tax_rate: number;
}

function calcTotal(row: BookingRow) {
  const base = row.session_price;
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

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  paid:          { label: "Paid",          variant: "default",     icon: CheckCircle2 },
  deposit_paid:  { label: "Deposit Paid",  variant: "secondary",   icon: Clock },
  pending:       { label: "Pending",       variant: "outline",     icon: Clock },
  failed:        { label: "Failed",        variant: "destructive", icon: XCircle },
  refunded:      { label: "Refunded",      variant: "outline",     icon: XCircle },
};

const BOOKING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "text-green-600" },
  pending:   { label: "Pending",   color: "text-yellow-600" },
  cancelled: { label: "Cancelled", color: "text-destructive" },
};

export default function Revenue() {
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          client_name,
          client_email,
          created_at,
          booked_date,
          payment_status,
          status,
          sessions (
            title,
            price,
            deposit_enabled,
            deposit_amount,
            deposit_type,
            tax_rate
          )
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
    fetch();
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

  const totalRevenue = rows.reduce((sum, r) => sum + calcPaid(r), 0);
  const paidCount = rows.filter((r) => r.payment_status === "paid").length;
  const pendingCount = rows.filter((r) => r.payment_status === "pending").length;
  const totalBookings = rows.length;

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={DollarSign} label="Total Revenue" value={fmt(totalRevenue)} />
                <KpiCard icon={TrendingUp} label="Total Bookings" value={String(totalBookings)} />
                <KpiCard icon={CheckCircle2} label="Paid" value={String(paidCount)} />
                <KpiCard icon={Clock} label="Pending Payment" value={String(pendingCount)} />
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
                    <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                    <SelectItem value="deposit_paid" className="text-xs">Deposit Paid</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                    <SelectItem value="refunded" className="text-xs">Refunded</SelectItem>
                  </SelectContent>
                </Select>
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
                  <p className="text-[10px] text-muted-foreground/50">Bookings will appear here once clients start booking sessions</p>
                </div>
              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs font-light">
                    <thead>
                      <tr className="border-b border-border">
                        {["Date", "Client", "Session", "Total", "Paid", "Payment", "Booking"].map((h) => (
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
                        const payConf = STATUS_CONFIG[row.payment_status] ?? STATUS_CONFIG["pending"];
                        const bookConf = BOOKING_STATUS_CONFIG[row.status] ?? BOOKING_STATUS_CONFIG["pending"];
                        const PayIcon = payConf.icon;
                        return (
                          <tr
                            key={row.id}
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {row.booked_date
                                ? format(new Date(row.booked_date), "MMM d, yyyy")
                                : format(new Date(row.created_at), "MMM d, yyyy")}
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

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="border border-border p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-light">{label}</span>
      </div>
      <span className="text-2xl font-light">{value}</span>
    </div>
  );
}
