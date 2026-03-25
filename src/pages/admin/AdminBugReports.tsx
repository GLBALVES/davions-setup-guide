import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BugReportThread } from "@/components/admin/BugReportThread";
import {
  Bug, ChevronDown, ExternalLink, Loader2,
  CheckCircle2, Clock, AlertCircle, XCircle, Video, Maximize2, X,
} from "lucide-react";
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

function isVideo(url: string) {
  return /\.(mp4|webm|mov|ogg|avi|mkv)(\?|$)/i.test(url);
}

type LightboxItem = { url: string; type: "image" | "video" };

export default function AdminBugReports() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);

  useEffect(() => {
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
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("bug_reports").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success("Status updated");
  };

  const saveNotes = async (id: string) => {
    setSavingNotes(id);
    const { error } = await (supabase as any).from("bug_reports").update({ admin_notes: notes[id] }).eq("id", id);
    if (error) toast.error("Failed to save notes");
    else toast.success("Notes saved");
    setSavingNotes(null);
  };

  const filtered = filterStatus === "all" ? reports : reports.filter((r) => r.status === filterStatus);
  const counts = STATUSES.reduce((acc, s) => { acc[s] = reports.filter((r) => r.status === s).length; return acc; }, {} as Record<string, number>);

  return (
    <AdminLayout>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={18} />
          </button>
          {lightbox.type === "video" ? (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[85vh] rounded-lg border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightbox.url}
              alt="attachment expanded"
              className="max-w-[90vw] max-h-[85vh] rounded-lg border border-border shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
      <div className="px-8 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground">Management</h1>
          <p className="text-2xl font-light mt-1">Bug Reports</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
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
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={18} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-2 text-muted-foreground">
            <Bug size={24} className="opacity-30" />
            <p className="text-sm">No reports found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((report) => {
              const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
              const Icon = cfg.icon;
              const isOpen = expanded === report.id;
              return (
                <div key={report.id} data-report-id={report.id} className={cn("border border-border rounded-md overflow-hidden transition-all duration-150", isOpen && "border-foreground/20")}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors duration-150"
                    onClick={() => {
                      setExpanded(isOpen ? null : report.id);
                    }}
                  >
                    <Icon size={13} className={cn("shrink-0", cfg.class.split(" ")[1])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light truncate">{report.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                        {report.reporter_email} · {report.route} · {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] tracking-widest uppercase font-light shrink-0", cfg.class)}>
                      {cfg.label}
                    </Badge>
                    <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-4 py-4 flex flex-col gap-5 bg-muted/10">
                      {/* Description */}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1.5">Description</p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{report.description}</p>
                      </div>

                      {/* Attachments (images + videos) */}
                      {report.screenshot_urls?.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2">
                            Attachments ({report.screenshot_urls.length})
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {report.screenshot_urls.map((url, i) =>
                              isVideo(url) ? (
                                <div key={i} className="relative group w-48 rounded border border-border overflow-hidden bg-muted">
                                  <video
                                    src={url}
                                    controls
                                    className="w-full max-h-32 object-contain bg-black"
                                  />
                                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setLightbox({ url, type: "video" })}
                                      className="bg-background/80 rounded p-0.5 hover:bg-background transition-colors"
                                    >
                                      <Maximize2 size={11} />
                                    </button>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-background/80 rounded p-0.5 hover:bg-background transition-colors"
                                    >
                                      <ExternalLink size={11} />
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-1 px-2 py-1">
                                    <Video size={10} className="text-muted-foreground shrink-0" />
                                    <span className="text-[9px] text-muted-foreground truncate">Video {i + 1}</span>
                                  </div>
                                </div>
                              ) : (
                                <div key={i} className="group relative cursor-pointer" onClick={() => setLightbox({ url, type: "image" })}>
                                  <img src={url} alt={`attachment ${i + 1}`} className="w-32 h-20 object-cover rounded border border-border group-hover:border-foreground/30 transition-colors" />
                                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/60 rounded">
                                    <Maximize2 size={14} />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Change Status */}
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
                                  report.status === s ? scfg.class + " font-medium" : "border-border text-muted-foreground hover:border-foreground/30"
                                )}
                              >
                                {scfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Admin Notes */}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2">Admin Notes</p>
                        <Textarea
                          value={notes[report.id] || ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                          placeholder="Internal notes about this bug..."
                          className="min-h-[80px] resize-none text-sm"
                        />
                        <div className="flex justify-end mt-2">
                          <Button size="sm" variant="outline" onClick={() => saveNotes(report.id)} disabled={savingNotes === report.id}>
                            {savingNotes === report.id ? <Loader2 size={12} className="animate-spin" /> : "Save Notes"}
                          </Button>
                        </div>
                      </div>

                      {/* Conversation Thread */}
                      <div className="border-t border-border pt-4">
                        <BugReportThread bugReportId={report.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
