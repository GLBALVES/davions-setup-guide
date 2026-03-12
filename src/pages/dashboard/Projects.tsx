import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Pencil, GripVertical, Calendar, User, LayoutGrid, List, Archive, ArchiveRestore, ChevronDown, ChevronRight, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";
import { ProjectDetailSheet } from "@/components/dashboard/ProjectDetailSheet";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { format } from "date-fns";

type Stage = "lead" | "briefing" | "shooting" | "editing" | "delivery" | "done" | "archived";

interface ClientProject {
  id: string;
  photographer_id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  session_type: string | null;
  booking_id: string | null;
  stage: Stage;
  notes: string | null;
  shoot_date: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  session_title?: string | null;
}

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "lead",      label: "Lead",     color: "hsl(var(--muted-foreground))" },
  { key: "briefing",  label: "Briefing", color: "hsl(215 80% 55%)" },
  { key: "shooting",  label: "Shooting", color: "hsl(280 70% 55%)" },
  { key: "editing",   label: "Editing",  color: "hsl(35 85% 55%)" },
  { key: "delivery",  label: "Delivery", color: "hsl(160 60% 45%)" },
  { key: "done",      label: "Done",     color: "hsl(var(--foreground))" },
];

const STAGE_COLORS: Record<Stage, string> = {
  lead:     "bg-muted/60 text-muted-foreground border-border",
  briefing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  shooting: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  editing:  "bg-orange-500/10 text-orange-600 border-orange-500/20",
  delivery: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  done:     "bg-foreground/10 text-foreground border-foreground/20",
  archived: "bg-muted/40 text-muted-foreground/60 border-border/50",
};


