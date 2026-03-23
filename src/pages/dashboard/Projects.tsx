import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Pencil, GripVertical, Calendar as CalendarIcon, User, LayoutGrid, List, Archive, ArchiveRestore, ChevronDown, ChevronRight, Camera, Clock, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { differenceInDays, differenceInHours, isPast, parseISO } from "date-fns";
import { ProjectsSkeleton } from "@/components/dashboard/skeletons/ProjectsSkeleton";
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

type Stage = "upcoming" | "shot" | "proof_gallery" | "post_production" | "final_gallery" | "archived";

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
  gallery_cover_url?: string | null;
  gallery_deadline?: string | null;
}

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "upcoming",       label: "Próximas sessões", color: "hsl(var(--muted-foreground))" },
  { key: "shot",           label: "Fotografadas",     color: "hsl(280 70% 55%)" },
  { key: "proof_gallery",  label: "Galeria de provas",color: "hsl(35 85% 55%)" },
  { key: "post_production",label: "Pós produção",     color: "hsl(215 80% 55%)" },
  { key: "final_gallery",  label: "Galeria final",    color: "hsl(160 60% 45%)" },
];

const STAGE_COLORS: Record<Stage, string> = {
  upcoming:        "bg-muted/60 text-muted-foreground border-border",
  shot:            "bg-purple-500/10 text-purple-600 border-purple-500/20",
  proof_gallery:   "bg-orange-500/10 text-orange-600 border-orange-500/20",
  post_production: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  final_gallery:   "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  archived:        "bg-muted/40 text-muted-foreground/60 border-border/50",
};


// ── Deadline helpers ─────────────────────────────────────────────────────────
function getDeadlineStatus(deadline: string | null | undefined): "overdue" | "urgent" | "warning" | "ok" | null {
  if (!deadline) return null;
  const d = parseISO(deadline);
  const now = new Date();
  const daysLeft = differenceInDays(d, now);
  if (isPast(d)) return "overdue";
  if (daysLeft <= 1) return "urgent";
  if (daysLeft <= 3) return "warning";
  return "ok";
}

const DEADLINE_BORDER: Record<string, string> = {
  overdue: "border-destructive shadow-[0_0_0_1px_hsl(var(--destructive))]",
  urgent:  "border-orange-500 shadow-[0_0_0_1px_theme(colors.orange.500)]",
  warning: "border-yellow-400 shadow-[0_0_0_1px_theme(colors.yellow.400)]",
  ok:      "border-emerald-500 shadow-[0_0_0_1px_theme(colors.emerald.500)]",
};

const DEADLINE_BADGE: Record<string, string> = {
  overdue: "text-destructive",
  urgent:  "text-orange-500",
  warning: "text-yellow-500",
  ok:      "text-emerald-500",
};

