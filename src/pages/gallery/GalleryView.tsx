import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Lock, Image, CalendarX2 } from "lucide-react";
import logoPrincipal from "@/assets/logo_principal_preto.png";

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
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      if (!slug) return;
      setLoading(true);

      // Try by slug first, then fall back to UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      let query = supabase
        .from("galleries")
        .select("id, title, slug, category, status, access_code, photographer_id, cover_image_url, cover_focal_x, cover_focal_y, expires_at")
        .eq("status", "published");

      if (isUuid) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        // If slug lookup failed and it looks like a UUID, try by ID anyway
        if (!isUuid) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setNotFound(true);
        setLoading(false);
        return;
      }

      setGallery(data as Gallery);

      if (!data.access_code) {
        setUnlocked(true);
        await loadPhotos(data.id);
      }

      setLoading(false);
    };

    fetchGallery();
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
    }
  };

  const handleUnlock = async () => {
    if (!gallery) return;
    if (codeInput.trim().toUpperCase() === (gallery.access_code ?? "").toUpperCase()) {
      setUnlocked(true);
      setCodeError(false);
      await loadPhotos(gallery.id);
    } else {
      setCodeError(true);
    }
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
        <img src={logoPrincipal} alt="Davions" className="h-5 w-auto" />
        <Badge
          variant={gallery?.category === "proof" ? "outline" : "default"}
          className="text-[9px] tracking-[0.2em] uppercase font-light rounded-none"
        >
          {gallery?.category === "proof" ? "Proof Gallery" : "Final Gallery"}
        </Badge>
      </header>

      {/* Access gate */}
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

      {/* Gallery content */}
      {unlocked && (
        <main className="flex-1 flex flex-col">
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
                  </p>
                </div>
                <Badge
                  variant={gallery.category === "proof" ? "outline" : "default"}
                  className="text-[9px] tracking-[0.2em] uppercase font-light rounded-none border-white/40 text-white shrink-0"
                >
                  {gallery.category === "proof" ? "Proof Gallery" : "Final Gallery"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="px-6 md:px-10 pt-8 pb-2">
              <h1 className="text-2xl font-light tracking-wide">{gallery?.title}</h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
                {gallery?.category === "final" && " · Click any photo to download"}
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
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square bg-muted overflow-hidden cursor-pointer"
                  onClick={() => setLightboxIndex(index)}
                >
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}

                  {gallery?.category === "final" && (
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadPhoto(photo); }}
                        className="bg-background/90 text-foreground p-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-2xl leading-none"
            onClick={() => setLightboxIndex(null)}
          >
            ×
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-muted-foreground hover:text-foreground text-3xl leading-none px-3 py-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              ‹
            </button>
          )}
          {lightboxIndex < photos.length - 1 && (
            <button
              className="absolute right-4 text-muted-foreground hover:text-foreground text-3xl leading-none px-3 py-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              ›
            </button>
          )}
          <img
            src={photos[lightboxIndex].url}
            alt={photos[lightboxIndex].filename}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {gallery?.category === "final" && (
            <button
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-foreground text-background px-4 py-2 text-xs tracking-widest uppercase font-light hover:bg-foreground/80 transition-colors"
              onClick={(e) => { e.stopPropagation(); downloadPhoto(photos[lightboxIndex!]); }}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          )}
          <div className="absolute bottom-6 right-6 text-xs text-muted-foreground">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}

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
