import { useState, useRef, useEffect } from "react";
import { Bug, X, Upload, ImageIcon, Loader2, CheckCircle2, Video, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserBugThread } from "@/components/dashboard/UserBugThread";
import { RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MediaFile = { file: File; preview: string; type: "image" | "video" };

type BugReport = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  route: string;
};

export function BugReportDialog({ open, onOpenChange }: BugReportDialogProps) {
  const { user } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const STATUS_LABELS: Record<string, { label: string; class: string }> = {
    open: { label: t.bugReport.statusOpen, class: "bg-destructive/10 text-destructive border-destructive/20" },
    in_progress: { label: t.bugReport.statusInProgress, class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    fixed: { label: t.bugReport.statusFixed, class: "bg-green-500/10 text-green-600 border-green-500/20" },
    wont_fix: { label: t.bugReport.statusWontFix, class: "bg-muted text-muted-foreground border-border" },
  };

  // New report form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // My reports
  const [myReports, setMyReports] = useState<BugReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Unread admin replies
  const [unreadReportIds, setUnreadReportIds] = useState<Set<string>>(new Set());
  const seenKey = user ? `bug_seen_${user.id}` : null;

  const getSeenMap = (): Record<string, string> => {
    if (!seenKey) return {};
    try { return JSON.parse(localStorage.getItem(seenKey) || "{}"); } catch { return {}; }
  };

  const markReportSeen = (reportId: string, lastMsgAt: string) => {
    if (!seenKey) return;
    const map = getSeenMap();
    map[reportId] = lastMsgAt;
    localStorage.setItem(seenKey, JSON.stringify(map));
    setUnreadReportIds((prev) => { const n = new Set(prev); n.delete(reportId); return n; });
  };

  const fetchMyReports = async () => {
    if (!user) return;
    setLoadingReports(true);
    const { data } = await (supabase as any)
      .from("bug_reports")
      .select("id, title, status, created_at, route")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false });
    setMyReports(data || []);
    setLoadingReports(false);

    if (data && data.length > 0) {
      const ids = data.map((r: BugReport) => r.id);
      const { data: msgs } = await (supabase as any)
        .from("bug_report_messages")
        .select("bug_report_id, created_at, is_admin")
        .in("bug_report_id", ids)
        .eq("is_admin", true)
        .order("created_at", { ascending: false });

      if (msgs) {
        const seenMap = getSeenMap();
        const unread = new Set<string>();
        const latestByReport: Record<string, string> = {};
        for (const msg of msgs) {
          if (!latestByReport[msg.bug_report_id]) {
            latestByReport[msg.bug_report_id] = msg.created_at;
          }
        }
        for (const [reportId, latestAt] of Object.entries(latestByReport)) {
          const seenAt = seenMap[reportId];
          if (!seenAt || seenAt < latestAt) unread.add(reportId);
        }
        setUnreadReportIds(unread);
      }
    }
  };

  useEffect(() => {
    if (!open || !user) return;
    const channel: RealtimeChannel = (supabase as any)
      .channel(`bug-msgs-user-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bug_report_messages", filter: `is_admin=eq.true` },
        (payload: any) => {
          const reportId = payload.new?.bug_report_id;
          const createdAt = payload.new?.created_at;
          if (!reportId || !createdAt) return;
          setExpandedReport((expanded) => {
            if (expanded !== reportId) {
              setUnreadReportIds((prev) => new Set([...prev, reportId]));
            } else {
              markReportSeen(reportId, createdAt);
            }
            return expanded;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, user]);

  useEffect(() => {
    if (open) fetchMyReports();
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newItems: MediaFile[] = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      type: f.type.startsWith("video/") ? "video" : "image",
    }));
    setMediaFiles((prev) => [...prev, ...newItems].slice(0, 5));
    e.target.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadMedia = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const item of mediaFiles) {
      const ext = item.file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("bug-screenshots")
        .upload(path, item.file, { contentType: item.file.type });
      if (!error) {
        const { data } = supabase.storage.from("bug-screenshots").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error(t.bugReport.fillRequired);
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      const mediaUrls = await uploadMedia();
      const { error } = await (supabase as any).from("bug_reports").insert({
        reporter_id: user.id,
        reporter_email: user.email ?? "",
        title: title.trim(),
        description: description.trim(),
        screenshot_urls: mediaUrls,
        route: location.pathname,
        status: "open",
      });
      if (error) throw error;

      setSuccess(true);
      await fetchMyReports();
      setTimeout(() => {
        setSuccess(false);
        setTitle("");
        setDescription("");
        setMediaFiles([]);
      }, 2000);
    } catch {
      toast.error(t.bugReport.failedSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  const br = t.bugReport;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-medium tracking-wide uppercase">
            <Bug size={15} className="text-muted-foreground" />
            {br.dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="new">
          <TabsList className="w-full mb-2">
            <TabsTrigger value="new" className="flex-1 text-xs uppercase tracking-widest">{br.tabNew}</TabsTrigger>
            <TabsTrigger value="my" className="flex-1 text-xs uppercase tracking-widest relative">
              {br.tabMy}
              {myReports.length > 0 && (
                <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] rounded-full px-1.5 py-0.5">{myReports.length}</span>
              )}
              {unreadReportIds.size > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── New Report ── */}
          <TabsContent value="new">
            {success ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <CheckCircle2 size={36} className="text-primary" />
                <p className="text-sm text-foreground font-medium">{br.successTitle}</p>
                <p className="text-xs text-muted-foreground">{br.successDesc}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60 font-light">
                  {br.pageLabel} <span className="text-muted-foreground">{location.pathname}</span>
                </p>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs uppercase tracking-widest font-light">{br.titleLabel}</Label>
                  <Input
                    placeholder={br.titlePlaceholder}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs uppercase tracking-widest font-light">{br.descriptionLabel}</Label>
                  <Textarea
                    placeholder={br.descriptionPlaceholder}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[110px] resize-none"
                    maxLength={2000}
                  />
                </div>

                {/* Media attachments */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs uppercase tracking-widest font-light">
                    {br.attachmentsLabel}{" "}
                    <span className="text-muted-foreground/50 normal-case tracking-normal">({br.attachmentsHint})</span>
                  </Label>

                  {mediaFiles.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {mediaFiles.map((item, i) => (
                        <div key={i} className="relative group w-24 h-16 rounded border border-border overflow-hidden bg-muted">
                          {item.type === "image" ? (
                            <img src={item.preview} alt={`attachment ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <Video size={16} className="text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground truncate max-w-[80px] px-1">{item.file.name}</span>
                            </div>
                          )}
                          <button
                            onClick={() => removeMedia(i)}
                            className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {mediaFiles.length < 5 && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "flex items-center gap-2 w-full border border-dashed border-border rounded-md py-3 px-4",
                          "text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors duration-200"
                        )}
                      >
                        <Upload size={13} />
                        <span>{br.uploadHint}</span>
                        <div className="ml-auto flex items-center gap-1 opacity-40">
                          <ImageIcon size={12} />
                          <Video size={12} />
                        </div>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
                    {br.cancel}
                  </Button>
                  <Button size="sm" onClick={handleSubmit} disabled={submitting || !title.trim() || !description.trim()}>
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : br.submitReport}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── My Reports ── */}
          <TabsContent value="my">
            {loadingReports ? (
              <div className="flex justify-center py-8">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : myReports.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                <Bug size={22} className="opacity-30" />
                <p className="text-sm">{br.noReportsYet}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Status filter */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { value: "all", label: br.filterAll },
                    { value: "open", label: br.filterOpen },
                    { value: "in_progress", label: br.filterInProgress },
                    { value: "fixed", label: br.filterFixed },
                    { value: "wont_fix", label: br.filterWontFix },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      className={cn(
                        "text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm border transition-colors duration-200",
                        statusFilter === opt.value
                          ? "bg-foreground text-background border-foreground"
                          : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {myReports
                  .filter((r) => statusFilter === "all" || r.status === statusFilter)
                  .map((report) => {
                  const scfg = STATUS_LABELS[report.status] || STATUS_LABELS.open;
                  const isExpanded = expandedReport === report.id;
                  const hasUnread = unreadReportIds.has(report.id);
                  return (
                    <div key={report.id} className={cn("border border-border rounded-md overflow-hidden", isExpanded && "border-foreground/20")}>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => {
                          const next = isExpanded ? null : report.id;
                          setExpandedReport(next);
                          if (next && hasUnread) markReportSeen(report.id, new Date().toISOString());
                        }}
                      >
                        <div className="relative shrink-0">
                          <MessageSquare size={12} className="text-muted-foreground" />
                          {hasUnread && (
                            <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm truncate", hasUnread ? "font-medium" : "font-light")}>{report.title}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {new Date(report.created_at).toLocaleDateString()}
                            {hasUnread && <span className="ml-2 text-destructive">• {br.newReply}</span>}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] tracking-widest uppercase font-light shrink-0", scfg.class)}>
                          {scfg.label}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp size={13} className="text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-3 py-3 bg-muted/10">
                          <UserBugThread bugReportId={report.id} />
                          {(report.status === "fixed" || report.status === "wont_fix") && (
                            <div className="flex justify-end mt-3 pt-2 border-t border-border">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1.5"
                                onClick={async () => {
                                  const { error } = await (supabase as any)
                                    .from("bug_reports")
                                    .update({ status: "open" })
                                    .eq("id", report.id);
                                  if (error) {
                                    toast.error(br.failedReopen);
                                    return;
                                  }
                                  setMyReports((prev) =>
                                    prev.map((r) => (r.id === report.id ? { ...r, status: "open" } : r))
                                  );
                                  toast.success(br.reportReopened);
                                }}
                              >
                                <RotateCcw size={12} />
                                {br.reopen}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
