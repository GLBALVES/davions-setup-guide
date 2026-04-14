import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GalleryCard } from "@/components/dashboard/GalleryCard";
import { CreateGalleryDialog } from "@/components/dashboard/CreateGalleryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GalleriesSkeleton } from "@/components/dashboard/skeletons/GalleriesSkeleton";
import {
  Plus,
  FolderOpen,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCheck,
  Clock4,
  CalendarX2,
  LayoutGrid,
  List,
  UserX,
  GripVertical,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Gallery {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  status: string;
  created_at: string;
  sort_order: number;
  photo_count: number;
  cover_image_url?: string | null;
  expires_at?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  session_title?: string | null;
  booking_id?: string | null;
}

type StatusFilter = "all" | "draft" | "published" | "expired" | "unassigned";
type SortOption = "newest" | "oldest" | "title_asc" | "title_desc" | "photos_desc" | "manual";
type ViewMode = "grid" | "list";

const Galleries = () => {
  const { user, signOut, photographerId } = useAuth();
  const { t } = useLanguage();
  const g = t.galleries;
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editGallery, setEditGallery] = useState<Gallery | null>(null);
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") as "proof" | "final" | null;

  // Filter / search state
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const STATUS_FILTERS: { value: StatusFilter; label: string; icon: React.ElementType }[] = [
    { value: "all", label: g.all, icon: SlidersHorizontal },
    { value: "draft", label: g.draft, icon: Clock4 },
    { value: "published", label: g.published, icon: CheckCheck },
    { value: "expired", label: g.expired, icon: CalendarX2 },
    { value: "unassigned", label: g.noClient, icon: UserX },
  ];

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "newest", label: g.newestFirst },
    { value: "oldest", label: g.oldestFirst },
    { value: "title_asc", label: g.titleAZ },
    { value: "title_desc", label: g.titleZA },
    { value: "photos_desc", label: g.mostPhotos },
    { value: "manual", label: g.manualOrder ?? "Manual" },
  ];

  const fetchGalleries = async () => {
    if (!photographerId) return;
    setLoading(true);
    const { data: galleriesData } = await supabase
      .from("galleries")
      .select(`
        id, title, slug, category, status, created_at, sort_order, cover_image_url, expires_at, booking_id, project_id,
        bookings ( client_name, client_email, sessions ( title ) ),
        client_projects ( title )
      `)
      .eq("photographer_id", photographerId)
      .order("sort_order", { ascending: true });

    if (galleriesData) {
      const { data: photoCounts } = await supabase
        .from("photos")
        .select("gallery_id")
        .eq("photographer_id", photographerId);

      const countMap: Record<string, number> = {};
      photoCounts?.forEach((p: { gallery_id: string }) => {
        countMap[p.gallery_id] = (countMap[p.gallery_id] || 0) + 1;
      });

      setGalleries(
        (galleriesData as any[]).map((gal) => ({
          ...gal,
          category: gal.category ?? "proof",
          sort_order: gal.sort_order ?? 0,
          photo_count: countMap[gal.id] || 0,
          cover_image_url: gal.cover_image_url ?? null,
          expires_at: gal.expires_at ?? null,
          booking_id: gal.booking_id ?? null,
          project_id: gal.project_id ?? null,
          project_title: gal.client_projects?.title ?? null,
          client_name: gal.bookings?.client_name ?? null,
          client_email: gal.bookings?.client_email ?? null,
          session_title: (gal.bookings as any)?.sessions?.title ?? null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!photographerId) return;
    fetchGalleries();

    const channel = supabase
      .channel("galleries-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "galleries" }, () => {
        fetchGalleries();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [photographerId]);

  // Derived — apply category tab, search, status filter, sort
  const filtered = useMemo(() => {
    let list = type ? galleries.filter((gal) => gal.category === type) : galleries;

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (gal) =>
          gal.title.toLowerCase().includes(q) ||
          (gal.client_name?.toLowerCase().includes(q) ?? false) ||
          (gal.session_title?.toLowerCase().includes(q) ?? false) ||
          (gal.client_email?.toLowerCase().includes(q) ?? false)
      );
    }

    // Status
    if (statusFilter !== "all") {
      list = list.filter((gal) => {
        const isExpired = gal.expires_at ? new Date(gal.expires_at) < new Date() : false;
        if (statusFilter === "expired") return isExpired;
        if (statusFilter === "unassigned") return !gal.booking_id;
        if (statusFilter === "draft") return gal.status === "draft" && !isExpired;
        if (statusFilter === "published") return gal.status === "published" && !isExpired;
        return true;
      });
    }

    // Sort (manual uses existing sort_order already applied in fetch)
    if (sortBy !== "manual") {
      list = [...list].sort((a, b) => {
        if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === "title_asc") return a.title.localeCompare(b.title);
        if (sortBy === "title_desc") return b.title.localeCompare(a.title);
        if (sortBy === "photos_desc") return b.photo_count - a.photo_count;
        return 0;
      });
    }

    return list;
  }, [galleries, type, query, statusFilter, sortBy]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = filtered.findIndex((gal) => gal.id === active.id);
    const newIdx = filtered.findIndex((gal) => gal.id === over.id);
    const reordered = arrayMove(filtered, oldIdx, newIdx).map((gal, i) => ({
      ...gal,
      sort_order: i,
    }));

    // Optimistic update — merge back into full galleries list
    setGalleries((prev) => {
      const map = new Map(reordered.map((gal) => [gal.id, gal]));
      return prev.map((gal) => map.get(gal.id) ?? gal);
    });

    // Persist to DB
    await Promise.all(
      reordered.map((gal) =>
        supabase.from("galleries").update({ sort_order: gal.sort_order }).eq("id", gal.id)
      )
    );
  };

  const heading = type === "proof" ? g.proofGalleries : type === "final" ? g.finalGalleries : g.title;
  const defaultCategory = type ?? "proof";
  const isManual = sortBy === "manual";
  const hasActiveFilters = query.trim() !== "" || statusFilter !== "all" || sortBy !== "newest";

  // Count per status chip, always from the full category-scoped list (ignoring active filter/search)
  const statusCounts = useMemo(() => {
    const base = type ? galleries.filter((gal) => gal.category === type) : galleries;
    const now = new Date();
    return {
      all: base.length,
      draft: base.filter((gal) => gal.status === "draft" && !(gal.expires_at && new Date(gal.expires_at) < now)).length,
      published: base.filter((gal) => gal.status === "published" && !(gal.expires_at && new Date(gal.expires_at) < now)).length,
      expired: base.filter((gal) => gal.expires_at && new Date(gal.expires_at) < now).length,
      unassigned: base.filter((gal) => !gal.booking_id).length,
    };
  }, [galleries, type]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-6">
              {/* Page heading + CTA */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                    <span className="inline-block w-6 h-px bg-border" />
                    Dashboard
                  </p>
                  <h1 className="text-2xl font-light tracking-wide">{heading}</h1>
                </div>
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  className="gap-2 text-xs tracking-wider uppercase font-light"
                >
                   <Plus className="h-3.5 w-3.5" />
                  {g.newGallery}
                </Button>
              </div>

              {/* ── Toolbar ── */}
              <div className="flex flex-col gap-3">
                {/* Search + sort + view toggle */}
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={g.searchPlaceholder}
                      className="h-8 pl-8 pr-8 text-xs font-light rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground/40"
                    />
                    <AnimatePresence>
                      {query && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.12 }}
                          onClick={() => setQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sort dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 gap-1.5 text-[10px] tracking-wider uppercase font-light rounded-none border-border",
                          sortBy !== "newest" && "border-foreground/40 text-foreground"
                        )}
                      >
                        {isManual ? <GripVertical className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
                        {SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? g.sortBy}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground font-light">
                        {g.sortBy}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                        {SORT_OPTIONS.map((opt) => (
                          <DropdownMenuRadioItem
                            key={opt.value}
                            value={opt.value}
                            className="text-xs font-light cursor-pointer"
                          >
                            {opt.value === "manual" && <GripVertical className="h-3 w-3 mr-1.5 inline" />}
                            {opt.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* View mode toggle */}
                  <div className="flex border border-border rounded-none overflow-hidden">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-1.5 transition-colors",
                        viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      title="Grid view"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-1.5 transition-colors",
                        viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      title="List view"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status filter chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {STATUS_FILTERS.map((f) => {
                    const isActive = statusFilter === f.value;
                    const Icon = f.icon;
                    const count = statusCounts[f.value];
                    const showCount = f.value !== "all" && count > 0;
                    return (
                      <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase font-light border transition-colors rounded-none",
                          isActive
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {f.label}
                        {showCount && (
                          <span className={cn(
                            "ml-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[9px] font-normal px-1 leading-none",
                            isActive
                              ? "bg-background/20 text-background"
                              : f.value === "unassigned"
                              ? "bg-warning/20 text-warning"
                              : f.value === "expired"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-foreground/10 text-foreground/60"
                          )}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Count + clear */}
                  <span className="ml-1 text-[10px] text-muted-foreground/60 tracking-wider">
                    {filtered.length} {filtered.length !== 1 ? g.results : g.result}
                  </span>

                  <AnimatePresence>
                    {hasActiveFilters && (
                      <motion.button
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => { setQuery(""); setStatusFilter("all"); setSortBy("newest"); }}
                        className="flex items-center gap-1 text-[10px] tracking-wider uppercase font-light text-muted-foreground hover:text-destructive transition-colors ml-1"
                      >
                        <X className="h-2.5 w-2.5" />
                        {g.clearFilters}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Manual hint */}
                {isManual && (
                  <p className="text-[10px] text-muted-foreground/60 tracking-wide">
                    {g.manualOrderHint ?? "Drag the ⠿ handle to reorder your galleries"}
                  </p>
                )}
              </div>

              <GalleryGrid
                galleries={filtered}
                loading={loading}
                onEdit={setEditGallery}
                onDelete={fetchGalleries}
                onAssigned={fetchGalleries}
                viewMode={viewMode}
                isManual={isManual}
                sensors={sensors}
                onDragEnd={handleDragEnd}
              />
            </div>
          </main>
        </div>
      </div>

      <CreateGalleryDialog
        open={createOpen || !!editGallery}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditGallery(null); }}
        onCreated={fetchGalleries}
        defaultCategory={defaultCategory}
        editGallery={editGallery}
      />
    </SidebarProvider>
  );
};

/* ─────────────────────────── Sortable wrapper ─────────────────────────── */

function SortableGalleryItem({
  gallery,
  isManual,
  viewMode,
  onEdit,
  onDelete,
  onAssigned,
}: {
  gallery: Gallery;
  isManual: boolean;
  viewMode: ViewMode;
  onEdit: () => void;
  onDelete: () => void;
  onAssigned: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: gallery.id,
    disabled: !isManual,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={viewMode === "list" ? "flex items-stretch gap-2" : "relative"}>
      {/* Drag handle */}
      {isManual && (
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors",
            viewMode === "list"
              ? "w-5 self-stretch"
              : "absolute top-2 left-2 z-10 p-1 bg-background/80 backdrop-blur-sm rounded-sm"
          )}
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <div className={viewMode === "list" && isManual ? "flex-1 min-w-0" : "w-full"}>
        <GalleryCard
          gallery={gallery}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssigned={onAssigned}
          compact={viewMode === "list"}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── Grid/List container ─────────────────────────── */

function GalleryGrid({
  galleries,
  loading,
  onEdit,
  onDelete,
  onAssigned,
  viewMode,
  isManual,
  sensors,
  onDragEnd,
}: {
  galleries: Gallery[];
  loading: boolean;
  onEdit: (g: Gallery) => void;
  onDelete: () => void;
  onAssigned: () => void;
  viewMode: ViewMode;
  isManual: boolean;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const { t } = useLanguage();
  const g = t.galleries;

  if (loading) return <GalleriesSkeleton />;

  if (galleries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 gap-3 text-center"
      >
        <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-light text-muted-foreground">{g.noGalleriesFound}</p>
        <p className="text-[10px] text-muted-foreground/60">{g.adjustFilters}</p>
      </motion.div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={galleries.map((gal) => gal.id)}
        strategy={viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "flex flex-col gap-2"
          }
        >
          {galleries.map((gallery) => (
            <SortableGalleryItem
              key={gallery.id}
              gallery={gallery}
              isManual={isManual}
              viewMode={viewMode}
              onEdit={() => onEdit(gallery)}
              onDelete={onDelete}
              onAssigned={onAssigned}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default Galleries;
