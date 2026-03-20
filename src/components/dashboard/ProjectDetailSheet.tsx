import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";
import {
  Trash2, Archive, ArchiveRestore, Camera,
  Pencil, Check, X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Stage = "upcoming" | "shot" | "proof_gallery" | "post_production" | "final_gallery" | "archived";

const STAGES: { key: Stage; label: string }[] = [
  { key: "upcoming",        label: "Próximas sessões" },
  { key: "shot",            label: "Fotografadas" },
  { key: "proof_gallery",   label: "Galeria de provas" },
  { key: "post_production", label: "Pós produção" },
  { key: "final_gallery",   label: "Galeria final" },
];

const STAGE_COLORS: Record<Stage, string> = {
  upcoming:        "bg-muted/60 text-muted-foreground border-border",
  shot:            "bg-purple-500/10 text-purple-600 border-purple-500/20",
  proof_gallery:   "bg-orange-500/10 text-orange-600 border-orange-500/20",
  post_production: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  final_gallery:   "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  archived:        "bg-muted/40 text-muted-foreground/60 border-border/50",
};

export interface ProjectSheetData {
  id: string;
  photographer_id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  session_type: string | null;
  session_title?: string | null;
  booking_id: string | null;
  stage: Stage;
  notes: string | null;
  shoot_date: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  project: ProjectSheetData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: Partial<ProjectSheetData>) => Promise<void>;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onOpenEdit: (p: ProjectSheetData) => void;
  photographerId: string;
  sessionTypes: SessionType[];
  onRefetchSessionTypes: () => void;
}

// Inline editable field
function InlineField({
  label,
  value,
  placeholder,
  onSave,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(value); setEditing(false); }
            }}
            className="h-7 text-sm"
            autoFocus
          />
          <button onClick={commit} className="text-muted-foreground hover:text-foreground transition-colors">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setDraft(value); setEditing(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">{label}</Label>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex items-center justify-between text-sm text-left border border-transparent hover:border-border rounded-sm px-2 py-1 -mx-2 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/50 italic text-xs"}>
          {value || placeholder || "—"}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
      </button>
    </div>
  );
}

export function ProjectDetailSheet({
  project,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onArchive,
  onUnarchive,
  photographerId,
  sessionTypes,
  onRefetchSessionTypes,
}: Props) {
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    const matched = sessionTypes.find((t) => t.name === project.session_type);
    setSessionTypeId(matched?.id ?? null);
  }, [project?.id, project?.session_type, sessionTypes]);

  if (!project) return null;

  const isArchived = project.stage === "archived";

  const save = async (data: Partial<ProjectSheetData>) => {
    await onUpdate(project.id, data);
  };

  const handleSessionTypeChange = async (id: string | null) => {
    setSessionTypeId(id);
    const name = sessionTypes.find((t) => t.id === id)?.name ?? null;
    await save({ session_type: name });
  };

  const shootDateFormatted = project.shoot_date
    ? format(new Date(project.shoot_date + "T00:00:00"), "MMM d, yyyy")
    : null;

  const isOverdue = project.shoot_date && new Date(project.shoot_date + "T00:00:00") < new Date() && !isArchived;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full p-0 flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
        <DialogHeader className="p-5 pb-3 shrink-0">
          <DialogTitle className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-normal">
            Project Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-5 pb-6 space-y-5">

            {/* Title */}
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Title</Label>
              <input
                defaultValue={project.title}
                key={project.id + "-title"}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== project.title) save({ title: v });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="text-base font-medium bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/40 outline-none w-full py-0.5 transition-colors"
              />
            </div>

            {/* Stage badge + selector */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Stage</Label>
              {isArchived ? (
                <span className={cn("self-start inline-flex items-center gap-1 border rounded-sm px-2 py-0.5 text-[10px] tracking-wider uppercase", STAGE_COLORS.archived)}>
                  <Archive className="h-2.5 w-2.5" /> Archived
                </span>
              ) : (
                <Select
                  value={project.stage}
                  onValueChange={(v) => save({ stage: v as Stage })}
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Client info */}
            <div className="space-y-3">
              <h4 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">Client</h4>
              <InlineField
                label="Name"
                value={project.client_name}
                placeholder="Add client name"
                onSave={(v) => save({ client_name: v })}
              />
              <InlineField
                label="Email"
                value={project.client_email ?? ""}
                placeholder="Add email"
                type="email"
                onSave={(v) => save({ client_email: v || null })}
              />
            </div>

            <Separator />

            {/* Session */}
            <div className="space-y-3">
              <h4 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">Session</h4>

              <SessionTypeManager
                photographerId={photographerId}
                sessionTypes={sessionTypes}
                selectedTypeId={sessionTypeId}
                onSelect={handleSessionTypeChange}
                onRefetch={onRefetchSessionTypes}
                mode="select"
              />

              {/* Linked session (from booking) */}
              {project.session_title && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Camera className="h-3 w-3 shrink-0" />
                  <span className="italic">{project.session_title}</span>
                </div>
              )}

              {/* Shoot date */}
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Shoot date</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    defaultValue={project.shoot_date ?? ""}
                    key={project.id + "-date"}
                    onBlur={(e) => save({ shoot_date: e.target.value || null })}
                    className="h-7 text-sm bg-transparent border border-input rounded-md px-2 focus:outline-none focus:border-foreground/40 transition-colors w-full"
                  />
                  {shootDateFormatted && (
                    <span className={cn("text-[10px] shrink-0", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                      {isOverdue ? "Overdue" : shootDateFormatted}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Notes</Label>
              <textarea
                key={project.id + "-notes"}
                defaultValue={project.notes ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (project.notes ?? "")) save({ notes: v || null });
                }}
                rows={4}
                placeholder="Add notes..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 pt-1">
              <span>Created {format(new Date(project.created_at), "MMM d, yyyy")}</span>
              {project.updated_at !== project.created_at && (
                <span>· Updated {format(new Date(project.updated_at), "MMM d, yyyy")}</span>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => { onUnarchive(project.id); onOpenChange(false); }}
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Restore
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => { onArchive(project.id); onOpenChange(false); }}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{project.title}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { onDelete(project.id); onOpenChange(false); }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
