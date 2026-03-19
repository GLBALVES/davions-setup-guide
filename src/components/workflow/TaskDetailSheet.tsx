import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Trash2, Send, Flag, Calendar, User, MessageSquare, Activity,
  Clock, Loader2, X, Building2, ArrowRightLeft,
} from "lucide-react";
import {
  WorkflowTask, WorkflowSection, WorkflowMember, WorkflowProject,
  fetchComments, addComment, fetchActivity, logActivity,
  WorkflowComment, WorkflowActivity, fetchProjects, fetchSections as fetchSectionsApi,
} from "@/lib/workflow-api";

interface Props {
  task: WorkflowTask;
  sections: WorkflowSection[];
  profileMap: Record<string, { full_name: string | null }>;
  members: WorkflowMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<WorkflowTask>) => void;
  onDelete: () => void;
  onMoveToProject?: (taskId: string, newProjectId: string, newSectionId: string) => void;
}

const priorityOptions = [
  { value: "urgent", label: "Urgent", color: "text-red-500" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "medium", label: "Medium", color: "text-amber-500" },
  { value: "low", label: "Low", color: "text-blue-500" },
];

const departmentOptions = [
  "Operations", "Finance", "Sales", "HR", "IT", "Marketing", "Logistics", "Admin",
];

export function TaskDetailSheet({ task, sections, profileMap, members, open, onOpenChange, onUpdate, onDelete, onMoveToProject }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [activities, setActivities] = useState<WorkflowActivity[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const [sending, setSending] = useState(false);
  const [allProjects, setAllProjects] = useState<WorkflowProject[]>([]);
  const [targetProjectSections, setTargetProjectSections] = useState<WorkflowSection[]>([]);
  const [selectedTargetProject, setSelectedTargetProject] = useState<string>("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setSelectedTargetProject("");
    setTargetProjectSections([]);
    loadData();
  }, [task.id]);

  useEffect(() => {
    if (!onMoveToProject) return;
    if (!task.photographer_id) return;
    fetchProjects(task.photographer_id).then((p) => {
      setAllProjects(p.filter((proj) => proj.id !== task.project_id));
    }).catch(() => {});
  }, [task.project_id, task.photographer_id, onMoveToProject]);

  useEffect(() => {
    if (!selectedTargetProject) { setTargetProjectSections([]); return; }
    fetchSectionsApi(selectedTargetProject).then(setTargetProjectSections);
  }, [selectedTargetProject]);

  const loadData = async () => {
    setLoadingComments(true);
    const [c, a] = await Promise.all([fetchComments(task.id), fetchActivity(task.id)]);
    setComments(c);
    setActivities(a);
    setLoadingComments(false);
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdate({ title });
      logActivity(task.id, user!.id, "renamed the task");
    }
  };

  const handleDescBlur = () => {
    if (description !== (task.description || "")) {
      onUpdate({ description });
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    const comment = await addComment(task.id, user!.id, newComment);
    setComments((prev) => [...prev, comment]);
    await logActivity(task.id, user!.id, "commented");
    setNewComment("");
    setSending(false);
  };

  const getInitials = (name: string | null) =>
    (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return date.toLocaleDateString("en-US");
  };

  const creator = profileMap[task.created_by];

  const sectionToStatusMap: Record<string, string> = {
    "to do": "pending",
    "in progress": "in_progress",
    "in review": "in_progress",
    "done": "done",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 pr-12">
          <SheetTitle className="text-sm font-medium text-muted-foreground">Task Details</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 space-y-5 pb-6">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 shadow-none h-auto"
            />

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">{getInitials(creator?.full_name || null)}</AvatarFallback>
                </Avatar>
                <span>Created by <span className="font-medium text-foreground">{creator?.full_name || "Unknown"}</span></span>
              </div>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(task.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Add a detailed description..."
                rows={6}
                className="resize-none"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h4>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Section / Status
                  </Label>
                  <Select value={task.section_id} onValueChange={(v) => {
                    const section = sections.find((s) => s.id === v);
                    const newStatus = section ? (sectionToStatusMap[section.name.toLowerCase().trim()] || "pending") : task.status;
                    onUpdate({ section_id: v, status: newStatus } as any);
                    logActivity(task.id, user!.id, "moved the task", { to_section: v });
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Flag className="h-3 w-3" /> Priority
                  </Label>
                  <Select value={task.priority} onValueChange={(v) => {
                    onUpdate({ priority: v });
                    logActivity(task.id, user!.id, "changed priority", { to: v });
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-xs">
                          <span className={p.color}>{p.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Due Date
                  </Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={task.due_date || ""}
                    onChange={(e) => onUpdate({ due_date: e.target.value || null })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Department
                  </Label>
                  <Select
                    value={(task as any).department || "none"}
                    onValueChange={(v) => {
                      const val = v === "none" ? null : v;
                      onUpdate({ department: val } as any);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-muted-foreground">None</SelectItem>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {onMoveToProject && allProjects.length > 0 && (
                <div className="col-span-2 space-y-2 pt-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ArrowRightLeft className="h-3 w-3" /> Move to another project
                  </Label>
                  <div className="flex gap-2">
                    <Select value={selectedTargetProject} onValueChange={setSelectedTargetProject}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select project..." /></SelectTrigger>
                      <SelectContent>
                        {allProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTargetProject && targetProjectSections.length > 0 && (
                      <Select onValueChange={(sectionId) => {
                        onMoveToProject(task.id, selectedTargetProject, sectionId);
                        setSelectedTargetProject("");
                        onOpenChange(false);
                      }}>
                        <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Section..." /></SelectTrigger>
                        <SelectContent>
                          {targetProjectSections.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <Tabs defaultValue="comments">
              <TabsList className="w-full h-9">
                <TabsTrigger value="comments" className="text-xs flex-1 gap-1">
                  <MessageSquare className="h-3 w-3" /> Comments ({comments.length})
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs flex-1 gap-1">
                  <Clock className="h-3 w-3" /> Activity ({activities.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="mt-3 space-y-3">
                {loadingComments ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
                ) : (
                  comments.map((c) => {
                    const author = profileMap[c.user_id];
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar className="h-7 w-7 mt-0.5">
                          <AvatarFallback className="text-[10px]">{getInitials(author?.full_name || null)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{author?.full_name || "User"}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendComment()}
                    className="h-8 text-xs"
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSendComment} disabled={sending}>
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-3 space-y-2">
                {loadingComments ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity recorded</p>
                ) : (
                  activities.map((a) => {
                    const author = profileMap[a.user_id];
                    return (
                      <div key={a.id} className="flex items-start gap-2 py-1.5">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs">
                            <span className="font-medium">{author?.full_name || "Someone"}</span>
                            {" "}{a.action}
                          </p>
                          <span className="text-[10px] text-muted-foreground">{formatDate(a.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>

            <Separator />
            {user && user.id === task.created_by && (
              <div className="flex justify-center pb-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" /> Delete Task
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The task "{task.title}" will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
