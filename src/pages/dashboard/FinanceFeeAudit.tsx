import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Receipt, Wallet, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { getBillableTaxRate } from "@/lib/tax-utils";
import { usePlatformFee } from "@/hooks/usePlatformFee";

interface Row {
  id: string;
  client_name: string;
  client_email: string;
  created_at: string;
  booked_date: string | null;
  payment_status: string;
  session_title: string;
  session_price: number;
  extras_total: number;
  tax_rate: number;
  business_country: string | null;
  business_currency: string | null;
  total_paid_amount: number | null;
  deposit_paid_amount: number | null;
  platform_fee_percent: number | null;
  platform_fee_amount: number | null;
}

const PAID_STATUSES = new Set(["paid", "deposit_paid"]);

export default function FinanceFeeAudit() {
  const { user, signOut, photographerId } = useAuth();
  const { t } = useLanguage();
  const { feePercent: currentFeePercent } = usePlatformFee();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user || !photographerId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, client_name, client_email, created_at, booked_date,
          payment_status, extras_total,
          total_paid_amount, deposit_paid_amount,
          platform_fee_percent, platform_fee_amount,
          sessions ( title, price, tax_rate ),
          photographers ( business_country, business_currency )
        `)
        .eq("photographer_id", photographerId)
        .order("created_at", { ascending: false });

      if (!error && data) {
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
          tax_rate: b.sessions?.tax_rate ?? 0,
          business_country: b.photographers?.business_country ?? null,
          business_currency: b.photographers?.business_currency ?? null,
          total_paid_amount: b.total_paid_amount ?? null,
          deposit_paid_amount: b.deposit_paid_amount ?? null,
          platform_fee_percent: b.platform_fee_percent ?? null,
          platform_fee_amount: b.platform_fee_amount ?? null,
        })));
      }
      setLoading(false);
    })();
  }, [user, photographerId]);

  const currency = rows[0]?.business_currency || "USD";
  const fmt = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);

  function deriveRow(r: Row) {
    const subtotal = r.session_price + r.extras_total;                 // gross before tax
    const taxRate = getBillableTaxRate(r.tax_rate, r.business_country);
    const tax = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + tax;
    const paid = PAID_STATUSES.has(r.payment_status)
      ? (r.total_paid_amount ?? r.deposit_paid_amount ?? total)
      : 0;
    const feePct = r.platform_fee_percent ?? currentFeePercent;
    const feeAmt = r.platform_fee_amount ?? Math.round(paid * (feePct / 100));
    const net = paid - feeAmt;
    const isSnapshot = r.platform_fee_amount != null;
    return { subtotal, tax, taxRate, total, paid, feePct, feeAmt, net, isSnapshot };
  }

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.toLowerCase();
    return !q ||
      r.client_name.toLowerCase().includes(q) ||
      r.client_email.toLowerCase().includes(q) ||
      r.session_title.toLowerCase().includes(q);
  }), [rows, search]);

  const totals = useMemo(() => filtered.reduce((acc, r) => {
    const d = deriveRow(r);
    acc.gross += d.subtotal;
    acc.fee += d.paid > 0 ? d.feeAmt : 0;
    acc.net += d.net;
    acc.paid += d.paid;
    return acc;
  }, { gross: 0, fee: 0, net: 0, paid: 0 }), [filtered, currentFeePercent]);

  function exportCSV() {
    const header = ["Date","Client","Email","Session","Subtotal","Tax","Total","Paid","Fee%","Fee","Net","Snapshot"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const d = deriveRow(r);
      const cells = [
        format(new Date(r.booked_date || r.created_at), "yyyy-MM-dd"),
        r.client_name, r.client_email, r.session_title,
        (d.subtotal / 100).toFixed(2),
        (d.tax / 100).toFixed(2),
        (d.total / 100).toFixed(2),
        (d.paid / 100).toFixed(2),
        d.feePct.toString(),
        (d.feeAmt / 100).toFixed(2),
        (d.net / 100).toFixed(2),
        d.isSnapshot ? "yes" : "no",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
                  <span className="inline-block w-6 h-px bg-border" />
                  {t.finance.sectionLabel}
                </p>
                <h1 className="text-2xl font-light tracking-wide">{t.nav.feeAudit}</h1>
                <p className="text-xs text-muted-foreground font-light mt-2 max-w-2xl">
                  Compare gross / subtotal, platform fee, and net to receive for every booking.
                  Paid bookings show the snapshot taken at payment time; unpaid use your current plan rate ({currentFeePercent}%).
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi icon={Receipt}      label="Gross (subtotal)" value={fmt(totals.gross)} />
                <Kpi icon={Wallet}       label="Total collected"  value={fmt(totals.paid)}  highlight />
                <Kpi icon={TrendingDown} label="Platform fee"     value={`−${fmt(totals.fee)}`} />
                <Kpi icon={Wallet}       label="Net to receive"   value={fmt(totals.net)}   highlight />
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
                <Button variant="ghost" size="sm" onClick={exportCSV} className="ml-auto h-8 text-xs gap-2">
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground tracking-widest uppercase animate-pulse py-12 text-center">
                  {t.common.loading}
                </p>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-border">
                  <Receipt className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-light text-muted-foreground">{t.finance.noBookingsFound}</p>
                </div>
              ) : (
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs font-light">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {["Date","Client","Session","Subtotal","Tax","Total","Paid","Fee %","Fee","Net","Source"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const d = deriveRow(r);
                        return (
                          <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {format(new Date(r.booked_date || r.created_at), "MMM d, yyyy")}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-normal">{r.client_name}</p>
                              <p className="text-[10px] text-muted-foreground">{r.client_email}</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{r.session_title}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{fmt(d.subtotal)}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                              {d.taxRate > 0 ? fmt(d.tax) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums font-normal">{fmt(d.total)}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{fmt(d.paid)}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">{d.feePct}%</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums text-amber-600">−{fmt(d.feeAmt)}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums font-normal">{fmt(d.net)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-[10px] px-2 py-0.5 border ${d.isSnapshot ? "border-foreground/30 text-foreground" : "border-border text-muted-foreground"}`}>
                                {d.isSnapshot ? "snapshot" : "estimate"}
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

function Kpi({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border border-border p-5 flex flex-col gap-2 ${highlight ? "bg-muted/20" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
      <p className="text-lg font-light tabular-nums">{value}</p>
    </div>
  );
}
