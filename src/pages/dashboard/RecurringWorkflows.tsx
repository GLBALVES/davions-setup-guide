import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Play, Pause, Edit, Copy, Plus, CheckCircle2, AlertTriangle, Clock, TrendingUp, TrendingDown, Timer, Trash2 } from "lucide-react";
import {
  RecurringTask, TaskOccurrence,
  fetchRecurringTasks, createRecurringTask, updateRecurringTask, deleteRecurringTask,
  duplicateRecurringTask, fetchOccurrences, completeOccurrence, markOverdue,
  startTask, pauseTask, computeMetrics,
} from "@/lib/recurring-tasks";
import { useAuth } from "@/contexts/AuthContext";

const FREQ_LABELS: Record<string, string> = { daily: "Daily", weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly", quarterly: "Quarterly", semiannual: "Semiannual", yearly: "Yearly" };
const DEPARTMENT_OPTIONS = ["Operations", "Finance", "Sales", "HR", "IT", "Marketing", "Logistics", "Admin"];
const STATE_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/20 text-primary",
  paused: "bg-amber-500/20 text-amber-600",
};
const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  overdue: { label: "Overdue", className: "bg-destructive/20 text-destructive" },
  completed_on_time: { label: "On Time", className: "bg-primary/20 text-primary" },
  completed_late: { label: "Late (done)", className: "bg-amber-500/20 text-amber-600" },
};
const DAYS_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function RecurringWorkflows() {
  const { user, signOut, photographerId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("tasks");
  const [editTask, setEditTask] = useState<Partial<RecurringTask> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedOcc, setSelectedOcc] = useState<TaskOccurrence | null>(null);
  const [completeMinutes, setCompleteMinutes] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [occFilter, setOccFilter] = useState("all");
  const [occFrom, setOccFrom] = useState("");
  const [occTo, setOccTo] = useState("");
  const [occDept, setOccDept] = useState("");

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["recurring-tasks", photographerId],
    queryFn: () => fetchRecurringTasks(photographerId!),
    enabled: !!photographerId,
  });

  const { data: allOccurrences = [] } = useQuery({
    queryKey: ["task-occurrences-all"],
    queryFn: () => fetchOccurrences({}),
  });

  const occFilters = useMemo(() => {
    const f: any = {};
    const today = new Date().toISOString().split("T")[0];
    if (occFilter === "today") { f.from = today; f.to = today; }
    else if (occFilter === "overdue") f.status = "overdue";
    else if (occFilter === "on_time") f.status = "completed_on_time";
    else if (occFilter === "late") f.status = "completed_late";
    if (occFrom && occFilter !== "today") f.from = occFrom;
    if (occTo && occFilter !== "today") f.to = occTo;
    if (occDept) f.department = occDept;
    return f;
  }, [occFilter, occFrom, occTo, occDept]);

  const { data: occurrences = [], isLoading: occLoading } = useQuery({
    queryKey: ["task-occurrences", occFilters],
    queryFn: () => fetchOccurrences(occFilters),
  });

  const taskMetrics = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeMetrics>> = {};
    for (const t of tasks) {
      const taskOccs = allOccurrences.filter(o => o.recurring_task_id === t.id);
      map[t.id] = computeMetrics(taskOccs);
    }
    return map;
  }, [tasks, allOccurrences]);

  const dashMetrics = useMemo(() => {
    const today = new Date();
    const thirtyAgo = new Date(today);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const thirtyAgoStr = thirtyAgo.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];
    const recent = allOccurrences.filter(o => o.due_date >= thirtyAgoStr && o.due_date <= todayStr);
    const metrics = computeMetrics(recent);
    const pendingToday = allOccurrences.filter(o => o.due_date === todayStr && (o.status === "pending" || o.status === "overdue")).length;
    return { ...metrics, pendingToday };
  }, [allOccurrences]);

  const topOverdue = useMemo(() => {
    return tasks
      .map(t => ({ task: t, overdue: taskMetrics[t.id]?.overdueOpen ?? 0 }))
      .filter(t => t.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 5);
  }, [tasks, taskMetrics]);

  const departments = useMemo(() => [...new Set(tasks.map(t => t.department).filter(Boolean))], [tasks]);

  const saveMut = useMutation({
    mutationFn: async (t: Partial<RecurringTask>) => {
      if (t.id) {
        await updateRecurringTask(t.id, t);
      } else {
        await createRecurringTask({ ...t, user_id: user!.id, photographer_id: user!.id } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-tasks"] });
      setEditOpen(false);
      toast.success("Task saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startMut = useMutation({
    mutationFn: (t: RecurringTask) => startTask(t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-tasks"] });
      qc.invalidateQueries({ queryKey: ["task-occurrences"] });
      toast.success("Task started!");
    },
  });

  const pauseMut = useMutation({
    mutationFn: (id: string) => pauseTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-tasks"] });
      toast.success("Task paused!");
    },
  });

  const dupMut = useMutation({
    mutationFn: (t: RecurringTask) => duplicateRecurringTask(t, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-tasks"] });
      toast.success("Task duplicated!");
    },
  });

  const completeMut = useMutation({
    mutationFn: async () => {
      if (!selectedOcc) return;
      await completeOccurrence(selectedOcc.id, parseInt(completeMinutes) || 0, completeNotes, selectedOcc.due_date);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-occurrences"] });
      qc.invalidateQueries({ queryKey: ["task-occurrences-all"] });
      setCompleteOpen(false);
      setSelectedOcc(null);
      setCompleteMinutes("");
      setCompleteNotes("");
      toast.success("Occurrence completed!");
    },
  });

  function openNewTask() {
    setEditTask({
      title: "", department: "", owner_name: "", notes: "",
      start_date: new Date().toISOString().split("T")[0],
      schedule_freq: "daily", schedule_interval: 1,
      schedule_days_of_week: [], schedule_day_of_month: 1,
      avoid_weekends: false, weekend_policy: "next_business_day",
      estimated_minutes: 0, repeat_count: null, display_order: 0,
    });
    setEditOpen(true);
  }

  function openEditTask(t: RecurringTask) {
    setEditTask({ ...t });
    setEditOpen(true);
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 space-y-6">
            <h1 className="text-2xl font-bold">Recurring Workflows</h1>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="tasks">Recurring Tasks</TabsTrigger>
                <TabsTrigger value="executions">Executions</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={openNewTask}><Plus className="h-4 w-4 mr-1" />New Task</Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Active</TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead className="text-center">Exec.</TableHead>
                          <TableHead className="text-center">Overdue</TableHead>
                          <TableHead className="text-center">% On Time</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.map(t => {
                          const m = taskMetrics[t.id] || { totalExecuted: 0, overdueOpen: 0, onTimeRate: 0, lateRate: 0, avgMinutes: 0 };
                          return (
                            <TableRow key={t.id} className={!t.enabled ? "opacity-60" : ""}>
                              <TableCell className="text-center">
                                <Switch
                                  checked={t.enabled}
                                  onCheckedChange={async (checked) => {
                                    await updateRecurringTask(t.id, { enabled: checked } as any);
                                    qc.invalidateQueries({ queryKey: ["recurring-tasks"] });
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{t.title}</TableCell>
                              <TableCell>{t.department || "—"}</TableCell>
                              <TableCell>{t.owner_name || "—"}</TableCell>
                              <TableCell>{FREQ_LABELS[t.schedule_freq]} {t.schedule_interval > 1 ? `(every ${t.schedule_interval})` : ""}</TableCell>
                              <TableCell>{t.start_date}</TableCell>
                              <TableCell><Badge className={STATE_COLORS[t.state]}>{t.state === "draft" ? "Draft" : t.state === "active" ? "Active" : "Paused"}</Badge></TableCell>
                              <TableCell className="text-center">{m.totalExecuted}</TableCell>
                              <TableCell className="text-center">{m.overdueOpen > 0 ? <span className="text-destructive font-bold">{m.overdueOpen}</span> : 0}</TableCell>
                              <TableCell className="text-center">{m.onTimeRate}%</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {(t.state === "draft" || t.state === "paused") && (
                                    <Button variant="ghost" size="icon" onClick={() => startMut.mutate(t)} title="Start">
                                      <Play className="h-4 w-4 text-primary" />
                                    </Button>
                                  )}
                                  {t.state === "active" && (
                                    <Button variant="ghost" size="icon" onClick={() => pauseMut.mutate(t.id)} title="Pause">
                                      <Pause className="h-4 w-4 text-amber-500" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => openEditTask(t)} title="Edit"><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => dupMut.mutate(t)} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {tasks.length === 0 && !tasksLoading && (
                          <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No recurring tasks created</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="executions" className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <Label className="text-xs">Quick Filter</Label>
                        <Select value={occFilter} onValueChange={setOccFilter}>
                          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="on_time">On Time</SelectItem>
                            <SelectItem value="late">Late (done)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input type="date" value={occFrom} onChange={e => setOccFrom(e.target.value)} className="w-[150px]" />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input type="date" value={occTo} onChange={e => setOccTo(e.target.value)} className="w-[150px]" />
                      </div>
                      {departments.length > 0 && (
                        <div>
                          <Label className="text-xs">Department</Label>
                          <Select value={occDept || "__all__"} onValueChange={v => setOccDept(v === "__all__" ? "" : v)}>
                            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All</SelectItem>
                              {departments.map(d => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Completed At</TableHead>
                          <TableHead className="text-center">Actual Time</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {occurrences.map(o => {
                          const rt = o.recurring_task;
                          const sb = STATUS_BADGES[o.status];
                          return (
                            <TableRow key={o.id}>
                              <TableCell className="font-medium">{rt?.title || "—"}</TableCell>
                              <TableCell>{rt?.department || "—"}</TableCell>
                              <TableCell>{rt?.owner_name || "—"}</TableCell>
                              <TableCell>{o.due_date}</TableCell>
                              <TableCell><Badge className={sb?.className}>{sb?.label}</Badge></TableCell>
                              <TableCell>{o.completed_at ? new Date(o.completed_at).toLocaleString("en-US") : "—"}</TableCell>
                              <TableCell className="text-center">{o.actual_minutes != null ? `${o.actual_minutes}min` : "—"}</TableCell>
                              <TableCell>
                                {(o.status === "pending" || o.status === "overdue") && (
                                  <Button size="sm" variant="outline" onClick={() => { setSelectedOcc(o); setCompleteOpen(true); }}>
                                    <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {occurrences.length === 0 && !occLoading && (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No occurrences found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Today</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{dashMetrics.pendingToday}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open Overdue</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-destructive">{dashMetrics.overdueOpen}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" /> % On Time (30d)</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-primary">{dashMetrics.onTimeRate}%</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingDown className="h-4 w-4" /> % Late (30d)</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-amber-500">{dashMetrics.lateRate}%</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Timer className="h-4 w-4" /> Avg. Time (30d)</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{dashMetrics.avgMinutes > 0 ? `${dashMetrics.avgMinutes}min` : "—"}</div></CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Top Overdue Tasks</CardTitle></CardHeader>
                    <CardContent>
                      {topOverdue.length === 0 ? <p className="text-muted-foreground text-sm">No overdue tasks</p> : (
                        <div className="space-y-2">
                          {topOverdue.map(({ task, overdue }) => (
                            <div key={task.id} className="flex justify-between items-center">
                              <span className="text-sm">{task.title}</span>
                              <Badge variant="destructive">{overdue}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editTask?.id ? "Edit Task" : "New Recurring Task"}</DialogTitle>
                </DialogHeader>
                {editTask && (
                  <div className="space-y-4">
                    <div>
                      <Label>Task *</Label>
                      <Input value={editTask.title || ""} onChange={e => setEditTask({ ...editTask, title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Department</Label>
                        <Select value={editTask.department || ""} onValueChange={v => setEditTask({ ...editTask, department: v })}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {DEPARTMENT_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Owner</Label>
                        <Input value={editTask.owner_name || ""} onChange={e => setEditTask({ ...editTask, owner_name: e.target.value })} placeholder="Owner name" />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={editTask.notes || ""} onChange={e => setEditTask({ ...editTask, notes: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start date *</Label>
                        <Input type="date" value={editTask.start_date || ""} onChange={e => setEditTask({ ...editTask, start_date: e.target.value })} />
                      </div>
                      <div>
                        <Label>Estimated time (min)</Label>
                        <Input type="number" value={editTask.estimated_minutes ?? 0} onChange={e => setEditTask({ ...editTask, estimated_minutes: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Repeat count</Label>
                        <Input type="number" min={1} placeholder="Unlimited" value={editTask.repeat_count ?? ""} onChange={e => setEditTask({ ...editTask, repeat_count: e.target.value ? parseInt(e.target.value) || null : null })} />
                        <p className="text-[11px] text-muted-foreground mt-1">Leave empty for unlimited</p>
                      </div>
                      <div>
                        <Label>Display order</Label>
                        <Input type="number" min={0} value={editTask.display_order ?? 0} onChange={e => setEditTask({ ...editTask, display_order: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Frequency</Label>
                        <Select value={editTask.schedule_freq || "daily"} onValueChange={v => setEditTask({ ...editTask, schedule_freq: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Biweekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semiannual">Semiannual</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(editTask.schedule_freq === "daily" || editTask.schedule_freq === "weekly" || editTask.schedule_freq === "monthly") && (
                        <div>
                          <Label>Interval</Label>
                          <Input type="number" min={1} value={editTask.schedule_interval ?? 1} onChange={e => setEditTask({ ...editTask, schedule_interval: parseInt(e.target.value) || 1 })} />
                        </div>
                      )}
                    </div>

                    {editTask.schedule_freq === "weekly" && (
                      <div>
                        <Label>Days of week</Label>
                        <div className="flex gap-3 mt-1">
                          {[1, 2, 3, 4, 5, 6, 7].map(d => (
                            <label key={d} className="flex items-center gap-1 text-sm">
                              <Checkbox
                                checked={(editTask.schedule_days_of_week ?? []).includes(d)}
                                onCheckedChange={checked => {
                                  const curr = editTask.schedule_days_of_week ?? [];
                                  setEditTask({
                                    ...editTask,
                                    schedule_days_of_week: checked ? [...curr, d] : curr.filter(x => x !== d),
                                  });
                                }}
                              />
                              {DAYS_LABELS[d]}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {["monthly", "quarterly", "semiannual", "yearly"].includes(editTask.schedule_freq || "") && (
                      <div>
                        <Label>Day of month</Label>
                        <Input type="number" min={1} max={31} value={editTask.schedule_day_of_month ?? 1} onChange={e => setEditTask({ ...editTask, schedule_day_of_month: parseInt(e.target.value) || 1 })} />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editTask.avoid_weekends ?? false}
                        onCheckedChange={c => setEditTask({ ...editTask, avoid_weekends: c })}
                      />
                      <Label>Avoid weekends</Label>
                    </div>

                    {editTask.avoid_weekends && (
                      <div>
                        <Label>Weekend policy</Label>
                        <Select value={editTask.weekend_policy || "next_business_day"} onValueChange={v => setEditTask({ ...editTask, weekend_policy: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="next_business_day">Next business day</SelectItem>
                            <SelectItem value="previous_business_day">Previous business day</SelectItem>
                            <SelectItem value="skip">Skip</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                <DialogFooter className="flex !justify-between">
                  {editTask?.id && (
                    <Button variant="destructive" onClick={async () => {
                      if (!confirm("Delete this task and all its occurrences?")) return;
                      await deleteRecurringTask(editTask.id!);
                      qc.invalidateQueries({ queryKey: ["recurring-tasks"] });
                      qc.invalidateQueries({ queryKey: ["task-occurrences"] });
                      setEditOpen(false);
                      toast.success("Task deleted!");
                    }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={() => editTask && saveMut.mutate(editTask)} disabled={!editTask?.title || !editTask?.start_date}>
                      Save
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Complete Occurrence</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Task: <strong>{selectedOcc?.recurring_task?.title}</strong> — Due: <strong>{selectedOcc?.due_date}</strong>
                  </p>
                  <div>
                    <Label>Actual duration (minutes)</Label>
                    <Input type="number" value={completeMinutes} onChange={e => setCompleteMinutes(e.target.value)} placeholder="E.g.: 30" />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} placeholder="Execution details..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
                  <Button onClick={() => completeMut.mutate()}>Complete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
