import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ReactDOM from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Pencil, GripVertical, Calendar as CalendarIcon, User, LayoutGrid, List, Archive, ArchiveRestore, Camera, Clock, AlertTriangle, Timer, RefreshCw, Pause, Play } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { TimePickerInput } from "@/components/ui/time-picker-input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  TouchSensor,
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
import { checkBookingConflict, timeToMinutes } from "@/lib/booking-conflict";

type Stage = "upcoming" | "shot" | "proof_gallery" | "post_production" | "final_gallery" | "archived";

interface ClientProject {
  id: string;
  photographer_id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  client_phone?: string | null;
  session_type: string | null;
  booking_id: string | null;
  stage: Stage;
  notes: string | null;
  shoot_date: string | null;
  shoot_time: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  session_title?: string | null;
  gallery_cover_url?: string | null;
  gallery_deadline?: string | null;
  gallery_expires_at?: string | null;
  location?: string | null;
  description?: string | null;
  is_paused?: boolean;
  session_duration_minutes?: number | null;
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

/** Returns 0–100: percentage of time elapsed from startDate → deadline */
function getDeadlineProgress(startDate: string | null | undefined, deadline: string | null | undefined): number {
  if (!startDate || !deadline) return 0;
  try {
    const start = new Date(startDate);
    const end = parseISO(deadline);
    const now = new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const total = end.getTime() - start.getTime();
    if (total <= 0) return 100;
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  } catch { return 0; }
}

const DEADLINE_BAR: Record<string, string> = {
  overdue: "bg-destructive",
  urgent:  "bg-orange-500",
  warning: "bg-yellow-400",
  ok:      "bg-emerald-500",
};

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

// ── Confirm Delete Button ─────────────────────────────────────────────────
function ConfirmDeleteButton({
  projectTitle,
  onDelete,
  compact = false,
}: {
  projectTitle: string;
  onDelete: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const p_t = t.projects;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className={`p-0.5 text-muted-foreground hover:text-destructive ${compact ? "" : ""}`}
          title={p_t.projectRemoved}
          onClick={(e) => e.stopPropagation()}
        >
          <X className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{p_t.deleteProjectTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {p_t.deleteProjectDesc(projectTitle)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{(t as any).cancel ?? "Cancel"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {p_t.projectRemoved}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
function KanbanCard({
  project,
  onView,
  onEdit,
  onDelete,
  onArchive,
  onTogglePause,
  shotDeadlineDays,
  postProdDeadlineDays,
  proofDeadlineDays,
  finalDeadlineDays,
  onSetDeadline,
  onSetGalleryExpiry,
}: {
  project: ClientProject;
  onView: (p: ClientProject) => void;
  onEdit: (p: ClientProject) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onTogglePause?: (id: string, paused: boolean) => void;
  shotDeadlineDays?: number | null;
  postProdDeadlineDays?: number | null;
  proofDeadlineDays?: number | null;
  finalDeadlineDays?: number | null;
  onSetDeadline?: (projectId: string, deadline: string | null) => void;
  onSetGalleryExpiry?: (projectId: string, expiresAt: string | null) => void;
}) {
  const [deadlinePopoverOpen, setDeadlinePopoverOpen] = useState(false);
  const [draftDeadlineDate, setDraftDeadlineDate] = useState<string | null>(null);
  const [draftDeadlineTime, setDraftDeadlineTime] = useState<string>("09:00");
  const deadlineAnchorRef = useRef<HTMLButtonElement>(null);
  const [expiryPopoverOpen, setExpiryPopoverOpen] = useState(false);
  const expiryAnchorRef = useRef<HTMLButtonElement>(null);
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

  // Compute effective deadline for "shot" stage
  const shotEffectiveDeadline = (() => {
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

  // Compute effective deadline for "post_production" stage
  const postProdEffectiveDeadline = (() => {
    if (project.stage !== "post_production") return null;
    if (project.gallery_deadline) return project.gallery_deadline;
    if (postProdDeadlineDays != null && project.shoot_date) {
      try {
        const shoot = new Date(project.shoot_date);
        if (!isNaN(shoot.getTime())) {
          const d = new Date(shoot);
          d.setDate(d.getDate() + postProdDeadlineDays);
          return d.toISOString();
        }
      } catch { /* ignore */ }
    }
    return null;
  })();

  const effectiveDeadline = shotEffectiveDeadline ?? postProdEffectiveDeadline;
  const deadlineStatus = effectiveDeadline ? getDeadlineStatus(effectiveDeadline) : null;

  // Effective gallery expiry: explicit gallery_expires_at, else derived shoot_date + column days
  const effectiveGalleryExpiry = (() => {
    if (project.stage !== "proof_gallery" && project.stage !== "final_gallery") return null;
    if (project.gallery_expires_at) return project.gallery_expires_at;
    const days = project.stage === "proof_gallery" ? proofDeadlineDays : finalDeadlineDays;
    if (days != null && project.shoot_date) {
      try {
        const shoot = new Date(project.shoot_date);
        if (!isNaN(shoot.getTime())) {
          const d = new Date(shoot);
          d.setDate(d.getDate() + days);
          return d.toISOString();
        }
      } catch { /* ignore */ }
    }
    return null;
  })();

  // Gallery expiry urgency for proof_gallery / final_gallery stages
  const galleryExpiryStatus = effectiveGalleryExpiry ? getDeadlineStatus(effectiveGalleryExpiry) : null;

  // Upcoming session proximity alert
  // Combine shoot_date (YYYY-MM-DD) + shoot_time (HH:mm) into a local Date
  const shootDateTime = (() => {
    if (!project.shoot_date) return null;
    const time = project.shoot_time && /^\d{1,2}:\d{2}/.test(project.shoot_time)
      ? project.shoot_time.slice(0, 5)
      : "00:00";
    const d = new Date(`${project.shoot_date}T${time}:00`);
    return isNaN(d.getTime()) ? null : d;
  })();

  const upcomingSessionStatus = (() => {
    if (project.stage !== "upcoming") return null;
    if (project.is_paused) return null;
    if (!shootDateTime) return null;
    const now = new Date();
    if (isPast(shootDateTime)) return "overdue";
    const daysUntil = differenceInDays(shootDateTime, now);
    const hoursUntil = differenceInHours(shootDateTime, now);
    if (hoursUntil < 24) return "urgent";
    if (daysUntil <= 3) return "warning";
    return "ok";
  })();

  const upcomingSessionLabel = (() => {
    if (!upcomingSessionStatus || !shootDateTime) return null;
    const now = new Date();
    if (isPast(shootDateTime)) return p_t.sessionPassed;
    const h = differenceInHours(shootDateTime, now);
    if (h < 24) {
      if (h < 1) {
        const mins = Math.max(0, Math.round((shootDateTime.getTime() - now.getTime()) / 60000));
        return `${mins}m`;
      }
      return p_t.sessionInHours(h);
    }
    const days = differenceInDays(shootDateTime, now);
    return p_t.sessionInDays(days);
  })();

  // Border: expiry urgency takes priority for gallery stages, else deadline urgency, else upcoming session
  const borderClass = galleryExpiryStatus
    ? DEADLINE_BORDER[galleryExpiryStatus]
    : deadlineStatus
    ? DEADLINE_BORDER[deadlineStatus]
    : upcomingSessionStatus
    ? DEADLINE_BORDER[upcomingSessionStatus]
    : "border-border hover:border-foreground/30";

  // Human-readable deadline label
  const deadlineLabel = (() => {
    if (!effectiveDeadline) return null;
    const d = parseISO(effectiveDeadline);
    const now = new Date();
    if (isPast(d)) return p_t.deadlineOverdue;
    const h = differenceInHours(d, now);
    if (h < 24) return p_t.deadlineHoursLeft(h);
    const days = differenceInDays(d, now);
    return p_t.deadlineDaysLeft(days);
  })();

  // Human-readable gallery expiry label
  const galleryExpiryLabel = (() => {
    if (!effectiveGalleryExpiry || !galleryExpiryStatus) return null;
    const d = parseISO(effectiveGalleryExpiry);
    const now = new Date();
    if (isPast(d)) return p_t.galleryExpired;
    const h = differenceInHours(d, now);
    if (h < 24) return p_t.galleryExpiresHours(h);
    const days = differenceInDays(d, now);
    return p_t.galleryExpiresDays(days);
  })();

  // Deadline popover values (computed outside JSX for stability)
  const rawDeadline = project.gallery_deadline ?? null;
  const deadlineDateStr = rawDeadline ? rawDeadline.substring(0, 10) : null;
  const deadlineTimeStr = rawDeadline && rawDeadline.length > 10 ? rawDeadline.substring(11, 16) : "09:00";
  const pickerDeadline = deadlineDateStr ? parseISO(`${deadlineDateStr}T${deadlineTimeStr}:00`) : undefined;

  const saveDeadline = (dateStr: string | null, timeStr: string) => {
    if (!onSetDeadline) return;
    const val = dateStr ? `${dateStr}T${timeStr}` : null;
    onSetDeadline(project.id, val);
  };

  const showDeadlineEditor = (project.stage === "shot" || project.stage === "post_production") && !!onSetDeadline;

  // Gallery expiry popover values
  const rawExpiry = project.gallery_expires_at ?? null;
  const expiryDateStr = rawExpiry ? rawExpiry.substring(0, 10) : null;
  const pickerExpiry = expiryDateStr ? parseISO(`${expiryDateStr}T00:00:00`) : undefined;
  const saveExpiry = (dateStr: string | null) => {
    if (!onSetGalleryExpiry) return;
    onSetGalleryExpiry(project.id, dateStr ? `${dateStr}T00:00:00` : null);
  };
  const isGalleryStage = project.stage === "proof_gallery" || project.stage === "final_gallery";

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        {...attributes}
        {...listeners}
        className={`border bg-card rounded-sm p-3 flex flex-col gap-2 transition-colors cursor-grab active:cursor-grabbing ${borderClass} ${project.is_paused ? "opacity-60 border-dashed" : ""}`}
        onClick={() => onView(project)}
      >
        {project.is_paused && (
          <div className="flex items-center gap-1 text-[9px] tracking-[0.2em] uppercase text-amber-500">
            <Pause className="h-2.5 w-2.5" />
            <span>Pausada</span>
          </div>
        )}
        {/* drag handle + actions */}
        <div className="flex items-start justify-between gap-1">
          <span
            className="shrink-0 text-muted-foreground/30 mt-0.5"
            aria-label={p_t.dragHandle}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <p className="flex-1 text-xs font-medium leading-snug truncate">{project.client_name || project.title}</p>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {project.stage === "upcoming" && onTogglePause && (
              <button
                className={`p-0.5 ${project.is_paused ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-500"}`}
                onClick={(e) => { e.stopPropagation(); onTogglePause(project.id, !project.is_paused); }}
                title={project.is_paused ? ((p_t as any).resumeSession ?? "Resume") : ((p_t as any).pauseSession ?? "Pause — awaiting reschedule")}
              >
                {project.is_paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </button>
            )}
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
            <ConfirmDeleteButton
              projectTitle={project.client_name || project.title}
              onDelete={() => onDelete(project.id)}
            />
          </div>
        </div>

        {/* Gallery cover thumbnail — shown whenever a gallery is linked to the project */}
        {project.gallery_cover_url && (
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
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground min-w-0">
              {/* Shoot date — clickable to open deadline editor on shot/post-production */}
              {showDeadlineEditor ? (
                <button
                  ref={deadlineAnchorRef}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setDraftDeadlineDate(deadlineDateStr); setDraftDeadlineTime(deadlineTimeStr); setDeadlinePopoverOpen(true); }}
                  className="group/deadline flex items-center gap-1 shrink-0 hover:text-foreground transition-colors"
                >
                  <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                  <span>
                    {format(new Date(project.shoot_date + "T00:00:00"), "MMM d")}
                    {project.shoot_time && (() => {
                      const [h, m] = project.shoot_time.split(":").map(Number);
                      const p = h < 12 ? "AM" : "PM";
                      const h12 = h % 12 === 0 ? 12 : h % 12;
                      return ` ${h12}:${String(m).padStart(2,"0")} ${p}`;
                    })()}
                  </span>
                  <Pencil className="h-2 w-2 shrink-0 opacity-0 group-hover/deadline:opacity-60 transition-opacity" />
                </button>
              ) : isGalleryStage && onSetGalleryExpiry ? (
                <button
                  ref={expiryAnchorRef}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setExpiryPopoverOpen(true); }}
                  className="group/expiry flex items-center gap-1 shrink-0 hover:text-foreground transition-colors"
                >
                  <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                  <span>
                    {format(new Date(project.shoot_date + "T00:00:00"), "MMM d")}
                    {project.shoot_time && (() => {
                      const [h, m] = project.shoot_time.split(":").map(Number);
                      const p = h < 12 ? "AM" : "PM";
                      const h12 = h % 12 === 0 ? 12 : h % 12;
                      return ` ${h12}:${String(m).padStart(2,"0")} ${p}`;
                    })()}
                  </span>
                  <Pencil className="h-2 w-2 shrink-0 opacity-0 group-hover/expiry:opacity-60 transition-opacity" />
                </button>
              ) : (
                <span className="flex items-center gap-1 shrink-0">
                  <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                  <span>
                    {format(new Date(project.shoot_date + "T00:00:00"), "MMM d")}
                    {project.shoot_time && (
                      <>{" "}{(() => {
                        const [h, m] = project.shoot_time.split(":").map(Number);
                        const period = h < 12 ? "AM" : "PM";
                        const h12 = h % 12 === 0 ? 12 : h % 12;
                        return `${h12}:${String(m).padStart(2,"0")} ${period}`;
                      })()}</>
                    )}
                  </span>
                </span>
              )}

              {/* Right side: deadline/expiry status badge */}
              {isGalleryStage ? (
                galleryExpiryLabel && galleryExpiryStatus ? (
                  <span className={`flex items-center gap-0.5 shrink-0 font-medium ${DEADLINE_BADGE[galleryExpiryStatus]}`}>
                    {galleryExpiryStatus === "overdue"
                      ? <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                      : <Clock className="h-2.5 w-2.5 shrink-0" />
                    }
                    <span>{p_t.galleryPrefix} {galleryExpiryLabel}</span>
                  </span>
                ) : null
              ) : showDeadlineEditor ? (
                deadlineStatus ? (
                  <span className={`flex items-center gap-0.5 shrink-0 font-medium ${DEADLINE_BADGE[deadlineStatus]}`}>
                    {deadlineStatus === "overdue"
                      ? <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                      : <Timer className="h-2.5 w-2.5 shrink-0" />
                    }
                    <span>{deadlineLabel}</span>
                  </span>
                ) : null
              ) : (effectiveDeadline && deadlineLabel ? (
                <span className={`flex items-center gap-0.5 shrink-0 font-medium ${deadlineStatus ? DEADLINE_BADGE[deadlineStatus] : ""}`}>
                  {deadlineStatus === "overdue"
                    ? <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                    : <Timer className="h-2.5 w-2.5 shrink-0" />
                  }
                  <span>{deadlineLabel}</span>
                </span>
              ) : (upcomingSessionStatus && upcomingSessionLabel ? (
                <span className={`flex items-center gap-0.5 shrink-0 font-medium ${DEADLINE_BADGE[upcomingSessionStatus]}`}>
                  {upcomingSessionStatus === "overdue"
                    ? <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                    : <Clock className="h-2.5 w-2.5 shrink-0" />
                  }
                  <span>{upcomingSessionLabel}</span>
                </span>
              ) : null))}
            </div>
          )}
          {(project.session_title || project.session_type) && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <Camera className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate italic">{project.session_title ?? project.session_type}</span>
            </div>
          )}
        </div>

        {/* Deadline progress bar */}
        {(() => {
          const status = galleryExpiryStatus ?? deadlineStatus ?? upcomingSessionStatus;
          const shootISO = shootDateTime ? shootDateTime.toISOString() : null;
          const deadline = effectiveGalleryExpiry ?? effectiveDeadline ?? (upcomingSessionStatus && shootISO ? shootISO : null);
          // Start anchor: for gallery expiry use shoot_date; for delivery deadlines use created_at
          const startAnchor = (galleryExpiryStatus || upcomingSessionStatus)
            ? (shootISO ?? project.created_at)
            : project.created_at;
          if (!status || !deadline) {
            // Show a subtle warning when this stage expects a deadline but none is set
            const expectsDeadline =
              project.stage === "shot" ||
              project.stage === "post_production" ||
              project.stage === "proof_gallery" ||
              project.stage === "final_gallery" ||
              project.stage === "upcoming";
            if (!expectsDeadline) return null;
            return (
              <div className="mt-3 flex items-center gap-1 text-[9px] text-muted-foreground/60 italic">
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                <span>{(p_t as any).noDeadlineSet ?? "Sem prazo definido"}</span>
              </div>
            );
          }
          const progress = getDeadlineProgress(startAnchor, deadline);
          const barColor = DEADLINE_BAR[status] ?? "bg-border";
          // Label text (days/hours/min left)
          const label = (() => {
            if (!deadline) return null;
            const d = parseISO(deadline);
            const now = new Date();
            if (isPast(d)) return null;
            const diffMs = d.getTime() - now.getTime();
            const mins = Math.round(diffMs / 60000);
            if (mins < 60) return `${Math.max(0, mins)}m`;
            const h = differenceInHours(d, now);
            if (h < 24) return `${h}h`;
            return `${differenceInDays(d, now)}d`;
          })();
          const labelColorClass = DEADLINE_BADGE[status] ?? "text-muted-foreground";
          // Clamp so the label doesn't overflow: min 0, max ~92% to leave room for text
          const clampedPct = Math.min(Math.max(progress, 0), 93);
          return (
            <div className="mt-4 relative w-full">
              {/* track */}
              <div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* floating label at bar tip */}
              {label && (
                <span
                  className={`absolute -top-4 text-[9px] font-semibold leading-none pointer-events-none transition-all duration-500 ${labelColorClass}`}
                  style={{ left: `${clampedPct}%`, transform: "translateX(-50%)" }}
                >
                  {label}
                </span>
              )}
            </div>
          );
        })()}
      </div>

      {/* Deadline popover — portalled to body to escape dnd-kit transform context */}
      {showDeadlineEditor && deadlinePopoverOpen && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999]"
          onClick={(e) => { e.stopPropagation(); setDeadlinePopoverOpen(false); }}
        >
          <div
            className="absolute z-[10000] bg-popover border border-border rounded-md shadow-md p-0 w-auto"
            style={{ top: deadlineAnchorRef.current ? deadlineAnchorRef.current.getBoundingClientRect().bottom + 4 : 0, left: deadlineAnchorRef.current ? deadlineAnchorRef.current.getBoundingClientRect().left : 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Calendar
              mode="single"
              selected={draftDeadlineDate ? parseISO(`${draftDeadlineDate}T${draftDeadlineTime ?? "09:00"}:00`) : undefined}
              onSelect={(d) => setDraftDeadlineDate(d ? format(d, "yyyy-MM-dd") : null)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
            <div className="px-3 pb-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 border border-border rounded-sm p-2 relative z-[10001]">
                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                <TimePickerInput
                  value={draftDeadlineTime ?? "09:00"}
                  onChange={(t) => setDraftDeadlineTime(t)}
                  minuteStep={15}
                  selectZIndex={10002}
                />
              </div>
              <button
                disabled={!draftDeadlineDate}
                onClick={() => { saveDeadline(draftDeadlineDate, draftDeadlineTime ?? "09:00"); setDeadlinePopoverOpen(false); }}
                className="w-full text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-1.5 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {p_t.applyDeadline ?? "Apply"}
              </button>
              {draftDeadlineDate && (
                <button
                  onClick={() => { if (onSetDeadline) onSetDeadline(project.id, null); setDeadlinePopoverOpen(false); }}
                  className="w-full text-[11px] text-destructive/70 hover:text-destructive transition-colors py-1 border border-dashed border-destructive/20 rounded-sm"
                >
                  {p_t.removeDeadline ?? "Remove deadline"}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Gallery expiry popover — portalled to body to escape dnd-kit transform context */}
      {isGalleryStage && expiryPopoverOpen && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999]"
          onClick={(e) => { e.stopPropagation(); setExpiryPopoverOpen(false); }}
        >
          <div
            className="absolute z-[10000] bg-popover border border-border rounded-md shadow-md p-0 w-auto"
            style={{ top: expiryAnchorRef.current ? expiryAnchorRef.current.getBoundingClientRect().bottom + 4 : 0, left: expiryAnchorRef.current ? expiryAnchorRef.current.getBoundingClientRect().left : 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Calendar
              mode="single"
              selected={pickerExpiry}
              onSelect={(d) => { saveExpiry(d ? format(d, "yyyy-MM-dd") : null); setExpiryPopoverOpen(false); }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
            {expiryDateStr && (
              <div className="px-3 pb-3">
                <button
                  onClick={() => { saveExpiry(null); setExpiryPopoverOpen(false); }}
                  className="w-full text-[11px] text-destructive/70 hover:text-destructive transition-colors py-1 border border-dashed border-destructive/20 rounded-sm"
                >
                  {p_t.removeDeadline ?? "Remove expiry"}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
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
  onTogglePause,
  onAddCard,
  shotDeadlineDays,
  onSetShotDeadlineDays,
  postProdDeadlineDays,
  onSetPostProdDeadlineDays,
  proofDeadlineDays,
  onSetProofDeadlineDays,
  finalDeadlineDays,
  onSetFinalDeadlineDays,
  onSetDeadline,
  onSetGalleryExpiry,
}: {
  stage: { key: Stage; label: string; color: string };
  projects: ClientProject[];
  onView: (p: ClientProject) => void;
  onEdit: (p: ClientProject) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onTogglePause?: (id: string, paused: boolean) => void;
  onAddCard: (stage: Stage) => void;
  shotDeadlineDays?: number | null;
  onSetShotDeadlineDays?: (days: number | null) => void;
  postProdDeadlineDays?: number | null;
  onSetPostProdDeadlineDays?: (days: number | null) => void;
  proofDeadlineDays?: number | null;
  onSetProofDeadlineDays?: (days: number | null) => void;
  finalDeadlineDays?: number | null;
  onSetFinalDeadlineDays?: (days: number | null) => void;
  onSetDeadline?: (projectId: string, deadline: string | null) => void;
  onSetGalleryExpiry?: (projectId: string, expiresAt: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  const { t } = useLanguage();
  const [inputVal, setInputVal] = useState(shotDeadlineDays != null ? String(shotDeadlineDays) : "");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [ppInputVal, setPpInputVal] = useState(postProdDeadlineDays != null ? String(postProdDeadlineDays) : "");
  const [ppPopoverOpen, setPpPopoverOpen] = useState(false);
  const [proofInputVal, setProofInputVal] = useState(proofDeadlineDays != null ? String(proofDeadlineDays) : "");
  const [proofPopoverOpen, setProofPopoverOpen] = useState(false);
  const [finalInputVal, setFinalInputVal] = useState(finalDeadlineDays != null ? String(finalDeadlineDays) : "");
  const [finalPopoverOpen, setFinalPopoverOpen] = useState(false);

  const handleDaysCommit = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) onSetShotDeadlineDays?.(n);
    else { onSetShotDeadlineDays?.(null); setInputVal(""); }
  };

  const handlePpDaysCommit = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) onSetPostProdDeadlineDays?.(n);
    else { onSetPostProdDeadlineDays?.(null); setPpInputVal(""); }
  };

  const handleProofDaysCommit = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) onSetProofDeadlineDays?.(n);
    else { onSetProofDeadlineDays?.(null); setProofInputVal(""); }
  };

  const handleFinalDaysCommit = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) onSetFinalDeadlineDays?.(n);
    else { onSetFinalDeadlineDays?.(null); setFinalInputVal(""); }
  };

  // Example date: today + shotDeadlineDays
  const { lang } = useLanguage();
  const dateLocale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-MX" : "en-US";
  const exampleDate = shotDeadlineDays != null
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + shotDeadlineDays);
        return d.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" });
      })()
    : null;

  // Example date: today + postProdDeadlineDays
  const ppExampleDate = postProdDeadlineDays != null
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + postProdDeadlineDays);
        return d.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" });
      })()
    : null;

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* header */}
      <div className="flex items-center justify-between mb-2 px-0.5 h-6">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: stage.color }}
          />
          <span className="text-[10px] tracking-[0.25em] uppercase font-medium truncate">{({ upcoming: t.projects.upcoming, shot: t.projects.shot, proof_gallery: t.projects.proof_gallery, post_production: t.projects.post_production, final_gallery: t.projects.final_gallery } as Record<string,string>)[stage.key] ?? stage.label}</span>
          <span className="text-[10px] text-muted-foreground/60 shrink-0">{projects.length}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Deadline popover — only for "shot" column */}
          {stage.key === "shot" && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                 <button
                   className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] transition-colors ${
                    shotDeadlineDays != null
                       ? "text-purple-500 bg-purple-500/10 hover:bg-purple-500/20"
                       : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40"
                   }`}
                   title={t.projects.deadlineTooltipShot}
                 >
                   <Timer className="h-3 w-3 shrink-0" />
                   {shotDeadlineDays != null && <span>{shotDeadlineDays}d</span>}
                 </button>
               </PopoverTrigger>
               <PopoverContent side="bottom" align="end" className="w-64 p-4 flex flex-col gap-3">
                 <div>
                   <p className="text-xs font-semibold">{t.projects.shotDeadlineTitle}</p>
                   <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                     {t.projects.shotDeadlineDesc}
                   </p>
                 </div>
                 <div className="flex items-center gap-2">
                   <input
                     type="number"
                     min={1}
                     max={365}
                     value={inputVal}
                     onChange={(e) => setInputVal(e.target.value)}
                     onBlur={() => handleDaysCommit(inputVal)}
                     onKeyDown={(e) => {
                       if (e.key === "Enter") {
                         handleDaysCommit(inputVal);
                         setPopoverOpen(false);
                       }
                     }}
                     placeholder="ex: 7"
                     className="w-16 h-8 text-center text-sm border border-border rounded-sm bg-background focus:outline-none focus:border-foreground/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                   />
                   <span className="text-sm text-muted-foreground">{t.projects.daysAfterSession}</span>
                 </div>
                 {shotDeadlineDays != null && exampleDate && (
                   <p className="text-[11px] text-muted-foreground italic">
                     {t.projects.deadlineExample(exampleDate).split(exampleDate).map((part, i, arr) =>
                       i < arr.length - 1
                         ? <>{part}<span className="font-medium not-italic text-foreground">{exampleDate}</span></>
                         : part
                     )}
                   </p>
                 )}
                 {shotDeadlineDays != null && (
                   <button
                     onClick={() => { onSetShotDeadlineDays?.(null); setInputVal(""); setPopoverOpen(false); }}
                     className="text-[11px] text-destructive/70 hover:text-destructive text-left transition-colors"
                   >
                     {t.projects.removeDeadline}
                   </button>
                 )}
              </PopoverContent>
            </Popover>
          )}
          {/* Deadline popover — only for "post_production" column */}
          {stage.key === "post_production" && (
            <Popover open={ppPopoverOpen} onOpenChange={setPpPopoverOpen}>
              <PopoverTrigger asChild>
                 <button
                   className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] transition-colors ${postProdDeadlineDays != null ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20" : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40"}`}
                   title={t.projects.deadlineTooltipPostProd}
                 >
                   <Timer className="h-3 w-3 shrink-0" />
                   {postProdDeadlineDays != null && <span>{postProdDeadlineDays}d</span>}
                 </button>
               </PopoverTrigger>
               <PopoverContent side="bottom" align="end" className="w-64 p-4 flex flex-col gap-3">
                 <div>
                   <p className="text-xs font-semibold">{t.projects.postProdDeadlineTitle}</p>
                   <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                     {t.projects.postProdDeadlineDesc}
                   </p>
                 </div>
                 <div className="flex items-center gap-2">
                   <input
                     type="number"
                     min={1}
                     max={365}
                     value={ppInputVal}
                     onChange={(e) => setPpInputVal(e.target.value)}
                     onBlur={() => handlePpDaysCommit(ppInputVal)}
                     onKeyDown={(e) => {
                       if (e.key === "Enter") {
                         handlePpDaysCommit(ppInputVal);
                         setPpPopoverOpen(false);
                       }
                     }}
                     placeholder="ex: 30"
                     className="w-16 h-8 text-center text-sm border border-border rounded-sm bg-background focus:outline-none focus:border-foreground/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                   />
                   <span className="text-sm text-muted-foreground">{t.projects.daysAfterSession}</span>
                 </div>
                 {postProdDeadlineDays != null && ppExampleDate && (
                   <p className="text-[11px] text-muted-foreground italic">
                     {t.projects.deadlineExample(ppExampleDate).split(ppExampleDate).map((part, i, arr) =>
                       i < arr.length - 1
                         ? <>{part}<span className="font-medium not-italic text-foreground">{ppExampleDate}</span></>
                         : part
                     )}
                   </p>
                 )}
                 {postProdDeadlineDays != null && (
                   <button
                     onClick={() => { onSetPostProdDeadlineDays?.(null); setPpInputVal(""); setPpPopoverOpen(false); }}
                     className="text-[11px] text-destructive/70 hover:text-destructive text-left transition-colors"
                   >
                     {t.projects.removeDeadline}
                   </button>
                 )}
              </PopoverContent>
            </Popover>
          )}
          {/* Deadline popover — proof_gallery / final_gallery columns */}
          {(stage.key === "proof_gallery" || stage.key === "final_gallery") && (() => {
            const isProof = stage.key === "proof_gallery";
            const days = isProof ? proofDeadlineDays : finalDeadlineDays;
            const inputVal2 = isProof ? proofInputVal : finalInputVal;
            const setInputVal2 = isProof ? setProofInputVal : setFinalInputVal;
            const open = isProof ? proofPopoverOpen : finalPopoverOpen;
            const setOpen = isProof ? setProofPopoverOpen : setFinalPopoverOpen;
            const commit = isProof ? handleProofDaysCommit : handleFinalDaysCommit;
            const onClear = isProof ? onSetProofDeadlineDays : onSetFinalDeadlineDays;
            const colorClass = isProof
              ? "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20"
              : "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20";
            return (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] transition-colors ${
                      days != null ? colorClass : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40"
                    }`}
                    title={t.projects.deadlineTooltipPostProd}
                  >
                    <Timer className="h-3 w-3 shrink-0" />
                    {days != null && <span>{days}d</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-64 p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-semibold">
                      {isProof ? t.projects.proof_gallery : t.projects.final_gallery}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {t.projects.postProdDeadlineDesc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={inputVal2}
                      onChange={(e) => setInputVal2(e.target.value)}
                      onBlur={() => commit(inputVal2)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          commit(inputVal2);
                          setOpen(false);
                        }
                      }}
                      placeholder={isProof ? "ex: 14" : "ex: 60"}
                      className="w-16 h-8 text-center text-sm border border-border rounded-sm bg-background focus:outline-none focus:border-foreground/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-sm text-muted-foreground">{t.projects.daysAfterSession}</span>
                  </div>
                  {days != null && (
                    <button
                      onClick={() => { onClear?.(null); setInputVal2(""); setOpen(false); }}
                      className="text-[11px] text-destructive/70 hover:text-destructive text-left transition-colors"
                    >
                      {t.projects.removeDeadline}
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            );
          })()}
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
        className={`flex flex-col gap-2 min-h-[60px] rounded-sm transition-colors ${
          isOver ? "bg-muted/40 ring-1 ring-border" : ""
        }`}
      >
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map((p) => (
            <KanbanCard key={p.id} project={p} onView={onView} onEdit={onEdit} onDelete={onDelete} onArchive={onArchive} onTogglePause={onTogglePause} shotDeadlineDays={shotDeadlineDays} postProdDeadlineDays={postProdDeadlineDays} proofDeadlineDays={proofDeadlineDays} finalDeadlineDays={finalDeadlineDays} onSetDeadline={onSetDeadline} onSetGalleryExpiry={onSetGalleryExpiry} />
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
  const [shootTime, setShootTime] = useState("09:00");
  const [stage, setStage] = useState<Stage>("upcoming");
  const [notes, setNotes] = useState("");

  const stageLabels: Record<string, string> = {
    upcoming: p_t.upcoming, shot: p_t.shot, proof_gallery: p_t.proof_gallery,
    post_production: p_t.post_production, final_gallery: p_t.final_gallery,
  };

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setClientName(initial?.client_name ?? "");
      setClientEmail(initial?.client_email ?? "");
      const matched = sessionTypes.find((s) => s.name === initial?.session_type);
      setSessionTypeId(matched?.id ?? null);
      setShootDate(initial?.shoot_date ?? "");
      setShootTime(initial?.shoot_time ?? "09:00");
      setStage(initial?.stage ?? defaultStage ?? "upcoming");
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial, defaultStage, sessionTypes]);

  const handleSave = () => {
    if (!title.trim()) { toast.error(p_t.titleRequired); return; }
    const resolvedName = sessionTypes.find((s) => s.id === sessionTypeId)?.name ?? null;
    onSave({ title, client_name: clientName, client_email: clientEmail || null, session_type: resolvedName, shoot_date: shootDate || null, shoot_time: shootDate ? shootTime : null, stage, notes: notes || null });
  };

  const isCreate = !initial;
  const handleCreateSimple = () => {
    const name = clientName.trim();
    if (!name) { toast.error(p_t.clientName); return; }
    onSave({
      title: name,
      client_name: name,
      client_email: clientEmail.trim() || null,
      stage: defaultStage ?? "upcoming",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-light tracking-widest uppercase">
            {initial ? p_t.editProject : p_t.newProject}
          </DialogTitle>
        </DialogHeader>

        {isCreate ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{p_t.clientName} *</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ana Lima" autoFocus />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{p_t.email}</label>
              <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="ana@email.com" type="email" />
            </div>
          </div>
        ) : (
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
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground">{(p_t as any).time ?? "Time"}</label>
              <TimePickerInput value={shootTime} onChange={setShootTime} />
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
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{p_t.cancel}</Button>
          <Button size="sm" onClick={isCreate ? handleCreateSimple : handleSave}>{initial ? p_t.save : p_t.create}</Button>
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
  hideActive = false,
}: {
  projects: ClientProject[];
  onEdit: (p: ClientProject) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  showArchived: boolean;
  hideActive?: boolean;
}) {
  const { t } = useLanguage();
  const p_t = t.projects;
  const stageLabels: Record<string, string> = {
    upcoming: p_t.upcoming, shot: p_t.shot, proof_gallery: p_t.proof_gallery,
    post_production: p_t.post_production, final_gallery: p_t.final_gallery,
  };

  const active = [...projects.filter((p) => p.stage !== "archived")].sort((a, b) => {
    const si = STAGES.findIndex((s) => s.key === a.stage);
    const sj = STAGES.findIndex((s) => s.key === b.stage);
    if (si !== sj) return si - sj;
    // Within same stage, sort by date ascending
    const dateA = a.shoot_date;
    const dateB = b.shoot_date;
    if (dateA && dateB) {
      const cmpDate = dateA.localeCompare(dateB);
      if (cmpDate !== 0) return cmpDate;
      const timeA = a.shoot_time || "00:00";
      const timeB = b.shoot_time || "00:00";
      return timeA.localeCompare(timeB);
    }
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
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
          <ConfirmDeleteButton
            projectTitle={p.client_name || p.title}
            onDelete={() => onDelete(p.id)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {!hideActive && <div className="border border-border rounded-sm overflow-hidden">
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
      </div>}

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
  onView,
  onUnarchive,
  onDelete,
}: {
  projects: ClientProject[];
  onView: (p: ClientProject) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLanguage();
  const p_t = t.projects;
  return (
    <div className="mt-6 border border-border/50 rounded-sm overflow-hidden">
      <div className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border/40">
        <Archive className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] tracking-[0.25em] uppercase font-medium text-muted-foreground">{p_t.archived}</span>
        <span className="text-[10px] text-muted-foreground/50 ml-1">{projects.length}</span>
      </div>
      {projects.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground/50 tracking-widest uppercase">{p_t.noArchivedProjects}</div>
      ) : (
        <div className="flex flex-wrap gap-3 p-4 bg-background">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => onView(p)}
              className="group border border-border/50 bg-muted/10 rounded-sm p-3 w-[260px] flex flex-col gap-2 opacity-70 hover:opacity-100 hover:border-foreground/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-1">
                <p className="flex-1 text-xs font-medium leading-snug line-clamp-2 text-muted-foreground">{p.title}</p>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button className="p-0.5 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onUnarchive(p.id); }} title={p_t.showArchived}>
                    <ArchiveRestore className="h-3 w-3" />
                  </button>
                  <ConfirmDeleteButton
                    projectTitle={p.client_name || p.title}
                    onDelete={() => onDelete(p.id)}
                    compact
                  />
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
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProject | null>(null);
  const [defaultStage, setDefaultStage] = useState<Stage>("upcoming");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL-persisted filters (survive reload / back-forward) ──────────────────
  const VALID_STAGES: (Stage | "all")[] = ["all", "upcoming", "shot", "proof_gallery", "post_production", "final_gallery", "archived"];
  const initialStageParam = searchParams.get("stage") as Stage | "all" | null;
  const initialStage: Stage | "all" = initialStageParam && VALID_STAGES.includes(initialStageParam) ? initialStageParam : "all";
  const initialView = searchParams.get("view") === "list" ? "list" : "kanban";
  const initialArchived = searchParams.get("archived") === "1" || initialStage === "archived";

  const [view, setView] = useState<"kanban" | "list">(initialView);
  const [showArchived, setShowArchived] = useState(initialArchived);
  const [showPausedOnly, setShowPausedOnly] = useState(false);
  const [activeStageFilter, setActiveStageFilter] = useState<Stage | "all">(initialStage);

  // Keep the URL in sync whenever filter state changes
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (view === "kanban") next.delete("view"); else next.set("view", view);
    if (activeStageFilter === "all") next.delete("stage"); else next.set("stage", activeStageFilter);
    if (showArchived && activeStageFilter !== "archived") next.set("archived", "1"); else next.delete("archived");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, showArchived, activeStageFilter]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [sheetProject, setSheetProject] = useState<ClientProject | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Column-level deadline for "shot" stage (days after shoot) — persisted in localStorage
  const [shotDeadlineDays, setShotDeadlineDays] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("shot_gallery_deadline_days");
      const n = v ? parseInt(v, 10) : NaN;
      return isNaN(n) ? null : n;
    } catch { return null; }
  });

  const handleSetShotDeadlineDays = (days: number | null) => {
    setShotDeadlineDays(days);
    try {
      if (days != null) localStorage.setItem("shot_gallery_deadline_days", String(days));
      else localStorage.removeItem("shot_gallery_deadline_days");
    } catch { /* ignore */ }
  };

  // Column-level deadline for "post_production" stage — persisted in localStorage
  const [postProdDeadlineDays, setPostProdDeadlineDays] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("post_prod_deadline_days");
      const n = v ? parseInt(v, 10) : NaN;
      return isNaN(n) ? null : n;
    } catch { return null; }
  });

  const handleSetPostProdDeadlineDays = (days: number | null) => {
    setPostProdDeadlineDays(days);
    try {
      if (days != null) localStorage.setItem("post_prod_deadline_days", String(days));
      else localStorage.removeItem("post_prod_deadline_days");
    } catch { /* ignore */ }
  };

  // Column-level deadline for proof_gallery and final_gallery stages
  const [proofDeadlineDays, setProofDeadlineDays] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("proof_gallery_deadline_days");
      const n = v ? parseInt(v, 10) : NaN;
      return isNaN(n) ? null : n;
    } catch { return null; }
  });
  const handleSetProofDeadlineDays = (days: number | null) => {
    setProofDeadlineDays(days);
    try {
      if (days != null) localStorage.setItem("proof_gallery_deadline_days", String(days));
      else localStorage.removeItem("proof_gallery_deadline_days");
    } catch { /* ignore */ }
  };
  const [finalDeadlineDays, setFinalDeadlineDays] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("final_gallery_deadline_days");
      const n = v ? parseInt(v, 10) : NaN;
      return isNaN(n) ? null : n;
    } catch { return null; }
  });
  const handleSetFinalDeadlineDays = (days: number | null) => {
    setFinalDeadlineDays(days);
    try {
      if (days != null) localStorage.setItem("final_gallery_deadline_days", String(days));
      else localStorage.removeItem("final_gallery_deadline_days");
    } catch { /* ignore */ }
  };

  const handleSetDeadline = async (projectId: string, deadline: string | null) => {
    // Optimistic update — card refreshes immediately before DB confirms
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, gallery_deadline: deadline } : p));
    const { error } = await supabase
      .from("client_projects" as any)
      .update({ gallery_deadline: deadline } as any)
      .eq("id", projectId);
    if (error) { toast.error("Erro ao salvar prazo: " + error.message); }
  };

  const handleSetGalleryExpiry = async (projectId: string, expiresAt: string | null) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project?.booking_id) { toast.error("Galeria não vinculada a um agendamento."); return; }
    // Force end-of-day (23:59:59.999) per contractual rule
    let normalized: string | null = null;
    if (expiresAt) {
      const datePart = expiresAt.substring(0, 10);
      const d = new Date(`${datePart}T00:00:00`);
      d.setHours(23, 59, 59, 999);
      normalized = d.toISOString();
    }
    const { error } = await supabase
      .from("galleries" as any)
      .update({ expires_at: normalized } as any)
      .eq("booking_id", project.booking_id);
    if (error) { toast.error("Erro ao salvar expiração: " + error.message); return; }
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, gallery_expires_at: normalized } : p));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
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

  const fetchProjects = useCallback(async (silent = false) => {
    if (!photographerId) return;
    if (silent) setRefreshing(true);

    // 1. Fetch existing projects
    const { data: existingProjects, error } = await supabase
      .from("client_projects" as any)
      .select("*, bookings(session_availability(start_time), sessions(title), client_name, client_email, booked_date, session_id)")
      .eq("photographer_id", photographerId)
      .order("position", { ascending: true });

    // 2. Fetch confirmed bookings that don't have a project yet
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, booked_date, session_id, contract_html_snapshot, contract_signed_at, contract_signed_ip, contract_signed_user_agent, contract_locked, sessions(title, session_type_id), session_availability(start_time)")
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
        shoot_time: (b.session_availability as any)?.start_time?.slice(0, 5) ?? null,
        position: (existingProjects?.length ?? 0) + i,
        signed_contract_html: b.contract_locked ? b.contract_html_snapshot ?? null : null,
        contract_signed_at: b.contract_signed_at ?? null,
        contract_signed_ip: b.contract_signed_ip ?? null,
        contract_signed_user_agent: b.contract_signed_user_agent ?? null,
      }));
      await supabase.from("client_projects" as any).insert(toInsert as any);
    }

    // 4. Reload after potential inserts — also fetch duration + availability start_time for auto-advance
    const { data: allProjects } = await supabase
      .from("client_projects" as any)
        .select("*, bookings(sessions(title, duration_minutes), session_availability(start_time, end_time), client_name, client_email, booked_date, status)")
      .eq("photographer_id", photographerId)
      .order("position", { ascending: true });

    if (allProjects) {
      // 5. Fetch gallery covers for projects with a booking_id OR linked via project_id
      const bookingIds = (allProjects as any[])
        .map((p) => p.booking_id)
        .filter(Boolean);
      const projectIds = (allProjects as any[]).map((p) => p.id).filter(Boolean);

      // Per-category maps so the final_gallery column shows the final gallery's
      // cover/expiry and proof_gallery shows the proof gallery's data.
      const coverByBooking: Record<"proof" | "final", Record<string, string>> = { proof: {}, final: {} };
      const expiryByBooking: Record<"proof" | "final", Record<string, string>> = { proof: {}, final: {} };
      const coverByProject: Record<"proof" | "final", Record<string, string>> = { proof: {}, final: {} };
      const expiryByProject: Record<"proof" | "final", Record<string, string>> = { proof: {}, final: {} };
      const proofByProject = new Set<string>();
      const finalByProject = new Set<string>();
      if (bookingIds.length > 0 || projectIds.length > 0) {
        const orFilter = [
          bookingIds.length > 0 ? `booking_id.in.(${bookingIds.join(",")})` : null,
          projectIds.length > 0 ? `project_id.in.(${projectIds.join(",")})` : null,
        ].filter(Boolean).join(",");
        const { data: galleries } = await supabase
          .from("galleries")
          .select("booking_id, project_id, cover_image_url, category, status, expires_at")
          .or(orFilter);

        if (galleries) {
          for (const g of galleries as any[]) {
            const cat: "proof" | "final" | null =
              g.category === "final" ? "final" : g.category === "proof" ? "proof" : null;
            if (!cat) continue;
            if (g.project_id) {
              if (g.cover_image_url && g.status !== "expired") {
                coverByProject[cat][g.project_id] = g.cover_image_url;
              }
              if (g.expires_at) expiryByProject[cat][g.project_id] = g.expires_at;
              if (cat === "proof") proofByProject.add(g.project_id);
              if (cat === "final") finalByProject.add(g.project_id);
            }
            if (g.booking_id) {
              if (g.cover_image_url && g.status !== "expired") {
                coverByBooking[cat][g.booking_id] = g.cover_image_url;
              }
              if (g.expires_at) expiryByBooking[cat][g.booking_id] = g.expires_at;
            }
          }
        }

        // Build set of booking_ids that have a proof / final gallery
        const proofGalleryBookings = new Set<string>(Object.keys(coverByBooking.proof).concat(Object.keys(expiryByBooking.proof)));
        const finalGalleryBookings = new Set<string>(Object.keys(coverByBooking.final).concat(Object.keys(expiryByBooking.final)));
        if (galleries) {
          for (const g of galleries as any[]) {
            if (g.booking_id && g.category === "proof") proofGalleryBookings.add(g.booking_id);
            if (g.booking_id && g.category === "final") finalGalleryBookings.add(g.booking_id);
          }
        }

        // Auto-advance "shot" → "proof_gallery" when a proof gallery is linked
        const toProofGallery: string[] = [];
        for (const p of (allProjects as any[])) {
          if (p.stage !== "shot") continue;
          if ((p.booking_id && proofGalleryBookings.has(p.booking_id)) || proofByProject.has(p.id)) {
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

        // Auto-advance to "final_gallery" when a final gallery is linked (from any stage except final/archived)
        const toFinalGallery: string[] = [];
        for (const p of (allProjects as any[])) {
          if (p.stage === "final_gallery" || p.stage === "archived") continue;
          if ((p.booking_id && finalGalleryBookings.has(p.booking_id)) || finalByProject.has(p.id)) {
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

      const mapped = (allProjects as any[]).map((p) => {
        // Derive shoot_time from availability if not set on the project
        const availStartTime = (p.bookings as any)?.session_availability?.start_time?.slice(0, 5) ?? null;
        // Pick the gallery category that matches the project's current stage so
        // each column displays the correct gallery cover and expiration.
        const cat: "proof" | "final" =
          p.stage === "final_gallery" ? "final" : "proof";
        const pickCover = (c: "proof" | "final") =>
          coverByProject[c][p.id] ??
          (p.booking_id ? coverByBooking[c][p.booking_id] ?? null : null);
        const pickExpiry = (c: "proof" | "final") =>
          expiryByProject[c][p.id] ??
          (p.booking_id ? expiryByBooking[c][p.booking_id] ?? null : null);

        // Prefer the category for the stage; fall back to the other if missing.
        const cover = pickCover(cat) ?? pickCover(cat === "final" ? "proof" : "final");
        const expiry = pickExpiry(cat) ?? pickExpiry(cat === "final" ? "proof" : "final");
        return {
          ...p,
          shoot_time: p.shoot_time ?? availStartTime,
          session_title: (p.bookings as any)?.sessions?.title ?? null,
          session_duration_minutes: (p.bookings as any)?.sessions?.duration_minutes ?? null,
          gallery_cover_url: cover,
          gallery_deadline: p.gallery_deadline ?? null,
          gallery_expires_at: expiry,

          location: p.location ?? null,
          description: p.description ?? null,
          client_phone: p.client_phone ?? null,
        };
      });

      // 6. Auto-advance "upcoming" → "shot" when session has ended
      const now = new Date();
      const toAdvance: string[] = [];

      for (const p of mapped) {
        if (p.stage !== "upcoming") continue;
        if (p.is_paused) continue;

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
          // Skip auto-advance if user manually moved the card back after the session ended
          const updatedAt = p.updated_at ? new Date(p.updated_at) : null;
          if (updatedAt && updatedAt > sessionEnd) continue;
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
    if (silent) setRefreshing(false);
  }, [photographerId]);

  // Realtime subscription — refetch on any change to client_projects, bookings or galleries
  useEffect(() => {
    if (!photographerId) return;
    fetchProjects();
    fetchSessionTypes();

    const channel = supabase
      .channel("projects-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_projects", filter: `photographer_id=eq.${photographerId}` }, () => fetchProjects(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings",         filter: `photographer_id=eq.${photographerId}` }, () => fetchProjects(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "galleries",        filter: `photographer_id=eq.${photographerId}` }, () => fetchProjects(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [photographerId]);

  // Auto-advance upcoming → shot every 30s while page is open
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const toAdvance: string[] = [];

      for (const p of projects) {
        if (p.stage !== "upcoming") continue;
        if (p.is_paused) continue;

        let sessionEnd: Date | null = null;
        if (p.shoot_date && p.shoot_time) {
          const start = new Date(`${p.shoot_date}T${p.shoot_time}`);
          if (!isNaN(start.getTime())) {
            const durationMin = p.session_duration_minutes ?? 0;
            sessionEnd = new Date(start.getTime() + durationMin * 60 * 1000);
          }
        } else if (p.shoot_date) {
          const d = new Date(p.shoot_date + "T23:59:59");
          if (!isNaN(d.getTime())) sessionEnd = d;
        }

        if (sessionEnd && sessionEnd <= now) {
          // Skip if user manually moved the card after the session ended
          const updatedAt = p.updated_at ? new Date(p.updated_at) : null;
          if (updatedAt && updatedAt > sessionEnd) continue;
          toAdvance.push(p.id);
        }
      }

      if (toAdvance.length > 0) {
        setProjects((prev) =>
          prev.map((p) => toAdvance.includes(p.id) ? { ...p, stage: "shot" as Stage } : p)
        );
        supabase
          .from("client_projects" as any)
          .update({ stage: "shot" } as any)
          .in("id", toAdvance)
          .then();
      }
    }, 30_000); // check every 30 seconds

    return () => clearInterval(interval);
  }, [projects]);

  const projectsByStage = (stage: Stage) =>
    projects
      .filter((p) => p.stage === stage)
      .filter((p) => (showPausedOnly ? !!p.is_paused : true))
      .sort((a, b) => {
        // Paused always last
        if (!!a.is_paused !== !!b.is_paused) return a.is_paused ? 1 : -1;
        // Primary sort: shoot_date ascending (nulls last)
        const dateA = a.shoot_date;
        const dateB = b.shoot_date;
        if (dateA && dateB) {
          const cmpDate = dateA.localeCompare(dateB);
          if (cmpDate !== 0) return cmpDate;
          const timeA = a.shoot_time || "00:00";
          const timeB = b.shoot_time || "00:00";
          const cmpTime = timeA.localeCompare(timeB);
          if (cmpTime !== 0) return cmpTime;
        }
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return a.position - b.position;
      });

  const activeStages = STAGES.filter((s) => s.key !== "archived");
  const visibleStages = activeStageFilter === "all"
    ? activeStages
    : activeStages.filter((s) => s.key === activeStageFilter);
  const visibleProjects = activeStageFilter === "all"
    ? projects
    : projects.filter((p) => p.stage === activeStageFilter || (showArchived && p.stage === "archived"));

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

    if (activeProj.stage !== newStage) {
      const stageLabel = (STAGES.find((s) => s.key === newStage)?.label) ?? newStage;
      toast.success(`Movido para ${stageLabel}`);
    }
  };

  const openAdd = (stage: Stage) => {
    setEditing(null);
    setDefaultStage(stage);
    setModalOpen(true);
  };

  const openEdit = (p: ClientProject) => {
    openView(p);
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
    // Validate scheduling conflicts whenever a shoot date is set/changed.
    const targetDate = (data as any).shoot_date ?? editing?.shoot_date ?? null;
    const rawTargetTime = (data as any).shoot_time ?? editing?.shoot_time ?? null;
    const targetTime = rawTargetTime ?? "09:00";
    const sessTitle = (data as any).session_type ?? editing?.session_type ?? null;
    if (rawTargetTime && !targetDate) {
      toast.error("Selecione uma data antes de salvar o horário.");
      return;
    }
    if (targetDate) {
      let duration = 60;
      if (sessTitle && user?.id) {
        const { data: sess } = await (supabase as any)
          .from("sessions")
          .select("duration_minutes")
          .eq("photographer_id", user.id)
          .eq("title", sessTitle)
          .maybeSingle();
        if (sess?.duration_minutes) duration = sess.duration_minutes;
      }
      const totalMins = timeToMinutes(targetTime) + duration;
      const endTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;
      const conflict = await checkBookingConflict(
        user!.id,
        targetDate,
        targetTime,
        endTime,
        editing?.booking_id ?? undefined,
        editing?.id ?? undefined,
      );
      if (conflict.hasConflict) {
        toast.error(conflict.conflictDetails || "Time conflict detected");
        return;
      }
      if (!editing) {
        const localConflict = projects.find((p) => {
          if (p.stage === "archived" || !p.shoot_date || p.shoot_date !== targetDate) return false;
          const existingTime = p.shoot_time?.slice(0, 5) ?? (p.booking_id ? (p as any).bookings?.session_availability?.start_time?.slice(0, 5) : null);
          if (!existingTime) return false;
          const existingDuration = Number((p as any).bookings?.sessions?.duration_minutes ?? 60);
          const existingTotal = timeToMinutes(existingTime) + existingDuration;
          const existingEnd = `${String(Math.floor(existingTotal / 60) % 24).padStart(2, "0")}:${String(existingTotal % 60).padStart(2, "0")}`;
          return timeToMinutes(targetTime) < timeToMinutes(existingEnd) && totalMins > timeToMinutes(existingTime);
        });
        if (localConflict) {
          toast.error(`Conflita com ${localConflict.client_name || localConflict.title} (${localConflict.shoot_time ?? "horário existente"})`);
          return;
        }
      }
    }

    if (editing) {
      const { error } = await supabase
        .from("client_projects" as any)
        .update(data as any)
        .eq("id", editing.id);
      if (error) { toast.error(p_t.failedToUpdate); return; }
      toast.success(p_t.projectUpdated);
    } else {
      const stageProjects = projects.filter((p) => p.stage === data.stage);
      const { data: created, error } = await supabase
        .from("client_projects" as any)
        .insert({
          ...data,
          photographer_id: user?.id,
          position: stageProjects.length,
        } as any)
        .select()
        .single();
      if (error) { toast.error(p_t.failedToCreate); return; }
      toast.success(p_t.projectCreated);
      setModalOpen(false);
      await fetchProjects();
      if (created) {
        setSheetProject(created as unknown as ClientProject);
        setSheetOpen(true);
      }
      return;
    }
    setModalOpen(false);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("client_projects" as any).delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success(p_t.projectRemoved);
  };

  const handleTogglePause = async (id: string, paused: boolean) => {
    await supabase.from("client_projects" as any).update({ is_paused: paused } as any).eq("id", id);
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, is_paused: paused } : p));
    setSheetProject((prev) => prev?.id === id ? { ...prev, is_paused: paused } : prev);
    toast.success(paused ? "Sessão pausada — aguardando reagendamento" : "Sessão retomada");
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
                  variant="outline"
                  size="sm"
                  onClick={() => fetchProjects(true)}
                  disabled={refreshing}
                  className="gap-1.5 text-xs tracking-wider uppercase font-light"
                  title={p_t.refresh ?? "Refresh"}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
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
              {activeStages.map((s) => {
                const count = projectsByStage(s.key).length;
                const stageLabel = ({ upcoming: p_t.upcoming, shot: p_t.shot, proof_gallery: p_t.proof_gallery, post_production: p_t.post_production, final_gallery: p_t.final_gallery } as Record<string,string>)[s.key] ?? s.label;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setShowArchived(false);
                      setActiveStageFilter((current) => current === s.key ? "all" : s.key);
                    }}
                    className={`flex items-center gap-1.5 border rounded-sm px-2 py-0.5 text-[10px] tracking-wider uppercase transition-all ${STAGE_COLORS[s.key]} ${activeStageFilter === s.key ? "ring-1 ring-foreground/40" : "opacity-70 hover:opacity-100"}`}
                  >
                    <span>{stageLabel}</span>
                    <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2">
                {(activeStageFilter !== "all" || showArchived || showPausedOnly) && (
                  <button
                    onClick={() => {
                      setActiveStageFilter("all");
                      setShowArchived(false);
                      setShowPausedOnly(false);
                    }}
                    className="flex items-center gap-1.5 border border-border/50 rounded-sm px-2.5 py-0.5 text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <X className="h-3 w-3" />
                    <span>{(p_t as any).clearFilters ?? "Limpar filtros"}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowPausedOnly((v) => {
                      const next = !v;
                      if (next) { setShowArchived(false); setActiveStageFilter("upcoming"); }
                      return next;
                    });
                  }}
                  className={`flex items-center gap-1.5 border rounded-sm px-2.5 py-0.5 text-[10px] tracking-wider uppercase transition-colors ${
                    showPausedOnly
                      ? "bg-muted text-foreground border-border"
                      : "text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                  }`}
                >
                  <Pause className="h-3 w-3" />
                  <span>Pausadas</span>
                  <span className="opacity-60">{projects.filter((p) => p.is_paused && p.stage !== "archived").length}</span>
                </button>
                <button
                  onClick={() => {
                    setShowArchived((v) => {
                      const next = !v;
                      setActiveStageFilter(next ? "archived" : "all");
                      return next;
                    });
                  }}
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
                  projects={visibleProjects}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  showArchived={showArchived || activeStageFilter === "archived"}
                  hideActive={activeStageFilter === "archived"}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto px-6 md:px-10 pb-8">
                {activeStageFilter !== "archived" && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex gap-4 h-full items-start">
                      {visibleStages.map((s) => (
                        <KanbanColumn
                          key={s.key}
                          stage={s}
                          projects={projectsByStage(s.key)}
                          onView={openView}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onArchive={handleArchive}
                          onTogglePause={s.key === "upcoming" ? handleTogglePause : undefined}
                          onAddCard={openAdd}
                          shotDeadlineDays={s.key === "shot" ? shotDeadlineDays : undefined}
                          onSetShotDeadlineDays={s.key === "shot" ? handleSetShotDeadlineDays : undefined}
                          postProdDeadlineDays={s.key === "post_production" ? postProdDeadlineDays : undefined}
                          onSetPostProdDeadlineDays={s.key === "post_production" ? handleSetPostProdDeadlineDays : undefined}
                          proofDeadlineDays={proofDeadlineDays}
                          onSetProofDeadlineDays={s.key === "proof_gallery" ? handleSetProofDeadlineDays : undefined}
                          finalDeadlineDays={finalDeadlineDays}
                          onSetFinalDeadlineDays={s.key === "final_gallery" ? handleSetFinalDeadlineDays : undefined}
                          onSetDeadline={handleSetDeadline}
                          onSetGalleryExpiry={(s.key === "proof_gallery" || s.key === "final_gallery") ? handleSetGalleryExpiry : undefined}
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
                )}

                {/* Archived section in kanban — shown when toggle is on or filter is set to archived */}
                {(showArchived || activeStageFilter === "archived") && (
                  <ArchivedKanbanSection
                    projects={projectsByStage("archived")}
                    onView={openView}
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
