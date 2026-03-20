import { useEffect, useState, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Lock, Image, CalendarX2, Heart, ShoppingCart, X, Loader2, CheckCircle, ChevronLeft, ChevronRight, MessageSquare, Download, PackageOpen, ArrowDownToLine, LayoutGrid, LayoutList, CheckCheck, MousePointerSquareDashed, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";


// ── Client token ────────────────────────────────────────────────────────────
function getClientToken(): string {
  const key = "davions_client_token";
  let token = localStorage.getItem(key);
  if (!token) { token = crypto.randomUUID(); localStorage.setItem(key, token); }
  return token;
}

// ── Persist access code per gallery ─────────────────────────────────────────
function getStoredCode(galleryId: string): string | null {
  return localStorage.getItem(`davions_access_${galleryId}`);
}
function storeCode(galleryId: string, code: string): void {
  localStorage.setItem(`davions_access_${galleryId}`, code);
}

// ── Downloaded photos (per gallery) ─────────────────────────────────────────
function getDownloadedKey(galleryId: string): string {
  return `davions_downloaded_${galleryId}`;
}
function loadDownloaded(galleryId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getDownloadedKey(galleryId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function markDownloaded(galleryId: string, photoId: string): Set<string> {
  const set = loadDownloaded(galleryId);
  set.add(photoId);
  localStorage.setItem(getDownloadedKey(galleryId), JSON.stringify([...set]));
  return set;
}

// ── Photo notes (client-side per token+gallery) ──────────────────────────────
function getNotesKey(galleryId: string, clientToken: string) {
  return `davions_notes_${galleryId}_${clientToken}`;
}
function loadNotes(galleryId: string, clientToken: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(getNotesKey(galleryId, clientToken));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveNotes(galleryId: string, clientToken: string, notes: Record<string, string>) {
  localStorage.setItem(getNotesKey(galleryId, clientToken), JSON.stringify(notes));
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// ── Log gallery access to analytics ─────────────────────────────────────────
async function logAccess(photographerId: string, galleryId: string) {
  try {
    await supabase.from("analytics_pageviews").insert({
      photographer_id: photographerId,
      page_path: `/gallery/${galleryId}`,
      action: "gallery_access",
    });
  } catch { /* non-blocking */ }
}


type WmPosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

function positionToStyle(pos: WmPosition): React.CSSProperties {
  const map: Record<WmPosition, React.CSSProperties> = {
    "top-left":      { top: "6%",    left: "5%",  transform: "none" },
    "top-center":    { top: "6%",    left: "50%", transform: "translateX(-50%)" },
    "top-right":     { top: "6%",    right: "5%", transform: "none" },
    "center-left":   { top: "50%",   left: "5%",  transform: "translateY(-50%)" },
    "center":        { top: "50%",   left: "50%", transform: "translate(-50%, -50%)" },
    "center-right":  { top: "50%",   right: "5%", transform: "translateY(-50%)" },
    "bottom-left":   { bottom: "6%", left: "5%",  transform: "none" },
    "bottom-center": { bottom: "6%", left: "50%", transform: "translateX(-50%)" },
    "bottom-right":  { bottom: "6%", right: "5%", transform: "none" },
  };
  return map[pos] ?? { bottom: "6%", right: "5%" };
}

const fontFamilyMap: Record<string, string> = {
  serif:  "Georgia, serif",
  sans:   "system-ui, sans-serif",
  mono:   "monospace",
  italic: "Georgia, serif",
};

interface WatermarkSettings {
  text_enabled: boolean;
  text_content: string | null;
  text_font: string;
  text_color: string;
  text_opacity: number;
  text_scale: number;
  text_position: WmPosition;
  image_enabled: boolean;
  image_url: string | null;
  image_opacity: number;
  image_scale: number;
  image_position: WmPosition;
}

function WatermarkOverlay({ wm, size }: { wm: WatermarkSettings; size: "thumb" | "full" }) {
  const scaleFactor = size === "thumb" ? 0.55 : 1;
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-40">
      {wm.text_enabled && wm.text_content && (
        <span
          style={{
            position: "absolute",
            ...positionToStyle(wm.text_position),
            opacity: wm.text_opacity,
            fontFamily: fontFamilyMap[wm.text_font] ?? "serif",
            fontStyle: wm.text_font === "italic" ? "italic" : "normal",
            color: wm.text_color,
            fontSize: `${Math.round(wm.text_scale * 36 * scaleFactor) + 8}px`,
            whiteSpace: "nowrap",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            userSelect: "none",
            letterSpacing: "0.04em",
          }}
        >
          {wm.text_content}
        </span>
      )}
      {wm.image_enabled && wm.image_url && (
        <img
          src={wm.image_url}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            ...positionToStyle(wm.image_position),
            opacity: wm.image_opacity,
            width: `${Math.round(wm.image_scale * 60 * scaleFactor) + 10}%`,
            maxWidth: "80%",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}
    </div>
  );
}

// ── Interfaces ───────────────────────────────────────────────────────────────
interface Gallery {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  status: string;
  access_code: string | null;
  photographer_id: string;
  cover_image_url: string | null;
  cover_focal_x: number | null;
  cover_focal_y: number | null;
  expires_at: string | null;
  price_per_photo: number;
  watermark_id: string | null;
  booking_id: string | null;
}

interface BookingSessionInfo {
  // booking fields
  payment_status: string;
  extras_total: number;
  // session fields
  session_price: number;
  tax_rate: number;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  num_photos: number;
  session_title: string;
  session_id: string;
}

interface PhotoTier {
  id: string;
  min_photos: number;
  max_photos: number | null;
  price_per_photo: number;
}

// Find matching tier for a given extra photo count
function calcTieredCost(extraPhotos: number, tiers: PhotoTier[]): { cost: number; tier: PhotoTier | null } {
  if (extraPhotos <= 0 || tiers.length === 0) return { cost: 0, tier: null };
  const sorted = [...tiers].sort((a, b) => a.min_photos - b.min_photos);
  const match = sorted.find((t) => extraPhotos >= t.min_photos && (t.max_photos == null || extraPhotos <= t.max_photos));
  if (!match) {
    // If beyond all tiers, use the last one (largest min)
    const last = sorted[sorted.length - 1];
    return { cost: last.price_per_photo * extraPhotos, tier: last };
  }
  return { cost: match.price_per_photo * extraPhotos, tier: match };
}

interface Photo {
  id: string;
  filename: string;
  storage_path: string | null;
  order_index: number;
  url?: string;
}

type FavFilter = "all" | "favorited" | "not_favorited";

// ── Strip extension from filename ───────────────────────────────────────────
function displayName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

// ── Photographer brand logo ──────────────────────────────────────────────────
function PhotographerBrand({ brand }: { brand: { business_name: string | null; full_name: string | null; hero_image_url: string | null } | null }) {
  if (brand?.hero_image_url) {
    return <img src={brand.hero_image_url} alt={brand.business_name ?? brand.full_name ?? ""} className="h-7 w-auto max-w-[160px] object-contain" draggable={false} />;
  }
  const name = brand?.business_name || brand?.full_name || "Studio";
  return <span className="text-sm font-light tracking-[0.22em] uppercase text-foreground">{name}</span>;
}

// ── Main component ───────────────────────────────────────────────────────────
const GalleryView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [togglingFav, setTogglingFav] = useState<Set<string>>(new Set());
  const [watermark, setWatermark] = useState<WatermarkSettings | null>(null);
  const [photographerBrand, setPhotographerBrand] = useState<{ business_name: string | null; full_name: string | null; hero_image_url: string | null } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  // card note panel open state (photoId -> boolean)
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  // favorites filter
  const [favFilter, setFavFilter] = useState<FavFilter>("all");
  const clientToken = getClientToken();

  // Final gallery view mode (grid / list)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // Downloaded photo ids (persisted in localStorage)
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  // Multi-select for batch download (final only)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloadingSelected, setDownloadingSelected] = useState(false);

  // Purchase modal
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<BookingSessionInfo | null>(null);
  const [photoTiers, setPhotoTiers] = useState<PhotoTier[]>([]);
  const prevFavCountRef = useRef(0);

  // Renewal state
  const [renewalFee, setRenewalFee] = useState<number>(0);
  const [renewalDays, setRenewalDays] = useState<number>(30);
  const [renewalName, setRenewalName] = useState("");
  const [renewalEmail, setRenewalEmail] = useState("");
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalSuccess, setRenewalSuccess] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const [settingsFetched, setSettingsFetched] = useState(false);
  const reactivationHandled = useRef(false);

  // Download state (final galleries)
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Anti-piracy ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Print block
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @media print { body { display: none !important; } }
      * { -webkit-user-select: none !important; user-select: none !important; }
    `;
    document.head.appendChild(styleEl);

    // Block right-click globally
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", blockCtx);

    // Block keyboard shortcuts: F12, Ctrl+S/P/U/A, Ctrl+Shift+I/J/C/K, PrtSc
    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      // Ctrl combos
      if (ctrl && ["s", "p", "u", "a"].includes(key)) { e.preventDefault(); return; }
      // Ctrl+Shift combos (DevTools, view source)
      if (ctrl && e.shiftKey && ["i", "j", "c", "k", "e"].includes(key)) { e.preventDefault(); return; }
      // F keys
      if (["f12", "f11", "f5"].includes(key)) { e.preventDefault(); return; }
      // PrintScreen
      if (e.key === "PrintScreen") { e.preventDefault(); return; }
    };
    window.addEventListener("keydown", blockKeys, true);

    // Detect DevTools open via resize heuristic and blur the page
    const devtoolsStyle = document.createElement("style");
    devtoolsStyle.id = "davions-blur-devtools";
    document.head.appendChild(devtoolsStyle);

    // Disable drag on all images globally
    const blockDrag = (e: DragEvent) => e.preventDefault();
    document.addEventListener("dragstart", blockDrag);

    return () => {
      document.head.removeChild(styleEl);
      document.head.removeChild(devtoolsStyle);
      document.removeEventListener("contextmenu", blockCtx);
      window.removeEventListener("keydown", blockKeys, true);
      document.removeEventListener("dragstart", blockDrag);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("purchased") === "true") setPurchaseSuccess(true);
  }, [searchParams]);

  // ── Fetch renewal settings when gallery is expired ───────────────────────
  useEffect(() => {
    if (!gallery?.expires_at) return;
    const expired = new Date(gallery.expires_at) < new Date();
    if (!expired || settingsFetched) return;
    const galleryType = (gallery as any).category ?? "proof"; // "proof" | "final"
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("gallery_settings")
        .select("key, value")
        .eq("photographer_id", gallery.photographer_id);
      const map: Record<string, string> = {};
      (data ?? []).forEach((s: { key: string; value: string | null }) => {
        if (s.value != null) map[s.key] = s.value;
      });
      // per-type keys take precedence over legacy global keys
      const feeKey    = `${galleryType}_reactivation_fee`;
      const daysKey   = `${galleryType}_renewal_days`;
      const expiryKey = `${galleryType}_expiry_days`;
      setRenewalFee(parseFloat(map[feeKey] ?? map["reactivation_fee"] ?? "0"));
      setRenewalDays(parseInt(map[daysKey] ?? map[expiryKey] ?? map["default_expiry_days"] ?? "30", 10));
      setSettingsFetched(true);
    };
    fetchSettings();
  }, [gallery, settingsFetched]);



  // ── Auto-confirm reactivation on return from Stripe ──────────────────────
  useEffect(() => {
    if (reactivationHandled.current) return;
    if (searchParams.get("reactivated") !== "true") return;
    if (!gallery) return;
    reactivationHandled.current = true;
    const sessionId = searchParams.get("session_id") ?? undefined;
    const storedEmail = sessionStorage.getItem(`davions_renewal_email_${gallery.id}`) ?? undefined;
    const confirmReactivation = async () => {
      setRenewalLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("confirm-gallery-reactivation", {
          body: { galleryId: gallery.id, sessionId, clientEmail: storedEmail },
        });
        if (error) throw error;
        if (data?.success) {
          setRenewalSuccess(true);
          // Reload gallery to reflect new expiry
          window.location.href = window.location.pathname;
        }
      } catch (err: any) {
        setRenewalError(err?.message ?? "Could not confirm renewal");
      } finally {
        setRenewalLoading(false);
      }
    };
    confirmReactivation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery, searchParams]);

  // ── Fetch gallery ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchGallery = async () => {
      if (!slug) return;
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      let query = supabase
        .from("galleries")
        .select("id, title, slug, category, status, access_code, photographer_id, cover_image_url, cover_focal_x, cover_focal_y, expires_at, price_per_photo, watermark_id, booking_id")
        .eq("status", "published");
      if (isUuid) query = query.eq("id", slug);
      else query = query.eq("slug", slug);

      const { data, error } = await query.single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setGallery(data as Gallery);

      // Fetch watermark + photographer brand in parallel
      const [wmResult, brandResult] = await Promise.all([
        data.watermark_id
          ? supabase.from("watermarks").select("text_enabled, text_content, text_font, text_color, text_opacity, text_scale, text_position, image_enabled, image_url, image_opacity, image_scale, image_position").eq("id", data.watermark_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("photographers").select("business_name, full_name, hero_image_url").eq("id", data.photographer_id).single(),
      ]);
      if (wmResult.data) setWatermark(wmResult.data as WatermarkSettings);
      if (brandResult.data) setPhotographerBrand(brandResult.data);

      // Fetch booking + session info for price breakdown (if gallery has a booking)
      if (data.booking_id) {
        try {
          const { data: bookingData } = await supabase
            .from("bookings")
            .select("payment_status, extras_total, session_id, sessions(title, price, tax_rate, deposit_enabled, deposit_amount, deposit_type, num_photos)")
            .eq("id", data.booking_id)
            .single();
          if (bookingData) {
            const s = (bookingData as any).sessions;
            const sessionId = bookingData.session_id as string;
            setBookingInfo({
              payment_status: bookingData.payment_status ?? "pending",
              extras_total: bookingData.extras_total ?? 0,
              session_price: s?.price ?? 0,
              tax_rate: s?.tax_rate ?? 0,
              deposit_enabled: s?.deposit_enabled ?? false,
              deposit_amount: s?.deposit_amount ?? 0,
              deposit_type: s?.deposit_type ?? "fixed",
              num_photos: s?.num_photos ?? 0,
              session_title: s?.title ?? "",
              session_id: sessionId,
            });
            // Fetch photo tiers for this session
            if (sessionId) {
              const { data: tiersData } = await supabase
                .from("session_photo_tiers")
                .select("id, min_photos, max_photos, price_per_photo")
                .eq("session_id", sessionId)
                .order("min_photos", { ascending: true });
              if (tiersData && tiersData.length > 0) {
                setPhotoTiers(tiersData as PhotoTier[]);
              }
            }
          }
        } catch { /* non-blocking */ }
      }

      // Load saved notes + downloaded markers
      setNotes(loadNotes(data.id, clientToken));
      setDownloaded(loadDownloaded(data.id));

      if (data.access_code) {
        const stored = getStoredCode(data.id);
        if (stored && stored.toUpperCase() === (data.access_code ?? "").toUpperCase()) {
          setUnlocked(true);
          await loadPhotos(data.id);
          // Log access (returning visitor with stored code)
          await logAccess(data.photographer_id, data.id);
          setLoading(false);
          return;
        }
      } else {
        setUnlocked(true);
        await loadPhotos(data.id);
        // Log access (no code required)
        await logAccess(data.photographer_id, data.id);
      }
      setLoading(false);
    };
    fetchGallery();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadPhotos = async (galleryId: string) => {
    const { data } = await supabase
      .from("photos")
      .select("id, filename, storage_path, order_index")
      .eq("gallery_id", galleryId)
      .order("order_index", { ascending: true });
    if (data) {
      const withUrls = data.map((p) => {
        let url: string | undefined;
        if (p.storage_path) {
          const { data: urlData } = supabase.storage.from("gallery-photos").getPublicUrl(p.storage_path);
          url = urlData.publicUrl;
        }
        return { ...p, url };
      });
      setPhotos(withUrls);
      const { data: favData } = await supabase
        .from("photo_favorites")
        .select("photo_id")
        .eq("gallery_id", galleryId)
        .eq("client_token", clientToken);
      if (favData) {
        const loadedFavs = new Set(favData.map((f) => f.photo_id));
        setFavorites(loadedFavs);
        // Auto-open summary if there are already favorites on load
        if (loadedFavs.size > 0) setSummaryOpen(true);
      }
    }
  };

  // Auto-open summary when first photo is selected
  useEffect(() => {
    const currentCount = favorites.size;
    if (prevFavCountRef.current === 0 && currentCount === 1) {
      setSummaryOpen(true);
    }
    prevFavCountRef.current = currentCount;
  }, [favorites.size]);

  const handleUnlock = async () => {
    if (!gallery) return;
    if (codeInput.trim().toUpperCase() === (gallery.access_code ?? "").toUpperCase()) {
      setUnlocked(true);
      setCodeError(false);
      storeCode(gallery.id, codeInput.trim().toUpperCase());
      await loadPhotos(gallery.id);
      // Log access after manual unlock
      await logAccess(gallery.photographer_id, gallery.id);
    } else {
      setCodeError(true);
    }
  };

  const toggleFavorite = useCallback(async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    if (!gallery || togglingFav.has(photo.id)) return;
    setTogglingFav((prev) => new Set(prev).add(photo.id));
    const isFav = favorites.has(photo.id);
    if (isFav) {
      await supabase.from("photo_favorites").delete().eq("photo_id", photo.id).eq("client_token", clientToken);
      setFavorites((prev) => { const s = new Set(prev); s.delete(photo.id); return s; });
    } else {
      await supabase.from("photo_favorites").insert({ photo_id: photo.id, gallery_id: gallery.id, client_token: clientToken });
      setFavorites((prev) => new Set(prev).add(photo.id));
    }
    setTogglingFav((prev) => { const s = new Set(prev); s.delete(photo.id); return s; });
  }, [gallery, favorites, togglingFav, clientToken]);

  // ── Note helpers ─────────────────────────────────────────────────────────
  const handleNoteChange = useCallback((photoId: string, value: string) => {
    if (!gallery) return;
    setNotes((prev) => {
      const updated = { ...prev, [photoId]: value };
      saveNotes(gallery.id, clientToken, updated);
      return updated;
    });
  }, [gallery, clientToken]);

  const toggleNotePanel = useCallback((e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    setNoteOpen((prev) => ({ ...prev, [photoId]: !prev[photoId] }));
  }, []);

  // ── Download (final galleries) ────────────────────────────────────────────
  const handleDownloadSingle = useCallback(async (photo: Photo) => {
    if (!photo.url || downloadingId || !gallery) return;
    setDownloadingId(photo.id);
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.filename || `photo-${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Mark as downloaded
      const newSet = markDownloaded(gallery.id, photo.id);
      setDownloaded(new Set(newSet));
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId, gallery]);

  const handleDownloadAll = useCallback(async () => {
    if (!gallery || downloadingAll) return;
    setDownloadingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("download-gallery-zip", {
        body: { galleryId: gallery.id },
      });
      if (error) throw error;
      // The function returns binary ZIP — need to use fetch directly for binary response
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/download-gallery-zip`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ galleryId: gallery.id }),
        }
      );
      if (!res.ok) throw new Error("Failed to generate ZIP");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (gallery.title || "gallery").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      a.download = `${safeTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Mark all photos as downloaded
      const allIds = photos.map((p) => p.id);
      const key = getDownloadedKey(gallery.id);
      const merged = new Set([...loadDownloaded(gallery.id), ...allIds]);
      localStorage.setItem(key, JSON.stringify([...merged]));
      setDownloaded(new Set(merged));
    } catch (err) {
      console.error("Download all error:", err);
    } finally {
      setDownloadingAll(false);
    }
  }, [gallery, downloadingAll, photos]);

  // ── Download selected photos (sequential fetch + mark downloaded) ──────────
  const handleDownloadSelected = useCallback(async () => {
    if (!gallery || downloadingSelected || selected.size === 0) return;
    setDownloadingSelected(true);
    const selectedPhotos = photos.filter((p) => selected.has(p.id));
    try {
      for (const photo of selectedPhotos) {
        if (!photo.url) continue;
        const res = await fetch(photo.url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = photo.filename || `photo-${photo.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      // Mark all selected as downloaded
      const merged = new Set([...loadDownloaded(gallery.id), ...selected]);
      localStorage.setItem(getDownloadedKey(gallery.id), JSON.stringify([...merged]));
      setDownloaded(new Set(merged));
    } catch (err) {
      console.error("Download selected error:", err);
    } finally {
      setDownloadingSelected(false);
      setSelected(new Set());
      setSelectMode(false);
    }
  }, [gallery, downloadingSelected, selected, photos]);

  // ── Select mode helpers ───────────────────────────────────────────────────
  const toggleSelect = useCallback((photoId: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(photoId)) s.delete(photoId); else s.add(photoId);
      return s;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(photos.map((p) => p.id)));
  }, [photos]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectMode(false);
  }, []);

  // ── Purchase flow ─────────────────────────────────────────────────────────
  const handlePurchaseOrSubmit = async () => {
    if (!gallery || !clientEmail.trim()) return;
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-gallery-checkout", {
        body: {
          galleryId: gallery.id,
          clientEmail: clientEmail.trim(),
          clientName: clientName.trim() || undefined,
          clientToken,
          photoCount: favorites.size,
        },
      });
      if (error) throw error;
      if (data?.free) { setPurchaseOpen(false); setPurchaseSuccess(true); return; }
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Lightbox keyboard nav ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min((i ?? 0) + 1, photos.length - 1));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => Math.max((i ?? 0) - 1, 0));
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, photos.length]);

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">Loading…</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <Image className="h-10 w-10 text-muted-foreground/40" />
        <h1 className="text-xl font-light tracking-wide">Gallery not found</h1>
        <p className="text-sm text-muted-foreground">This gallery may not exist or has not been published yet.</p>
      </div>
    );
  }

  const isExpired = gallery?.expires_at ? new Date(gallery.expires_at) < new Date() : false;

  // ── Renewal handler ───────────────────────────────────────────────────────
  const handleRenewal = async () => {
    if (!gallery || !renewalEmail.trim()) return;
    setRenewalLoading(true);
    setRenewalError(null);
    try {
      const { data, error } = await supabase.functions.invoke("reactivate-gallery", {
        body: {
          galleryId: gallery.id,
          clientEmail: renewalEmail.trim(),
          clientName: renewalName.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error === "email_mismatch") {
        setRenewalError("This email is not associated with this gallery. Please use the email provided at the time of booking.");
        return;
      }
      if (data?.free) {
        setRenewalSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      if (data?.url) {
        // Store email so confirm step can re-validate after Stripe redirect
        sessionStorage.setItem(`davions_renewal_email_${gallery.id}`, renewalEmail.trim());
        window.location.href = data.url;
      }
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("email_mismatch") || msg.includes("403")) {
        setRenewalError("This email is not associated with this gallery. Please use the email you provided when booking.");
      } else {
        setRenewalError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setRenewalLoading(false);
    }
  };

  if (isExpired) {
    const expiredDate = gallery?.expires_at
      ? new Date(gallery.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;
    const studioName = photographerBrand?.business_name || photographerBrand?.full_name || "your photographer";

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur-sm">
          <PhotographerBrand brand={photographerBrand} />
        </header>

        {/* Blurred cover background */}
        {gallery?.cover_image_url && (
          <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url(${gallery.cover_image_url})`,
              backgroundSize: "cover",
              backgroundPosition: `${(gallery.cover_focal_x ?? 0.5) * 100}% ${(gallery.cover_focal_y ?? 0.5) * 100}%`,
              filter: "blur(24px) brightness(0.18)",
              transform: "scale(1.05)",
            }}
          />
        )}

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
          {renewalLoading && !renewalSuccess ? (
            <div className="flex flex-col items-center gap-5">
              <Loader2 className="h-8 w-8 animate-spin text-foreground/40" />
              <p className="text-sm text-muted-foreground tracking-widest uppercase">Processing renewal…</p>
            </div>
          ) : renewalSuccess ? (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="h-20 w-20 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-light tracking-wide">Access Renewed!</h2>
                <p className="text-sm text-muted-foreground mt-1">Your gallery is being unlocked…</p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg flex flex-col gap-6">

              {/* ── Hero expired banner ── */}
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarX2 className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-destructive tracking-wide">This gallery has expired</p>
                  {expiredDate && (
                    <p className="text-xs text-destructive/70">
                      Access ended on <strong>{expiredDate}</strong>. Your photos are still safe — renew to view them again.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Gallery title ── */}
              <div className="text-center px-2">
                <h1 className="text-3xl font-light tracking-wide text-foreground">{gallery?.title}</h1>
                <p className="text-sm text-muted-foreground mt-1.5">by {studioName}</p>
              </div>

              {/* ── Offer card ── */}
              <div className="rounded-xl border border-border bg-background/80 backdrop-blur-sm shadow-sm overflow-hidden">

                {/* Offer header */}
                <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs tracking-widest uppercase text-muted-foreground">Renew gallery access</p>
                    <p className="text-foreground font-light mt-0.5 text-sm">
                      Get back access to all your photos for another{" "}
                      <strong className="font-medium">{renewalDays} days</strong>
                    </p>
                  </div>
                  {renewalFee > 0 ? (
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-light tracking-tight text-foreground">${renewalFee.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground tracking-widest uppercase">one-time</p>
                    </div>
                  ) : (
                    <div className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-3 py-1">
                      <p className="text-xs font-medium text-primary tracking-wide">Free</p>
                    </div>
                  )}
                </div>

                {/* What's included */}
                <div className="px-6 py-4 flex flex-col gap-2 border-b border-border">
                  {[
                    `Access for ${renewalDays} days from today`,
                    "Full gallery restored — all photos included",
                    renewalFee > 0 ? "Secure checkout via Stripe" : "Instant access, no payment required",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Form */}
                <div className="px-6 py-5 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Your name</Label>
                      <Input
                        placeholder="Jane Smith"
                        value={renewalName}
                        onChange={(e) => setRenewalName(e.target.value)}
                        disabled={renewalLoading}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="email"
                        placeholder="jane@example.com"
                        value={renewalEmail}
                        onChange={(e) => setRenewalEmail(e.target.value)}
                        disabled={renewalLoading}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {renewalError && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <p className="text-xs text-destructive">{renewalError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleRenewal}
                    disabled={!renewalEmail.trim() || renewalLoading}
                    className="w-full h-11 text-sm"
                  >
                    {renewalLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                    ) : renewalFee > 0 ? (
                      `Renew Access — $${renewalFee.toFixed(2)}`
                    ) : (
                      "Unlock Gallery — Free"
                    )}
                  </Button>

                  {renewalFee > 0 && (
                    <p className="text-center text-[10px] text-muted-foreground/60 tracking-wide">
                      Secure payment powered by Stripe. Your card details are never stored.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        <footer className="relative z-10 border-t border-border py-4 px-6 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50">Powered by Davions</p>
        </footer>
      </div>
    );
  }

  const favCount = favorites.size;
  const isProof = gallery?.category === "proof";
  const pricePerPhoto = gallery?.price_per_photo ?? 0;
  const totalPrice = pricePerPhoto * favCount;
  const isFree = pricePerPhoto === 0;
  const blockContext = (e: React.MouseEvent) => e.preventDefault();

  // Inline summary calculations (mirrors modal logic)
  const inlineSummary = (() => {
    if (!bookingInfo || favCount === 0) return null;
    const bi = bookingInfo;
    const sessionBase = bi.session_price + bi.extras_total;
    const taxAmount = Math.round(sessionBase * (bi.tax_rate / 100));
    const sessionTotal = sessionBase + taxAmount;
    const depositCalc = bi.deposit_type === "percent" || bi.deposit_type === "percentage"
      ? Math.round(sessionTotal * (bi.deposit_amount / 100))
      : bi.deposit_amount;
    let sessionPaid = 0;
    if (bi.payment_status === "paid") sessionPaid = sessionTotal;
    else if (bi.payment_status === "deposit_paid") sessionPaid = bi.deposit_enabled ? depositCalc : 0;
    const sessionBalance = Math.max(0, sessionTotal - sessionPaid);
    const includedPhotos = bi.num_photos;
    const extraPhotos = Math.max(0, favCount - includedPhotos);
    // Use tiered pricing if available, otherwise fallback to flat price_per_photo
    const { cost: extraPhotoCost, tier: activeTier } = photoTiers.length > 0
      ? calcTieredCost(extraPhotos, photoTiers)
      : { cost: pricePerPhoto * extraPhotos, tier: null };
    const effectivePricePerPhoto = extraPhotos > 0 && activeTier
      ? activeTier.price_per_photo
      : pricePerPhoto;
    const photoSelectionCost = includedPhotos === 0 ? pricePerPhoto * favCount : extraPhotoCost;
    return { bi, sessionTotal, taxAmount, sessionPaid, sessionBalance, includedPhotos, extraPhotos, extraPhotoCost, photoSelectionCost, activeTier, effectivePricePerPhoto };
  })();



  // Derived filtered list (only relevant for proof galleries)
  const filteredPhotos = isProof
    ? photos.filter((p) => {
        if (favFilter === "favorited") return favorites.has(p.id);
        if (favFilter === "not_favorited") return !favorites.has(p.id);
        return true;
      })
    : photos;

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">

      {/* ── Navbar ── */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <PhotographerBrand brand={photographerBrand} />
        <div className="flex items-center gap-3">
          {/* Proof: purchase pill with summary popover */}
          {unlocked && isProof && favCount > 0 && (
            <Popover open={summaryOpen} onOpenChange={setSummaryOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2.5 border border-rose-300 bg-rose-50 hover:bg-rose-100 transition-colors px-3.5 py-1.5 rounded-full">
                  <span className="flex items-center gap-1 text-rose-600">
                    <Heart className="h-3.5 w-3.5 fill-rose-500" />
                    <span className="text-xs font-medium">{favCount}</span>
                  </span>
                  {pricePerPhoto > 0 && (
                    <>
                      <span className="text-rose-300 text-xs">·</span>
                      <span className="text-xs text-rose-700 font-medium">{formatCurrency(inlineSummary ? inlineSummary.extraPhotoCost + (inlineSummary.sessionBalance) : totalPrice)}</span>
                    </>
                  )}
                  <span className="hidden sm:flex items-center gap-1.5 ml-0.5 text-[10px] tracking-widest uppercase text-rose-600 font-light">
                    <ShoppingCart className="h-3 w-3" />
                    {isFree ? "Submit" : "Checkout"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-[340px] p-0 rounded-lg border-border shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3 bg-foreground flex items-center justify-between">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-background/70 font-light">Order Summary</p>
                  <span className="flex items-center gap-1.5 text-background">
                    <Heart className="h-3.5 w-3.5 fill-background" />
                    <span className="text-xs font-medium">{favCount} photo{favCount !== 1 ? "s" : ""} selected</span>
                  </span>
                </div>

                <div className="flex flex-col divide-y divide-border">

                  {/* ── SESSION BLOCK ── */}
                  {inlineSummary && (
                    <div className="px-5 py-4 flex flex-col gap-2.5">
                      {inlineSummary.bi.session_title && (
                        <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60 font-light -mb-1">{inlineSummary.bi.session_title}</p>
                      )}

                      {/* Session fee */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-light">Session fee</span>
                        <span className="text-xs tabular-nums text-foreground">{formatCurrency(inlineSummary.bi.session_price)}</span>
                      </div>

                      {/* Extra Photos (booking add-ons) */}
                      {inlineSummary.bi.extras_total > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground font-light">Extra Photos</span>
                            <span className="text-[10px] text-muted-foreground/50 font-light">Selected add-ons at booking</span>
                          </div>
                          <span className="text-xs tabular-nums text-foreground font-medium">{formatCurrency(inlineSummary.bi.extras_total)}</span>
                        </div>
                      )}

                      {/* Tax */}
                      {inlineSummary.taxAmount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-light">Tax ({inlineSummary.bi.tax_rate}%)</span>
                          <span className="text-xs tabular-nums text-foreground">{formatCurrency(inlineSummary.taxAmount)}</span>
                        </div>
                      )}

                      {/* Session subtotal */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-border">
                        <span className="text-xs font-semibold text-foreground tracking-wide">Session total</span>
                        <span className="text-xs tabular-nums font-semibold text-foreground">{formatCurrency(inlineSummary.sessionTotal)}</span>
                      </div>

                      {/* Deposit paid */}
                      {inlineSummary.sessionPaid > 0 && (
                        <div className="flex items-center justify-between rounded-md bg-primary/8 px-3 py-2 -mx-0.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] tracking-[0.18em] uppercase text-primary/70 font-medium">Deposit paid</span>
                            <span className="text-[10px] text-muted-foreground font-light">
                              {inlineSummary.bi.payment_status === "paid" ? "Paid in full" : "Partial deposit"}
                            </span>
                          </div>
                          <span className="text-sm tabular-nums font-semibold text-primary">− {formatCurrency(inlineSummary.sessionPaid)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── EXTRA PHOTOS BLOCK ── */}
                  {inlineSummary && pricePerPhoto > 0 && (
                    <div className="px-5 py-4 flex flex-col gap-2.5">
                      <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60 font-light -mb-1">Extra Photos</p>

                      {/* Included */}
                      {inlineSummary.includedPhotos > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-light">Included in session</span>
                          <span className="text-xs tabular-nums text-muted-foreground">{inlineSummary.includedPhotos} photos</span>
                        </div>
                      )}

                      {/* Selected */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-light">You selected</span>
                        <span className="text-xs tabular-nums font-medium text-foreground flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                          {favCount} photos
                        </span>
                      </div>

                      {/* Pricing tiers */}
                      {photoTiers.length > 0 && (
                        <div className="flex flex-col gap-1 bg-muted/40 rounded-md px-3 py-2.5 -mx-0.5">
                          <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/50 font-light mb-0.5">Pricing tiers</p>
                          {photoTiers.map((t) => {
                            const isActive = inlineSummary.activeTier?.id === t.id && inlineSummary.extraPhotos > 0;
                            return (
                              <div key={t.id} className={`flex items-center justify-between text-[11px] ${isActive ? "text-rose-700 font-semibold" : "text-muted-foreground font-light"}`}>
                                <span className="flex items-center gap-1.5">
                                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />}
                                  {!isActive && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20 inline-block" />}
                                  {t.min_photos}{t.max_photos ? `–${t.max_photos}` : "+"} extra photo{t.min_photos !== 1 ? "s" : ""}
                                </span>
                                <span className="tabular-nums">{formatCurrency(t.price_per_photo)} / photo</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Extra photos cost */}
                      {inlineSummary.extraPhotos > 0 ? (
                        <div className="flex items-center justify-between rounded-md bg-rose-50 dark:bg-rose-950/30 px-3 py-2.5 -mx-0.5 border border-rose-200 dark:border-rose-900">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] tracking-[0.18em] uppercase text-rose-700 dark:text-rose-400 font-semibold">Extra Photos</span>
                            <span className="text-[10px] text-rose-500/80 font-light">
                              {inlineSummary.extraPhotos} × {formatCurrency(inlineSummary.effectivePricePerPhoto)} / photo
                            </span>
                          </div>
                          <span className="text-sm tabular-nums font-bold text-rose-700 dark:text-rose-400">{formatCurrency(inlineSummary.extraPhotoCost)}</span>
                        </div>
                      ) : inlineSummary.includedPhotos > 0 && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground/60 italic">
                          <span>Within included quantity</span>
                          <span className="tabular-nums text-primary/70 font-medium not-italic">No extra charge</span>
                        </div>
                      )}

                      {/* Photos total (no booking) */}
                      {inlineSummary.includedPhotos === 0 && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-border">
                          <span className="text-xs font-semibold text-foreground">Photos total</span>
                          <span className="text-xs tabular-nums font-semibold text-foreground">{formatCurrency(inlineSummary.photoSelectionCost)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback: no booking */}
                  {!inlineSummary && pricePerPhoto > 0 && (
                    <div className="px-5 py-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-light">{favCount} × {formatCurrency(pricePerPhoto)}</span>
                      <span className="text-xs tabular-nums font-semibold text-foreground">{formatCurrency(totalPrice)}</span>
                    </div>
                  )}

                  {/* ── BALANCE DUE ── */}
                  {inlineSummary && (inlineSummary.sessionBalance > 0 || inlineSummary.extraPhotoCost > 0) && (
                    <div className="px-5 py-4 bg-foreground/[0.03] flex flex-col gap-2">
                      {inlineSummary.sessionBalance > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-light">Session balance</span>
                          <span className="text-xs tabular-nums text-amber-700 dark:text-amber-400 font-semibold">{formatCurrency(inlineSummary.sessionBalance)}</span>
                        </div>
                      )}
                      {inlineSummary.extraPhotoCost > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-light">Extra photos</span>
                          <span className="text-xs tabular-nums text-rose-700 dark:text-rose-400 font-semibold">{formatCurrency(inlineSummary.extraPhotoCost)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-sm font-bold text-foreground tracking-wide">Balance due today</span>
                        <span className="text-base tabular-nums font-bold text-foreground">{formatCurrency(inlineSummary.sessionBalance + inlineSummary.extraPhotoCost)}</span>
                      </div>
                    </div>
                  )}

                  {/* Fully paid, no extras */}
                  {inlineSummary && inlineSummary.sessionBalance === 0 && inlineSummary.extraPhotoCost === 0 && inlineSummary.sessionPaid > 0 && (
                    <div className="px-5 py-3 bg-primary/5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-light">Balance</span>
                      <span className="text-xs tabular-nums text-primary font-semibold">Paid in full ✓</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="px-5 py-4 border-t border-border bg-background">
                  <Button
                    onClick={() => setPurchaseOpen(true)}
                    className="w-full gap-2 text-xs tracking-widest uppercase font-light"
                    size="sm"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {isFree ? "Submit Selection" : "Proceed to Checkout"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {/* Final: Select + Download All buttons */}
          {unlocked && !isProof && photos.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={selectMode ? "outline" : "secondary"}
                onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}
                className="gap-1.5 text-xs tracking-widest uppercase font-light"
              >
                <MousePointerSquareDashed className="h-3.5 w-3.5" />
                {selectMode ? "Cancel" : "Select"}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="gap-2 text-xs tracking-widest uppercase font-light"
              >
                {downloadingAll ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…</>
                ) : (
                  <><ArrowDownToLine className="h-3.5 w-3.5" /> Download All</>
                )}
              </Button>
            </div>
          )}
          <Badge
            variant={isProof ? "outline" : "default"}
            className="text-[9px] tracking-[0.2em] uppercase font-light rounded-none"
          >
            {isProof ? "Proof" : "Final"}
          </Badge>
        </div>
      </header>

      {/* Purchase success banner */}
      {purchaseSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-light">
            {isFree
              ? "Your selection was submitted! The photographer will be notified."
              : "Payment confirmed! Your selection has been recorded."}
          </p>
          <button onClick={() => setPurchaseSuccess(false)} className="ml-auto text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Access gate ── */}
      {!unlocked && gallery?.access_code && (
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-sm flex flex-col gap-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full border border-border flex items-center justify-center">
                <Lock className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-light tracking-wide">{gallery.title}</h1>
                <p className="text-sm text-muted-foreground">This gallery is private. Enter the access code to continue.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Input
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="ACCESS CODE"
                autoFocus
                className={`rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground text-center tracking-[0.4em] uppercase font-mono text-base h-12 ${codeError ? "border-destructive focus-visible:border-destructive" : ""}`}
              />
              {codeError && <p className="text-xs text-destructive text-center">Incorrect code — please try again.</p>}
              <Button onClick={handleUnlock} className="w-full h-11 tracking-widest uppercase text-xs font-light" disabled={!codeInput.trim()}>
                Unlock Gallery
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery content ── */}
      {unlocked && (
        <main className="flex-1 flex flex-col pb-10">

          {/* ── Final gallery: delivery banner ── */}
          {!isProof && (
            <div className="bg-primary/5 border-b border-border px-6 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <PackageOpen className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-light text-foreground">Your edited photos are ready to download.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Download individually or get all photos at once as a ZIP file.</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleDownloadAll}
                disabled={downloadingAll || photos.length === 0}
                className="shrink-0 gap-2 text-xs tracking-widest uppercase font-light hidden sm:flex"
              >
                {downloadingAll ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing ZIP…</> : <><ArrowDownToLine className="h-3.5 w-3.5" /> Download All ({photos.length})</>}
              </Button>
            </div>
          )}

          {/* Cover hero */}
          {gallery?.cover_image_url ? (
            <div className="relative w-full h-[100dvh] overflow-hidden shrink-0" onContextMenu={blockContext}>
              <img
                src={gallery.cover_image_url}
                alt={gallery.title}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
                style={{ objectPosition: `${gallery.cover_focal_x ?? 50}% ${gallery.cover_focal_y ?? 50}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-6 flex items-end justify-between">
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-2xl font-light tracking-wide text-white drop-shadow">{gallery.title}</h1>
                  <p className="text-[11px] text-white/60 tracking-widest uppercase">
                    {photos.length} photo{photos.length !== 1 ? "s" : ""}
                    {isProof && " · Click ♡ to select"}
                    {!isProof && " · Ready for download"}
                  </p>
                </div>
                <Badge variant={isProof ? "outline" : "default"} className="text-[9px] tracking-[0.2em] uppercase font-light rounded-none border-white/40 text-white shrink-0">
                  {isProof ? "Proof" : "Final"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="px-6 md:px-10 pt-8 pb-2">
              <h1 className="text-2xl font-light tracking-wide">{gallery?.title}</h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
                {isProof && " · Click ♡ to select"}
                {!isProof && " · Ready for download"}
              </p>
            </div>
          )}

          <div className="p-6 md:p-10 flex flex-col gap-6">
            {photos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Image className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No photos in this gallery yet.</p>
              </div>
            )}

            {/* ── Toolbar: filter (proof) or view toggle (final) ── */}
            {photos.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Proof: favorites filter */}
                {isProof && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {(
                      [
                        { value: "all", label: "All", count: photos.length },
                        { value: "favorited", label: "Favorited", count: favorites.size },
                        { value: "not_favorited", label: "Not favorited", count: photos.length - favorites.size },
                      ] as { value: FavFilter; label: string; count: number }[]
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFavFilter(opt.value)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[0.18em] uppercase font-light border transition-colors rounded-none
                          ${favFilter === opt.value
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                          }`}
                      >
                        {opt.value === "favorited" && <Heart className="h-2.5 w-2.5 fill-current" />}
                        {opt.label}
                        <span className={`ml-0.5 text-[9px] ${favFilter === opt.value ? "text-background/70" : "text-muted-foreground/50"}`}>
                          {opt.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Final: downloaded count + select controls + view toggle */}
                {!isProof && (
                  <div className="flex items-center justify-between w-full gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      {downloaded.size > 0 && (
                        <span className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted-foreground">
                          <CheckCheck className="h-3 w-3 text-primary" />
                          {downloaded.size} of {photos.length} downloaded
                        </span>
                      )}
                      {selectMode && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={selectAll}
                            className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Select all
                          </button>
                          {selected.size > 0 && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <button
                                onClick={() => setSelected(new Set())}
                                className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Clear
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center border border-border">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                        title="Grid view"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                        title="List view"
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state when filter yields no results (proof) */}
            {isProof && photos.length > 0 && filteredPhotos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Heart className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {favFilter === "favorited" ? "No favorited photos yet." : "No photos here."}
                </p>
              </div>
            )}

            {/* ── GRID view ── */}
            {(isProof || viewMode === "grid") && filteredPhotos.length > 0 && (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredPhotos.map((photo) => {
                  const index = photos.indexOf(photo);
                  const isFav = favorites.has(photo.id);
                  const noteVal = notes[photo.id] ?? "";
                  const isNoteOpen = noteOpen[photo.id] ?? false;
                  const isDownloadingThis = downloadingId === photo.id;
                  const isDownloaded = downloaded.has(photo.id);
                  const isSelected = selected.has(photo.id);
                  return (
                    <div key={photo.id} className="flex flex-col gap-0">
                      {/* Image card */}
                      <div
                        className={`relative group aspect-square bg-muted overflow-hidden cursor-pointer transition-all duration-200
                          ${isProof && isFav ? "ring-2 ring-rose-500 ring-offset-2 ring-offset-background" : ""}
                          ${!isProof && selectMode && isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                        `}
                        onClick={() => {
                          if (!isProof && selectMode) { toggleSelect(photo.id); return; }
                          setLightboxIndex(index);
                        }}
                        onContextMenu={blockContext}
                      >
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                            draggable={false}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}

                        {/* Watermark — proof only */}
                        {isProof && watermark && <WatermarkOverlay wm={watermark} size="thumb" />}

                        {/* Proof: selected checkmark */}
                        {isProof && isFav && (
                          <div className="absolute top-2 left-2 z-30 bg-rose-500 text-white rounded-full p-1 shadow-lg">
                            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}

                        {/* Proof: rose tint when selected */}
                        {isProof && isFav && (
                          <div className="absolute inset-0 bg-rose-500/8 pointer-events-none z-10" />
                        )}

                        {/* Final: select mode checkbox */}
                        {!isProof && selectMode && (
                          <div className={`absolute top-2 left-2 z-30 h-5 w-5 border-2 flex items-center justify-center transition-all
                            ${isSelected ? "bg-primary border-primary" : "bg-background/80 border-border"}`}>
                            {isSelected && <CheckCheck className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        )}

                        {/* Final: downloaded badge (hidden in select mode) */}
                        {!isProof && isDownloaded && !selectMode && (
                          <div className="absolute top-2 left-2 z-30 flex items-center gap-1 bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] tracking-wider uppercase font-light">
                            <CheckCheck className="h-2.5 w-2.5" />
                            Done
                          </div>
                        )}

                        {/* Final: select tint */}
                        {!isProof && selectMode && isSelected && (
                          <div className="absolute inset-0 bg-primary/10 pointer-events-none z-10" />
                        )}

                        {/* Proof: hover overlay */}
                        {isProof && (
                          <div
                            className="absolute inset-0 flex flex-col items-center justify-end pb-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                            style={{ background: isFav ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.38)" }}
                          >
                            <button
                              onClick={(e) => toggleFavorite(e, photo)}
                              className={`pointer-events-auto flex items-center gap-2 px-5 py-2 text-[11px] tracking-widest uppercase font-semibold shadow-xl transition-all duration-150
                                ${isFav
                                  ? "bg-rose-500 text-white hover:bg-rose-600"
                                  : "bg-white text-black hover:bg-rose-500 hover:text-white"
                                }`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-white" : ""}`} />
                              {isFav ? "Remove" : "Select"}
                            </button>
                          </div>
                        )}

                        {/* Final: hover download overlay (only when NOT in select mode) */}
                        {!isProof && !selectMode && (
                          <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-foreground/30">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadSingle(photo); }}
                              disabled={isDownloadingThis || !!downloadingId}
                              className="pointer-events-auto flex items-center gap-2 px-5 py-2 text-[11px] tracking-widest uppercase font-semibold shadow-xl bg-background text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-150 disabled:opacity-50"
                            >
                              {isDownloadingThis ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading…</>
                              ) : (
                                <><Download className="h-3.5 w-3.5" /> Download</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Below card: filename + actions */}
                      <div className="bg-background border border-t-0 border-border px-3 pt-2 pb-2 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground truncate leading-tight" title={photo.filename}>
                            {displayName(photo.filename)}
                          </span>
                          {/* Proof: note toggle */}
                          {isProof && (
                            <button
                              onClick={(e) => toggleNotePanel(e, photo.id)}
                              className={`shrink-0 flex items-center gap-1 text-[10px] tracking-widest uppercase transition-colors ${
                                noteVal ? "text-foreground" : isNoteOpen ? "text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"
                              }`}
                              title="Add note"
                            >
                              <MessageSquare className="h-3 w-3" />
                              {noteVal ? <span className="text-[9px]">Note</span> : null}
                            </button>
                          )}
                          {/* Final: inline download button (hidden in select mode) */}
                          {!isProof && !selectMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadSingle(photo); }}
                              disabled={isDownloadingThis || !!downloadingId}
                              className={`shrink-0 flex items-center gap-1 text-[10px] tracking-widest uppercase transition-colors disabled:opacity-40 ${isDownloaded ? "text-primary" : "text-muted-foreground/70 hover:text-foreground"}`}
                              title="Download this photo"
                            >
                              {isDownloadingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : isDownloaded ? <CheckCheck className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                            </button>
                          )}
                        </div>

                        {/* Note textarea — slides open (proof only) */}
                        {isProof && isNoteOpen && (
                          <Textarea
                            value={noteVal}
                            onChange={(e) => handleNoteChange(photo.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Your note about this photo…"
                            className="text-xs rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground min-h-[60px] resize-none leading-snug placeholder:text-muted-foreground/40"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── LIST view (final galleries only) ── */}
            {!isProof && viewMode === "list" && filteredPhotos.length > 0 && (
              <div className="flex flex-col divide-y divide-border border border-border">
                {filteredPhotos.map((photo) => {
                  const index = photos.indexOf(photo);
                  const isDownloadingThis = downloadingId === photo.id;
                  const isDownloaded = downloaded.has(photo.id);
                  const isSelected = selected.has(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`flex items-center gap-4 px-4 py-3 group hover:bg-muted/40 transition-colors cursor-default
                        ${selectMode && isSelected ? "bg-primary/5" : ""}
                      `}
                      onClick={() => selectMode && toggleSelect(photo.id)}
                    >
                      {/* Select checkbox (select mode) or thumbnail click (normal) */}
                      {selectMode ? (
                        <div className={`h-5 w-5 shrink-0 border-2 flex items-center justify-center transition-all
                          ${isSelected ? "bg-primary border-primary" : "bg-background border-border"}`}>
                          {isSelected && <CheckCheck className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      ) : null}

                      {/* Thumbnail */}
                      <div
                        className="relative h-14 w-14 shrink-0 overflow-hidden bg-muted cursor-pointer"
                        onClick={(e) => { if (selectMode) return; e.stopPropagation(); setLightboxIndex(index); }}
                        onContextMenu={blockContext}
                      >
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-4 w-4 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Filename */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-light text-foreground truncate"
                          title={photo.filename}
                        >
                          {displayName(photo.filename)}
                        </p>
                        {isDownloaded && (
                          <span className="text-[10px] text-primary tracking-wider uppercase flex items-center gap-1 mt-0.5">
                            <CheckCheck className="h-2.5 w-2.5" />
                            Downloaded
                          </span>
                        )}
                      </div>

                      {/* Download button (hidden in select mode) */}
                      {!selectMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadSingle(photo); }}
                          disabled={isDownloadingThis || !!downloadingId}
                          className={`shrink-0 flex items-center gap-2 px-4 py-1.5 text-[10px] tracking-widest uppercase font-light border transition-colors disabled:opacity-40
                            ${isDownloaded
                              ? "border-primary/30 text-primary hover:bg-primary/10"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                            }`}
                          title="Download this photo"
                        >
                          {isDownloadingThis ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Downloading…</>
                          ) : isDownloaded ? (
                            <><CheckCheck className="h-3 w-3" /> Download again</>
                          ) : (
                            <><Download className="h-3 w-3" /> Download</>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ── Sticky selection action bar (final + selectMode) ── */}
      {!isProof && selectMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-light text-foreground">
              {selected.size > 0 ? (
                <><span className="font-medium">{selected.size}</span> photo{selected.size !== 1 ? "s" : ""} selected</>
              ) : (
                <span className="text-muted-foreground">Click photos to select</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={clearSelection}
              className="text-xs tracking-widest uppercase font-light"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadSelected}
              disabled={selected.size === 0 || downloadingSelected}
              className="gap-2 text-xs tracking-widest uppercase font-light"
            >
              {downloadingSelected ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading…</>
              ) : (
                <><Download className="h-3.5 w-3.5" /> Download {selected.size > 0 ? `(${selected.size})` : ""}</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Purchase / Submit modal ── */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-lg rounded-none border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-light tracking-wide flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {isFree ? "Submit Selection" : "Purchase Selection"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {favCount} photo{favCount !== 1 ? "s" : ""} selected
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 pt-1">

            {/* ── Booking / Session financial breakdown ── */}
            {bookingInfo && (() => {
              const bi = bookingInfo;
              const sessionBase = bi.session_price + bi.extras_total;
              const taxAmount = Math.round(sessionBase * (bi.tax_rate / 100));
              const sessionTotal = sessionBase + taxAmount;

              // Deposit paid
              const depositCalc = bi.deposit_type === "percent" || bi.deposit_type === "percentage"
                ? Math.round(sessionTotal * (bi.deposit_amount / 100))
                : bi.deposit_amount;
              let sessionPaid = 0;
              if (bi.payment_status === "paid") sessionPaid = sessionTotal;
              else if (bi.payment_status === "deposit_paid") sessionPaid = bi.deposit_enabled ? depositCalc : 0;
              const sessionBalance = Math.max(0, sessionTotal - sessionPaid);

              // Photos: beyond the included num_photos
              const includedPhotos = bi.num_photos;
              const extraPhotos = Math.max(0, favCount - includedPhotos);
              const { cost: extraPhotoCost, tier: activeTier } = photoTiers.length > 0
                ? calcTieredCost(extraPhotos, photoTiers)
                : { cost: pricePerPhoto * extraPhotos, tier: null };
              const effectivePPP = extraPhotos > 0 && activeTier ? activeTier.price_per_photo : pricePerPhoto;
              const photoSelectionCost = includedPhotos === 0 ? pricePerPhoto * favCount : extraPhotoCost;

              return (
                <div className="flex flex-col gap-0 border border-border">
                  {/* Section header */}
                  <div className="px-4 py-2 bg-muted/30 border-b border-border">
                    <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-light">Session Summary</p>
                    {bi.session_title && <p className="text-xs font-light text-foreground mt-0.5">{bi.session_title}</p>}
                  </div>

                  <div className="px-4 py-3 flex flex-col gap-2">
                    {/* Session fee */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-light">Session fee</span>
                      <span className="tabular-nums">{formatCurrency(bi.session_price)}</span>
                    </div>

                    {/* Extras */}
                    {bi.extras_total > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-light">Add-ons / Extras</span>
                        <span className="tabular-nums">{formatCurrency(bi.extras_total)}</span>
                      </div>
                    )}

                    {/* Tax */}
                    {taxAmount > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-light">Tax ({bi.tax_rate}%)</span>
                        <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                      </div>
                    )}

                    {/* Subtotal */}
                    <div className="flex items-center justify-between text-xs border-t border-border pt-2 mt-0.5">
                      <span className="text-foreground font-medium">Session total</span>
                      <span className="tabular-nums font-medium">{formatCurrency(sessionTotal)}</span>
                    </div>

                    {/* Paid */}
                    {sessionPaid > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-light">
                          {bi.payment_status === "paid" ? "Paid in full" : "Deposit paid"}
                        </span>
                        <span className="tabular-nums text-primary">− {formatCurrency(sessionPaid)}</span>
                      </div>
                    )}

                    {/* Balance */}
                    {sessionBalance > 0 && (
                      <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/20 -mx-4 px-4 py-2 mt-1 border-t border-amber-200 dark:border-amber-800">
                        <span className="text-amber-700 dark:text-amber-400 font-medium">Session balance due</span>
                        <span className="tabular-nums text-amber-700 dark:text-amber-400 font-medium">{formatCurrency(sessionBalance)}</span>
                      </div>
                    )}
                    {sessionBalance === 0 && sessionPaid > 0 && (
                      <div className="flex items-center justify-between text-xs bg-primary/5 -mx-4 px-4 py-2 mt-1 border-t border-border">
                        <span className="text-muted-foreground font-light">Session balance</span>
                        <span className="tabular-nums text-primary font-medium">Paid in full ✓</span>
                      </div>
                    )}
                  </div>

                  {/* Photo selection section */}
                  {pricePerPhoto > 0 && (
                    <>
                      <div className="px-4 py-2 bg-muted/30 border-t border-border">
                        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-light">Photo Selection</p>
                      </div>
                      <div className="px-4 py-3 flex flex-col gap-2">
                        {/* Tiered pricing table */}
                        {photoTiers.length > 0 && (
                          <div className="flex flex-col gap-0.5 bg-muted/30 -mx-4 px-4 py-2.5 border-b border-border mb-1">
                            <p className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground/60 font-light mb-1.5">Extra photo pricing tiers</p>
                            {photoTiers.map((t) => (
                              <div key={t.id} className={`flex items-center justify-between text-[11px] ${activeTier?.id === t.id && extraPhotos > 0 ? "text-rose-700 dark:text-rose-400 font-semibold" : "text-muted-foreground font-light"}`}>
                                <span>{t.min_photos}{t.max_photos ? `–${t.max_photos}` : "+"} extra photo{t.min_photos !== 1 ? "s" : ""}</span>
                                <span className="tabular-nums">{formatCurrency(t.price_per_photo)} / photo</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Selected count */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-light flex items-center gap-1.5">
                            <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                            Photos selected
                          </span>
                          <span className="tabular-nums font-medium text-foreground">{favCount} photo{favCount !== 1 ? "s" : ""}</span>
                        </div>
                        {/* Included in session */}
                        {includedPhotos > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-light">Included in session</span>
                            <span className="text-muted-foreground tabular-nums">{includedPhotos} photo{includedPhotos !== 1 ? "s" : ""} · free</span>
                          </div>
                        )}
                        {/* Extra photos block */}
                        {extraPhotos > 0 ? (
                          <div className="flex flex-col gap-1 bg-rose-50 dark:bg-rose-950/20 -mx-4 px-4 py-2.5 mt-0.5 border-t border-rose-100 dark:border-rose-900">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-rose-700 dark:text-rose-400">Extra photos</span>
                              <span className="tabular-nums font-semibold text-rose-700 dark:text-rose-400">{formatCurrency(extraPhotoCost)}</span>
                            </div>
                            <p className="text-[10px] text-rose-500/80 font-light">
                              {extraPhotos} photo{extraPhotos !== 1 ? "s" : ""} × {formatCurrency(effectivePPP)} each
                              {activeTier && (
                                <span className="ml-1 opacity-70">
                                  (tier: {activeTier.min_photos}{activeTier.max_photos ? `–${activeTier.max_photos}` : "+"} photos)
                                </span>
                              )}
                            </p>
                          </div>
                        ) : includedPhotos > 0 ? (
                          <div className="flex items-center justify-between text-xs text-primary/70">
                            <span className="font-light">Within included quantity</span>
                            <span className="tabular-nums">No extra charge</span>
                          </div>
                        ) : null}
                        {/* Total for photos (no included photos = all are charged) */}
                        {includedPhotos === 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-light">{favCount} × {formatCurrency(pricePerPhoto)}</span>
                            <span className="tabular-nums">{formatCurrency(photoSelectionCost)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs border-t border-border pt-2 mt-0.5 font-medium">
                          <span>Due today for photos</span>
                          <span className="tabular-nums">{formatCurrency(photoSelectionCost)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Fallback simple summary when no booking info */}
            {!bookingInfo && pricePerPhoto > 0 && (
              <div className="border border-border bg-muted/20 px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-light">{favCount} × {formatCurrency(pricePerPhoto)}</span>
                <span className="font-medium text-foreground">{formatCurrency(totalPrice)}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                  Your name <span className="normal-case tracking-normal text-muted-foreground/50">(optional)</span>
                </Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Jane Smith" className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                  E-mail <span className="text-destructive">*</span>
                </Label>
                <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="jane@example.com" className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground" />
              </div>
            </div>

            <Button onClick={handlePurchaseOrSubmit} disabled={!clientEmail.trim() || checkingOut} className="w-full gap-2" size="lg">
              {checkingOut ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : isFree ? "Submit Selection" : (
                <><ShoppingCart className="h-4 w-4" /> Go to Checkout · {formatCurrency(totalPrice)}</>
              )}
            </Button>
            {!isFree && (
              <p className="text-[10px] text-center text-muted-foreground/50 -mt-3">Secure payment powered by Stripe</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && photos[lightboxIndex] && (() => {
        const lPhoto = photos[lightboxIndex];
        const lIsFav = favorites.has(lPhoto.id);
        const lNoteVal = notes[lPhoto.id] ?? "";
        return (
          <div
            className="fixed inset-0 bg-black z-50 flex flex-col select-none"
            onContextMenu={blockContext}
          >
            {/* ── Top bar: counter + filename + close ── */}
            <div className="flex items-center justify-between px-5 py-3 z-10 shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/30 tracking-[0.2em] uppercase font-light">
                  Photo {lightboxIndex + 1} of {photos.length}
                </span>
                <span className="text-[13px] text-white/70 font-light tracking-wide">
                  {displayName(lPhoto.filename)}
                </span>
              </div>
              <button
                className="text-white/40 hover:text-white transition-colors p-1"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Image area (flex-1, centered) ── */}
            <div className="flex-1 flex items-center justify-center relative min-h-0 px-14">
              {/* Prev */}
              {lightboxIndex > 0 && (
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors z-10 p-2"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
              )}
              {/* Next */}
              {lightboxIndex < photos.length - 1 && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors z-10 p-2"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              )}

              {/* Photo + watermark (proof only) */}
              <div
                className="relative inline-flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={isProof ? blockContext : undefined}
                style={{ maxHeight: "calc(100vh - 200px)", maxWidth: "100%" }}
              >
                <img
                  src={lPhoto.url}
                  alt=""
                  className="block max-h-full max-w-full object-contain pointer-events-none"
                  style={{ maxHeight: "calc(100vh - 200px)" }}
                  draggable={false}
                />
                {isProof && watermark && <WatermarkOverlay wm={watermark} size="full" />}
              </div>
            </div>

            {/* ── Bottom bar: CTA (proof) or Download (final) + note ── */}
            <div className="shrink-0 flex flex-col items-center gap-3 px-6 pb-6 pt-4" onClick={(e) => e.stopPropagation()}>

              {/* Proof CTA */}
              {isProof && (
                <div className="flex flex-col items-center gap-2">
                  {pricePerPhoto > 0 && (
                    <span className="text-[11px] text-white/30 tracking-widest uppercase">
                      {formatCurrency(pricePerPhoto)} per photo
                    </span>
                  )}
                  <button
                    onClick={(e) => toggleFavorite(e, lPhoto)}
                    className={`flex items-center gap-3 px-10 py-3.5 text-sm tracking-widest uppercase font-semibold transition-all duration-200 shadow-2xl
                      ${lIsFav
                        ? "bg-rose-500 text-white hover:bg-rose-600"
                        : "bg-white text-black hover:bg-rose-500 hover:text-white"
                      }`}
                  >
                    <Heart className={`h-4 w-4 transition-all ${lIsFav ? "fill-white" : ""}`} />
                    {lIsFav ? "Selected  ·  Remove" : "Add to Selection"}
                  </button>
                  {favCount > 0 && (
                    <button
                      onClick={() => { setLightboxIndex(null); setPurchaseOpen(true); }}
                      className="text-[10px] text-white/30 hover:text-white/70 tracking-widest uppercase transition-colors underline underline-offset-2"
                    >
                      {favCount} selected · view selection
                    </button>
                  )}
                </div>
              )}

              {/* Final: download this photo CTA */}
              {!isProof && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadSingle(lPhoto); }}
                  disabled={!!downloadingId}
                  className="flex items-center gap-3 px-10 py-3.5 text-sm tracking-widest uppercase font-semibold bg-background text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-2xl disabled:opacity-50"
                >
                  {downloadingId === lPhoto.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Downloading…</>
                  ) : (
                    <><Download className="h-4 w-4" /> Download Photo</>
                  )}
                </button>
              )}

              {/* Note field — proof only */}
              {isProof && (
                <div className="w-full max-w-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageSquare className="h-3 w-3 text-white/30" />
                    <span className="text-[10px] text-white/30 tracking-widest uppercase">Note</span>
                  </div>
                  <Textarea
                    value={lNoteVal}
                    onChange={(e) => handleNoteChange(lPhoto.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Write something about this photo… e.g. I want this one in black & white"
                    className="w-full text-xs bg-white/5 border-white/10 text-white/80 placeholder:text-white/20 rounded-none focus-visible:ring-0 focus-visible:border-white/30 min-h-[52px] resize-none leading-snug"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6 flex items-center justify-center">
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50">Powered by Davions</p>
      </footer>
    </div>
  );
};

export default GalleryView;
