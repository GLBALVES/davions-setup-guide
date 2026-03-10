import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Download, Lock, Image, CalendarX2, Heart, ShoppingCart, X, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import logoPrincipal from "@/assets/logo_principal_preto.png";

// ── Client token (anonymous identifier persisted in localStorage) ─────────────
function getClientToken(): string {
  const key = "davions_client_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

// ── Persist access code per gallery ──────────────────────────────────────────
function getStoredCode(galleryId: string): string | null {
  return localStorage.getItem(`davions_access_${galleryId}`);
}
function storeCode(galleryId: string, code: string): void {
  localStorage.setItem(`davions_access_${galleryId}`, code);
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

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
}

interface Photo {
  id: string;
  filename: string;
  storage_path: string | null;
  order_index: number;
  url?: string;
}

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
  const clientToken = getClientToken();

  // Purchase modal state
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Check for ?purchased=true in URL
  useEffect(() => {
    if (searchParams.get("purchased") === "true") {
      setPurchaseSuccess(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchGallery = async () => {
      if (!slug) return;
      setLoading(true);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      let query = supabase
        .from("galleries")
        .select("id, title, slug, category, status, access_code, photographer_id, cover_image_url, cover_focal_x, cover_focal_y, expires_at, price_per_photo")
        .eq("status", "published");

      if (isUuid) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setGallery(data as Gallery);

      // Try to auto-unlock via stored code
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
          const { data: urlData } = supabase.storage
            .from("gallery-photos")
            .getPublicUrl(p.storage_path);
          url = urlData.publicUrl;
        }
        return { ...p, url };
      });
      setPhotos(withUrls);

      // Load this client's favorites for the gallery
      const { data: favData } = await supabase
        .from("photo_favorites")
        .select("photo_id")
        .eq("gallery_id", galleryId)
        .eq("client_token", clientToken);

      if (favData) {
        setFavorites(new Set(favData.map((f) => f.photo_id)));
      }
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
    if (!gallery) return;
    if (togglingFav.has(photo.id)) return;

    setTogglingFav((prev) => new Set(prev).add(photo.id));
    const isFav = favorites.has(photo.id);

    if (isFav) {
      await supabase
        .from("photo_favorites")
        .delete()
        .eq("photo_id", photo.id)
        .eq("client_token", clientToken);
      setFavorites((prev) => { const s = new Set(prev); s.delete(photo.id); return s; });
    } else {
      await supabase.from("photo_favorites").insert({
        photo_id: photo.id,
        gallery_id: gallery.id,
        client_token: clientToken,
      });
      setFavorites((prev) => new Set(prev).add(photo.id));
    }

    setTogglingFav((prev) => { const s = new Set(prev); s.delete(photo.id); return s; });
  }, [gallery, favorites, togglingFav, clientToken]);

  const downloadPhoto = async (photo: Photo) => {
    if (!photo.url) return;
    const res = await fetch(photo.url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = photo.filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Purchase / Submit selection ───────────────────────────────────────────────
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

      if (data?.free) {
        setPurchaseOpen(false);
        setPurchaseSuccess(true);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckingOut(false);
    }
  };

  // Lightbox keyboard nav
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
            <p className="text-sm text-muted-foreground max-w-xs">
              This gallery has expired and is no longer available.
            </p>
            {gallery?.expires_at && (
              <p className="text-[11px] text-muted-foreground/50 tracking-wider uppercase mt-1">
                Expired on {new Date(gallery.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
        <footer className="border-t border-border py-4 px-6 flex items-center justify-center">
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50">
            Powered by Davions
          </p>
        </footer>
      </div>
    );
  }

  const favCount = favorites.size;
  const isProof = gallery?.category === "proof";
  const pricePerPhoto = gallery?.price_per_photo ?? 0;
  const totalPrice = pricePerPhoto * favCount;
  const isFree = pricePerPhoto === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Navbar ── */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <img src={logoPrincipal} alt="Davions" className="h-5 w-auto" />

        <div className="flex items-center gap-3">
          {/* Selection summary pill — proof only, shown when 1+ favorites */}
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
            {isProof ? "Proof Gallery" : "Final Gallery"}
          </Badge>
        </div>
      </header>

      {/* Purchase success banner */}
      {purchaseSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-light">
            {isFree
              ? "Your selection has been submitted! The photographer will be notified."
              : "Payment successful! Your photo selection has been confirmed."}
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
                className={`rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground text-center tracking-[0.4em] uppercase font-mono text-base h-12 ${
                  codeError ? "border-destructive focus-visible:border-destructive" : ""
                }`}
              />
              {codeError && (
                <p className="text-xs text-destructive text-center">
                  Incorrect code — please try again.
                </p>
              )}
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
          {/* Cover image hero */}
          {gallery?.cover_image_url ? (
            <div className="relative w-full h-52 md:h-80 overflow-hidden shrink-0">
              <img
                src={gallery.cover_image_url}
                alt={gallery.title}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${gallery.cover_focal_x ?? 50}% ${gallery.cover_focal_y ?? 50}%`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-6 flex items-end justify-between">
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-2xl font-light tracking-wide text-white drop-shadow">
                    {gallery.title}
                  </h1>
                  <p className="text-[11px] text-white/60 tracking-widest uppercase">
                    {photos.length} photo{photos.length !== 1 ? "s" : ""}
                    {gallery.category === "final" && " · Click any photo to download"}
                    {isProof && " · Click ♡ to save your favorites"}
                  </p>
                </div>
                <Badge
                  variant={isProof ? "outline" : "default"}
                  className="text-[9px] tracking-[0.2em] uppercase font-light rounded-none border-white/40 text-white shrink-0"
                >
                  {isProof ? "Proof Gallery" : "Final Gallery"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="px-6 md:px-10 pt-8 pb-2">
              <h1 className="text-2xl font-light tracking-wide">{gallery?.title}</h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
                {gallery?.category === "final" && " · Click any photo to download"}
                {isProof && " · Click ♡ to save your favorites"}
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

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo, index) => {
                const isFav = favorites.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`relative group aspect-square bg-muted overflow-hidden cursor-pointer transition-all duration-200
                      ${isProof && isFav ? "ring-2 ring-rose-500 ring-offset-2 ring-offset-background" : ""}
                    `}
                    onClick={() => setLightboxIndex(index)}
                  >
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* ── PROOF: selection overlay ── */}
                    {isProof && (
                      <>
                        {/* Selected state: rose tint + checkmark badge */}
                        {isFav && (
                          <div className="absolute inset-0 bg-rose-500/10 pointer-events-none" />
                        )}
                        <div className={`absolute top-2 left-2 z-10 transition-all duration-200 ${isFav ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
                          <div className="bg-rose-500 text-white rounded-full p-1">
                            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>

                        {/* Hover overlay with CTA */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-end pb-3 transition-all duration-200
                          ${isFav
                            ? "bg-black/0 group-hover:bg-black/30"
                            : "bg-black/0 group-hover:bg-black/40"
                          } opacity-0 group-hover:opacity-100`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => toggleFavorite(e, photo)}
                            className={`flex items-center gap-2 px-4 py-2 text-[11px] tracking-widest uppercase font-medium transition-all duration-150 shadow-lg
                              ${isFav
                                ? "bg-rose-500 text-white hover:bg-rose-600"
                                : "bg-white text-black hover:bg-rose-500 hover:text-white"
                              }`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-white" : ""}`} />
                            {isFav ? "Remove" : "Select"}
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── FINAL: download overlay ── */}
                    {gallery?.category === "final" && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadPhoto(photo); }}
                          className="bg-white text-black p-3 hover:bg-black hover:text-white transition-colors shadow-lg"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    )}
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
              {isFree ? "Submit Your Selection" : "Purchase Your Selection"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {favCount} photo{favCount !== 1 ? "s" : ""} selected
              {pricePerPhoto > 0 && ` · ${formatCurrency(pricePerPhoto)} each · Total: ${formatCurrency(totalPrice)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            {/* Pricing summary */}
            {pricePerPhoto > 0 && (
              <div className="border border-border bg-muted/20 px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-light">
                  {favCount} × {formatCurrency(pricePerPhoto)}
                </span>
                <span className="font-medium text-foreground">{formatCurrency(totalPrice)}</span>
              </div>
            )}

            {/* Client name */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                Your Name <span className="normal-case tracking-normal text-muted-foreground/50">(optional)</span>
              </Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ana Silva"
                className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
              />
            </div>

            {/* Client email */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="ana@example.com"
                className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
              />
            </div>

            <Button
              onClick={handlePurchaseOrSubmit}
              disabled={!clientEmail.trim() || checkingOut}
              className="w-full mt-2 gap-2"
              size="lg"
            >
              {checkingOut ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : isFree ? (
                "Submit Selection"
              ) : (
                <><ShoppingCart className="h-4 w-4" /> Proceed to Checkout</>
              )}
            </Button>

            {!isFree && (
              <p className="text-[10px] text-center text-muted-foreground/50 -mt-2">
                Secure payment powered by Stripe
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && photos[lightboxIndex] && (() => {
        const lPhoto = photos[lightboxIndex];
        const lIsFav = favorites.has(lPhoto.id);
        return (
          <div
            className="fixed inset-0 bg-black/97 z-50 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-5 text-white/50 hover:text-white text-3xl leading-none z-10"
              onClick={() => setLightboxIndex(null)}
            >
              ×
            </button>

            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-4xl leading-none px-3 py-2 z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              >
                ‹
              </button>
            )}

            {/* Next */}
            {lightboxIndex < photos.length - 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-4xl leading-none px-3 py-2 z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              >
                ›
              </button>
            )}

            {/* Photo */}
            <img
              src={lPhoto.url}
              alt={lPhoto.filename}
              className="max-h-[88vh] max-w-[88vw] object-contain select-none"
              onClick={(e) => e.stopPropagation()}
            />

            {/* ── Bottom action bar ── */}
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/80 to-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Counter */}
              <span className="text-xs text-white/40 tracking-widest">
                {lightboxIndex + 1} / {photos.length}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Proof: save / saved button */}
                {isProof && (
                  <button
                    onClick={(e) => toggleFavorite(e, lPhoto)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-light transition-all border
                      ${lIsFav
                        ? "bg-rose-500 border-rose-500 text-white"
                        : "bg-white/10 border-white/20 text-white hover:bg-rose-500 hover:border-rose-500"
                      }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${lIsFav ? "fill-white" : ""}`} />
                    {lIsFav ? "Saved" : "Save"}
                  </button>
                )}

                {/* Final: download button */}
                {gallery?.category === "final" && (
                  <button
                    className="flex items-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2 text-xs tracking-widest uppercase font-light hover:bg-white hover:text-black transition-colors"
                    onClick={(e) => { e.stopPropagation(); downloadPhoto(lPhoto); }}
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6 flex items-center justify-center">
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50">
          Powered by Davions
        </p>
      </footer>
    </div>
  );
};

export default GalleryView;
