/**
 * DashboardCharts
 *
 * Management-level analytics for the photographer dashboard:
 *   - Revenue evolution (last 6 months) — line chart
 *   - Bookings per month + status breakdown — stacked bar chart
 *   - Conversion funnel: bookings → confirmed → paid
 *   - Top session types by booking volume
 *
 * All amounts come from `sessions` (price + deposit) joined to bookings,
 * and are stored in cents → divided by 100 for display.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, BarChart3, Target, PieChart as PieIcon, ArrowUpRight } from "lucide-react";

interface Props { photographerId: string; lang: "en" | "pt" | "es" }

interface MonthRow {
  key: string;          // YYYY-MM
  label: string;        // "Mai", "Jun"...
  revenue: number;      // currency units (already divided by 100)
  bookings: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

const ROSE = "hsl(347 77% 50%)";
const FOREGROUND = "hsl(0 0% 9%)";
const MUTED = "hsl(0 0% 60%)";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeBookingValueCents(b: any): number {
  const sess = b.sessions ?? {};
  const price = Number(sess.price ?? 0);
  const extras = Number(b.extras_total ?? 0);
  // Treat full session price as revenue once paid; deposit if partial.
  if (b.payment_status === "paid") return price + extras;
  if (b.payment_status === "partial") {
    const dep = sess.deposit_enabled
      ? sess.deposit_type === "percentage"
        ? Math.round((price * Number(sess.deposit_amount ?? 0)) / 100)
        : Number(sess.deposit_amount ?? 0)
      : 0;
    return dep + extras;
  }
  return 0;
}

const LABELS = {
  en: {
    revenueTitle: "Revenue evolution",
    revenueSub: "Last 6 months · paid + partial",
    bookingsTitle: "Bookings per month",
    bookingsSub: "Stacked by status",
    funnelTitle: "Conversion funnel",
    funnelSub: "All-time",
    topSessionsTitle: "Top session types",
    topSessionsSub: "By booking volume",
    confirmed: "Confirmed", pending: "Pending", cancelled: "Cancelled",
    revenue: "Revenue", bookings: "Bookings",
    paid: "Paid", total: "Total", noData: "No data yet",
  },
  pt: {
    revenueTitle: "Evolução do faturamento",
    revenueSub: "Últimos 6 meses · pago + parcial",
    bookingsTitle: "Agendamentos por mês",
    bookingsSub: "Empilhado por status",
    funnelTitle: "Funil de conversão",
    funnelSub: "Histórico completo",
    topSessionsTitle: "Sessões mais agendadas",
    topSessionsSub: "Por volume de reservas",
    confirmed: "Confirmado", pending: "Pendente", cancelled: "Cancelado",
    revenue: "Faturamento", bookings: "Agendamentos",
    paid: "Pago", total: "Total", noData: "Sem dados ainda",
  },
  es: {
    revenueTitle: "Evolución de facturación",
    revenueSub: "Últimos 6 meses · pagado + parcial",
    bookingsTitle: "Reservas por mes",
    bookingsSub: "Apilado por estado",
    funnelTitle: "Embudo de conversión",
    funnelSub: "Historial completo",
    topSessionsTitle: "Sesiones más reservadas",
    topSessionsSub: "Por volumen de reservas",
    confirmed: "Confirmado", pending: "Pendiente", cancelled: "Cancelado",
    revenue: "Facturación", bookings: "Reservas",
    paid: "Pagado", total: "Total", noData: "Sin datos aún",
  },
};

const MONTH_NAMES: Record<string, string[]> = {
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  pt: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
  es: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
};

function formatCurrency(n: number, lang: string) {
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const currency = lang === "pt" ? "BRL" : lang === "es" ? "MXN" : "USD";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${n.toFixed(0)}`;
  }
}

export function DashboardCharts({ photographerId, lang }: Props) {
  const L = LABELS[lang] ?? LABELS.en;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(`id, status, payment_status, created_at, booked_date, extras_total,
                 sessions!inner(title, price, deposit_amount, deposit_enabled, deposit_type)`)
        .eq("photographer_id", photographerId);
      if (!cancelled) {
        setBookings((data as any[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [photographerId]);

  // ── Build last-6-months series ─────────────────────────────────────
  const monthSeries = useMemo<MonthRow[]>(() => {
    const months: MonthRow[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: monthKey(d),
        label: MONTH_NAMES[lang][d.getMonth()],
        revenue: 0, bookings: 0, confirmed: 0, pending: 0, cancelled: 0,
      });
    }
    const idx: Record<string, number> = Object.fromEntries(months.map((m, i) => [m.key, i]));
    for (const b of bookings) {
      const date = b.booked_date ?? b.created_at;
      if (!date) continue;
      const k = monthKey(new Date(date));
      const i = idx[k];
      if (i === undefined) continue;
      months[i].bookings += 1;
      if (b.status === "confirmed") months[i].confirmed += 1;
      else if (b.status === "pending") months[i].pending += 1;
      else if (b.status === "cancelled") months[i].cancelled += 1;
      months[i].revenue += computeBookingValueCents(b) / 100;
    }
    return months;
  }, [bookings, lang]);

  // ── Funnel ─────────────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const paid = bookings.filter((b) => b.payment_status === "paid").length;
    return [
      { name: L.total, value: total },
      { name: L.confirmed, value: confirmed },
      { name: L.paid, value: paid },
    ];
  }, [bookings, L]);

  // ── Top session types ──────────────────────────────────────────────
  const topSessions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings) {
      const t = b.sessions?.title ?? "—";
      map[t] = (map[t] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bookings]);

  const PIE_COLORS = [ROSE, "hsl(347 77% 65%)", "hsl(347 30% 75%)", "hsl(0 0% 50%)", "hsl(0 0% 75%)"];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border border-border h-[280px] animate-pulse bg-muted/20" />
        ))}
      </div>
    );
  }

  const hasAny = bookings.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground flex items-center gap-2">
        <BarChart3 className="h-3 w-3" />
        Analytics
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue evolution */}
        <ChartCard
          icon={TrendingUp}
          title={L.revenueTitle}
          sub={L.revenueSub}
          empty={!hasAny ? L.noData : undefined}
          onClick={() => navigate("/dashboard/finance")}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthSeries} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" vertical={false} />
              <XAxis dataKey="label" stroke={MUTED} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke={MUTED} tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v, lang), L.revenue]}
                contentStyle={{ fontSize: 11, border: "1px solid hsl(0 0% 90%)", borderRadius: 4 }}
                labelStyle={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={ROSE}
                strokeWidth={2}
                dot={{ r: 3, fill: ROSE }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bookings per month — stacked */}
        <ChartCard
          icon={BarChart3}
          title={L.bookingsTitle}
          sub={L.bookingsSub}
          empty={!hasAny ? L.noData : undefined}
          onClick={() => navigate("/dashboard/bookings")}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" vertical={false} />
              <XAxis dataKey="label" stroke={MUTED} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke={MUTED} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, border: "1px solid hsl(0 0% 90%)", borderRadius: 4 }}
                labelStyle={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconSize={8} />
              <Bar dataKey="confirmed" stackId="a" fill={ROSE} name={L.confirmed} radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" stackId="a" fill="hsl(45 90% 55%)" name={L.pending} />
              <Bar dataKey="cancelled" stackId="a" fill="hsl(0 0% 70%)" name={L.cancelled} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Funnel */}
        <ChartCard
          icon={Target}
          title={L.funnelTitle}
          sub={L.funnelSub}
          empty={!hasAny ? L.noData : undefined}
        >
          <div className="flex flex-col gap-3 py-2">
            {funnelData.map((row, i) => {
              const pct = funnelData[0].value > 0 ? (row.value / funnelData[0].value) * 100 : 0;
              return (
                <div key={row.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="tracking-wider uppercase text-muted-foreground font-light">{row.name}</span>
                    <span className="font-light tabular-nums">
                      {row.value} <span className="text-muted-foreground/60 text-[10px]">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-sm overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? "hsl(0 0% 30%)" : i === 1 ? "hsl(347 50% 60%)" : ROSE,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Top sessions */}
        <ChartCard
          icon={PieIcon}
          title={L.topSessionsTitle}
          sub={L.topSessionsSub}
          empty={topSessions.length === 0 ? L.noData : undefined}
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={topSessions}
                dataKey="value"
                nameKey="name"
                cx="40%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {topSessions.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, border: "1px solid hsl(0 0% 90%)", borderRadius: 4 }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 10, paddingLeft: 8 }}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  icon: Icon, title, sub, children, empty,
}: {
  icon: React.ElementType; title: string; sub?: string; children: React.ReactNode; empty?: string;
}) {
  return (
    <div className="border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] tracking-wider uppercase font-light flex items-center gap-1.5">
            <Icon className="h-3 w-3 text-muted-foreground" />
            {title}
          </p>
          {sub && <p className="text-[9px] text-muted-foreground tracking-wide">{sub}</p>}
        </div>
      </div>
      {empty ? (
        <div className="h-[220px] flex items-center justify-center text-[11px] tracking-widest uppercase text-muted-foreground/40">
          {empty}
        </div>
      ) : children}
    </div>
  );
}
