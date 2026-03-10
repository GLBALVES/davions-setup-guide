import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  X,
  User,
  Camera,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoPrincipal from "@/assets/logo_principal_preto.png";

interface Gallery {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  status: string;
  access_code: string | null;
  cover_image_url: string | null;
  created_at: string;
  booking_id: string | null;
  client_name?: string | null;
  session_title?: string | null;
  booked_date?: string | null;
}

interface Photo {
  id: string;
  filename: string;
  storage_path: string | null;
  order_index: number;
  url?: string;
}

interface UploadItem {
  file: File;
  progress: number;
  done: boolean;
  error?: string;
}

const GalleryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const publicUrl = `${window.location.origin}/gallery/${id}`;

  // ── Fetch gallery + photos ──────────────────────────────────────────────────
  const fetchGallery = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("galleries")
      .select(`
        *,
        bookings (
          client_name,
          booked_date,
          sessions ( title )
        )
      `)
      .eq("id", id)
      .single();
    if (data) {
      const raw = data as any;
      setGallery({
        ...raw,
        client_name: raw.bookings?.client_name ?? null,
        session_title: raw.bookings?.sessions?.title ?? null,
        booked_date: raw.bookings?.booked_date ?? null,
      } as Gallery);
      setAccessCode(raw.access_code ?? "");
    }
  }, [id]);

  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("photos")
      .select("id, filename, storage_path, order_index")
      .eq("gallery_id", id)
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
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchGallery(), fetchPhotos()]);
      setLoading(false);
    };
    init();
  }, [fetchGallery, fetchPhotos]);

  // ── Upload logic ─────────────────────────────────────────────────────────────
  const uploadFiles = async (files: FileList | File[]) => {
    if (!user || !id) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    const newUploads: UploadItem[] = arr.map((f) => ({
      file: f,
      progress: 0,
      done: false,
    }));
    setUploads((prev) => [...prev, ...newUploads]);

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setUploads((prev) =>
        prev.map((u, idx) =>
          idx === prev.length - arr.length + i ? { ...u, progress: 20 } : u
        )
      );

      const { error: storageError } = await supabase.storage
        .from("gallery-photos")
        .upload(path, file, { upsert: false });

      if (storageError) {
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === prev.length - arr.length + i
              ? { ...u, error: storageError.message, done: true }
              : u
          )
        );
        continue;
      }

      setUploads((prev) =>
        prev.map((u, idx) =>
          idx === prev.length - arr.length + i ? { ...u, progress: 70 } : u
        )
      );

      const { error: dbError } = await supabase.from("photos").insert({
        gallery_id: id,
        photographer_id: user.id,
        filename: file.name,
        storage_path: path,
        order_index: photos.length + i,
      });

      setUploads((prev) =>
        prev.map((u, idx) =>
          idx === prev.length - arr.length + i
            ? { ...u, progress: 100, done: true, error: dbError?.message }
            : u
        )
      );
    }

    await fetchPhotos();
    // Clear finished uploads after a moment
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => !u.done || u.error));
    }, 2000);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(e.dataTransfer.files);
  };

  // ── Delete photo ────────────────────────────────────────────────────────────
  const deletePhoto = async (photo: Photo) => {
    if (photo.storage_path) {
      await supabase.storage.from("gallery-photos").remove([photo.storage_path]);
    }
    await supabase.from("photos").delete().eq("id", photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    toast({ title: "Photo removed" });
  };

  // ── Toggle publish ──────────────────────────────────────────────────────────
  const togglePublish = async () => {
    if (!gallery) return;
    const newStatus = gallery.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("galleries")
      .update({ status: newStatus })
      .eq("id", gallery.id);
    if (!error) {
      setGallery({ ...gallery, status: newStatus });
      toast({ title: newStatus === "published" ? "Gallery published" : "Gallery unpublished" });
    }
  };

  // ── Save access code ────────────────────────────────────────────────────────
  const saveAccessCode = async () => {
    if (!gallery) return;
    setSavingCode(true);
    const { error } = await supabase
      .from("galleries")
      .update({ access_code: accessCode.trim() || null })
      .eq("id", gallery.id);
    if (!error) {
      setGallery({ ...gallery, access_code: accessCode.trim() || null });
      toast({ title: "Access code saved" });
    }
    setSavingCode(false);
  };

  // ── Copy link ───────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Rename ──────────────────────────────────────────────────────────────────
  const startRename = () => {
    setNewTitle(gallery?.title ?? "");
    setEditingTitle(true);
  };

  const saveTitle = async () => {
    if (!gallery || !newTitle.trim()) return;
    const { error } = await supabase
      .from("galleries")
      .update({ title: newTitle.trim() })
      .eq("id", gallery.id);
    if (!error) {
      setGallery({ ...gallery, title: newTitle.trim() });
      toast({ title: "Gallery renamed" });
    }
    setEditingTitle(false);
  };

  // ── Delete gallery ──────────────────────────────────────────────────────────
  const deleteGallery = async () => {
    if (!gallery) return;
    if (!confirm(`Delete "${gallery.title}"? This cannot be undone.`)) return;

    // Remove all photos from storage
    if (photos.length > 0) {
      const paths = photos.map((p) => p.storage_path).filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("gallery-photos").remove(paths);
      }
      await supabase.from("photos").delete().eq("gallery_id", gallery.id);
    }

    await supabase.from("galleries").delete().eq("id", gallery.id);
    toast({ title: "Gallery deleted" });
    navigate("/dashboard/galleries");
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">Loading…</span>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!gallery) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Gallery not found.</p>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const activeUploads = uploads.filter((u) => !u.done);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <img src={logoPrincipal} alt="Davions" className="h-5 w-auto" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            {/* Hero banner */}
            {gallery.cover_image_url && (
              <div className="relative w-full h-52 md:h-72 overflow-hidden">
                <img
                  src={gallery.cover_image_url}
                  alt={gallery.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-5 flex items-end justify-between">
                  <div className="flex flex-col gap-1.5">
                    <h1 className="text-2xl font-light tracking-wide text-white drop-shadow">
                      {gallery.title || "Untitled Gallery"}
                    </h1>
                    {(gallery.client_name || gallery.session_title) && (
                      <div className="flex items-center gap-4 text-[11px] text-white/70">
                        {gallery.client_name && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {gallery.client_name}
                          </span>
                        )}
                        {gallery.session_title && (
                          <span className="flex items-center gap-1.5">
                            <Camera className="h-3 w-3" />
                            {gallery.session_title}
                          </span>
                        )}
                        {gallery.booked_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(gallery.booked_date))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={gallery.category === "proof" ? "outline" : "default"}
                      className="text-[9px] tracking-[0.2em] uppercase font-light rounded-none border-white/40 text-white"
                    >
                      {gallery.category === "proof" ? "Proof" : "Final"}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${gallery.status === "published" ? "bg-green-400" : "bg-white/30"}`} />
                      <span className="text-[10px] tracking-[0.2em] uppercase text-white/70 font-light">{gallery.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-header */}
            <div className="border-b border-border px-6 md:px-10 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/dashboard/galleries")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                {editingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle();
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      className="h-8 text-sm rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground w-56"
                      autoFocus
                    />
                    <button onClick={saveTitle} className="text-muted-foreground hover:text-foreground">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingTitle(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {!gallery.cover_image_url && (
                      <div className="flex items-center gap-3">
                        <h1 className="text-lg font-light tracking-wide">{gallery.title || "Untitled Gallery"}</h1>
                        <Badge
                          variant={gallery.category === "proof" ? "outline" : "default"}
                          className="text-[9px] tracking-[0.2em] uppercase font-light shrink-0 rounded-none"
                        >
                          {gallery.category === "proof" ? "Proof" : "Final"}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              gallery.status === "published" ? "bg-green-500" : "bg-muted-foreground/30"
                            }`}
                          />
                          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
                            {gallery.status}
                          </span>
                        </div>
                      </div>
                    )}
                    {gallery.cover_image_url && (
                      <h1 className="text-lg font-light tracking-wide">{gallery.title || "Untitled Gallery"}</h1>
                    )}

                    {/* Booking info strip — only show here if no cover (cover shows it overlaid) */}
                    {!gallery.cover_image_url && (gallery.client_name || gallery.session_title) && (
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        {gallery.client_name && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {gallery.client_name}
                          </span>
                        )}
                        {gallery.session_title && (
                          <span className="flex items-center gap-1.5">
                            <Camera className="h-3 w-3" />
                            {gallery.session_title}
                          </span>
                        )}
                        {gallery.booked_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(gallery.booked_date))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePublish}
                  className="gap-2 text-xs tracking-wider uppercase font-light"
                >
                  {gallery.status === "published" ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Unpublish</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5" /> Publish</>
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-none w-44">
                    <DropdownMenuItem onClick={startRename} className="gap-2 text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={deleteGallery}
                      className="gap-2 text-xs text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete gallery
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="p-6 md:p-10 flex flex-col gap-10">
              {/* Upload zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-none flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-colors ${
                  isDragging ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"
                }`}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-light text-muted-foreground">
                  Drag & drop photos or <span className="text-foreground underline underline-offset-2">browse</span>
                </p>
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60">
                  JPG, PNG, WEBP — multiple supported
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {/* Active uploads */}
              {activeUploads.length > 0 && (
                <div className="flex flex-col gap-2">
                  {activeUploads.map((u, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate max-w-xs">{u.file.name}</span>
                        <span className="text-[10px] text-muted-foreground">{u.progress}%</span>
                      </div>
                      <Progress value={u.progress} className="h-0.5 rounded-none" />
                    </div>
                  ))}
                </div>
              )}

              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="flex flex-col gap-4">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                    <span className="inline-block w-6 h-px bg-border" />
                    {photos.length} photo{photos.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group aspect-square bg-muted overflow-hidden">
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt={photo.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground">No preview</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => deletePhoto(photo)}
                            className="bg-background/90 text-foreground p-2 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {photos.length === 0 && activeUploads.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground/60">No photos yet — upload above to get started</p>
                </div>
              )}

              {/* Client access section */}
              <div className="border border-border p-6 flex flex-col gap-6">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-1">
                    <span className="inline-block w-6 h-px bg-border" />
                    Client Access
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Share this link with your client. Publish the gallery to make it accessible.
                  </p>
                </div>

                {/* Publish toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light">Publish gallery</p>
                    <p className="text-[10px] text-muted-foreground/70 tracking-wider">
                      Make the gallery accessible via link
                    </p>
                  </div>
                  <Switch
                    checked={gallery.status === "published"}
                    onCheckedChange={togglePublish}
                  />
                </div>

                {/* Share link */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                    Share Link
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={publicUrl}
                      readOnly
                      className="rounded-none border-border text-xs text-muted-foreground focus-visible:ring-0 bg-secondary/30"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyLink}
                      className="shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Access code */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light">
                    Access Code <span className="text-muted-foreground/50 normal-case tracking-normal">(optional)</span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground/60">
                    If set, clients must enter this code to view the gallery.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="e.g. WEDDING2025"
                      className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
                    />
                    <Button
                      variant="outline"
                      onClick={saveAccessCode}
                      disabled={savingCode}
                      className="text-xs tracking-wider uppercase font-light shrink-0"
                    >
                      {savingCode ? "Saving…" : "Save"}
                    </Button>
                  </div>
                  {gallery.access_code && (
                    <p className="text-[10px] text-green-600">
                      Access code active: <strong>{gallery.access_code}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default GalleryDetail;
