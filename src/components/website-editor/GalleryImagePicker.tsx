import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Check, Loader2, Search, Star, Upload, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GalleryRow {
  id: string;
  title: string;
  cover_image_url: string | null;
  is_site_gallery: boolean;
  photos_count?: number;
}

interface PhotoRow {
  id: string;
  filename: string;
  storage_path: string | null;
  url: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photographerId: string | null | undefined;
  onSelect: (url: string) => void;
  /** Folder for computer uploads (default: "blocks") */
  uploadFolder?: string;
}

const ASSETS_BUCKET = "site-assets";
const PHOTOS_BUCKET = "gallery-photos";

export default function GalleryImagePicker({
  open,
  onOpenChange,
  photographerId,
  onSelect,
  uploadFolder = "blocks",
}: Props) {
  const [tab, setTab] = useState<"galleries" | "upload">("galleries");
  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [loadingGalleries, setLoadingGalleries] = useState(false);
  const [search, setSearch] = useState("");
  const [activeGallery, setActiveGallery] = useState<GalleryRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingSite, setSavingSite] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load galleries
  useEffect(() => {
    if (!open || !photographerId) return;
    let cancelled = false;
    (async () => {
      setLoadingGalleries(true);
      const { data, error } = await supabase
        .from("galleries")
        .select("id, title, cover_image_url, is_site_gallery, updated_at")
        .eq("photographer_id", photographerId)
        .order("is_site_gallery", { ascending: false })
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
      } else {
        setGalleries((data ?? []) as any);
      }
      setLoadingGalleries(false);
    })();
    return () => { cancelled = true; };
  }, [open, photographerId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setActiveGallery(null);
      setPhotos([]);
      setSearch("");
      setTab("galleries");
    }
  }, [open]);

  // Load photos for active gallery
  useEffect(() => {
    if (!activeGallery) return;
    let cancelled = false;
    (async () => {
      setLoadingPhotos(true);
      const { data, error } = await supabase
        .from("photos")
        .select("id, filename, storage_path, order_index")
        .eq("gallery_id", activeGallery.id)
        .order("order_index", { ascending: true })
        .limit(500);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setPhotos([]);
      } else {
        const rows: PhotoRow[] = (data ?? []).map((p: any) => {
          const url = p.storage_path
            ? supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(p.storage_path).data.publicUrl
            : "";
          return { id: p.id, filename: p.filename, storage_path: p.storage_path, url };
        }).filter((p) => !!p.url);
        setPhotos(rows);
      }
      setLoadingPhotos(false);
    })();
    return () => { cancelled = true; };
  }, [activeGallery]);

  const filteredGalleries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return galleries;
    return galleries.filter((g) => g.title.toLowerCase().includes(q));
  }, [galleries, search]);

  const handleSetSiteGallery = async (g: GalleryRow) => {
    if (!photographerId) return;
    setSavingSite(g.id);
    try {
      // Clear previous
      await supabase
        .from("galleries")
        .update({ is_site_gallery: false })
        .eq("photographer_id", photographerId)
        .eq("is_site_gallery", true);
      const { error } = await supabase
        .from("galleries")
        .update({ is_site_gallery: true })
        .eq("id", g.id);
      if (error) throw error;
      setGalleries((prev) =>
        prev.map((x) => ({ ...x, is_site_gallery: x.id === g.id }))
      );
      toast.success("Site Gallery atualizada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao definir Site Gallery");
    } finally {
      setSavingSite(null);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!photographerId) {
      toast.error("Não autenticado");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 50MB");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${photographerId}/${uploadFolder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(ASSETS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path);
      onSelect(data.publicUrl);
      toast.success("Imagem enviada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle className="text-base font-medium">
            {activeGallery ? activeGallery.title : "Escolher imagem"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col">
          <div className="px-5 pt-3">
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="galleries">Galerias</TabsTrigger>
              <TabsTrigger value="upload">Enviar do computador</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="galleries" className="m-0">
            {!activeGallery ? (
              <div className="flex flex-col">
                <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar galeria..."
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <ScrollArea className="h-[60vh] px-5 pb-5">
                  {loadingGalleries ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : filteredGalleries.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-12">
                      Nenhuma galeria encontrada
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                      {filteredGalleries.map((g) => (
                        <div
                          key={g.id}
                          className="group relative rounded-md overflow-hidden border border-border bg-muted/20 cursor-pointer hover:border-foreground/40 transition-colors"
                          onClick={() => setActiveGallery(g)}
                        >
                          <div className="aspect-square bg-muted/30 overflow-hidden">
                            {g.cover_image_url ? (
                              <img src={g.cover_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <div className="text-xs font-medium truncate">{g.title}</div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetSiteGallery(g);
                              }}
                              disabled={savingSite === g.id}
                              className={cn(
                                "mt-1.5 w-full text-[10px] px-2 py-1 rounded inline-flex items-center justify-center gap-1 transition-colors",
                                g.is_site_gallery
                                  ? "bg-foreground text-background"
                                  : "bg-muted hover:bg-muted/70 text-foreground"
                              )}
                            >
                              {savingSite === g.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : g.is_site_gallery ? (
                                <><Check className="h-3 w-3" /> Site Gallery</>
                              ) : (
                                <><Star className="h-3 w-3" /> Definir como Site</>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-2"
                    onClick={() => setActiveGallery(null)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
                  </Button>
                  <div className="text-xs text-muted-foreground ml-auto">
                    {photos.length} {photos.length === 1 ? "foto" : "fotos"}
                  </div>
                </div>
                <ScrollArea className="h-[60vh] px-5 pb-5">
                  {loadingPhotos ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : photos.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-12">
                      Esta galeria não tem fotos
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
                      {photos.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onSelect(p.url);
                            onOpenChange(false);
                          }}
                          className="group relative aspect-square rounded-md overflow-hidden border border-border bg-muted/20 hover:border-foreground/60 transition-colors"
                        >
                          <img src={p.url} alt={p.filename} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="m-0">
            <div className="p-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleUploadFile(f);
                }}
                onDragOver={(e) => e.preventDefault()}
                className="w-full aspect-[3/1] border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-2 hover:border-foreground/40 hover:bg-muted/20 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
                <div className="text-sm">
                  {uploading ? "Enviando..." : "Clique ou arraste uma imagem"}
                </div>
                <div className="text-[11px] text-muted-foreground">PNG, JPG, WEBP, SVG até 50MB</div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