// ── Card ────────────────────────────────────────────────────────────────────
function KanbanCard({
  project,
  onEdit,
  onDelete,
  onArchive,
}: {
  project: ClientProject;
  onEdit: (p: ClientProject) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="border border-border bg-card rounded-sm p-3 flex flex-col gap-2 hover:border-foreground/30 transition-colors cursor-default">
        {/* drag handle + actions */}
        <div className="flex items-start justify-between gap-1">
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing mt-0.5"
            aria-label="Drag"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <p className="flex-1 text-xs font-medium leading-snug line-clamp-2">{project.title}</p>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              className="p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(project)}
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              className="p-0.5 text-muted-foreground hover:text-amber-500"
              onClick={() => onArchive(project.id)}
              title="Archive"
            >
              <Archive className="h-3 w-3" />
            </button>
            <button
              className="p-0.5 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(project.id)}
              title="Delete"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* meta */}
        <div className="flex flex-col gap-1">
          {project.client_name && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <User className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{project.client_name}</span>
            </div>
          )}
          {project.shoot_date && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5 shrink-0" />
              <span>{format(new Date(project.shoot_date + "T00:00:00"), "MMM d, yyyy")}</span>
            </div>
          )}
          {project.session_type && (
            <span className="self-start text-[9px] tracking-widest uppercase border border-border px-1.5 py-0.5 text-muted-foreground">
              {project.session_type}
            </span>
          )}
          {project.session_title && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <Camera className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate italic">{project.session_title}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Column ──────────────────────────────────────────────────────────────────
function KanbanColumn({
  stage,
  projects,
  onEdit,
  onDelete,
  onArchive,
  onAddCard,
}: {
  stage: { key: Stage; label: string; color: string };
  projects: ClientProject[];
  onEdit: (p: ClientProject) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onAddCard: (stage: Stage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] shrink-0">
      {/* header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: stage.color }}
          />
          <span className="text-[10px] tracking-[0.25em] uppercase font-medium">{stage.label}</span>
          <span className="text-[10px] text-muted-foreground/60">{projects.length}</span>
        </div>
        <button
          className="text-muted-foreground/40 hover:text-foreground transition-colors"
          onClick={() => onAddCard(stage.key)}
          aria-label={`Add to ${stage.label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-[60px] rounded-sm transition-colors ${
          isOver ? "bg-muted/40 ring-1 ring-border" : ""
        }`}
      >
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map((p) => (
            <KanbanCard key={p.id} project={p} onEdit={onEdit} onDelete={onDelete} onArchive={onArchive} />
          ))}
        </SortableContext>

        {projects.length === 0 && (
          <button
            onClick={() => onAddCard(stage.key)}
            className="border border-dashed border-border rounded-sm p-3 text-[10px] text-muted-foreground/40 hover:text-muted-foreground hover:border-muted-foreground/40 transition-colors text-center"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
function ProjectModal({
  open,
  onClose,
  onSave,
  initial,
  defaultStage,
  photographerId,
  sessionTypes,
  onRefetchSessionTypes,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ClientProject>) => void;
  initial?: ClientProject | null;
  defaultStage?: Stage;
  photographerId: string;
  sessionTypes: SessionType[];
  onRefetchSessionTypes: () => void;
}) {
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [shootDate, setShootDate] = useState("");
  const [stage, setStage] = useState<Stage>("lead");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setClientName(initial?.client_name ?? "");
      setClientEmail(initial?.client_email ?? "");
      // Match existing string name to an id for pre-selection
      const matched = sessionTypes.find((t) => t.name === initial?.session_type);
      setSessionTypeId(matched?.id ?? null);
      setShootDate(initial?.shoot_date ?? "");
      setStage(initial?.stage ?? defaultStage ?? "lead");
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial, defaultStage, sessionTypes]);

  const handleSave = () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const resolvedName = sessionTypes.find((t) => t.id === sessionTypeId)?.name ?? null;
    onSave({ title, client_name: clientName, client_email: clientEmail || null, session_type: resolvedName, shoot_date: shootDate || null, stage, notes: notes || null });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-light tracking-widest uppercase">
            {initial ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wedding João & Ana" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">Client name</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ana Lima" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">Email</label>
              <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="ana@email.com" type="email" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <SessionTypeManager
                photographerId={photographerId}
                sessionTypes={sessionTypes}
                selectedTypeId={sessionTypeId}
                onSelect={setSessionTypeId}
                onRefetch={onRefetchSessionTypes}
                mode="select"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">Shoot date</label>
              <Input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">Stage</label>
            <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>{initial ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── List View ────────────────────────────────────────────────────────────────
function ListView({
  projects,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  showArchived,
}: {
  projects: ClientProject[];
  onEdit: (p: ClientProject) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  showArchived: boolean;
}) {
  const active = [...projects.filter((p) => p.stage !== "archived")].sort((a, b) => {
    const si = STAGES.findIndex((s) => s.key === a.stage);
    const sj = STAGES.findIndex((s) => s.key === b.stage);
    if (si !== sj) return si - sj;
    return a.position - b.position;
  });
  const archived = projects.filter((p) => p.stage === "archived").sort((a, b) => a.position - b.position);

  const renderRow = (p: ClientProject, isArchived = false) => {
    const isOverdue = p.shoot_date && new Date(p.shoot_date + "T00:00:00") < new Date();
    return (
      <div
        key={p.id}
        className={`group grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-0 border-b border-border/50 last:border-b-0 transition-colors items-center ${isArchived ? "opacity-60 hover:opacity-100 hover:bg-muted/20" : "hover:bg-muted/30"}`}
      >
        <div className="px-4 py-3 text-sm font-medium truncate">{p.title}</div>
        <div className="px-4 py-3 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          {p.client_name ? (<><User className="h-3 w-3 shrink-0" />{p.client_name}</>) : <span className="text-muted-foreground/30">—</span>}
        </div>
        <div className="px-4 py-3 text-xs text-muted-foreground">
          {p.session_type || <span className="text-muted-foreground/30">—</span>}
        </div>
        <div className="px-4 py-3">
          {isArchived ? (
            <span className="inline-flex items-center gap-1 border rounded-sm px-2 py-0.5 text-[10px] tracking-wider uppercase bg-muted/40 text-muted-foreground/60 border-border/50">
              <Archive className="h-2.5 w-2.5" /> Archived
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 border rounded-sm px-2 py-0.5 text-[10px] tracking-wider uppercase ${STAGE_COLORS[p.stage]}`}>
              {STAGES.find((s) => s.key === p.stage)?.label}
            </span>
          )}
        </div>
        <div className="px-4 py-3 flex items-center gap-1.5 text-xs">
          {p.shoot_date ? (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3 shrink-0" />
              {format(new Date(p.shoot_date + "T00:00:00"), "MMM d, yyyy")}
            </span>
          ) : <span className="text-muted-foreground/30">—</span>}
        </div>
        <div className="px-4 py-3 w-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          {isArchived ? (
            <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => onUnarchive(p.id)} title="Unarchive">
              <ArchiveRestore className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => onEdit(p)} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button className="p-1 text-muted-foreground hover:text-amber-500" onClick={() => onArchive(p.id)} title="Archive">
                <Archive className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button className="p-1 text-muted-foreground hover:text-destructive" onClick={() => onDelete(p.id)} title="Delete">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border rounded-sm overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-0 border-b border-border bg-muted/30">
          {["Title", "Client", "Session type", "Stage", "Shoot date", ""].map((h, i) => (
            <div key={i} className={`px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium ${i === 5 ? "w-20" : ""}`}>
              {h}
            </div>
          ))}
        </div>
        {active.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground tracking-widest uppercase">
            No active projects
          </div>
        ) : (
          active.map((p) => renderRow(p, false))
        )}
      </div>

      {/* Archived section — controlled by parent toggle */}
      {showArchived && (
        <div className="border border-border/50 rounded-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border/40">
            <Archive className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">Archived</span>
            <span className="text-[10px] text-muted-foreground/50 ml-1">{archived.length}</span>
          </div>
          {archived.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground/50 tracking-widest uppercase">No archived projects</div>
          ) : (
            archived.map((p) => renderRow(p, true))
          )}
        </div>
      )}
    </div>
  );
}

