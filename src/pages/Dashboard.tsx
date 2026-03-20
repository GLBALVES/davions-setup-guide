import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import {
  CalendarDays, Clock, Users, FolderKanban, Image,
  TrendingUp, CheckCircle2, AlertCircle, ArrowRight,
  Camera, BookOpen, CircleDollarSign, Layers,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────
interface TodayBooking {
  id: string;
  client_name: string;
  client_email: string;
  booked_date: string | null;
  status: string;
  payment_status: string;
  session_title: string;
  start_time: string;
  end_time: string;
}

interface ProjectStage {
  stage: string;
  count: number;
}

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  activeProjects: number;
  deliveryProjects: number;
  totalGalleries: number;
  publishedGalleries: number;
  monthRevenue: number;
  pendingRevenue: number;
}

// ── Stage config ─────────────────────────────────────────────────────
const STAGE_ORDER = ["lead", "briefing", "shooting", "editing", "delivery", "done"];
const STAGE_COLORS: Record<string, string> = {
  lead: "bg-muted-foreground/20",
  briefing: "bg-primary/20",
  shooting: "bg-primary/40",
  editing: "bg-primary/60",
  delivery: "bg-primary/80",
  done: "bg-primary",
};

const Dashboard = () => {
  const { user, signOut, photographerId } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0, pendingBookings: 0,
    activeProjects: 0, deliveryProjects: 0,
    totalGalleries: 0, publishedGalleries: 0,
    monthRevenue: 0, pendingRevenue: 0,
  });
  const [photographerName, setPhotographerName] = useState("");

  useEffect(() => {
    if (!user || !photographerId) return;
    fetchAll();
  }, [user, photographerId]);

  const fetchAll = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [
      profileRes,
      bookingsRes,
      allBookingsRes,
      projectsRes,
      galleriesRes,
      paymentsRes,
    ] = await Promise.all([
      supabase.from("photographers").select("full_name, business_name").eq("id", photographerId!).single(),
      // Today's bookings with session info
      supabase.from("bookings")
        .select(`id, client_name, client_email, booked_date, status, payment_status,
          sessions!inner(title),
          session_availability!inner(start_time, end_time)`)
        .eq("photographer_id", photographerId!)
        .eq("booked_date", today)
        .order("session_availability(start_time)", { ascending: true }),
      // All bookings for stats
      supabase.from("bookings")
        .select("id, status, payment_status, created_at")
        .eq("photographer_id", photographerId!),
      // Projects by stage
      supabase.from("client_projects")
        .select("stage")
        .eq("photographer_id", photographerId!),
      // Galleries
      supabase.from("galleries")
        .select("id, status")
        .eq("photographer_id", photographerId!),
      // Revenue this month (from bookings with payment_status = paid)
      supabase.from("bookings")
        .select("extras_total, sessions!inner(price, deposit_amount, deposit_enabled, deposit_type)")
        .eq("photographer_id", photographerId!)
        .gte("created_at", monthStart),
    ]);

    // Profile
    if (profileRes.data) {
      const d = profileRes.data as any;
      setPhotographerName(d.business_name || d.full_name || "");
    }

    // Today's schedule
    if (bookingsRes.data) {
      const mapped: TodayBooking[] = bookingsRes.data.map((b: any) => ({
        id: b.id,
        client_name: b.client_name,
        client_email: b.client_email,
        booked_date: b.booked_date,
        status: b.status,
        payment_status: b.payment_status,
        session_title: b.sessions?.title ?? "Session",
        start_time: b.session_availability?.start_time ?? "",
        end_time: b.session_availability?.end_time ?? "",
      }));
      setTodayBookings(mapped);
    }

    // Booking stats
    if (allBookingsRes.data) {
      const all = allBookingsRes.data as any[];
      setStats((prev) => ({
        ...prev,
        totalBookings: all.length,
        pendingBookings: all.filter((b) => b.status === "pending").length,
      }));
    }

    // Projects by stage
    if (projectsRes.data) {
      const stageMap: Record<string, number> = {};
      (projectsRes.data as any[]).forEach((p) => {
        stageMap[p.stage] = (stageMap[p.stage] || 0) + 1;
      });
      const stages = STAGE_ORDER.map((s) => ({ stage: s, count: stageMap[s] || 0 }));
      setProjectStages(stages);
      const activeCount = (projectsRes.data as any[]).filter((p) => p.stage !== "done").length;
      const deliveryCount = (projectsRes.data as any[]).filter((p) => p.stage === "delivery").length;
      setStats((prev) => ({ ...prev, activeProjects: activeCount, deliveryProjects: deliveryCount }));
    }

    // Gallery stats
    if (galleriesRes.data) {
      const all = galleriesRes.data as any[];
      setStats((prev) => ({
        ...prev,
        totalGalleries: all.length,
        publishedGalleries: all.filter((g) => g.status === "published").length,
      }));
    }

    setLoading(false);
  };

  const totalProjects = projectStages.reduce((sum, s) => sum + s.count, 0);
  const maxStageCount = Math.max(...projectStages.map((s) => s.count), 1);

  const stageLabels: Record<string, string> = {
    lead: t.dashboard.lead,
    briefing: t.dashboard.briefing,
    shooting: t.dashboard.shooting,
    editing: t.dashboard.editing,
    delivery: t.dashboard.delivery,
    done: t.dashboard.doneStage,
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t.dashboard.goodMorning;
    if (h < 18) return t.dashboard.goodAfternoon;
    return t.dashboard.goodEvening;
  };

  const todayLabel = new Date().toLocaleDateString(
    lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  const formatTime = (t: string) =>
    t ? t.slice(0, 5) : "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-6xl mx-auto flex flex-col gap-8">

              {/* ── Header ── */}
              <div className="flex flex-col gap-1">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                  <span className="inline-block w-6 h-px bg-border" />
                  {t.dashboard.overview}
                </p>
                <h1 className="text-2xl font-light tracking-wide">
                  {greeting()}{photographerName ? `, ${photographerName}` : ""}
                </h1>
                <p className="text-[11px] text-muted-foreground font-light tracking-wide">{todayLabel}</p>
              </div>

              {/* ── Onboarding checklist (auto-hides when complete) ── */}
              <OnboardingChecklist />

              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">{t.dashboard.loading}</span>
                </div>
              ) : (
                <>
                  {/* ── KPI Row ── */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard
                      icon={CalendarDays}
                      label={t.dashboard.bookingsThisMonth}
                      value={stats.totalBookings}
                      sub={stats.pendingBookings > 0 ? `${stats.pendingBookings} ${t.dashboard.pending}` : t.dashboard.allConfirmed}
                      subWarning={stats.pendingBookings > 0}
                      onClick={() => navigate("/dashboard/bookings")}
                    />
                    <KpiCard
                      icon={FolderKanban}
                      label={t.dashboard.activeProjects}
                      value={stats.activeProjects}
                      sub={stats.deliveryProjects > 0 ? `${stats.deliveryProjects} ${t.dashboard.readyForDelivery}` : t.dashboard.allUpToDate}
                      subWarning={stats.deliveryProjects > 0}
                      onClick={() => navigate("/dashboard/projects")}
                    />
                    <KpiCard
                      icon={Image}
                      label={t.dashboard.publishedGalleries}
                      value={stats.publishedGalleries}
                      sub={`${stats.totalGalleries} ${t.dashboard.total}`}
                      onClick={() => navigate("/dashboard/galleries")}
                    />
                    <KpiCard
                      icon={CircleDollarSign}
                      label={t.dashboard.todaysSessions}
                      value={todayBookings.length}
                      sub={todayBookings.length === 0 ? t.dashboard.noSessionsToday : `${todayBookings.length} ${t.dashboard.scheduled}`}
                      onClick={() => navigate("/dashboard/schedule")}
                    />
                  </div>

                  {/* ── Main Grid ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* ── Today's Schedule (3/5) ── */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                      <SectionHeader
                        icon={Clock}
                        label={t.dashboard.todaysSchedule}
                        action={{ label: t.dashboard.fullSchedule, onClick: () => navigate("/dashboard/schedule") }}
                      />

                      {todayBookings.length === 0 ? (
                        <div className="border border-border p-8 flex flex-col items-center gap-3 text-center">
                          <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm font-light text-muted-foreground">{t.dashboard.noSessionsScheduled}</p>
                          <p className="text-[10px] text-muted-foreground/60 tracking-wide">
                            {t.dashboard.nextBookingsHere}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {todayBookings.map((b) => (
                            <div
                              key={b.id}
                              onClick={() => navigate("/dashboard/schedule")}
                              className="border border-border p-4 flex items-center gap-4 hover:bg-muted/30 cursor-pointer transition-colors group"
                            >
                              {/* Time */}
                              <div className="shrink-0 flex flex-col items-center gap-0.5 w-14">
                                <span className="text-sm font-light tabular-nums">{formatTime(b.start_time)}</span>
                                <span className="text-[9px] text-muted-foreground tracking-wide">—</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(b.end_time)}</span>
                              </div>

                              {/* Divider */}
                              <div className="w-px h-10 bg-border shrink-0" />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-light tracking-wide truncate">{b.client_name}</p>
                                <p className="text-[10px] text-muted-foreground tracking-wider uppercase truncate">{b.session_title}</p>
                              </div>

                              {/* Status */}
                              <div className="shrink-0 flex flex-col items-end gap-1">
                                <StatusDot status={b.status} />
                                <PaymentDot status={b.payment_status} />
                              </div>

                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-foreground transition-colors" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Project Pipeline (2/5) ── */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                      <SectionHeader
                        icon={Layers}
                        label={t.dashboard.projectPipeline}
                        action={{ label: t.dashboard.viewAll, onClick: () => navigate("/dashboard/projects") }}
                      />

                      <div className="border border-border p-5 flex flex-col gap-4">
                        {totalProjects === 0 ? (
                          <p className="text-xs text-muted-foreground font-light text-center py-4">{t.dashboard.noProjectsYet}</p>
                        ) : (
                          <>
                            {projectStages.map(({ stage, count }) => (
                              <div key={stage} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-light">
                                    {stageLabels[stage]}
                                  </span>
                                  <span className="text-[10px] font-light text-foreground tabular-nums">{count}</span>
                                </div>
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${STAGE_COLORS[stage]}`}
                                    style={{ width: `${(count / maxStageCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}

                            <div className="pt-2 border-t border-border flex items-center justify-between">
                              <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{t.dashboard.totalLabel}</span>
                              <span className="text-sm font-light">{totalProjects}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Quick Actions ── */}
                  <div className="flex flex-col gap-4">
                    <SectionHeader icon={TrendingUp} label={t.dashboard.quickAccess} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: Camera, label: t.dashboard.galleries, sub: t.dashboard.manageShare, path: "/dashboard/galleries" },
                        { icon: BookOpen, label: t.dashboard.sessionsLabel, sub: t.dashboard.bookingPages, path: "/dashboard/sessions" },
                        { icon: Users, label: t.dashboard.clientsLabel, sub: t.dashboard.crmProjects, path: "/dashboard/projects" },
                        { icon: CheckCircle2, label: t.dashboard.workflowsLabel, sub: t.dashboard.tasksAutomation, path: "/dashboard/workflows" },
                      ].map(({ icon: Icon, label, sub, path }) => (
                        <button
                          key={path}
                          onClick={() => navigate(path)}
                          className="border border-border p-4 flex flex-col gap-3 text-left hover:bg-muted/30 transition-colors group"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          <div>
                            <p className="text-xs font-light tracking-wide">{label}</p>
                            <p className="text-[10px] text-muted-foreground">{sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// ── Sub-components ────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, subWarning = false, onClick,
}: {
  icon: React.ElementType; label: string; value: number;
  sub?: string; subWarning?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="border border-border p-4 flex flex-col gap-3 cursor-pointer hover:bg-muted/30 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-2xl font-light tabular-nums">{value}</span>
        <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-light">{label}</span>
      </div>
      {sub && (
        <span className={`text-[10px] font-light ${subWarning ? "text-amber-500" : "text-muted-foreground"}`}>
          {subWarning && <AlertCircle className="h-2.5 w-2.5 inline mr-1" />}
          {sub}
        </span>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon, label, action,
}: {
  icon: React.ElementType; label: string; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground flex items-center gap-2">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {action.label}
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, { color: string; label: string }> = {
    confirmed: { color: "bg-green-500", label: t.bookings.confirmed },
    pending: { color: "bg-amber-500", label: t.bookings.pending },
    cancelled: { color: "bg-muted-foreground/40", label: t.bookings.cancelled },
  };
  const cfg = map[status] ?? { color: "bg-muted-foreground/40", label: status };
  return (
    <span className="flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.color}`} />
      <span className="text-[9px] text-muted-foreground tracking-wide">{cfg.label}</span>
    </span>
  );
}

function PaymentDot({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, { color: string; label: string }> = {
    paid: { color: "text-green-500", label: t.bookings.paid },
    partial: { color: "text-amber-500", label: t.bookings.partial },
    pending: { color: "text-muted-foreground/50", label: t.bookings.unpaid },
  };
  const cfg = map[status] ?? { color: "text-muted-foreground/50", label: status };
  return (
    <span className={`text-[9px] tracking-wide font-light ${cfg.color}`}>{cfg.label}</span>
  );
}

export default Dashboard;
