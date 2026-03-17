import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Loader2, Users, Images, CalendarCheck, Bug, TrendingUp, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Stats = {
  totalStudios: number;
  newThisMonth: number;
  totalGalleries: number;
  publishedGalleries: number;
  totalBookings: number;
  confirmedBookings: number;
  openBugs: number;
  inProgressBugs: number;
  fixedBugs: number;
  totalSessions: number;
};

type RecentStudio = {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  created_at: string;
};

const CARD_GROUPS = (s: Stats) => [
  {
    label: "Studios",
    color: "text-foreground",
    items: [
      { label: "Total Studios", value: s.totalStudios, icon: Users, sub: `+${s.newThisMonth} this month` },
      { label: "Active Sessions", value: s.totalSessions, icon: TrendingUp, sub: "All published" },
    ],
  },
  {
    label: "Galleries & Bookings",
    color: "text-foreground",
    items: [
      { label: "Total Galleries", value: s.totalGalleries, icon: Images, sub: `${s.publishedGalleries} published` },
      { label: "Total Bookings", value: s.totalBookings, icon: CalendarCheck, sub: `${s.confirmedBookings} confirmed` },
    ],
  },
  {
    label: "Bug Reports",
    color: "text-foreground",
    items: [
      { label: "Open", value: s.openBugs, icon: AlertCircle, sub: "Needs attention", accent: s.openBugs > 0 ? "text-destructive" : undefined },
      { label: "In Progress", value: s.inProgressBugs, icon: Clock, sub: "Being worked on", accent: "text-yellow-600" },
      { label: "Fixed", value: s.fixedBugs, icon: CheckCircle2, sub: "Resolved", accent: "text-green-600" },
    ],
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentStudios, setRecentStudios] = useState<RecentStudio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: totalStudios },
        { count: newThisMonth },
        { count: totalGalleries },
        { count: publishedGalleries },
        { count: totalBookings },
        { count: confirmedBookings },
        { count: totalSessions },
        { data: bugData },
        { data: recentData },
      ] = await Promise.all([
        (supabase as any).from("photographers").select("*", { count: "exact", head: true }),
        (supabase as any).from("photographers").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
        (supabase as any).from("galleries").select("*", { count: "exact", head: true }),
        (supabase as any).from("galleries").select("*", { count: "exact", head: true }).eq("status", "published"),
        (supabase as any).from("bookings").select("*", { count: "exact", head: true }),
        (supabase as any).from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        (supabase as any).from("sessions").select("*", { count: "exact", head: true }).eq("status", "active"),
        (supabase as any).from("bug_reports").select("status"),
        (supabase as any).from("photographers").select("id, email, full_name, business_name, created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      const bugs = (bugData || []) as { status: string }[];
      setStats({
        totalStudios: totalStudios || 0,
        newThisMonth: newThisMonth || 0,
        totalGalleries: totalGalleries || 0,
        publishedGalleries: publishedGalleries || 0,
        totalBookings: totalBookings || 0,
        confirmedBookings: confirmedBookings || 0,
        totalSessions: totalSessions || 0,
        openBugs: bugs.filter((b) => b.status === "open").length,
        inProgressBugs: bugs.filter((b) => b.status === "in_progress").length,
        fixedBugs: bugs.filter((b) => b.status === "fixed").length,
      });
      setRecentStudios(recentData || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="px-8 py-8 max-w-5xl mx-auto">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground">Overview</h1>
          <p className="text-2xl font-light mt-1">Platform Statistics</p>
        </div>

        {loading || !stats ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={18} />
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {/* Stat groups */}
            {CARD_GROUPS(stats).map((group) => (
              <div key={group.label}>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60 font-light mb-3">
                  {group.label}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.items.map(({ label, value, icon: Icon, sub, accent }) => (
                    <div
                      key={label}
                      className="border border-border rounded-md px-5 py-4 flex flex-col gap-3 hover:border-foreground/20 transition-colors duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-light">{label}</span>
                        <Icon size={13} className={cn("text-muted-foreground/40", accent)} />
                      </div>
                      <p className={cn("text-3xl font-light tabular-nums", accent)}>{value}</p>
                      <p className="text-[10px] text-muted-foreground/50">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Recent Studios */}
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60 font-light mb-3">
                Recent Signups
              </p>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground">Studio</th>
                      <th className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground">Email</th>
                      <th className="text-right px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentStudios.map((s, i) => (
                      <tr
                        key={s.id}
                        className={cn(
                          "border-b border-border last:border-0 transition-colors hover:bg-muted/20",
                        )}
                      >
                        <td className="px-4 py-3">
                          <p className="font-light text-sm">{s.business_name || s.full_name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-mono">{s.id.slice(0, 8)}…</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-light">{s.email}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground font-light tabular-nums">
                          {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
