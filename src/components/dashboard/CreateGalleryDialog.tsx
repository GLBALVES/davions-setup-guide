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
  prefilledBookingId?: string;
  // Edit mode
  editGallery?: {
    id: string;
    title: string;
    category: string;
    cover_image_url?: string | null;
    booking_id?: string | null;
    watermark_id?: string | null;
  } | null;
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

interface Watermark {
  id: string;
  name: string;
}

function generateSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function CreateGalleryDialog({
  open,
  onOpenChange,
  onCreated,
  defaultCategory = "proof",
  prefilledBookingId,
  editGallery,
}: CreateGalleryDialogProps) {
  const { user } = useAuth();
  const isEditMode = !!editGallery;

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

  // Watermarks (proof only)
  const [watermarks, setWatermarks] = useState<Watermark[]>([]);
  const [selectedWatermarkId, setSelectedWatermarkId] = useState<string>("");

  // Default expiry from gallery settings
  const [defaultExpiryDays, setDefaultExpiryDays] = useState<number | null>(null);

  const isProof = (isEditMode ? editGallery?.category : defaultCategory) === "proof";

  // Reset + populate when dialog opens
  useEffect(() => {
    if (!open || !user) return;

    if (isEditMode && editGallery) {
      setTitle(editGallery.title ?? "");
      setCoverPreview(editGallery.cover_image_url ?? null);
      setSelectedBookingId(editGallery.booking_id ?? "");
      setSelectedWatermarkId(editGallery.watermark_id ?? "");
    } else {
      setTitle("");
      setCoverPreview(null);
      setSelectedBookingId(prefilledBookingId ?? "");
      setSelectedWatermarkId("");
    }

    setCoverFile(null);
    setSessions([]);
    setSelectedSessionId("");

    const fetchData = async () => {
      const [bookingsRes, gallerySettingsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, client_name, client_email, session_id")
          .eq("photographer_id", user.id)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("gallery_settings")
          .select("key, value")
          .eq("photographer_id", user.id),
      ]);

      let watermarksRes: { data: Watermark[] | null } = { data: null };
      if (isProof) {
        watermarksRes = await (supabase as any)
          .from("watermarks")
          .select("id, name")
          .eq("photographer_id", user.id)
          .order("created_at", { ascending: true });
      }

      if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);
      if (watermarksRes?.data) setWatermarks(watermarksRes.data as Watermark[]);
      if (gallerySettingsRes?.data) {
        const expiryRow = gallerySettingsRes.data.find((r: any) => r.key === "default_expiry_days");
        if (expiryRow?.value) {
          const days = parseInt(expiryRow.value, 10);
          setDefaultExpiryDays(isNaN(days) || days <= 0 ? null : days);
        } else {
          setDefaultExpiryDays(null);
        }
      }
    };

    fetchData();
  }, [open, user]);

  // When booking selected, load its session
  useEffect(() => {
    if (!selectedBookingId) {
      setSessions([]);
      setSelectedSessionId("");
      return;
    }

    const booking = bookings.find((b) => b.id === selectedBookingId);
    if (!booking) return;

    const fetchSession = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, title")
        .eq("id", booking.session_id)
        .maybeSingle();
      if (data) {
        setSessions([data as Session]);
        setSelectedSessionId(data.id);
      } else {
        setSessions([]);
        setSelectedSessionId("");
      }
    };

    fetchSession();
  }, [selectedBookingId, bookings]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    setLoading(true);

    let coverImageUrl: string | null = coverFile ? null : (isEditMode ? editGallery?.cover_image_url ?? null : null);

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

    const autoSlug = generateSlug(title.trim());

    if (isEditMode && editGallery) {
      // UPDATE
      const updatePayload: Record<string, string | boolean | null> = {
        title: title.trim(),
        slug: autoSlug || null,
      };
      if (coverImageUrl !== undefined) updatePayload.cover_image_url = coverImageUrl;
      if (selectedBookingId) updatePayload.booking_id = selectedBookingId;
      if (isProof && selectedWatermarkId) updatePayload.watermark_id = selectedWatermarkId;

      const { error } = await supabase.from("galleries").update(updatePayload as any).eq("id", editGallery.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Gallery updated" });
        onOpenChange(false);
        onCreated();
      }
    } else {
      // INSERT — apply default expiry if configured
      const expiresAt = defaultExpiryDays
        ? new Date(Date.now() + defaultExpiryDays * 86400000).toISOString()
        : null;

      const insertPayload: Record<string, string | boolean | null> = {
        photographer_id: user.id,
        title: title.trim(),
        slug: autoSlug || null,
        category: defaultCategory,
      };
      if (coverImageUrl) insertPayload.cover_image_url = coverImageUrl;
      if (selectedBookingId) insertPayload.booking_id = selectedBookingId;
      if (isProof && selectedWatermarkId) insertPayload.watermark_id = selectedWatermarkId;
      if (expiresAt) (insertPayload as any).expires_at = expiresAt;

      const { error } = await supabase.from("galleries").insert([insertPayload] as any);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Gallery created" });
        onOpenChange(false);
        onCreated();
      }
    }

    setLoading(false);
  };

  // Unique clients
  const uniqueClients = bookings.reduce<Booking[]>((acc, b) => {
    if (!acc.find((x) => x.client_email === b.client_email)) acc.push(b);
    return acc;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-light tracking-wide">
            {isEditMode ? "Edit Gallery" : `New ${isProof ? "Proof" : "Final"} Gallery`}
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
            <Label className="text-xs tracking-widests uppercase text-muted-foreground font-light">
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
            <Label className="text-xs tracking-widests uppercase text-muted-foreground font-light">
              Client
            </Label>
            <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
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

          {/* Session — auto-populated from booking */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs tracking-widests uppercase text-muted-foreground font-light">
              Session
            </Label>
            {!selectedBookingId ? (
              <div className="h-10 border border-dashed border-border flex items-center px-3 text-xs text-muted-foreground/60">
                Select a client first
              </div>
            ) : sessions.length === 0 ? (
              <div className="h-10 border border-border flex items-center px-3 text-xs text-muted-foreground animate-pulse">
                Loading…
              </div>
            ) : (
              <div className="h-10 border border-border bg-muted/30 flex items-center px-3 text-sm">
                {sessions[0]?.title ?? "—"}
              </div>
            )}
          </div>

          {/* Watermark — only for proof galleries */}
          {isProof && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs tracking-widests uppercase text-muted-foreground font-light">
                Watermark
              </Label>
              {watermarks.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/60 border border-dashed border-border px-3 py-2">
                  No watermarks configured — create one in Settings to apply to proof galleries.
                </p>
              ) : (
                <Select value={selectedWatermarkId} onValueChange={setSelectedWatermarkId}>
                  <SelectTrigger className="rounded-none border-border focus:ring-0">
                    <SelectValue placeholder="Select watermark… (optional)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {watermarks.map((wm) => (
                      <SelectItem key={wm.id} value={wm.id}>
                        {wm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="w-full mt-2"
            size="lg"
          >
            {loading ? (isEditMode ? "Saving…" : "Creating…") : (isEditMode ? "Save Changes" : "Create Gallery")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
