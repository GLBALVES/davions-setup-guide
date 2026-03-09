import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format, addMinutes, parse } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import logoPrincipal from "@/assets/logo_principal_preto.png";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
// Ordered Mon→Sun for display
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface WeeklySlot {
  id?: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;  // HH:mm
  end_time: string;    // computed from duration + break
  _local?: boolean;
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const computeEndTime = (start: string, durationMin: number): string => {
  const base = parse(start, "HH:mm", new Date());
  return format(addMinutes(base, durationMin), "HH:mm");
};

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

const SessionForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== "new";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [uploadingCover, setUploadingCover] = useState(false);

  // ── Form fields ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [breakAfterMinutes, setBreakAfterMinutes] = useState("0");
  const [numPhotos, setNumPhotos] = useState("30");
  const [location, setLocation] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "active">("draft");

  // ── Weekly slots ──
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [addingSlot, setAddingSlot] = useState(false);
  const [newDays, setNewDays] = useState<number[]>([]);
  const [newStart, setNewStart] = useState("09:00");

  // ────────────────────────────────────────────
  // Load (edit mode)
  // ────────────────────────────────────────────

  useEffect(() => {
    if (isEdit && id) loadSession(id);
  }, [id]);

  const loadSession = async (sessionId: string) => {
    const { data: s } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (s) {
      setTitle(s.title);
      setDescription(s.description ?? "");
      setPrice((s.price / 100).toFixed(2));
      setDurationMinutes(String(s.duration_minutes));
      setBreakAfterMinutes(String((s as unknown as { break_after_minutes?: number }).break_after_minutes ?? 0));
      setNumPhotos(String(s.num_photos));
      setLocation(s.location ?? "");
      setCoverImageUrl(s.cover_image_url);
      setStatus(s.status as "draft" | "active");
    }

    const { data: avail } = await supabase
      .from("session_availability")
      .select("id, day_of_week, start_time, end_time")
      .eq("session_id", sessionId)
      .not("day_of_week", "is", null)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (avail) {
      setSlots(
        avail.map((a) => ({
          id: a.id,
          day_of_week: (a as unknown as { day_of_week: number }).day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
        }))
      );
    }

    setLoading(false);
  };

  // ────────────────────────────────────────────
  // Cover upload
  // ────────────────────────────────────────────

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("session-covers")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload falhou", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("session-covers").getPublicUrl(path);
      setCoverImageUrl(data.publicUrl);
    }
    setUploadingCover(false);
  };

  // ────────────────────────────────────────────
  // Save
  // ────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    const priceInCents = Math.round(parseFloat(price || "0") * 100);
    const dur = parseInt(durationMinutes) || 60;

    const payload = {
      photographer_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      price: priceInCents,
      duration_minutes: dur,
      break_after_minutes: parseInt(breakAfterMinutes) || 0,
      num_photos: parseInt(numPhotos) || 0,
      location: location.trim() || null,
      cover_image_url: coverImageUrl,
      status,
    };

    let sessionId = id;

    if (isEdit && sessionId) {
      const { error } = await supabase.from("sessions").update(payload).eq("id", sessionId);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("sessions")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        toast({ title: "Erro ao criar", description: error?.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      sessionId = data.id;
    }

    // Insert new local weekly slots
    const newSlots = slots.filter((s) => s._local && sessionId);
    if (newSlots.length > 0) {
      await supabase.from("session_availability").insert(
        newSlots.map((s) => ({
          session_id: sessionId!,
          photographer_id: user.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          // date is now nullable; leave null for weekly recurring slots
        }))
      );
    }

    toast({ title: isEdit ? "Sessão atualizada" : "Sessão criada" });
    navigate("/dashboard/sessions");
    setSaving(false);
  };

  // ────────────────────────────────────────────
  // Slot helpers
  // ────────────────────────────────────────────

  const toggleDay = (d: number) =>
    setNewDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const handleAddSlots = () => {
    if (newDays.length === 0) return;
    const dur = parseInt(durationMinutes) || 60;
    const end = computeEndTime(newStart, dur);
    const newEntries: WeeklySlot[] = newDays
      .sort((a, b) => a - b)
      .map((d) => ({
        day_of_week: d,
        start_time: newStart,
        end_time: end,
        _local: true,
      }));
    setSlots((prev) => [...prev, ...newEntries]);
    setAddingSlot(false);
    setNewDays([]);
    setNewStart("09:00");
  };

  const handleRemoveSlot = async (slot: WeeklySlot, index: number) => {
    if (slot.id) {
      await supabase.from("session_availability").delete().eq("id", slot.id);
    }
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  // ────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────

  const dur = parseInt(durationMinutes) || 60;
  const brk = parseInt(breakAfterMinutes) || 0;
  const totalMinutes = dur + brk;

  // ────────────────────────────────────────────
  // Loading state
  // ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <img src={logoPrincipal} alt="Davions" className="h-5 w-auto" />
            </div>
          </header>

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-8">
              {/* Back */}
              <div>
                <button
                  onClick={() => navigate("/dashboard/sessions")}
                  className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar para Sessions
                </button>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  {isEdit ? "Editar Session" : "Nova Session"}
                </p>
                <h1 className="text-2xl font-light tracking-wide">
                  {isEdit ? title || "Sem título" : "Criar Session"}
                </h1>
              </div>

              {/* Cover Image */}
              <section className="flex flex-col gap-3">
                <Label className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">
                  Foto de Capa
                </Label>
                <div
                  className="aspect-video border border-dashed border-border relative overflow-hidden cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {coverImageUrl ? (
                    <>
                      <img src={coverImageUrl} alt="Capa" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                      {uploadingCover ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6" />
                          <span className="text-[10px] tracking-widest uppercase">
                            Clique para enviar
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
              </section>

              {/* Basic Info */}
              <section className="flex flex-col gap-4">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                  <span className="inline-block w-4 h-px bg-border" />
                  Detalhes da Session
                </p>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="title" className="text-xs tracking-wider uppercase font-light">
                    Título *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex: Ensaio New Born"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="description" className="text-xs tracking-wider uppercase font-light">
                    Descrição
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva a session para seus clientes…"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="price" className="text-xs tracking-wider uppercase font-light">
                      Preço (R$)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="location" className="text-xs tracking-wider uppercase font-light">
                      Local
                    </Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="ex: São Paulo, SP"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="duration" className="text-xs tracking-wider uppercase font-light">
                      Duração (min)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="break" className="text-xs tracking-wider uppercase font-light">
                      Intervalo (min)
                    </Label>
                    <Input
                      id="break"
                      type="number"
                      min="0"
                      step="5"
                      value={breakAfterMinutes}
                      onChange={(e) => setBreakAfterMinutes(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="numPhotos" className="text-xs tracking-wider uppercase font-light">
                      Nº de Fotos
                    </Label>
                    <Input
                      id="numPhotos"
                      type="number"
                      min="0"
                      value={numPhotos}
                      onChange={(e) => setNumPhotos(e.target.value)}
                    />
                  </div>
                </div>

                {/* Duration summary */}
                {brk > 0 && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Cada slot ocupa {totalMinutes} min ({dur} min de ensaio + {brk} min de intervalo)
                  </p>
                )}

                <div className="flex items-center justify-between border border-border p-4">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-light">Ativo na Loja</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Clientes podem encontrar e agendar esta session
                    </p>
                  </div>
                  <Switch
                    checked={status === "active"}
                    onCheckedChange={(v) => setStatus(v ? "active" : "draft")}
                  />
                </div>
              </section>

              {/* Weekly Availability */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                      <span className="inline-block w-4 h-px bg-border" />
                      Horários Disponíveis
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                      Defina os dias da semana e horários de início de cada atendimento
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingSlot(true)}
                    className="gap-2 text-xs tracking-wider uppercase font-light shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>

                {/* Add slot form */}
                {addingSlot && (
                  <div className="border border-border p-5 flex flex-col gap-5 bg-muted/20">
                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground">
                      Novo Horário Recorrente
                    </p>

                    {/* Day of week selector */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs tracking-wider uppercase font-light">
                        Dias da Semana
                      </Label>
                      <div className="flex gap-2 flex-wrap">
                        {DAY_LABELS.map((label, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleDay(i)}
                            className={cn(
                              "w-10 h-10 text-[11px] tracking-wider border transition-colors",
                              newDays.includes(i)
                                ? "border-foreground bg-foreground text-background"
                                : "border-border hover:border-foreground/40 text-muted-foreground"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Start time */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs tracking-wider uppercase font-light">
                        Horário de Início
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="time"
                          value={newStart}
                          onChange={(e) => setNewStart(e.target.value)}
                          className="w-36"
                        />
                        {newStart && (
                          <span className="text-[11px] text-muted-foreground">
                            → término às {computeEndTime(newStart, dur)}
                            {brk > 0 && `, livre às ${computeEndTime(newStart, totalMinutes)}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddingSlot(false);
                          setNewDays([]);
                          setNewStart("09:00");
                        }}
                        className="text-xs tracking-wider uppercase font-light"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddSlots}
                        disabled={newDays.length === 0}
                        className="text-xs tracking-wider uppercase font-light"
                      >
                        Adicionar {newDays.length > 0 ? `(${newDays.length})` : ""}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Slots list grouped by day */}
                {slots.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {slots.map((slot, i) => (
                      <div
                        key={slot.id ?? i}
                        className="flex items-center justify-between px-4 py-3 border border-border text-sm font-light"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[11px] tracking-wider uppercase text-muted-foreground w-16">
                            {DAY_FULL[slot.day_of_week]}
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </span>
                          {slot._local && (
                            <span className="text-[9px] tracking-widest uppercase bg-primary/10 text-primary px-2 py-0.5">
                              Novo
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveSlot(slot, i)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground text-center py-6 border border-dashed border-border">
                    Nenhum horário definido — adicione disponibilidade semanal para que clientes possam agendar
                  </p>
                )}
              </section>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-border pt-6">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard/sessions")}
                  className="text-xs tracking-wider uppercase font-light text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 text-xs tracking-wider uppercase font-light"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEdit ? "Salvar Alterações" : "Criar Session"}
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SessionForm;