// ── Archived Kanban Section ──────────────────────────────────────────────────
function ArchivedKanbanSection({
  projects,
  onUnarchive,
  onDelete,
}: {
  projects: ClientProject[];
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border border-border/50 rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <Archive className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] tracking-[0.25em] uppercase font-medium text-muted-foreground">Archived</span>
        <span className="text-[10px] text-muted-foreground/50 ml-1">{projects.length}</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-3 p-4">
          {projects.map((p) => (
            <div key={p.id} className="group border border-border/50 bg-muted/10 rounded-sm p-3 w-[220px] flex flex-col gap-2 opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex items-start justify-between gap-1">
                <p className="flex-1 text-xs font-medium leading-snug line-clamp-2 text-muted-foreground">{p.title}</p>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button className="p-0.5 text-muted-foreground hover:text-foreground" onClick={() => onUnarchive(p.id)} title="Unarchive">
                    <ArchiveRestore className="h-3 w-3" />
                  </button>
                  <button className="p-0.5 text-muted-foreground hover:text-destructive" onClick={() => onDelete(p.id)} title="Delete">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {p.client_name && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <User className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{p.client_name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
const Projects = () => {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProject | null>(null);
  const [defaultStage, setDefaultStage] = useState<Stage>("lead");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showArchived, setShowArchived] = useState(false);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const fetchSessionTypes = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("session_types")
      .select("id, name")
      .eq("photographer_id", user.id)
      .order("name");
    if (data) setSessionTypes(data as SessionType[]);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("client_projects" as any)
      .select("*, bookings(sessions(title))")
      .order("position", { ascending: true });
    if (!error && data) {
      const mapped = (data as any[]).map((p) => ({
        ...p,
        session_title: (p.bookings as any)?.sessions?.title ?? null,
      }));
      setProjects(mapped as ClientProject[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); fetchSessionTypes(); }, [user?.id]);

  const projectsByStage = (stage: Stage) =>
    projects.filter((p) => p.stage === stage).sort((a, b) => a.position - b.position);

  const activeProject = projects.find((p) => p.id === activeId) ?? null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const activeProject = projects.find((p) => p.id === active.id);
    if (!activeProject) return;

    // Check if over a stage column (droppable)
    const overStage = STAGES.find((s) => s.key === over.id);
    if (overStage && activeProject.stage !== overStage.key) {
      setProjects((prev) =>
        prev.map((p) => p.id === active.id ? { ...p, stage: overStage.key } : p)
      );
    }

    // Check if over another card
    const overProject = projects.find((p) => p.id === over.id);
    if (overProject && overProject.stage !== activeProject.stage) {
      setProjects((prev) =>
        prev.map((p) => p.id === active.id ? { ...p, stage: overProject.stage } : p)
      );
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeProj = projects.find((p) => p.id === active.id);
    if (!activeProj) return;

    // Determine new stage
    let newStage = activeProj.stage;
    const overStage = STAGES.find((s) => s.key === over.id);
    if (overStage) newStage = overStage.key;
    const overProj = projects.find((p) => p.id === over.id);
    if (overProj) newStage = overProj.stage;

    // Reorder within stage
    const stageItems = projects.filter((p) => p.stage === newStage || p.id === active.id);
    const oldIndex = stageItems.findIndex((p) => p.id === active.id);
    const newIndex = stageItems.findIndex((p) => p.id === over.id);
    let reordered = [...stageItems];
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      reordered = arrayMove(stageItems, oldIndex, newIndex);
    }

    const updates = reordered.map((p, i) => ({ ...p, stage: newStage, position: i }));
    setProjects((prev) => {
      const others = prev.filter((p) => p.stage !== newStage && p.id !== active.id);
      return [...others, ...updates];
    });

    // Persist
    await Promise.all(
      updates.map((p) =>
        supabase
          .from("client_projects" as any)
          .update({ stage: p.stage, position: p.position } as any)
          .eq("id", p.id)
      )
    );
  };

  const openAdd = (stage: Stage) => {
    setEditing(null);
    setDefaultStage(stage);
    setModalOpen(true);
  };

  const openEdit = (p: ClientProject) => {
    setEditing(p);
    setModalOpen(true);
  };

  const handleSave = async (data: Partial<ClientProject>) => {
    if (editing) {
      const { error } = await supabase
        .from("client_projects" as any)
        .update(data as any)
        .eq("id", editing.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Project updated");
    } else {
      const stageProjects = projects.filter((p) => p.stage === data.stage);
      const { error } = await supabase
        .from("client_projects" as any)
        .insert({
          ...data,
          photographer_id: user?.id,
          position: stageProjects.length,
        } as any);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Project created");
    }
    setModalOpen(false);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("client_projects" as any).delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project removed");
  };

  const handleArchive = async (id: string) => {
    await supabase.from("client_projects" as any).update({ stage: "archived" } as any).eq("id", id);
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, stage: "archived" as Stage } : p));
    toast.success("Project archived");
  };

  const handleUnarchive = async (id: string) => {
    await supabase.from("client_projects" as any).update({ stage: "lead" } as any).eq("id", id);
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, stage: "lead" as Stage } : p));
    toast.success("Project restored to Lead");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 md:px-10 pt-8 pb-4 flex items-end justify-between gap-4 shrink-0">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  Photographers
                </p>
                <h1 className="text-2xl font-light tracking-wide">Projects</h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="kanban" className="text-xs gap-1.5 px-2.5">
                      <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                    </TabsTrigger>
                    <TabsTrigger value="list" className="text-xs gap-1.5 px-2.5">
                      <List className="h-3.5 w-3.5" /> List
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  size="sm"
                  onClick={() => openAdd("lead")}
                  className="gap-2 text-xs tracking-wider uppercase font-light"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Project
                </Button>
              </div>
            </div>

            {/* Stage summary pills + archive toggle */}
            <div className="px-6 md:px-10 pb-4 flex items-center gap-2 flex-wrap shrink-0">
              {STAGES.filter((s) => s.key !== "archived").map((s) => {
                const count = projectsByStage(s.key).length;
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-1.5 border rounded-sm px-2 py-0.5 text-[10px] tracking-wider uppercase ${STAGE_COLORS[s.key]}`}
                  >
                    <span>{s.label}</span>
                    <span className="opacity-60">{count}</span>
                  </div>
                );
              })}
              <div className="ml-auto">
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  className={`flex items-center gap-1.5 border rounded-sm px-2.5 py-0.5 text-[10px] tracking-wider uppercase transition-colors ${
                    showArchived
                      ? "bg-muted text-foreground border-border"
                      : "text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                  }`}
                >
                  <Archive className="h-3 w-3" />
                  <span>Archived</span>
                  <span className="opacity-60">{projectsByStage("archived").length}</span>
                </button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">Loading…</span>
              </div>
            ) : view === "list" ? (
              <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-8">
                <ListView
                  projects={projects}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  showArchived={showArchived}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto px-6 md:px-10 pb-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex gap-4 h-full items-start">
                    {STAGES.filter((s) => s.key !== "archived").map((s) => (
                      <KanbanColumn
                        key={s.key}
                        stage={s}
                        projects={projectsByStage(s.key)}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onArchive={handleArchive}
                        onAddCard={openAdd}
                      />
                    ))}
                  </div>
                  <DragOverlay>
                    {activeProject && (
                      <div className="border border-border bg-card rounded-sm p-3 w-[220px] shadow-xl opacity-90">
                        <p className="text-xs font-medium">{activeProject.title}</p>
                        {activeProject.client_name && (
                          <p className="text-[10px] text-muted-foreground mt-1">{activeProject.client_name}</p>
                        )}
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>

                {/* Archived section in kanban — always shown when toggle is on */}
                {showArchived && (
                  <ArchivedKanbanSection
                    projects={projectsByStage("archived")}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <ProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
        defaultStage={defaultStage}
        photographerId={user?.id ?? ""}
        sessionTypes={sessionTypes}
        onRefetchSessionTypes={fetchSessionTypes}
      />
    </SidebarProvider>
  );
};

export default Projects;
