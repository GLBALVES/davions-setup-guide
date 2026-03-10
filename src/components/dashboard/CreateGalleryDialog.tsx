import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Loader2 } from "lucide-react";

interface CreateGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultCategory?: string;
}

interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  session_id: string;
}

interface Session {
  id: string;
  title: string;
}

export function CreateGalleryDialog({ open, onOpenChange, onCreated, defaultCategory = "proof" }: CreateGalleryDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  // Cover upload
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Bookings / clients
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // Watermark (proof only)
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [applyWatermark, setApplyWatermark] = useState(true);

  const isProof = defaultCategory === "proof";

  // Fetch bookings + watermark when dialog opens
  useEffect(() => {
    if (!open || !user) return;

    setTitle("");
    setCoverFile(null);
    setCoverPreview(null);
    setSelectedBookingId("");
    setSelectedSessionId("");
    setSessions([]);

    const fetchData = async () => {
      const [{ data: bookingsData }, { data: photographerData }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, client_name, client_email, session_id")
          .eq("photographer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("photographers")
          .select("watermark_url")
          .eq("id", user.id)
          .single(),
      ]);

      if (bookingsData) setBookings(bookingsData as Booking[]);
      if (photographerData) setWatermarkUrl((photographerData as { watermark_url?: string | null }).watermark_url ?? null);
    };

    fetchData();
  }, [open, user]);

  // When client selected, filter sessions
  useEffect(() => {
    if (!selectedBookingId) {
      setSessions([]);
      setSelectedSessionId("");
      return;
    }

    const booking = bookings.find((b) => b.id === selectedBookingId);
    if (!booking) return;

    // Fetch all sessions booked by same client (same session_id from matching bookings)
    const clientSessionIds = bookings
      .filter((b) => b.client_email === booking.client_email)
      .map((b) => b.session_id);

    const fetchSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, title")
        .in("id", clientSessionIds);
      if (data) setSessions(data as Session[]);

      // Auto-select if only one
      if (data?.length === 1) setSelectedSessionId(data[0].id);
      else setSelectedSessionId("");
    };

    fetchSessions();
  }, [selectedBookingId, bookings]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    setLoading(true);

    let coverImageUrl: string | null = null;

    // Upload cover if provided
    if (coverFile) {
      setUploadingCover(true);
      const ext = coverFile.name.split(".").pop();
      const path = `${user.id}/covers/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery-photos")
        .upload(path, coverFile, { upsert: true });

      if (upErr) {
        toast({ title: "Cover upload failed", description: upErr.message, variant: "destructive" });
        setUploadingCover(false);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("gallery-photos").getPublicUrl(path);
      coverImageUrl = urlData.publicUrl;
      setUploadingCover(false);
    }

    const insertPayload: Record<string, string | boolean | null> = {
      photographer_id: user.id,
      title: title.trim(),
      category: defaultCategory,
    };

    if (coverImageUrl) insertPayload.cover_image_url = coverImageUrl;
    if (selectedBookingId) insertPayload.booking_id = selectedBookingId;
    if (selectedSessionId) insertPayload.session_id = selectedSessionId;
    if (isProof && watermarkUrl) insertPayload.watermark_url = applyWatermark ? watermarkUrl : null;

    const { error } = await supabase.from("galleries").insert([insertPayload] as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gallery created" });
      onOpenChange(false);
      onCreated();
    }
    setLoading(false);
  };

  // Unique clients
  const uniqueClients = bookings.reduce<Booking[]>((acc, b) => {
    if (!acc.find((x) => x.client_email === b.client_email)) acc.push(b);
    return acc;
  }, []);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-light tracking-wide">
            New {isProof ? "Proof" : "Final"} Gallery
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-2">
          {/* Cover */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
              Cover
            </Label>
            {coverPreview ? (
              <div className="relative group w-full aspect-[16/7] overflow-hidden border border-border">
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="text-white text-[10px] tracking-widest uppercase border border-white/60 px-3 py-1.5 hover:bg-white/10 transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="w-full aspect-[16/7] border border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-foreground/40 transition-colors text-muted-foreground hover:text-foreground"
              >
                {uploadingCover ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-[10px] tracking-widest uppercase">Upload cover</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
          </div>

          {/* Gallery Name */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
              Gallery Name
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wedding — Ana & Pedro"
              className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
            />
          </div>

          {/* Client */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
              Client
            </Label>
            <Select
              value={selectedBookingId}
              onValueChange={setSelectedBookingId}
            >
              <SelectTrigger className="rounded-none border-border focus:ring-0">
                <SelectValue placeholder={uniqueClients.length === 0 ? "No bookings yet" : "Select client…"} />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {uniqueClients.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.client_name}
                    <span className="ml-2 text-muted-foreground text-xs">{b.client_email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session — only shown after client selected */}
          {selectedBookingId && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                Session
              </Label>
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger className="rounded-none border-border focus:ring-0">
                  <SelectValue placeholder="Select session…" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Watermark — only for proof galleries */}
          {isProof && watermarkUrl && (
            <div className="flex items-center justify-between border border-border p-3">
              <div className="flex items-center gap-3">
                <img src={watermarkUrl} alt="Watermark" className="h-6 w-auto opacity-70 object-contain" />
                <span className="text-xs font-light text-muted-foreground">Apply watermark</span>
              </div>
              <button
                type="button"
                onClick={() => setApplyWatermark((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                  applyWatermark ? "bg-foreground" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    applyWatermark ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {isProof && !watermarkUrl && (
            <p className="text-[10px] text-muted-foreground/60 border border-dashed border-border px-3 py-2">
              No watermark configured — add one in Settings to apply it to proof galleries.
            </p>
          )}

          <Button
            onClick={handleCreate}
            disabled={!title.trim() || loading}
            className="w-full mt-2"
            size="lg"
          >
            {loading ? "Creating…" : "Create Gallery"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
