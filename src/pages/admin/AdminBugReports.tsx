import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Bug, ChevronDown, ExternalLink, ImageIcon, Loader2, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BugReport = {
  id: string;
  reporter_email: string;
  title: string;
  description: string;
  screenshot_urls: string[];
  status: string;
  route: string;
  created_at: string;
  admin_notes: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  open: { label: "Open", icon: AlertCircle, class: "bg-destructive/10 text-destructive border-destructive/20" },
  in_progress: { label: "In Progress", icon: Clock, class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  fixed: { label: "Fixed", icon: CheckCircle2, class: "bg-green-500/10 text-green-600 border-green-500/20" },
  wont_fix: { label: "Won't Fix", icon: XCircle, class: "bg-muted text-muted-foreground border-border" },
};

const STATUSES = ["open", "in_progress", "fixed", "wont_fix"];

export default function AdminBugReports() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<BugReport[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Check admin role
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }: { data: { role: string } | null }) => {
        if (!data) { navigate("/dashboard"); return; }
        setIsAdmin(true);
      });
  }, [user, loading, navigate]);

  // Fetch reports
  useEffect(() => {
    if (!isAdmin) return;
    setFetching(true);
    (supabase as any)
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: BugReport[] | null }) => {
        setReports(data || []);
        const n: Record<string, string> = {};
        (data || []).forEach((r) => { n[r.id] = r.admin_notes || ""; });
        setNotes(n);
        setFetching(false);
      });
  }, [isAdmin]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from("bug_reports")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success("Status updated");
  };

  const saveNotes = async (id: string) => {
    setSavingNotes(id);
    const { error } = await (supabase as any)
      .from("bug_reports")
      .update({ admin_notes: notes[id] })
      .eq("id", id);
    if (error) toast.error("Failed to save notes");
    else toast.success("Notes saved");
    setSavingNotes(null);
  };

  const filtered = filterStatus === "all" ? reports : reports.filter((r) => r.status === filterStatus);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = reports.filter((r) => r.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-6 gap-3">
        <Bug size={15} className="text-muted-foreground" />
        <span className="text-[11px] tracking-[0.25em] uppercase font-light">Bug Reports — Admin</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                className={cn(
                  "border rounded-md px-4 py-3 text-left transition-all duration-150",
                  filterStatus === s ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={cn("shrink-0", cfg.class.split(" ")[1])} />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-light">{cfg.label}</span>
                </div>
                <p className="text-2xl font-light tabular-nums">{counts[s] || 0}</p>
              </button>
            );
          })}
        </div>

        {/* List */}
        {fetching ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={18} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-2 text-muted-foreground">
            <Bug size={24} className="opacity-30" />
            <p className="text-sm">No reports found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((report) => {
              const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
              const Icon = cfg.icon;
              const isOpen = expanded === report.id;
              return (
                <div
                  key={report.id}
                  className={cn(
                    "border border-border rounded-md overflow-hidden transition-all duration-150",
                    isOpen && "border-foreground/20"
                  )}
                >
                  {/* Row header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors duration-150"
                    onClick={() => setExpanded(isOpen ? null : report.id)}
                  >
                    <Icon size={13} className={cn("shrink-0", cfg.class.split(" ")[1])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light truncate">{report.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                        {report.reporter_email} · {report.route} · {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] tracking-widest uppercase font-light shrink-0", cfg.class)}
                    >
                      {cfg.label}
                    </Badge>
                    <ChevronDown
                      size={14}
                      className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180")}
                    />
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div className="border-t border-border px-4 py-4 flex flex-col gap-4 bg-muted/10">
                      {/* Description */}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1.5">Description</p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{report.description}</p>
                      </div>

                      {/* Screenshots */}
                      {report.screenshot_urls?.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2">
                            Screenshots ({report.screenshot_urls.length})
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {report.screenshot_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group relative">
                                <img
                                  src={url}
                                  alt={`screenshot ${i + 1}`}
                                  className="w-32 h-20 object-cover rounded border border-border group-hover:border-foreground/30 transition-colors"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/60 rounded">
                                  <ExternalLink size={14} />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status change */}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2">Change Status</p>
                        <div className="flex gap-2 flex-wrap">
                          {STATUSES.map((s) => {
                            const scfg = STATUS_CONFIG[s];
                            return (
                              <button
                                key={s}
                                onClick={() => updateStatus(report.id, s)}
                                className={cn(
                                  "text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border transition-all duration-150 font-light",
                                  report.status === s
                                    ? scfg.class + " font-medium"
                                    : "border-border text-muted-foreground hover:border-foreground/30"
                                )}
                              >
                                {scfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Admin notes */}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2">Admin Notes</p>
                        <Textarea
                          value={notes[report.id] || ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                          placeholder="Internal notes about this bug..."
                          className="min-h-[80px] resize-none text-sm"
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveNotes(report.id)}
                            disabled={savingNotes === report.id}
                          >
                            {savingNotes === report.id ? <Loader2 size={12} className="animate-spin" /> : "Save Notes"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
