import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  RefreshCw,
  XCircle,
  Send,
  Mail,
  ImagePlus,
  Star,
  Stamp,
  ChevronDown,
  CalendarClock,
  Crosshair,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Heart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface Gallery {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  status: string;
  access_code: string | null;
  cover_image_url: string | null;
  cover_focal_x: number | null;
  cover_focal_y: number | null;
  created_at: string;
  booking_id: string | null;
  watermark_id: string | null;
  expires_at: string | null;
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
  favorite_count?: number;
}

interface UploadItem {
  file: File;
  progress: number;
  done: boolean;
  error?: string;
}

interface Watermark {
  id: string;
  name: string;
}

// ── Sortable photo card ───────────────────────────────────────────────────────
interface SortablePhotoProps {
  photo: Photo;
  onRequestDelete: (photo: Photo) => void;
  onPreview: (photo: Photo) => void;
  isSelected: boolean;
  isSelecting: boolean;
  onToggleSelect: (id: string) => void;
}

const SortablePhoto = ({ photo, onRequestDelete, onPreview, isSelected, isSelecting, onToggleSelect }: SortablePhotoProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  // Truncate filename for display
  const displayName = photo.filename.length > 22
    ? photo.filename.slice(0, 10) + "…" + photo.filename.slice(-8)
    : photo.filename;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group aspect-square bg-muted overflow-hidden",
        isSelecting ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isSelected && "ring-2 ring-primary ring-offset-1"
      )}
      {...(isSelecting ? {} : attributes)}
      {...(isSelecting ? {} : listeners)}
      onClick={isSelecting ? () => onToggleSelect(photo.id) : undefined}
    >
      {photo.url ? (
        <img
          src={photo.url}
          alt={photo.filename}
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-muted-foreground">No preview</span>
        </div>
      )}

      {/* Favorite badge (top-left) */}
      {(photo.favorite_count ?? 0) > 0 && !isSelecting && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-rose-500/90 text-white px-1.5 py-0.5 text-[9px] tracking-wider font-medium pointer-events-none">
          <Heart className="h-2.5 w-2.5 fill-white" />
          {photo.favorite_count}
        </div>
      )}

      {/* Selection checkbox */}
      {isSelecting && (
        <div className="absolute top-2 left-2 z-10">
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-primary drop-shadow" />
          ) : (
            <Square className="h-5 w-5 text-white/80 drop-shadow" />
          )}
        </div>
      )}

      {/* Selected overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
      )}

      {/* Filename bar — always visible at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 pointer-events-none">
        <p className="text-[9px] text-white/80 truncate tracking-wide font-mono">
          {displayName}
        </p>
      </div>

      {/* Hover actions (only when not selecting) */}
      {!isSelecting && (
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onPreview(photo); }}
            className="bg-background/90 text-foreground p-2 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRequestDelete(photo); }}
            className="bg-background/90 text-foreground p-2 hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};



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
  const [copiedCode, setCopiedCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [settingCover, setSettingCover] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [watermarks, setWatermarks] = useState<Watermark[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [focalMode, setFocalMode] = useState(false);
  const [focalPreview, setFocalPreview] = useState<{ x: number; y: number } | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [deleteGalleryOpen, setDeleteGalleryOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [copiedFavorites, setCopiedFavorites] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const focalImgRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Public URL uses slug if available, otherwise falls back to id
  const publicSlugOrId = gallery?.slug ?? id;
  const publicUrl = `${window.location.origin}/gallery/${publicSlugOrId}`;

  // ── Fetch gallery + photos + watermarks ────────────────────────────────────
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
      setExpiresAt(raw.expires_at ? new Date(raw.expires_at) : undefined);
      
    }
  }, [id]);

  const fetchWatermarks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("watermarks")
      .select("id, name")
      .eq("photographer_id", user.id)
      .order("name");
    if (data) setWatermarks(data as Watermark[]);
  }, [user]);

  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("photos")
      .select("id, filename, storage_path, order_index")
      .eq("gallery_id", id)
      .order("order_index", { ascending: true });

    if (data) {
      // Fetch favorite counts per photo
      const { data: favData } = await supabase
        .from("photo_favorites")
        .select("photo_id")
        .eq("gallery_id", id);

      const favCount: Record<string, number> = {};
      favData?.forEach((f) => {
        favCount[f.photo_id] = (favCount[f.photo_id] || 0) + 1;
      });

      const withUrls = data.map((p) => {
        let url: string | undefined;
        if (p.storage_path) {
          const { data: urlData } = supabase.storage
            .from("gallery-photos")
            .getPublicUrl(p.storage_path);
          url = urlData.publicUrl;
        }
        return { ...p, url, favorite_count: favCount[p.id] ?? 0 };
      });
      setPhotos(withUrls);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchGallery(), fetchPhotos(), fetchWatermarks()]);
      setLoading(false);
    };
    init();
  }, [fetchGallery, fetchPhotos, fetchWatermarks]);

  // ── Realtime: auto-refresh photos when Lightroom plugin adds new ones ────────
  useEffect(() => {
    if (!id) return;

    const triggerSyncing = () => {
      setIsSyncing(true);
      setSyncCount((n) => n + 1);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        setIsSyncing(false);
        setSyncCount(0);
      }, 4000);
    };

    const channel = supabase
      .channel(`gallery-photos-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `gallery_id=eq.${id}`,
        },
        (payload) => {
          triggerSyncing();
          const newPhoto = payload.new as { id: string; filename: string; storage_path: string | null; order_index: number };
          let url: string | undefined;
          if (newPhoto.storage_path) {
            const { data: urlData } = supabase.storage
              .from("gallery-photos")
              .getPublicUrl(newPhoto.storage_path);
            url = urlData.publicUrl;
          }
          setPhotos((prev) => {
            if (prev.some((p) => p.id === newPhoto.id)) return prev;
            return [...prev, { ...newPhoto, url }].sort(
              (a, b) => a.order_index - b.order_index
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [id]);

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

  // ── Bulk delete selected photos ──────────────────────────────────────────────
  const deleteSelectedPhotosBulk = async () => {
    if (selectedPhotos.size === 0) return;
    setDeletingSelected(true);
    const toDelete = photos.filter((p) => selectedPhotos.has(p.id));
    const paths = toDelete.map((p) => p.storage_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      await supabase.storage.from("gallery-photos").remove(paths);
    }
    const ids = toDelete.map((p) => p.id);
    await supabase.from("photos").delete().in("id", ids);
    setPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
    setSelectedPhotos(new Set());
    setIsSelecting(false);
    setDeletingSelected(false);
    toast({ title: `${toDelete.length} photo${toDelete.length !== 1 ? "s" : ""} removed` });
  };

  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map((p) => p.id)));
    }
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

  // ── Auto-save access code ───────────────────────────────────────────────────
  const persistAccessCode = useCallback(async (code: string) => {
    if (!gallery) return;
    setSavingCode(true);
    const value = code.trim() || null;
    const { error } = await supabase
      .from("galleries")
      .update({ access_code: value })
      .eq("id", gallery.id);
    if (!error) {
      setGallery((g) => g ? { ...g, access_code: value } : g);
    }
    setSavingCode(false);
  }, [gallery]);

  const handleAccessCodeChange = (value: string) => {
    const upper = value.toUpperCase();
    setAccessCode(upper);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => persistAccessCode(upper), 800);
  };

  // ── Copy link ───────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (!gallery?.access_code) return;
    navigator.clipboard.writeText(gallery.access_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ── Generate access code ────────────────────────────────────────────────────
  const generateAccessCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    handleAccessCodeChange(code);
  };

  const clearAccessCode = async () => {
    setAccessCode("");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await persistAccessCode("");
    toast({ title: "Access code removed" });
  };

  // ── Rename ──────────────────────────────────────────────────────────────────
  const startRename = () => {
    setNewTitle(gallery?.title ?? "");
    setEditingTitle(true);
  };

  const saveTitle = async () => {
    if (!gallery || !newTitle.trim()) return;
    const trimmed = newTitle.trim();
    const autoSlug = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    const { error } = await supabase
      .from("galleries")
      .update({ title: trimmed, slug: autoSlug || null })
      .eq("id", gallery.id);
    if (!error) {
      setGallery({ ...gallery, title: trimmed, slug: autoSlug || null });
      toast({ title: "Gallery renamed" });
    }
    setEditingTitle(false);
  };

  // ── Send gallery link to client ─────────────────────────────────────────────
  const sendGalleryLink = async () => {
    if (!gallery) return;
    const clientEmail = gallery.client_name
      ? prompt(`Send gallery to client email:`)
      : prompt(`Send gallery to client email:`);
    if (!clientEmail?.trim()) return;

    setSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("send-gallery-link", {
        body: {
          galleryId: gallery.id,
          clientEmail: clientEmail.trim(),
          clientName: gallery.client_name ?? undefined,
        },
      });

      if (res.error) throw res.error;

      toast({
        title: "Email sent",
        description: `Gallery link sent to ${clientEmail.trim()}`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to send email",
        description: err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Set cover from photo ─────────────────────────────────────────────────────
  const setCoverFromPhoto = async (photo: Photo) => {
    if (!gallery || !photo.url) return;
    setSettingCover(photo.id);
    const { error } = await supabase
      .from("galleries")
      .update({ cover_image_url: photo.url, cover_focal_x: 50, cover_focal_y: 50 } as any)
      .eq("id", gallery.id);
    if (!error) {
      setGallery((g) => g ? { ...g, cover_image_url: photo.url!, cover_focal_x: 50, cover_focal_y: 50 } : g);
      toast({ title: "Cover updated" });
      setCoverPickerOpen(false);
    }
    setSettingCover(null);
  };

  const removeCover = async () => {
    if (!gallery) return;
    const { error } = await supabase
      .from("galleries")
      .update({ cover_image_url: null } as any)
      .eq("id", gallery.id);
    if (!error) {
      setGallery((g) => g ? { ...g, cover_image_url: null } : g);
      toast({ title: "Cover removed" });
    }
  };

  // ── Focal point ──────────────────────────────────────────────────────────────

  const handleFocalClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gallery || !focalMode || !focalImgRef.current) return;
    const rect = focalImgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    // 1) instantly preview on cover (stay in focal mode — user can re-pick)
    setFocalPreview({ x, y });
    // 2) persist in background
    const { error } = await supabase
      .from("galleries")
      .update({ cover_focal_x: x, cover_focal_y: y } as any)
      .eq("id", gallery.id);
    if (!error) {
      setGallery((g) => g ? { ...g, cover_focal_x: x, cover_focal_y: y } : g);
    }
  };

  // ── Watermark ────────────────────────────────────────────────────────────────
  const setWatermark = async (watermarkId: string | null) => {
    if (!gallery) return;
    const { error } = await supabase
      .from("galleries")
      .update({ watermark_id: watermarkId })
      .eq("id", gallery.id);
    if (!error) {
      setGallery((g) => g ? { ...g, watermark_id: watermarkId } : g);
      toast({ title: watermarkId ? "Watermark applied" : "Watermark removed" });
    }
  };

  // ── Expiration date ──────────────────────────────────────────────────────────
  const saveExpiresAt = async (date: Date | undefined) => {
    if (!gallery) return;
    const value = date ? date.toISOString() : null;
    const { error } = await supabase
      .from("galleries")
      .update({ expires_at: value } as any)
      .eq("id", gallery.id);
    if (!error) {
      setGallery((g) => g ? { ...g, expires_at: value } : g);
      setExpiresAt(date);
      toast({ title: date ? "Expiration date set" : "Expiration date removed" });
    }
  };

  // ── Delete gallery ──────────────────────────────────────────────────────────
  const deleteGallery = async () => {
    if (!gallery) return;

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

  // ── Drag-and-drop reorder ────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({
      ...p,
      order_index: i,
    }));
    setPhotos(reordered);

    // Persist new order in parallel
    await Promise.all(
      reordered.map((p) =>
        supabase.from("photos").update({ order_index: p.order_index }).eq("id", p.id)
      )
    );
  };

  // ── Lightbox keyboard navigation ─────────────────────────────────────────────
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => i !== null && i < photos.length - 1 ? i + 1 : i);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => i !== null && i > 0 ? i - 1 : i);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, photos.length]);

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
          <DashboardHeader />

          {/* Lightroom sync indicator */}
          {isSyncing && (
            <div className="flex items-center gap-3 px-6 py-2.5 bg-primary/10 border-b border-primary/20 text-primary text-[11px] tracking-[0.2em] uppercase font-light">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Sincronizando com Lightroom
              {syncCount > 0 && (
                <span className="ml-auto text-primary/60">
                  {syncCount} foto{syncCount !== 1 ? "s" : ""} recebida{syncCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          <main className="flex-1 overflow-y-auto">
            {/* Hero banner */}
            {gallery.cover_image_url ? (
              <>
                {/* ── Focal point modal ───────────────────────────────────── */}
                {focalMode && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-background rounded-none shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                      {/* Modal header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Crosshair className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[11px] tracking-[0.2em] uppercase font-light text-foreground">
                            Set focal point
                          </span>
                        </div>
                        <button
                          onClick={() => { setFocalMode(false); setFocalPreview(null); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Clickable image */}
                      <div
                        ref={focalImgRef}
                        className="relative cursor-crosshair select-none"
                        onClick={handleFocalClick}
                      >
                        <img
                          src={gallery.cover_image_url}
                          alt={gallery.title}
                          className="w-full block pointer-events-none"
                          style={{ maxHeight: "55vh", objectFit: "contain" }}
                          draggable={false}
                        />
                        {/* Focal dot */}
                        {(focalPreview || gallery.cover_focal_x != null) && (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: `${focalPreview?.x ?? gallery.cover_focal_x ?? 50}%`,
                              top: `${focalPreview?.y ?? gallery.cover_focal_y ?? 50}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            <div className="h-7 w-7 rounded-full border-[3px] border-primary bg-primary/20 shadow-lg" />
                            <div
                              className="absolute rounded-full bg-primary"
                              style={{ width: 8, height: 8, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Footer hint */}
                      <div className="px-5 py-3 border-t border-border">
                        <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-light">
                          {focalPreview ? "Click to reposition · preview updated on cover" : "Click anywhere on the image to set focus"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Cover hero (always visible, updates in real-time) ───── */}
                <div
                  ref={coverRef}
                  className="relative w-full h-52 md:h-72 overflow-hidden group"
                >
                  <img
                    src={gallery.cover_image_url}
                    alt={gallery.title}
                    className="w-full h-full object-cover pointer-events-none transition-[object-position] duration-300"
                    style={{
                      objectPosition: `${focalPreview?.x ?? gallery.cover_focal_x ?? 50}% ${focalPreview?.y ?? gallery.cover_focal_y ?? 50}%`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-5 flex items-end justify-between pointer-events-none">
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
                    <div className="flex items-center gap-2 shrink-0">
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
                  {/* Cover action buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setFocalMode(true)}
                      className="bg-background/80 hover:bg-background text-foreground px-3 py-1.5 text-[10px] tracking-widest uppercase flex items-center gap-1.5 transition-colors"
                    >
                      <Crosshair className="h-3 w-3" /> Focus
                    </button>
                    <button
                      onClick={() => setCoverPickerOpen(true)}
                      className="bg-background/80 hover:bg-background text-foreground px-3 py-1.5 text-[10px] tracking-widest uppercase flex items-center gap-1.5 transition-colors"
                    >
                      <ImagePlus className="h-3 w-3" /> Change
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="px-6 md:px-10 pt-6 pb-0 flex items-center gap-3">
                <button
                  onClick={() => setCoverPickerOpen(true)}
                  disabled={photos.length === 0}
                  className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {photos.length === 0 ? "Upload photos to set a cover" : "Set cover image"}
                </button>
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
                  <DropdownMenuContent align="end" className="rounded-none w-48">
                    <DropdownMenuItem onClick={startRename} className="gap-2 text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCoverPickerOpen(true)} className="gap-2 text-xs" disabled={photos.length === 0}>
                      <ImagePlus className="h-3.5 w-3.5" /> Change cover
                    </DropdownMenuItem>
                    {gallery.cover_image_url && (
                      <DropdownMenuItem onClick={removeCover} className="gap-2 text-xs">
                        <X className="h-3.5 w-3.5" /> Remove cover
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteGalleryOpen(true)}
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

              {/* Photo grid — drag to reorder */}
              {photos.length > 0 && (
                <div className="flex flex-col gap-4">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                      <span className="inline-block w-6 h-px bg-border" />
                      {isSelecting
                        ? `${selectedPhotos.size} selected`
                        : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
                      {!isSelecting && (
                        <span className="text-muted-foreground/50 normal-case tracking-normal text-[10px] ml-1">— drag to reorder</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {isSelecting ? (
                        <>
                          <button
                            onClick={toggleSelectAll}
                            className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {selectedPhotos.size === photos.length ? "Deselect all" : "Select all"}
                          </button>
                          {selectedPhotos.size > 0 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteSelectedOpen(true)}
                              className="gap-1.5 text-xs tracking-wider uppercase font-light h-7"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete {selectedPhotos.size}
                            </Button>
                          )}
                          <button
                            onClick={() => { setIsSelecting(false); setSelectedPhotos(new Set()); }}
                            className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsSelecting(true)}
                          className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {photos.map((photo, idx) => (
                           <SortablePhoto
                             key={photo.id}
                             photo={photo}
                             onRequestDelete={setPhotoToDelete}
                             onPreview={() => setLightboxIndex(idx)}
                             isSelected={selectedPhotos.has(photo.id)}
                             isSelecting={isSelecting}
                             onToggleSelect={toggleSelectPhoto}
                           />
                         ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {photos.length === 0 && activeUploads.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground/60">No photos yet — upload above to get started</p>
                </div>
              )}


              {/* Watermark section */}
              {gallery.category === "proof" && (
                <div className="border border-border p-6 flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-1">
                      <span className="inline-block w-6 h-px bg-border" />
                      Watermark
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Select a watermark preset to apply to proof photos.
                    </p>
                  </div>

                  {watermarks.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50">
                      No watermark presets found. Create one in{" "}
                      <button
                        onClick={() => navigate("/dashboard/settings")}
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                      >
                        Settings
                      </button>.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setWatermark(null)}
                        className={cn(
                          "px-3 py-1.5 border text-xs tracking-wider uppercase font-light transition-colors",
                          !gallery.watermark_id
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground/50 text-muted-foreground"
                        )}
                      >
                        None
                      </button>
                      {watermarks.map((wm) => (
                        <button
                          key={wm.id}
                          onClick={() => setWatermark(wm.id)}
                          className={cn(
                            "px-3 py-1.5 border text-xs tracking-wider uppercase font-light transition-colors flex items-center gap-1.5",
                            gallery.watermark_id === wm.id
                              ? "border-foreground bg-foreground text-background"
                              : "border-border hover:border-foreground/50 text-muted-foreground"
                          )}
                        >
                          <Stamp className="h-3 w-3" />
                          {wm.name || "Untitled"}
                        </button>
                      ))}
                    </div>
                  )}
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
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                    <div className="relative flex-1">
                      <Input
                        value={accessCode}
                        onChange={(e) => handleAccessCodeChange(e.target.value)}
                        placeholder="e.g. WEDDING2025"
                        className="rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground pr-8 font-mono tracking-widest"
                      />
                      {savingCode && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/50 tracking-widest uppercase">saving…</span>
                      )}
                      {!savingCode && accessCode && (
                        <button
                          onClick={() => clearAccessCode()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                          type="button"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={generateAccessCode}
                      title="Generate random code"
                      className="shrink-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    {gallery.access_code ? (
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-primary flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                          Active: <strong className="font-mono tracking-widest">{gallery.access_code}</strong>
                        </p>
                        <button
                          onClick={copyCode}
                          className="text-muted-foreground/50 hover:text-foreground transition-colors"
                          title="Copy code"
                        >
                          {copiedCode ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50">No code set — gallery is open to anyone with the link.</p>
                    )}
                    {gallery.access_code && (
                      <button
                        onClick={clearAccessCode}
                        disabled={savingCode}
                        className="text-[10px] text-muted-foreground/50 hover:text-destructive transition-colors"
                      >
                        Remove code
                      </button>
                    )}
                  </div>
                </div>

                {/* Send to client */}
                <div className="pt-2 border-t border-border flex flex-col gap-4">
                  {/* Expiration date */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs tracking-widest uppercase text-muted-foreground font-light flex items-center gap-1.5">
                      <CalendarClock className="h-3 w-3" />
                      Expiration Date <span className="text-muted-foreground/50 normal-case tracking-normal">(optional)</span>
                    </Label>
                    <p className="text-[10px] text-muted-foreground/60">
                      After this date, the gallery will no longer be accessible.
                    </p>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-light text-xs rounded-none border-border h-9 gap-2",
                              !expiresAt && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {expiresAt ? format(expiresAt, "dd MMM yyyy") : "No expiration"}
                            <ChevronDown className="h-3.5 w-3.5 ml-auto shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-none" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={expiresAt}
                            onSelect={(d) => saveExpiresAt(d)}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      {expiresAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveExpiresAt(undefined)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          title="Remove expiration"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {expiresAt && (
                      <p className={cn(
                        "text-[10px] flex items-center gap-1.5",
                        expiresAt < new Date() ? "text-destructive" : "text-muted-foreground/60"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full inline-block", expiresAt < new Date() ? "bg-destructive" : "bg-amber-500")} />
                        {expiresAt < new Date() ? "Expired — gallery is no longer accessible" : `Expires ${format(expiresAt, "MMMM d, yyyy")}`}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 text-xs tracking-wider uppercase font-light"
                    onClick={sendGalleryLink}
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? (
                      <><Mail className="h-3.5 w-3.5 animate-pulse" /> Sending…</>
                    ) : (
                      <><Send className="h-3.5 w-3.5" /> Send to Client</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground/50 text-center -mt-2">
                    Sends the gallery link{gallery.access_code ? " and access code" : ""} to the client by email.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Cover Picker Dialog */}
      <Dialog open={coverPickerOpen} onOpenChange={setCoverPickerOpen}>
        <DialogContent className="max-w-2xl rounded-none p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-base font-light tracking-wide">Choose Cover Image</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Select one of the gallery photos to use as the cover.</p>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <ImagePlus className="h-8 w-8 opacity-30" />
                <p className="text-sm">No photos uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photos.map((photo) => {
                  const isCurrent = gallery.cover_image_url === photo.url;
                  return (
                    <button
                      key={photo.id}
                      onClick={() => setCoverFromPhoto(photo)}
                      disabled={settingCover === photo.id}
                      className={`relative aspect-square overflow-hidden group border-2 transition-colors ${
                        isCurrent ? "border-primary" : "border-transparent hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Star className="h-5 w-5 text-primary fill-primary" />
                        </div>
                      )}
                      {settingCover === photo.id && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground animate-pulse tracking-widest uppercase">Saving…</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!photoToDelete} onOpenChange={(open) => { if (!open) setPhotoToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The photo will be permanently removed from the gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (photoToDelete) {
                  await deletePhoto(photoToDelete);
                  setPhotoToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteSelectedOpen} onOpenChange={setDeleteSelectedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{selectedPhotos.size}</strong> selected photo{selectedPhotos.size !== 1 ? "s" : ""} from the gallery. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                setDeleteSelectedOpen(false);
                await deleteSelectedPhotosBulk();
              }}
              disabled={deletingSelected}
            >
              {deletingSelected ? "Deleting…" : `Delete ${selectedPhotos.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteGalleryOpen} onOpenChange={setDeleteGalleryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-foreground">"{gallery?.title}"</span> and all its photos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteGallery}
            >
              Delete gallery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-[11px] tracking-[0.3em] uppercase z-10">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Filename */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-[10px] tracking-widest uppercase z-10 truncate max-w-xs text-center">
            {photos[lightboxIndex].filename}
          </div>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white/50 hover:text-white transition-colors z-10 p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i ?? 0) - 1); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < photos.length - 1 && (
            <button
              className="absolute right-4 text-white/50 hover:text-white transition-colors z-10 p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i ?? 0) + 1); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Image */}
          <img
            src={photos[lightboxIndex].url}
            alt={photos[lightboxIndex].filename}
            className="max-h-[90vh] max-w-[90vw] object-contain select-none"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </SidebarProvider>
  );
};

export default GalleryDetail;
