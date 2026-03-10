import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Lock, Image, CalendarX2, Heart, ShoppingCart, X, Loader2, CheckCircle, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import logoPrincipal from "@/assets/logo_principal_preto.png";

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

// ── Watermark position helper ────────────────────────────────────────────────
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
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
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
}

interface Photo {
  id: string;
  filename: string;
  storage_path: string | null;
  order_index: number;
  url?: string;
}

// ── Strip extension from filename ───────────────────────────────────────────
function displayName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
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
  const [notes, setNotes] = useState<Record<string, string>>({});
  // card note panel open state (photoId -> boolean)
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const clientToken = getClientToken();

  // Purchase modal
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // ── Anti-piracy ──────────────────────────────────────────────────────────
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = `@media print { body { display: none !important; } }`;
    document.head.appendChild(styleEl);
    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (ctrl && ["s", "p", "u", "a"].includes(key)) { e.preventDefault(); return; }
      if (e.key === "F12") { e.preventDefault(); return; }
      if (ctrl && e.shiftKey && ["i", "j", "c"].includes(key)) { e.preventDefault(); return; }
    };
    window.addEventListener("keydown", blockKeys);
    return () => {
      document.head.removeChild(styleEl);
      window.removeEventListener("keydown", blockKeys);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("purchased") === "true") setPurchaseSuccess(true);
  }, [searchParams]);

  // ── Fetch gallery ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchGallery = async () => {
      if (!slug) return;
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      let query = supabase
        .from("galleries")
        .select("id, title, slug, category, status, access_code, photographer_id, cover_image_url, cover_focal_x, cover_focal_y, expires_at, price_per_photo, watermark_id")
        .eq("status", "published");
      if (isUuid) query = query.eq("id", slug);
      else query = query.eq("slug", slug);

      const { data, error } = await query.single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setGallery(data as Gallery);

      if (data.watermark_id) {
        const { data: wmData } = await supabase
          .from("watermarks")
          .select("text_enabled, text_content, text_font, text_color, text_opacity, text_scale, text_position, image_enabled, image_url, image_opacity, image_scale, image_position")
          .eq("id", data.watermark_id)
          .single();
        if (wmData) setWatermark(wmData as WatermarkSettings);
      }

      // Load saved notes
      setNotes(loadNotes(data.id, clientToken));

      if (data.access_code) {
        const stored = getStoredCode(data.id);
        if (stored && stored.toUpperCase() === (data.access_code ?? "").toUpperCase()) {
          setUnlocked(true);
          await loadPhotos(data.id);
          setLoading(false);
          return;
        }
      } else {
        setUnlocked(true);
        await loadPhotos(data.id);
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
      if (favData) setFavorites(new Set(favData.map((f) => f.photo_id)));
    }
  };

  const handleUnlock = async () => {
    if (!gallery) return;
    if (codeInput.trim().toUpperCase() === (gallery.access_code ?? "").toUpperCase()) {
      setUnlocked(true);
      setCodeError(false);
      storeCode(gallery.id, codeInput.trim().toUpperCase());
      await loadPhotos(gallery.id);
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

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
          <img src={logoPrincipal} alt="Davions" className="h-5 w-auto" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="h-20 w-20 rounded-full border border-border flex items-center justify-center text-muted-foreground/40">
            <CalendarX2 className="h-9 w-9" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-light tracking-wide">{gallery?.title}</h1>
            <p className="text-sm text-muted-foreground max-w-xs">This gallery has expired and is no longer available.</p>
            {gallery?.expires_at && (
              <p className="text-[11px] text-muted-foreground/50 tracking-wider uppercase mt-1">
                Expired on {new Date(gallery.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
        <footer className="border-t border-border py-4 px-6 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">

      {/* ── Navbar ── */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <img src={logoPrincipal} alt="Davions" className="h-5 w-auto" draggable={false} />
        <div className="flex items-center gap-3">
          {unlocked && isProof && favCount > 0 && (
            <button
              onClick={() => setPurchaseOpen(true)}
              className="flex items-center gap-2.5 border border-rose-300 bg-rose-50 hover:bg-rose-100 transition-colors px-3.5 py-1.5 rounded-full"
            >
              <span className="flex items-center gap-1 text-rose-600">
                <Heart className="h-3.5 w-3.5 fill-rose-500" />
                <span className="text-xs font-medium">{favCount}</span>
              </span>
              {pricePerPhoto > 0 && (
                <>
                  <span className="text-rose-300 text-xs">·</span>
                  <span className="text-xs text-rose-700 font-medium">{formatCurrency(totalPrice)}</span>
                </>
              )}
              <span className="hidden sm:flex items-center gap-1.5 ml-0.5 text-[10px] tracking-widest uppercase text-rose-600 font-light">
                <ShoppingCart className="h-3 w-3" />
                {isFree ? "Submit" : "Checkout"}
              </span>
            </button>
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
                placeholder="CÓDIGO DE ACESSO"
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
          {/* Cover hero */}
          {gallery?.cover_image_url ? (
            <div className="relative w-full h-52 md:h-80 overflow-hidden shrink-0" onContextMenu={blockContext}>
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
                  </p>
                </div>
                <Badge variant={isProof ? "outline" : "default"} className="text-[9px] tracking-[0.2em] uppercase font-light rounded-none border-white/40 text-white shrink-0">
                  {isProof ? "Prova" : "Final"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="px-6 md:px-10 pt-8 pb-2">
              <h1 className="text-2xl font-light tracking-wide">{gallery?.title}</h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
                {isProof && " · Click ♡ to select"}
              </p>
            </div>
          )}

          <div className="p-6 md:p-10 flex flex-col gap-8">
            {photos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Image className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No photos in this gallery yet.</p>
              </div>
            )}

            {/* ── Photo grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, index) => {
                const isFav = favorites.has(photo.id);
                const noteVal = notes[photo.id] ?? "";
                const isNoteOpen = noteOpen[photo.id] ?? false;
                return (
                  <div key={photo.id} className="flex flex-col gap-0">
                    {/* Image card */}
                    <div
                      className={`relative group aspect-square bg-muted overflow-hidden cursor-pointer transition-all duration-200
                        ${isProof && isFav ? "ring-2 ring-rose-500 ring-offset-2 ring-offset-background" : ""}
                      `}
                      onClick={() => setLightboxIndex(index)}
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

                      {/* Watermark */}
                      {watermark && <WatermarkOverlay wm={watermark} size="thumb" />}

                      {/* Selected checkmark */}
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

                      {/* Proof: hover overlay */}
                      {isProof && (
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-end pb-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{ background: isFav ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.38)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => toggleFavorite(e, photo)}
                            className={`flex items-center gap-2 px-5 py-2 text-[11px] tracking-widest uppercase font-semibold shadow-xl transition-all duration-150
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
                    </div>

                    {/* Below card: filename + note toggle */}
                    <div className="bg-background border border-t-0 border-border px-3 pt-2 pb-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground truncate leading-tight" title={photo.filename}>
                          {displayName(photo.filename)}
                        </span>
                        <button
                          onClick={(e) => toggleNotePanel(e, photo.id)}
                          className={`shrink-0 flex items-center gap-1 text-[10px] tracking-widest uppercase transition-colors ${
                            noteVal
                              ? "text-foreground"
                              : isNoteOpen
                              ? "text-foreground"
                              : "text-muted-foreground/50 hover:text-muted-foreground"
                          }`}
                          title="Add note"
                        >
                          <MessageSquare className="h-3 w-3" />
                          {noteVal ? <span className="text-[9px]">Nota</span> : null}
                        </button>
                      </div>

                      {/* Note textarea — slides open */}
                      {isNoteOpen && (
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
          </div>
        </main>
      )}

      {/* ── Purchase / Submit modal ── */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-md rounded-none border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-light tracking-wide flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {isFree ? "Submit Selection" : "Purchase Selection"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {favCount} photo{favCount !== 1 ? "s" : ""} selected
              {pricePerPhoto > 0 && ` · ${formatCurrency(pricePerPhoto)} each · Total: ${formatCurrency(totalPrice)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            {pricePerPhoto > 0 && (
              <div className="border border-border bg-muted/20 px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-light">{favCount} × {formatCurrency(pricePerPhoto)}</span>
                <span className="font-medium text-foreground">{formatCurrency(totalPrice)}</span>
              </div>
            )}
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
            <Button onClick={handlePurchaseOrSubmit} disabled={!clientEmail.trim() || checkingOut} className="w-full mt-2 gap-2" size="lg">
              {checkingOut ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : isFree ? "Submit Selection" : (
                <><ShoppingCart className="h-4 w-4" /> Go to Checkout</>
              )}
            </Button>
            {!isFree && (
              <p className="text-[10px] text-center text-muted-foreground/50 -mt-2">Secure payment via Stripe</p>
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

              {/* Photo + watermark */}
              <div
                className="relative flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={blockContext}
                style={{ maxHeight: "100%", maxWidth: "100%" }}
              >
                <img
                  src={lPhoto.url}
                  alt=""
                  className="max-h-full max-w-full object-contain pointer-events-none"
                  style={{ maxHeight: "calc(100vh - 200px)" }}
                  draggable={false}
                />
                {watermark && (
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                    <WatermarkOverlay wm={watermark} size="full" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Bottom bar: CTA + note field ── */}
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

              {/* Note field */}
              <div className="w-full max-w-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="h-3 w-3 text-white/30" />
                  <span className="text-[10px] text-white/30 tracking-widest uppercase">Observação</span>
                </div>
                <Textarea
                  value={lNoteVal}
                  onChange={(e) => handleNoteChange(lPhoto.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Escreva algo sobre esta foto… ex: quero esta em preto e branco"
                  className="w-full text-xs bg-white/5 border-white/10 text-white/80 placeholder:text-white/20 rounded-none focus-visible:ring-0 focus-visible:border-white/30 min-h-[52px] resize-none leading-snug"
                />
              </div>
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
