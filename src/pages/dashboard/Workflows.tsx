import React, { useState, useMemo } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProjects, createProject, deleteProject, updateProject,
  fetchTaskCountsByProject, fetchAssignedProjects, fetchUserTasks,
  fetchSections, fetchMembers, updateTask, deleteTask,
  WorkflowProject, WorkflowTask,
} from "@/lib/workflow-api";
import { TaskDetailSheet } from "@/components/workflow/TaskDetailSheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus, FolderKanban, Trash2, Calendar, Loader2,
  ListChecks, Archive, UserCheck, FolderOpen, CheckCircle2,
  ClipboardList, Clock, AlertCircle, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const projectColors = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

type FilterTab = "mine" | "assigned" | "completed" | "archived";
type TaskFilterTab = "assigned" | "pending" | "completed" | "archived";
type MainView = "projects" | "tasks";

export default function Workflows() {
  const { user, signOut, photographerId } = useAuth();
  const { t } = useLanguage();
  const wf = t.workflows;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(projectColors[0]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("mine");
  const [mainView, setMainView] = useState<MainView>("projects");
  const [taskFilter, setTaskFilter] = useState<TaskFilterTab>("assigned");
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filterTabs: { key: FilterTab; label: string; icon: typeof FolderOpen }[] = [
    { key: "mine", label: wf.myProjects, icon: FolderOpen },
    { key: "assigned", label: wf.assigned, icon: UserCheck },
    { key: "completed", label: wf.completed, icon: CheckCircle2 },
    { key: "archived", label: wf.archived, icon: Archive },
  ];

  const taskFilterTabs: { key: TaskFilterTab; label: string; icon: typeof Clock }[] = [
    { key: "assigned", label: wf.assigned, icon: UserCheck },
    { key: "pending", label: wf.pending, icon: Clock },
    { key: "completed", label: wf.completed, icon: CheckCircle2 },
    { key: "archived", label: wf.archived, icon: Archive },
  ];

  const priorityConfig: Record<string, { label: string; color: string; icon: typeof Flag }> = {
    urgent: { label: wf.urgent, color: "text-red-500", icon: AlertCircle },
    high: { label: wf.high, color: "text-orange-500", icon: Flag },
    medium: { label: wf.medium, color: "text-amber-500", icon: Flag },
    low: { label: wf.low, color: "text-blue-500", icon: Flag },
  };

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["workflow-projects"],
    queryFn: fetchProjects,
  });

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  const { data: taskCounts = {} } = useQuery({
    queryKey: ["workflow-task-counts", projectIds],
    queryFn: () => fetchTaskCountsByProject(projectIds),
    enabled: projectIds.length > 0,
  });

  const { data: assignedProjectIds = [] } = useQuery({
    queryKey: ["workflow-assigned-projects", user?.id],
    queryFn: () => fetchAssignedProjects(user!.id),
    enabled: !!user,
  });

  const { data: allUserTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["workflow-user-tasks", user?.id],
    queryFn: () => fetchUserTasks(user!.id),
    enabled: !!user && mainView === "tasks",
  });

  const projectMap = useMemo(() => {
    const m: Record<string, WorkflowProject> = {};
    projects.forEach((p) => (m[p.id] = p));
    return m;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    if (!user) return [];
    switch (taskFilter) {
      case "assigned":
        return allUserTasks.filter((t) => t.assignee_id === user.id && t.status !== "done" && t.status !== "archived");
      case "pending":
        return allUserTasks.filter((t) => t.status === "pending");
      case "completed":
        return allUserTasks.filter((t) => t.status === "done");
      case "archived":
        return allUserTasks.filter((t) => t.status === "archived");
      default:
        return allUserTasks;
    }
  }, [allUserTasks, taskFilter, user]);

  const selectedProjectId = selectedTask?.project_id;
  const { data: selectedSections = [] } = useQuery({
    queryKey: ["workflow-sections", selectedProjectId],
    queryFn: () => fetchSections(selectedProjectId!),
    enabled: !!selectedProjectId,
  });
  const { data: selectedMembers = [] } = useQuery({
    queryKey: ["workflow-members", selectedProjectId],
    queryFn: () => fetchMembers(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const filteredProjects = useMemo(() => {
    if (!user) return [];
    switch (activeFilter) {
      case "mine":
        return projects.filter((p) => p.owner_id === user.id && p.status !== "archived" && p.status !== "completed");
      case "assigned":
        return projects.filter((p) => assignedProjectIds.includes(p.id) && p.status !== "archived" && p.status !== "completed");
      case "completed":
        return projects.filter((p) => p.status === "completed");
      case "archived":
        return projects.filter((p) => p.status === "archived");
      default:
        return projects;
    }
  }, [projects, activeFilter, user, assignedProjectIds]);

  const createMut = useMutation({
    mutationFn: () => createProject(newName, newDesc, newColor, user!.id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-projects"] });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      toast.success(wf.projectCreated);
    },
    onError: () => toast.error(wf.errorCreating),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-projects"] });
      toast.success(wf.projectDeleted);
    },
  });

  const archiveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateProject(id, { status } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-projects"] });
      toast.success(wf.statusUpdated);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" /> {wf.completedBadge}</Badge>;
      case "archived":
        return <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground"><Archive className="h-3 w-3" /> {wf.archivedBadge}</Badge>;
      default:
        return null;
    }
  };

  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress": return wf.inProgress;
      case "done": return wf.done;
      case "archived": return wf.archived;
      default: return wf.pending;
    }
  };

  const getTaskStatusVariant = (status: string) => {
    switch (status) {
      case "in_progress": return "default" as const;
      case "done": return "secondary" as const;
      case "archived": return "outline" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{wf.pageTitle}</h2>
                <p className="text-muted-foreground mt-1">{wf.pageSubtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
                  <button
                    onClick={() => setMainView("projects")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      mainView === "projects" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    <FolderKanban className="h-3.5 w-3.5" /> {wf.projectsView}
                  </button>
                  <button
                    onClick={() => setMainView("tasks")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      mainView === "tasks" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> {wf.tasksView}
                  </button>
                </div>
                {mainView === "projects" && (
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" /> {wf.newProject}
                  </Button>
                )}
              </div>
            </div>

            {mainView === "projects" ? (
              <>
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
                  {filterTabs.map((tab) => {
                    const isActive = activeFilter === tab.key;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <FolderKanban className="h-16 w-16 mx-auto text-muted-foreground/40" />
                    <h3 className="text-lg font-semibold">{wf.noProjectsFound}</h3>
                    <p className="text-muted-foreground text-sm">{wf.createFirstProject}</p>
                    {activeFilter === "mine" && (
                      <Button onClick={() => setShowCreate(true)}>
                        <Plus className="h-4 w-4 mr-2" /> {wf.createProject}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((p) => {
                      const count = taskCounts[p.id] || 0;
                      const status = p.status || "active";
                      return (
                        <Card
                          key={p.id}
                          className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden relative"
                          onClick={() => navigate(`/dashboard/workflow/${p.id}`)}
                        >
                          <div className="h-1.5 w-full" style={{ backgroundColor: p.color }} />
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: p.color + "18" }}>
                                  <FolderKanban className="h-5 w-5" style={{ color: p.color }} />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                                  {p.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {status === "active" && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={wf.completed}
                                    onClick={(e) => { e.stopPropagation(); archiveMut.mutate({ id: p.id, status: "completed" }); }}>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  </Button>
                                )}
                                {status === "completed" && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={wf.archived}
                                    onClick={(e) => { e.stopPropagation(); archiveMut.mutate({ id: p.id, status: "archived" }); }}>
                                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                )}
                                {status === "archived" && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={wf.myProjects}
                                    onClick={(e) => { e.stopPropagation(); archiveMut.mutate({ id: p.id, status: "active" }); }}>
                                    <FolderOpen className="h-3.5 w-3.5 text-primary" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); if (confirm(wf.deleteProjectConfirm)) deleteMut.mutate(p.id); }}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <ListChecks className="h-3 w-3" />
                                  {count} {count === 1 ? wf.task : wf.tasks}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(p.updated_at).toLocaleDateString("en-US")}
                                </span>
                              </div>
                              {getStatusBadge(status)}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
                  {taskFilterTabs.map((tab) => {
                    const isActive = taskFilter === tab.key;
                    const Icon = tab.icon;
                    const count = (() => {
                      if (!user) return 0;
                      switch (tab.key) {
                        case "assigned": return allUserTasks.filter((t) => t.assignee_id === user.id && t.status !== "done" && t.status !== "archived").length;
                        case "pending": return allUserTasks.filter((t) => t.status === "pending").length;
                        case "completed": return allUserTasks.filter((t) => t.status === "done").length;
                        case "archived": return allUserTasks.filter((t) => t.status === "archived").length;
                        default: return 0;
                      }
                    })();
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setTaskFilter(tab.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                        {count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-0.5">{count}</Badge>}
                      </button>
                    );
                  })}
                </div>

                {loadingTasks ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/40" />
                    <h3 className="text-lg font-semibold">{wf.noTasksFound}</h3>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="text-left p-3 font-medium">{wf.columnTask}</th>
                            <th className="text-left p-3 font-medium">{wf.columnProject}</th>
                            <th className="text-left p-3 font-medium">{wf.columnStatus}</th>
                            <th className="text-left p-3 font-medium">{wf.columnPriority}</th>
                            <th className="text-left p-3 font-medium">{wf.columnDueDate}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTasks.map((task) => {
                            const pri = priorityConfig[task.priority] || priorityConfig.medium;
                            const project = projectMap[task.project_id];
                            const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                            return (
                              <tr
                                key={task.id}
                                className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => { setSelectedTask(task); setSheetOpen(true); }}
                              >
                                <td className="p-3">
                                  <p className="text-sm font-medium">{task.title}</p>
                                  {task.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>}
                                </td>
                                <td className="p-3">
                                  {project ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                                      <span className="text-xs font-medium truncate max-w-[120px]">{project.name}</span>
                                    </div>
                                  ) : <span className="text-xs text-muted-foreground">—</span>}
                                </td>
                                <td className="p-3">
                                  <Badge variant={getTaskStatusVariant(task.status)} className="text-[10px]">
                                    {getTaskStatusLabel(task.status)}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <span className={`text-xs flex items-center gap-1 ${pri.color}`}>
                                    <pri.icon className="h-3 w-3" /> {pri.label}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {task.due_date ? (
                                    <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                      {new Date(task.due_date).toLocaleDateString("en-US")}
                                    </span>
                                  ) : <span className="text-xs text-muted-foreground">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{wf.newProjectTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{wf.projectName}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={wf.projectNamePlaceholder} />
            </div>
            <div className="space-y-2">
              <Label>{wf.descriptionLabel}</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={wf.descriptionPlaceholder} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{wf.colorLabel}</Label>
              <div className="flex gap-2 flex-wrap">
                {projectColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: c === newColor ? "hsl(var(--foreground))" : "transparent" }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{wf.cancel}</Button>
            <Button onClick={() => createMut.mutate()} disabled={!newName.trim() || createMut.isPending}>
              {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {wf.createBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          sections={selectedSections}
          profileMap={{}}
          members={selectedMembers}
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setSelectedTask(null);
          }}
          onUpdate={async (updates) => {
            await updateTask(selectedTask.id, updates);
            setSelectedTask({ ...selectedTask, ...updates });
            queryClient.invalidateQueries({ queryKey: ["workflow-user-tasks"] });
          }}
          onDelete={async () => {
            await deleteTask(selectedTask.id);
            setSheetOpen(false);
            setSelectedTask(null);
            queryClient.invalidateQueries({ queryKey: ["workflow-user-tasks"] });
            toast.success(wf.taskDeleted);
          }}
        />
      )}
    </SidebarProvider>
  );
}