// ── Card ────────────────────────────────────────────────────────────────────
function KanbanCard({
  project,
  onView,
  onEdit,
  onDelete,
  onArchive,
  shotDeadlineDays,
}: {
  project: ClientProject;
  onView: (p: ClientProject) => void;
  onEdit: (p: ClientProject) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  shotDeadlineDays?: number | null;
}) {
  const { t } = useLanguage();
  const p_t = t.projects;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  // Compute effective deadline:
  // 1. Per-card gallery_deadline (absolute date string) takes priority
  // 2. Otherwise: shoot_date + column-level days
  const effectiveDeadline = (() => {
    if (project.stage !== "shot") return null;
    if (project.gallery_deadline) return project.gallery_deadline;
    if (shotDeadlineDays != null && project.shoot_date) {
      try {
        const shoot = new Date(project.shoot_date);
        if (!isNaN(shoot.getTime())) {
          const d = new Date(shoot);
          d.setDate(d.getDate() + shotDeadlineDays);
          return d.toISOString();
        }
      } catch { /* ignore */ }
    }
    return null;
  })();
  const deadlineStatus = project.stage === "shot" ? getDeadlineStatus(effectiveDeadline) : null;
  const borderClass = deadlineStatus ? DEADLINE_BORDER[deadlineStatus] : "border-border hover:border-foreground/30";

  // Human-readable deadline label
  const deadlineLabel = (() => {
    if (!effectiveDeadline || project.stage !== "shot") return null;
    const d = parseISO(effectiveDeadline);
    const now = new Date();
    if (isPast(d)) return "Prazo vencido";
    const h = differenceInHours(d, now);
    if (h < 24) return `${h}h restantes`;
    const days = differenceInDays(d, now);
    return `${days}d restantes`;
  })();

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        className={`border bg-card rounded-sm p-3 flex flex-col gap-2 transition-colors cursor-pointer ${borderClass}`}
        onClick={() => onView(project)}
      >
        {/* drag handle + actions */}
        <div className="flex items-start justify-between gap-1">
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing mt-0.5"
            aria-label={p_t.dragHandle}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <p className="flex-1 text-xs font-medium leading-snug truncate">{project.client_name || project.title}</p>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              className="p-0.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEdit(project); }}
              title={p_t.editProject}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              className="p-0.5 text-muted-foreground hover:text-amber-500"
              onClick={(e) => { e.stopPropagation(); onArchive(project.id); }}
              title={p_t.archived}
            >
              <Archive className="h-3 w-3" />
            </button>
            <button
              className="p-0.5 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              title={p_t.projectRemoved}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Gallery cover thumbnail for proof/final stages */}
        {(project.stage === "proof_gallery" || project.stage === "final_gallery") && project.gallery_cover_url && (
          <div className="w-full h-20 rounded-sm overflow-hidden border border-border">
            <img
              src={project.gallery_cover_url}
              alt="Gallery cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* meta */}
        <div className="flex flex-col gap-1">
          {project.shoot_date && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-0">
              <span className="flex items-center gap-1 shrink-0">
                <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                <span>{format(new Date(project.shoot_date), "MMM d, h:mm a")}</span>
              </span>
            </div>
          )}
          {project.session_title && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <Camera className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate italic">{project.session_title}</span>
            </div>
          )}

          {/* Deadline alert — only for "shot" stage */}
          {deadlineLabel && deadlineStatus && (
            <div className={`flex items-center gap-1 text-[10px] font-medium mt-0.5 ${DEADLINE_BADGE[deadlineStatus]}`}>
              {deadlineStatus === "overdue" ? (
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              ) : (
                <Clock className="h-2.5 w-2.5 shrink-0" />
              )}
              <span>Galeria: {deadlineLabel}</span>
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
  onView,
  onEdit,
  onDelete,
  onArchive,
  onAddCard,
  shotDeadlineDays,
  onSetShotDeadlineDays,
}: {
  stage: { key: Stage; label: string; color: string };
  projects: ClientProject[];
  onView: (p: ClientProject) => void;
  onEdit: (p: ClientProject) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onAddCard: (stage: Stage) => void;
  shotDeadlineDays?: number | null;
  onSetShotDeadlineDays?: (days: number | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  const { t } = useLanguage();
  const [inputVal, setInputVal] = useState(shotDeadlineDays != null ? String(shotDeadlineDays) : "");

  const handleDaysBlur = () => {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n > 0) onSetShotDeadlineDays?.(n);
    else { onSetShotDeadlineDays?.(null); setInputVal(""); }
  };

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: stage.color }}
          />
          <span className="text-[10px] tracking-[0.25em] uppercase font-medium truncate">{stage.label}</span>
          <span className="text-[10px] text-muted-foreground/60 shrink-0">{projects.length}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Numeric deadline input — only for "shot" column */}
          {stage.key === "shot" && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={365}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={handleDaysBlur}
                onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
                placeholder="–"
                className="w-8 h-5 text-center text-[10px] bg-transparent border border-border rounded-sm focus:outline-none focus:border-foreground/40 text-muted-foreground placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Prazo em dias após a sessão para entrega da galeria de provas"
              />
              <span className="text-[10px] text-muted-foreground/50">d</span>
            </div>
          )}
          <button
            className="text-muted-foreground/40 hover:text-foreground transition-colors"
            onClick={() => onAddCard(stage.key)}
            aria-label={stage.label}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
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
            <KanbanCard key={p.id} project={p} onView={onView} onEdit={onEdit} onDelete={onDelete} onArchive={onArchive} shotDeadlineDays={shotDeadlineDays} />
          ))}
        </SortableContext>

        {projects.length === 0 && (
          <button
            onClick={() => onAddCard(stage.key)}
            className="border border-dashed border-border rounded-sm p-3 text-[10px] text-muted-foreground/40 hover:text-muted-foreground hover:border-muted-foreground/40 transition-colors text-center"
          >
            {t.projects.addCard}
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
  const { t } = useLanguage();
  const p_t = t.projects;
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [shootDate, setShootDate] = useState("");
  const [stage, setStage] = useState<Stage>("upcoming");
  const [notes, setNotes] = useState("");

  const stageLabels: Record<string, string> = {
    upcoming: "Próximas sessões", shot: "Fotografadas", proof_gallery: "Galeria de provas",
    post_production: "Pós produção", final_gallery: "Galeria final",
  };

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setClientName(initial?.client_name ?? "");
      setClientEmail(initial?.client_email ?? "");
      const matched = sessionTypes.find((s) => s.name === initial?.session_type);
      setSessionTypeId(matched?.id ?? null);
      setShootDate(initial?.shoot_date ?? "");
      setStage(initial?.stage ?? defaultStage ?? "upcoming");
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial, defaultStage, sessionTypes]);

  const handleSave = () => {
    if (!title.trim()) { toast.error(p_t.titleRequired); return; }
    const resolvedName = sessionTypes.find((s) => s.id === sessionTypeId)?.name ?? null;
    onSave({ title, client_name: clientName, client_email: clientEmail || null, session_type: resolvedName, shoot_date: shootDate || null, stage, notes: notes || null });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-light tracking-widest uppercase">
            {initial ? p_t.editProject : p_t.newProject}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{p_t.title_field} *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wedding João & Ana" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{p_t.clientName}</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ana Lima" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{p_t.email}</label>
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
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{p_t.shootDate}</label>
              <Input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{p_t.stage}</label>
            <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{stageLabels[s.key] ?? s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{p_t.notes}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={p_t.additionalNotes}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{p_t.cancel}</Button>
          <Button size="sm" onClick={handleSave}>{initial ? p_t.save : p_t.create}</Button>
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
  const { t } = useLanguage();
  const p_t = t.projects;
  const stageLabels: Record<string, string> = {
    upcoming: "Próximas sessões", shot: "Fotografadas", proof_gallery: "Galeria de provas",
    post_production: "Pós produção", final_gallery: "Galeria final",
  };

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
              <Archive className="h-2.5 w-2.5" /> {p_t.archived}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 border rounded-sm px-2 py-0.5 text-[10px] tracking-wider uppercase ${STAGE_COLORS[p.stage]}`}>
              {stageLabels[p.stage] ?? STAGES.find((s) => s.key === p.stage)?.label}
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
            <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => onUnarchive(p.id)} title={p_t.showArchived}>
              <ArchiveRestore className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => onEdit(p)} title={p_t.editProject}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button className="p-1 text-muted-foreground hover:text-amber-500" onClick={() => onArchive(p.id)} title={p_t.archived}>
                <Archive className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button className="p-1 text-muted-foreground hover:text-destructive" onClick={() => onDelete(p.id)} title={p_t.projectRemoved}>
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
          {[p_t.title_field, p_t.client, p_t.sessionType, p_t.stage, p_t.shootDate, ""].map((h, i) => (
            <div key={i} className={`px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium ${i === 5 ? "w-20" : ""}`}>
              {h}
            </div>
          ))}
        </div>
        {active.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground tracking-widest uppercase">
            {p_t.noActiveProjects}
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
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">{p_t.archived}</span>
            <span className="text-[10px] text-muted-foreground/50 ml-1">{archived.length}</span>
          </div>
          {archived.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground/50 tracking-widest uppercase">{p_t.noArchivedProjects}</div>
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
  const { t } = useLanguage();
  const p_t = t.projects;
  return (
    <div className="mt-6 border border-border/50 rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <Archive className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] tracking-[0.25em] uppercase font-medium text-muted-foreground">{p_t.archived}</span>
        <span className="text-[10px] text-muted-foreground/50 ml-1">{projects.length}</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-3 p-4">
          {projects.map((p) => (
            <div key={p.id} className="group border border-border/50 bg-muted/10 rounded-sm p-3 w-[260px] flex flex-col gap-2 opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex items-start justify-between gap-1">
                <p className="flex-1 text-xs font-medium leading-snug line-clamp-2 text-muted-foreground">{p.title}</p>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button className="p-0.5 text-muted-foreground hover:text-foreground" onClick={() => onUnarchive(p.id)} title={p_t.showArchived}>
                    <ArchiveRestore className="h-3 w-3" />
                  </button>
                  <button className="p-0.5 text-muted-foreground hover:text-destructive" onClick={() => onDelete(p.id)} title={p_t.projectRemoved}>
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
  const { user, signOut, photographerId } = useAuth();
  const { t } = useLanguage();
  const p_t = t.projects;
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProject | null>(null);
  const [defaultStage, setDefaultStage] = useState<Stage>("upcoming");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showArchived, setShowArchived] = useState(false);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [sheetProject, setSheetProject] = useState<ClientProject | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Column-level deadline for "shot" stage — persisted in localStorage
  const [shotDeadline, setShotDeadline] = useState<string | null>(() => {
    try { return localStorage.getItem("shot_gallery_deadline"); } catch { return null; }
  });

  const handleSetShotDeadline = (date: string | null) => {
    setShotDeadline(date);
    try {
      if (date) localStorage.setItem("shot_gallery_deadline", date);
      else localStorage.removeItem("shot_gallery_deadline");
    } catch { /* ignore */ }
  };

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
    if (!photographerId) return;

    // 1. Fetch existing projects
    const { data: existingProjects, error } = await supabase
      .from("client_projects" as any)
      .select("*, bookings(sessions(title), client_name, client_email, booked_date, session_id)")
      .eq("photographer_id", photographerId)
      .order("position", { ascending: true });

    // 2. Fetch confirmed bookings that don't have a project yet
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, booked_date, session_id, sessions(title, session_type_id)")
      .eq("photographer_id", photographerId)
      .in("status", ["confirmed", "completed"]);

    const existingBookingIds = new Set(
      (existingProjects as any[] ?? [])
        .map((p: any) => p.booking_id)
        .filter(Boolean)
    );

    // 3. Auto-create projects for bookings that don't have one
    const newBookings = (bookings ?? []).filter((b: any) => !existingBookingIds.has(b.id));
    if (newBookings.length > 0) {
      const toInsert = newBookings.map((b: any, i: number) => ({
        photographer_id: photographerId,
        title: `${b.client_name} — ${(b.sessions as any)?.title ?? "Session"}`,
        client_name: b.client_name,
        client_email: b.client_email ?? null,
        booking_id: b.id,
        stage: "upcoming",
        shoot_date: b.booked_date ?? null,
        position: (existingProjects?.length ?? 0) + i,
      }));
      await supabase.from("client_projects" as any).insert(toInsert as any);
    }

    // 4. Reload after potential inserts — also fetch duration + availability start_time for auto-advance
    const { data: allProjects } = await supabase
      .from("client_projects" as any)
      .select("*, bookings(sessions(title, duration_minutes), session_availability(start_time, end_time), client_name, client_email, booked_date)")
      .eq("photographer_id", photographerId)
      .order("position", { ascending: true });

    if (allProjects) {
      // 5. Fetch gallery covers for projects with a booking_id
      const bookingIds = (allProjects as any[])
        .map((p) => p.booking_id)
        .filter(Boolean);

      let galleryCovers: Record<string, string> = {};
      if (bookingIds.length > 0) {
        const { data: galleries } = await supabase
          .from("galleries")
          .select("booking_id, cover_image_url, category, status")
          .in("booking_id", bookingIds)
          .neq("status", "expired");
        if (galleries) {
          for (const g of galleries as any[]) {
            if (g.booking_id && g.cover_image_url) {
              galleryCovers[g.booking_id] = g.cover_image_url;
            }
          }
        }

        // Build set of booking_ids that have a proof gallery
        const proofGalleryBookings = new Set<string>();
        // Build set of booking_ids that have a final gallery
        const finalGalleryBookings = new Set<string>();
        if (galleries) {
          for (const g of galleries as any[]) {
            if (g.booking_id && g.category === "proof") {
              proofGalleryBookings.add(g.booking_id);
            }
            if (g.booking_id && g.category === "final") {
              finalGalleryBookings.add(g.booking_id);
            }
          }
        }

        // Auto-advance "shot" → "proof_gallery" when a proof gallery is linked
        const toProofGallery: string[] = [];
        for (const p of (allProjects as any[])) {
          if (p.stage !== "shot") continue;
          if (p.booking_id && proofGalleryBookings.has(p.booking_id)) {
            toProofGallery.push(p.id);
          }
        }

        if (toProofGallery.length > 0) {
          await supabase
            .from("client_projects" as any)
            .update({ stage: "proof_gallery" } as any)
            .in("id", toProofGallery);
          for (const p of allProjects as any[]) {
            if (toProofGallery.includes(p.id)) p.stage = "proof_gallery";
          }
        }

        // Auto-advance "post_production" → "final_gallery" when a final gallery is linked
        const toFinalGallery: string[] = [];
        for (const p of (allProjects as any[])) {
          if (p.stage !== "post_production") continue;
          if (p.booking_id && finalGalleryBookings.has(p.booking_id)) {
            toFinalGallery.push(p.id);
          }
        }

        if (toFinalGallery.length > 0) {
          await supabase
            .from("client_projects" as any)
            .update({ stage: "final_gallery" } as any)
            .in("id", toFinalGallery);
          for (const p of allProjects as any[]) {
            if (toFinalGallery.includes(p.id)) p.stage = "final_gallery";
          }
        }
      }

      const mapped = (allProjects as any[]).map((p) => ({
        ...p,
        session_title: (p.bookings as any)?.sessions?.title ?? null,
        gallery_cover_url: p.booking_id ? (galleryCovers[p.booking_id] ?? null) : null,
        gallery_deadline: p.gallery_deadline ?? null,
      }));

      // 6. Auto-advance "upcoming" → "shot" when session has ended
      const now = new Date();
      const toAdvance: string[] = [];

      for (const p of mapped) {
        if (p.stage !== "upcoming") continue;

        const booking = (p as any).bookings;
        let sessionEnd: Date | null = null;

        if (p.shoot_date && booking?.session_availability?.start_time && booking?.sessions?.duration_minutes != null) {
          // Precise: shoot_date + booking start_time + duration_minutes
          const startStr = `${p.shoot_date}T${booking.session_availability.start_time}`;
          const start = new Date(startStr);
          if (!isNaN(start.getTime())) {
            sessionEnd = new Date(start.getTime() + booking.sessions.duration_minutes * 60 * 1000);
          }
        } else if (p.shoot_date) {
          // Fallback for manually created projects: end of shoot day
          const d = new Date(p.shoot_date + "T23:59:59");
          if (!isNaN(d.getTime())) sessionEnd = d;
        }

        if (sessionEnd && sessionEnd < now) {
          toAdvance.push(p.id);
        }
      }

      if (toAdvance.length > 0) {
        await supabase
          .from("client_projects" as any)
          .update({ stage: "shot" } as any)
          .in("id", toAdvance);

        for (const p of mapped) {
          if (toAdvance.includes(p.id)) p.stage = "shot";
        }
      }

      setProjects(mapped as ClientProject[]);
    }
    setLoading(false);
  };

  useEffect(() => { if (photographerId) { fetchProjects(); fetchSessionTypes(); } }, [photographerId]);

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

  const openView = (p: ClientProject) => {
    setSheetProject(p);
    setSheetOpen(true);
  };

  const handleSheetUpdate = async (id: string, data: Partial<ClientProject>) => {
    const { error } = await supabase
      .from("client_projects" as any)
      .update(data as any)
      .eq("id", id);
    if (error) { toast.error(p_t.failedToUpdate); return; }
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
    setSheetProject((prev) => prev ? { ...prev, ...data } : prev);
  };

  const handleSave = async (data: Partial<ClientProject>) => {
    if (editing) {
      const { error } = await supabase
        .from("client_projects" as any)
        .update(data as any)
        .eq("id", editing.id);
      if (error) { toast.error(p_t.failedToUpdate); return; }
      toast.success(p_t.projectUpdated);
    } else {
      const stageProjects = projects.filter((p) => p.stage === data.stage);
      const { error } = await supabase
        .from("client_projects" as any)
        .insert({
          ...data,
          photographer_id: user?.id,
          position: stageProjects.length,
        } as any);
      if (error) { toast.error(p_t.failedToCreate); return; }
      toast.success(p_t.projectCreated);
    }
    setModalOpen(false);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("client_projects" as any).delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success(p_t.projectRemoved);
  };

  const handleArchive = async (id: string) => {
    await supabase.from("client_projects" as any).update({ stage: "archived" } as any).eq("id", id);
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, stage: "archived" as Stage } : p));
    setSheetProject((prev) => prev?.id === id ? { ...prev, stage: "archived" as Stage } : prev);
    toast.success(p_t.projectArchived);
  };

  const handleUnarchive = async (id: string) => {
    await supabase.from("client_projects" as any).update({ stage: "upcoming" } as any).eq("id", id);
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, stage: "upcoming" as Stage } : p));
    setSheetProject((prev) => prev?.id === id ? { ...prev, stage: "upcoming" as Stage } : prev);
    toast.success(p_t.restoredToLead);
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
                  {p_t.photographers}
                </p>
                <h1 className="text-2xl font-light tracking-wide">{p_t.title}</h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="kanban" className="text-xs gap-1.5 px-2.5">
                      <LayoutGrid className="h-3.5 w-3.5" /> {p_t.kanban}
                    </TabsTrigger>
                    <TabsTrigger value="list" className="text-xs gap-1.5 px-2.5">
                      <List className="h-3.5 w-3.5" /> {p_t.list}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  size="sm"
                  onClick={() => openAdd("upcoming")}
                  className="gap-2 text-xs tracking-wider uppercase font-light"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {p_t.newProject}
                </Button>
              </div>
            </div>

            {/* Stage summary pills + archive toggle */}
            <div className="px-6 md:px-10 pb-4 flex items-center gap-2 flex-wrap shrink-0">
              {STAGES.filter((s) => s.key !== "archived").map((s) => {
                const count = projectsByStage(s.key).length;
                const stageLabel = s.label;
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-1.5 border rounded-sm px-2 py-0.5 text-[10px] tracking-wider uppercase ${STAGE_COLORS[s.key]}`}
                  >
                    <span>{stageLabel}</span>
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
                  <span>{p_t.archived}</span>
                  <span className="opacity-60">{projectsByStage("archived").length}</span>
                </button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <ProjectsSkeleton />
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
                        onView={openView}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onArchive={handleArchive}
                        onAddCard={openAdd}
                        shotDeadline={s.key === "shot" ? shotDeadline : undefined}
                        onSetShotDeadline={s.key === "shot" ? handleSetShotDeadline : undefined}
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

      <ProjectDetailSheet
        project={sheetProject}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={handleSheetUpdate}
        onDelete={(id) => { handleDelete(id); }}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onOpenEdit={(p) => { setSheetOpen(false); openEdit(p); }}
        photographerId={user?.id ?? ""}
        sessionTypes={sessionTypes}
        onRefetchSessionTypes={fetchSessionTypes}
      />
    </SidebarProvider>
  );
};

export default Projects;
