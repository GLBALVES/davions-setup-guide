import { useState, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimePickerInput } from "@/components/ui/time-picker-input";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";
import {
  Trash2, Archive, ArchiveRestore, Camera,
  Pencil, Check, X, AlertTriangle, CalendarIcon, Timer, MapPin, Phone, Mail, User, FileText,
} from "lucide-react";
import { format, differenceInDays, differenceInHours, isPast, parseISO } from "date-fns";
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
  client_phone?: string | null;
  session_type: string | null;
  session_title?: string | null;
  booking_id: string | null;
  stage: Stage;
  notes: string | null;
  shoot_date: string | null;
  shoot_time: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  gallery_deadline?: string | null;
  location?: string | null;
  description?: string | null;
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
  icon,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
  type?: string;
  icon?: React.ReactNode;
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
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        <div className="flex items-center gap-1 flex-1 min-w-0">
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
          <button onClick={commit} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setDraft(value); setEditing(false); }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 w-full text-sm text-left border border-transparent hover:border-border rounded-sm px-1 py-0.5 -mx-1 transition-colors"
    >
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <span className={cn("flex-1 min-w-0 truncate", value ? "text-foreground" : "text-muted-foreground/40 italic text-xs")}>
        {value || placeholder || label}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

// Section label
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium mb-2">
      {children}
    </p>
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

  const isOverdue = project.shoot_date && new Date(project.shoot_date + "T00:00:00") < new Date() && !isArchived;

  // Deadline section for shot / post_production
  const renderDeadlineSection = () => {
    if (project.stage !== "shot" && project.stage !== "post_production") return null;
    const label = project.stage === "shot" ? "Prazo para galeria de prova" : "Prazo para entrega final";
    const deadline = project.gallery_deadline ? parseISO(project.gallery_deadline) : undefined;
    const now = new Date();

    const urgencyBadge = (() => {
      if (!deadline) return null;
      if (isPast(deadline)) return (
        <span className="flex items-center gap-0.5 text-[10px] text-destructive font-medium shrink-0">
          <AlertTriangle className="h-2.5 w-2.5" /> Vencido
        </span>
      );
      const h = differenceInHours(deadline, now);
      if (h < 24) return <span className="text-[10px] text-destructive font-medium shrink-0">{h}h restantes</span>;
      const d = differenceInDays(deadline, now);
      const color = d <= 3 ? "text-orange-500" : d <= 7 ? "text-yellow-600" : "text-emerald-500";
      return <span className={cn("text-[10px] font-medium shrink-0", color)}>{d}d restantes</span>;
    })();

    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] tracking-widest uppercase text-muted-foreground flex items-center gap-1">
          <Timer className="h-2.5 w-2.5" /> {label}
        </Label>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1.5 h-7 px-2 rounded-md border text-sm transition-colors flex-1 text-left",
                  deadline
                    ? isPast(deadline)
                      ? "border-destructive/50 text-destructive"
                      : "border-input text-foreground hover:border-foreground/40"
                    : "border-input text-muted-foreground/60 hover:border-foreground/40"
                )}
              >
                <CalendarIcon className="h-3 w-3 shrink-0" />
                <span className="text-xs">
                  {deadline ? format(deadline, "d MMM yyyy") : "Definir prazo…"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
              <Calendar
                mode="single"
                selected={deadline}
                onSelect={(d) => save({ gallery_deadline: d ? format(d, "yyyy-MM-dd") : null } as any)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
              {deadline && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => save({ gallery_deadline: null } as any)}
                    className="w-full text-[11px] text-destructive/70 hover:text-destructive transition-colors py-1 border border-dashed border-destructive/20 rounded-sm"
                  >
                    Remover prazo
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          {urgencyBadge}
        </div>
        {deadline && !isPast(deadline) && project.shoot_date && (
          <p className="text-[10px] text-muted-foreground/60 italic">
            {differenceInDays(deadline, parseISO(project.shoot_date))}d após a sessão
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full p-0 flex flex-col overflow-hidden" style={{ maxHeight: "88vh" }}>

        {/* ── Header ── */}
        <DialogHeader className="p-5 pb-3 shrink-0 border-b border-border/50">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Editable title */}
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
                className="text-lg font-semibold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/40 outline-none w-full py-0.5 transition-colors leading-tight"
                placeholder="Project title"
              />
            </div>
            {/* Stage badge / selector */}
            {isArchived ? (
              <span className={cn("self-start inline-flex items-center gap-1 border rounded-sm px-2 py-1 text-[10px] tracking-wider uppercase shrink-0", STAGE_COLORS.archived)}>
                <Archive className="h-2.5 w-2.5" /> Archived
              </span>
            ) : (
              <Select value={project.stage} onValueChange={(v) => save({ stage: v as Stage })}>
                <SelectTrigger className={cn("h-7 text-[10px] tracking-wider uppercase border rounded-sm w-auto gap-1.5 shrink-0 px-2", STAGE_COLORS[project.stage])}>
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
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-5">
            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-5">

              {/* ── LEFT column ── */}
              <div className="flex flex-col gap-5 min-w-0">

                {/* Session section */}
                <div>
                  <SectionLabel>Sessão</SectionLabel>
                  <div className="flex flex-col gap-3">
                    <SessionTypeManager
                      photographerId={photographerId}
                      sessionTypes={sessionTypes}
                      selectedTypeId={sessionTypeId}
                      onSelect={handleSessionTypeChange}
                      onRefetch={onRefetchSessionTypes}
                      mode="select"
                    />

                    {project.session_title && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Camera className="h-3 w-3 shrink-0" />
                        <span className="italic">{project.session_title}</span>
                      </div>
                    )}

                    {/* Shoot date + time */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Data & hora</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="date"
                          defaultValue={project.shoot_date ?? ""}
                          key={project.id + "-date"}
                          onBlur={(e) => save({ shoot_date: e.target.value || null })}
                          className="h-7 text-sm bg-transparent border border-input rounded-md px-2 focus:outline-none focus:border-foreground/40 transition-colors"
                        />
                        <TimePickerInput
                          value={project.shoot_time ?? "09:00"}
                          onChange={(v) => save({ shoot_time: v })}
                          className="shrink-0"
                        />
                        {project.shoot_date && (
                          <span className={cn("text-[10px] shrink-0", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                            {isOverdue ? "Overdue" : format(new Date(project.shoot_date + "T00:00:00"), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Localização</Label>
                      <InlineField
                        label="Localização"
                        value={project.location ?? ""}
                        placeholder="Adicionar localização…"
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        onSave={(v) => save({ location: v || null } as any)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Deadline section */}
                {renderDeadlineSection() && (
                  <>
                    {renderDeadlineSection()}
                    <Separator />
                  </>
                )}

                {/* Notes */}
                <div>
                  <SectionLabel>Notas</SectionLabel>
                  <textarea
                    key={project.id + "-notes"}
                    defaultValue={project.notes ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (project.notes ?? "")) save({ notes: v || null });
                    }}
                    rows={5}
                    placeholder="Escreva uma nota…"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <SectionLabel>Descrição</SectionLabel>
                  <textarea
                    key={project.id + "-desc"}
                    defaultValue={project.description ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (project.description ?? "")) save({ description: v || null } as any);
                    }}
                    rows={3}
                    placeholder="Detalhes do projeto, briefing, referências…"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>

              {/* ── RIGHT column — Project Details panel ── */}
              <div className="flex flex-col gap-0 bg-muted/30 rounded-md border border-border/50 overflow-hidden self-start">
                <div className="px-3 py-2.5 border-b border-border/50 bg-muted/40">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">Detalhes do projeto</p>
                </div>

                <div className="flex flex-col divide-y divide-border/40">
                  {/* Client */}
                  <div className="px-3 py-2.5">
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">Cliente</p>
                    <InlineField
                      label="Nome"
                      value={project.client_name}
                      placeholder="Adicionar cliente…"
                      icon={<User className="h-3.5 w-3.5" />}
                      onSave={(v) => save({ client_name: v })}
                    />
                  </div>

                  {/* Email */}
                  <div className="px-3 py-2.5">
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">E-mail</p>
                    <InlineField
                      label="E-mail"
                      value={project.client_email ?? ""}
                      placeholder="Adicionar e-mail…"
                      type="email"
                      icon={<Mail className="h-3.5 w-3.5" />}
                      onSave={(v) => save({ client_email: v || null })}
                    />
                  </div>

                  {/* Phone */}
                  <div className="px-3 py-2.5">
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">Telefone</p>
                    <InlineField
                      label="Telefone"
                      value={project.client_phone ?? ""}
                      placeholder="Adicionar telefone…"
                      type="tel"
                      icon={<Phone className="h-3.5 w-3.5" />}
                      onSave={(v) => save({ client_phone: v || null } as any)}
                    />
                  </div>

                  {/* Session type read-only display */}
                  {project.session_type && (
                    <div className="px-3 py-2.5">
                      <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">Tipo de sessão</p>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{project.session_type}</span>
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  {project.shoot_date && (
                    <div className="px-3 py-2.5">
                      <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">Data da sessão</p>
                      <div className={cn("flex items-center gap-2 text-sm", isOverdue ? "text-destructive" : "text-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {format(new Date(project.shoot_date + "T00:00:00"), "d MMM yyyy")}
                          {project.shoot_time && (() => {
                            const [h, m] = project.shoot_time.split(":").map(Number);
                            const period = h < 12 ? "AM" : "PM";
                            const h12 = h % 12 === 0 ? 12 : h % 12;
                            return ` · ${h12}:${String(m).padStart(2, "0")} ${period}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {project.location && (
                    <div className="px-3 py-2.5">
                      <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">Localização</p>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="px-3 py-2.5">
                    <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">Criado em</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>{format(new Date(project.created_at), "d MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="mt-5" />

            {/* ── Actions footer ── */}
            <div className="flex items-center justify-between gap-2 pt-4">
              {isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => { onUnarchive(project.id); onOpenChange(false); }}
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Restaurar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => { onArchive(project.id); onOpenChange(false); }}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Arquivar
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
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso excluirá permanentemente "{project.title}". Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { onDelete(project.id); onOpenChange(false); }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
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
