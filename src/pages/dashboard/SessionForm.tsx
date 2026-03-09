import { useEffect, useRef, useState, useCallback } from "react";
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
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

  // ── Session type ──
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);

  // ── Weekly slots ──
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  // addingSlotForDay: which day is currently showing the inline "add time" input
  const [addingSlotForDay, setAddingSlotForDay] = useState<number | null>(null);
  const [newStart, setNewStart] = useState("09:00");
  // days that have been "opened" / expanded in the UI
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

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
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
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
      toast({ title: "Title is required", variant: "destructive" });
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
        toast({ title: "Error saving session", description: error.message, variant: "destructive" });
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
        toast({ title: "Error creating session", description: error?.message, variant: "destructive" });
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

    toast({ title: isEdit ? "Session updated" : "Session created" });
    navigate("/dashboard/sessions");
    setSaving(false);
  };

  // ────────────────────────────────────────────
  // Slot helpers
  // ────────────────────────────────────────────

  const toggleDayExpanded = (d: number) =>
    setExpandedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const suggestNextStart = (day: number): string => {
    const daySlots = slotsForDay(day);
    if (daySlots.length === 0) return "09:00";
    const latestEnd = daySlots.map((s) => s.end_time).sort().at(-1)!;
    return computeEndTime(latestEnd.slice(0, 5), parseInt(breakAfterMinutes) || 0);
  };

  const handleAddSlotForDay = (day: number) => {
    const dur = parseInt(durationMinutes) || 60;
    const end = computeEndTime(newStart, dur);

    // Validate: newStart must be >= latest end_time + break
    const daySlots = slotsForDay(day);
    if (daySlots.length > 0) {
      const latestEnd = daySlots.map((s) => s.end_time).sort().at(-1)!;
      const minAllowed = computeEndTime(latestEnd.slice(0, 5), parseInt(breakAfterMinutes) || 0);
      if (newStart < minAllowed) {
        toast({
          title: "Time conflict",
          description: `Start time must be ${minAllowed} or later (after previous slot + break).`,
          variant: "destructive",
        });
        return;
      }
    }

    const entry: WeeklySlot = {
      day_of_week: day,
      start_time: newStart,
      end_time: end,
      _local: true,
    };
    setSlots((prev) => [...prev, entry]);
    setAddingSlotForDay(null);
    setNewStart("09:00");
  };

  const handleRemoveSlot = async (slot: WeeklySlot, index: number) => {
    if (slot.id) {
      await supabase.from("session_availability").delete().eq("id", slot.id);
    }
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const slotsForDay = (day: number) => slots.filter((s) => s.day_of_week === day);

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
                  Back to Sessions
                </button>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  {isEdit ? "Edit Session" : "New Session"}
                </p>
                <h1 className="text-2xl font-light tracking-wide">
                  {isEdit ? title || "Untitled" : "Create Session"}
                </h1>
              </div>

              {/* Cover Image */}
              <section className="flex flex-col gap-3">
                <Label className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">
                  Cover Photo
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
                            Click to upload
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
                  Session Details
                </p>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="title" className="text-xs tracking-wider uppercase font-light">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Newborn Session"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="description" className="text-xs tracking-wider uppercase font-light">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this session for your clients…"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="price" className="text-xs tracking-wider uppercase font-light">
                      Price (USD)
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
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. New York, NY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="duration" className="text-xs tracking-wider uppercase font-light">
                      Duration (min)
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
                      Break (min)
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
                      No. of Photos
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
                    Each slot takes {totalMinutes} min ({dur} min session + {brk} min break)
                  </p>
                )}

                <div className="flex items-center justify-between border border-border p-4">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-light">Active in Store</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Clients can find and book this session
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
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                    <span className="inline-block w-4 h-px bg-border" />
                    Weekly Availability
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                    Each day can have different time slots. Click a day to expand and add times.
                  </p>
                </div>

                {/* Day rows */}
                <div className="flex flex-col border border-border divide-y divide-border">
                  {DAY_ORDER.map((dayIdx) => {
                    const daySlots = slotsForDay(dayIdx);
                    const isExpanded = expandedDays.includes(dayIdx);
                    const isAddingHere = addingSlotForDay === dayIdx;

                    return (
                      <div key={dayIdx}>
                        {/* Day header row */}
                        <div className="flex items-center justify-between px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleDayExpanded(dayIdx)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <span className={cn(
                              "text-[11px] tracking-wider uppercase w-28 font-light",
                              daySlots.length > 0 ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {DAY_FULL[dayIdx]}
                            </span>
                            {daySlots.length > 0 ? (
                              <span className="text-[10px] text-muted-foreground">
                                {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50">No slots</span>
                            )}
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (!isExpanded) setExpandedDays((p) => [...p, dayIdx]);
                              setAddingSlotForDay(isAddingHere ? null : dayIdx);
                              setNewStart(suggestNextStart(dayIdx));
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Expanded: existing slots + optional add form */}
                        {isExpanded && (
                          <div className="bg-muted/10 border-t border-border/60 px-4 py-3 flex flex-col gap-2">
                            {daySlots.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                {daySlots.map((slot) => {
                                  const globalIdx = slots.findIndex(
                                    (s) => s === slot
                                  );
                                  return (
                                    <div
                                      key={slot.id ?? globalIdx}
                                      className="flex items-center justify-between py-1.5 px-3 bg-background border border-border"
                                    >
                                      <span className="flex items-center gap-2 text-[11px]">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        {slot.start_time.slice(0, 5)}
                                        <span className="text-muted-foreground">→</span>
                                        {slot.end_time.slice(0, 5)}
                                        {brk > 0 && (
                                          <span className="text-[10px] text-muted-foreground/60">
                                            (+{brk} min break)
                                          </span>
                                        )}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {slot._local && (
                                          <span className="text-[9px] tracking-widest uppercase bg-primary/10 text-primary px-2 py-0.5">
                                             New
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveSlot(slot, globalIdx)}
                                          className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Inline add-time form */}
                            {isAddingHere && (
                              <div className="flex items-center gap-3 pt-1">
                                <Input
                                  type="time"
                                  value={newStart}
                                  onChange={(e) => setNewStart(e.target.value)}
                                  className="w-32 h-8 text-sm"
                                />
                                {newStart && (
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    → {computeEndTime(newStart, dur)}
                                    {brk > 0 && ` (free until ${computeEndTime(newStart, totalMinutes)})`}
                                  </span>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleAddSlotForDay(dayIdx)}
                                  className="h-8 text-xs tracking-wider uppercase font-light"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAddingSlotForDay(null)}
                                  className="h-8 text-xs tracking-wider uppercase font-light"
                                >
                                  ✕
                                </Button>
                              </div>
                            )}

                            {daySlots.length === 0 && !isAddingHere && (
                              <p className="text-[11px] text-muted-foreground/50 italic py-1">
                                No slots — click + to add
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-border pt-6">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard/sessions")}
                  className="text-xs tracking-wider uppercase font-light text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 text-xs tracking-wider uppercase font-light"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEdit ? "Save Changes" : "Create Session"}
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
