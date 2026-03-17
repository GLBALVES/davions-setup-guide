import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSections, fetchTasks, createTask, updateTask, deleteTask,
  fetchMembers, logActivity, WorkflowSection, WorkflowTask,
} from "@/lib/workflow-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, LayoutGrid, List, Calendar, Loader2, Flag, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { TaskDetailSheet } from "@/components/workflow/TaskDetailSheet";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  DragStartEvent, DragEndEvent, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const sectionToStatusMap: Record<string, string> = {
  "to do": "pending",
  "in progress": "in_progress",
  "in review": "in_progress",
  "done": "done",
};

function getStatusForSection(sectionName: string): string {
  return sectionToStatusMap[sectionName.toLowerCase().trim()] || "pending";
}

function DroppableColumn({ sectionId, children }: { sectionId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `section-${sectionId}`, data: { sectionId } });
  return (
    <div ref={setNodeRef} className={`space-y-2 px-2 pb-1 min-h-[60px] rounded-lg transition-colors ${isOver ? "bg-primary/5" : ""}`}>
      {children}
    </div>
  );
}

function SortableTaskCard({ task, children }: { task: WorkflowTask; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task, sectionId: task.section_id },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function WorkflowProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const wp = t.workflowProject;
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [projectName, setProjectName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const priorityConfig: Record<string, { label: string; color: string; icon: typeof Flag }> = {
    urgent: { label: wp.urgent, color: "text-red-500", icon: AlertCircle },
    high: { label: wp.high, color: "text-orange-500", icon: Flag },
    medium: { label: wp.medium, color: "text-amber-500", icon: Flag },
    low: { label: wp.low, color: "text-blue-500", icon: Flag },
  };

  const statusConfig: Record<string, { label: string; dotColor: string }> = {
    pending: { label: wp.pending, dotColor: "bg-amber-400" },
    in_progress: { label: wp.inProgress, dotColor: "bg-blue-500" },
    done: { label: wp.done, dotColor: "bg-emerald-500" },
    archived: { label: wp.archivedStatus, dotColor: "bg-muted-foreground" },
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!projectId) return;
    supabase.from("workflow_projects" as any).select("name").eq("id", projectId).single()
      .then(({ data }) => setProjectName((data as any)?.name || "Project"));
  }, [projectId]);

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ["workflow-sections", projectId],
    queryFn: () => fetchSections(projectId!),
    enabled: !!projectId,
  });

  const { data: allTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["workflow-tasks", projectId],
    queryFn: () => fetchTasks(projectId!),
    enabled: !!projectId,
  });

  const tasks = allTasks;

  const { data: members = [] } = useQuery({
    queryKey: ["workflow-members", projectId],
    queryFn: () => fetchMembers(projectId!),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`workflow-tasks-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_tasks", filter: `project_id=eq.${projectId}` },
        () => queryClient.invalidateQueries({ queryKey: ["workflow-tasks", projectId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  const createTaskMut = useMutation({
    mutationFn: (params: { sectionId: string; title: string }) =>
      createTask({
        project_id: projectId!,
        section_id: params.sectionId,
        title: params.title,
        created_by: user!.id,
        photographer_id: user!.id,
        position: tasks.filter((t) => t.section_id === params.sectionId).length,
      }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-tasks", projectId] });
      logActivity(task.id, user!.id, "created the task");
      toast.success(wp.taskCreated);
    },
  });

  const updateTaskMut = useMutation({
    mutationFn: ({ id, ...updates }: Partial<WorkflowTask> & { id: string }) => updateTask(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-tasks", projectId] }),
  });

  const deleteTaskMut = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-tasks", projectId] });
      setSelectedTask(null);
      toast.success(wp.taskDeleted);
    },
  });

  const handleAddTask = (sectionId: string) => {
    const title = (newTaskTitle[sectionId] || "").trim();
    if (!title) return;
    createTaskMut.mutate({ sectionId, title });
    setNewTaskTitle((prev) => ({ ...prev, [sectionId]: "" }));
  };

  const moveTask = (task: WorkflowTask, newSectionId: string) => {
    const section = sections.find((s) => s.id === newSectionId);
    const newStatus = section ? getStatusForSection(section.name) : task.status;
    updateTaskMut.mutate({ id: task.id, section_id: newSectionId, status: newStatus } as any);
    logActivity(task.id, user!.id, "moved the task", { to_section: newSectionId });
  };

  const handleMoveToProject = async (taskId: string, newProjectId: string, newSectionId: string) => {
    const { error } = await supabase
      .from("workflow_tasks" as any)
      .update({ project_id: newProjectId, section_id: newSectionId } as any)
      .eq("id", taskId);
    if (error) { toast.error(wp.errorMovingTask + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["workflow-tasks", projectId] });
    setSelectedTask(null);
    toast.success(wp.taskMovedProject);
  };

  const isLoading = loadingSections || loadingTasks;
  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId) || null, [tasks, activeId]);

  const handleDragStart = useCallback((event: DragStartEvent) => { setActiveId(event.active.id as string); }, []);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    let targetSectionId: string | null = null;
    if ((over.id as string).startsWith("section-")) {
      targetSectionId = over.data?.current?.sectionId || (over.id as string).replace("section-", "");
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetSectionId = overTask.section_id;
    }
    if (targetSectionId && targetSectionId !== task.section_id) {
      moveTask(task, targetSectionId);
    }
  }, [tasks]);

  const TaskCardContent = ({ task }: { task: WorkflowTask }) => {
    const pri = priorityConfig[task.priority] || priorityConfig.medium;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
    const st = statusConfig[task.status] || statusConfig.pending;

    return (
      <div
        className="bg-card border border-border rounded-lg p-3 space-y-2.5 cursor-grab hover:shadow-md hover:border-primary/30 transition-all active:cursor-grabbing"
        onClick={() => setSelectedTask(task)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
          <pri.icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${pri.color}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
          <span className="text-[10px] text-muted-foreground font-medium">{st.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {task.due_date && (
            <span className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
              <Calendar className="h-2.5 w-2.5" />
              {new Date(task.due_date).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
            </span>
          )}
          {task.department && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {task.department}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/workflow")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-bold tracking-tight">{projectName}</h2>
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                <TabsList className="h-9">
                  <TabsTrigger value="kanban" className="text-xs gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5" /> {wp.kanban}
                  </TabsTrigger>
                  <TabsTrigger value="list" className="text-xs gap-1.5">
                    <List className="h-3.5 w-3.5" /> {wp.list}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : view === "kanban" ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={() => {}}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {sections.map((section) => {
                    const sectionTasks = tasks.filter((t) => t.section_id === section.id);
                    const taskIds = sectionTasks.map((t) => t.id);
                    return (
                      <div key={section.id} className="flex-shrink-0 w-[280px]">
                        <div className="bg-muted/40 rounded-xl border border-border/50 space-y-3 min-h-[200px]">
                          <div className="flex items-center justify-between px-3 pt-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.name}</h4>
                            </div>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold">{sectionTasks.length}</Badge>
                          </div>
                          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                            <DroppableColumn sectionId={section.id}>
                              {sectionTasks.map((task) => (
                                <SortableTaskCard key={task.id} task={task}>
                                  <TaskCardContent task={task} />
                                </SortableTaskCard>
                              ))}
                            </DroppableColumn>
                          </SortableContext>
                          <div className="flex gap-1.5 px-2 pb-3">
                            <Input
                              placeholder={wp.newTaskPlaceholder}
                              className="h-8 text-xs bg-background/60"
                              value={newTaskTitle[section.id] || ""}
                              onChange={(e) => setNewTaskTitle((prev) => ({ ...prev, [section.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && handleAddTask(section.id)}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => handleAddTask(section.id)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <DragOverlay>
                  {activeTask ? (
                    <div className="w-[260px] opacity-90 rotate-2">
                      <TaskCardContent task={activeTask} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left p-3 font-medium">{wp.columnTask}</th>
                        <th className="text-left p-3 font-medium">{wp.columnSection}</th>
                        <th className="text-left p-3 font-medium">{wp.columnPriority}</th>
                        <th className="text-left p-3 font-medium">{wp.columnDueDate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">{wp.noTasks}</td></tr>
                      ) : (
                        tasks.map((task) => {
                          const pri = priorityConfig[task.priority] || priorityConfig.medium;
                          const section = sections.find((s) => s.id === task.section_id);
                          const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                          return (
                            <tr
                              key={task.id}
                              className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => setSelectedTask(task)}
                            >
                              <td className="p-3 text-sm font-medium">{task.title}</td>
                              <td className="p-3 text-xs text-muted-foreground">{section?.name || "—"}</td>
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
                        })
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          sections={sections}
          profileMap={{}}
          members={members}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdate={(updates) => {
            updateTaskMut.mutate({ id: selectedTask.id, ...updates } as any);
            setSelectedTask({ ...selectedTask, ...updates });
          }}
          onDelete={() => deleteTaskMut.mutate(selectedTask.id)}
          onMoveToProject={handleMoveToProject}
        />
      )}
    </SidebarProvider>
  );
}
