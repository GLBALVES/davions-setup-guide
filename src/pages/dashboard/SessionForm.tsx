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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarIcon,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import logoPrincipal from "@/assets/logo_principal_preto.png";
import { cn } from "@/lib/utils";

interface AvailabilitySlot {
  id?: string;
  date: Date;
  start_time: string;
  end_time: string;
  is_booked?: boolean;
  _local?: boolean;
}

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

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [numPhotos, setNumPhotos] = useState("30");
  const [location, setLocation] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "active">("draft");

  // Availability slots
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotDate, setSlotDate] = useState<Date | undefined>();
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");

  useEffect(() => {
    if (isEdit && id) {
      loadSession(id);
    }
  }, [id]);

  const loadSession = async (sessionId: string) => {
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionData) {
      setTitle(sessionData.title);
      setDescription(sessionData.description ?? "");
      setPrice((sessionData.price / 100).toFixed(2));
      setDurationMinutes(String(sessionData.duration_minutes));
      setNumPhotos(String(sessionData.num_photos));
      setLocation(sessionData.location ?? "");
      setCoverImageUrl(sessionData.cover_image_url);
      setStatus(sessionData.status as "draft" | "active");
    }

    const { data: availData } = await supabase
      .from("session_availability")
      .select("*")
      .eq("session_id", sessionId)
      .order("date", { ascending: true });

    if (availData) {
      setSlots(
        availData.map((a) => ({
          id: a.id,
          date: new Date(a.date + "T00:00:00"),
          start_time: a.start_time,
          end_time: a.end_time,
          is_booked: a.is_booked,
        }))
      );
    }

    setLoading(false);
  };

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
      const { data: urlData } = supabase.storage.from("session-covers").getPublicUrl(path);
      setCoverImageUrl(urlData.publicUrl);
    }
    setUploadingCover(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const priceInCents = Math.round(parseFloat(price || "0") * 100);

    const payload = {
      photographer_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      price: priceInCents,
      duration_minutes: parseInt(durationMinutes) || 60,
      num_photos: parseInt(numPhotos) || 0,
      location: location.trim() || null,
      cover_image_url: coverImageUrl,
      status,
    };

    let sessionId = id;

    if (isEdit && sessionId) {
      const { error } = await supabase
        .from("sessions")
        .update(payload)
        .eq("id", sessionId);
      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
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

    // Save new local slots
    const newSlots = slots.filter((s) => s._local && sessionId);
    if (newSlots.length > 0) {
      const inserts = newSlots.map((s) => ({
        session_id: sessionId!,
        photographer_id: user.id,
        date: format(s.date, "yyyy-MM-dd"),
        start_time: s.start_time,
        end_time: s.end_time,
      }));
      await supabase.from("session_availability").insert(inserts);
    }

    toast({ title: isEdit ? "Session updated" : "Session created" });
    navigate("/dashboard/sessions");
    setSaving(false);
  };

  const handleAddSlot = () => {
    if (!slotDate) return;
    setSlots((prev) => [
      ...prev,
      {
        date: slotDate,
        start_time: slotStart,
        end_time: slotEnd,
        _local: true,
      },
    ]);
    setAddingSlot(false);
    setSlotDate(undefined);
    setSlotStart("09:00");
    setSlotEnd("10:00");
  };

  const handleRemoveSlot = async (slot: AvailabilitySlot, index: number) => {
    if (slot.id) {
      await supabase.from("session_availability").delete().eq("id", slot.id);
    }
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                  Cover Image
                </Label>
                <div
                  className="aspect-video border border-dashed border-border relative overflow-hidden cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {coverImageUrl ? (
                    <>
                      <img
                        src={coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
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
                            Click to upload cover
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
                    placeholder="e.g. Ensaio Externo"
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
                    placeholder="Describe the session for clients…"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="price" className="text-xs tracking-wider uppercase font-light">
                      Price (R$)
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="numPhotos" className="text-xs tracking-wider uppercase font-light">
                      Nº of Photos
                    </Label>
                    <Input
                      id="numPhotos"
                      type="number"
                      min="0"
                      value={numPhotos}
                      onChange={(e) => setNumPhotos(e.target.value)}
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
                      placeholder="e.g. São Paulo, SP"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border border-border p-4">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-light">
                      Active on Store
                    </p>
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

              {/* Availability Slots */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                    <span className="inline-block w-4 h-px bg-border" />
                    Availability Slots
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingSlot(true)}
                    className="gap-2 text-xs tracking-wider uppercase font-light"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Slot
                  </Button>
                </div>

                {/* Add slot form */}
                {addingSlot && (
                  <div className="border border-border p-4 flex flex-col gap-4 bg-muted/30">
                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground">
                      New Slot
                    </p>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs tracking-wider uppercase font-light">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-light text-sm",
                              !slotDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {slotDate
                              ? format(slotDate, "PPP", { locale: ptBR })
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={slotDate}
                            onSelect={setSlotDate}
                            disabled={(d) => d < new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs tracking-wider uppercase font-light">Start Time</Label>
                        <Input
                          type="time"
                          value={slotStart}
                          onChange={(e) => setSlotStart(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs tracking-wider uppercase font-light">End Time</Label>
                        <Input
                          type="time"
                          value={slotEnd}
                          onChange={(e) => setSlotEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAddingSlot(false)}
                        className="text-xs tracking-wider uppercase font-light"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddSlot}
                        disabled={!slotDate}
                        className="text-xs tracking-wider uppercase font-light"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {/* Slots list */}
                {slots.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {slots.map((slot, i) => (
                      <div
                        key={slot.id ?? i}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 border border-border text-sm font-light",
                          slot.is_booked && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[11px] tracking-wider uppercase text-muted-foreground w-24">
                            {format(slot.date, "dd MMM yyyy", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {slot.start_time} – {slot.end_time}
                          </span>
                          {slot.is_booked && (
                            <span className="text-[9px] tracking-widest uppercase bg-muted px-2 py-0.5">
                              Booked
                            </span>
                          )}
                          {slot._local && (
                            <span className="text-[9px] tracking-widest uppercase bg-primary/10 text-primary px-2 py-0.5">
                              New
                            </span>
                          )}
                        </div>
                        {!slot.is_booked && (
                          <button
                            onClick={() => handleRemoveSlot(slot, i)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed border-border">
                    No slots yet — add availability for clients to book
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
