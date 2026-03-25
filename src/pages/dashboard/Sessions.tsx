import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Camera, Clock, MapPin, Image as ImageIcon, Eye, Share2, Search, ArrowUpDown, ArrowDownAZ, ArrowUpAZ, DollarSign, Globe, GlobeLock, Copy, Link2, Mail, MessageCircle, LayoutGrid, List, GripVertical, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { SessionsSkeleton } from "@/components/dashboard/skeletons/SessionsSkeleton";
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

interface Session {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  num_photos: number;
  location: string | null;
  cover_image_url: string | null;
  status: string;
  created_at: string;
  sort_order: number;
  session_model?: string | null;
  campaign_dates?: string[] | null;
}

const Sessions = () => {
  const { user, signOut, photographerId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const s = t.sessions;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "draft">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "az" | "za" | "price_asc" | "price_desc" | "manual">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchSessions = async () => {
    if (!photographerId) return;
    setLoading(true);
    const [{ data: sessionsData }, { data: photoData }] = await Promise.all([
      supabase.from("sessions").select("*").eq("photographer_id", photographerId).order("sort_order", { ascending: true }),
      supabase.from("photographers").select("store_slug").eq("id", photographerId).single(),
    ]);
    setSessions(sessionsData ?? []);
    setStoreSlug(photoData?.store_slug ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [photographerId]);

  const filteredSessions = useMemo(() => {
    let list = sessions.filter((sess) => {
      if (filter === "active") return sess.status === "active";
      if (filter === "draft") return sess.status !== "active";
      return true;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (sess) =>
          sess.title.toLowerCase().includes(q) ||
          (sess.description ?? "").toLowerCase().includes(q) ||
          (sess.location ?? "").toLowerCase().includes(q)
      );
    }
    if (sort !== "manual") {
      list = [...list].sort((a, b) => {
        if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sort === "az") return a.title.localeCompare(b.title);
        if (sort === "za") return b.title.localeCompare(a.title);
        if (sort === "price_asc") return a.price - b.price;
        if (sort === "price_desc") return b.price - a.price;
        return 0;
      });
    }
    return list;
  }, [sessions, filter, search, sort]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = filteredSessions.findIndex((s) => s.id === active.id);
    const newIdx = filteredSessions.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(filteredSessions, oldIdx, newIdx).map((s, i) => ({
      ...s,
      sort_order: i,
    }));

    // Optimistic update — merge back into full sessions list preserving unfiltered items
    setSessions((prev) => {
      const map = new Map(reordered.map((s) => [s.id, s]));
      return prev.map((s) => map.get(s.id) ?? s);
    });

    // Persist to DB
    await Promise.all(
      reordered.map((s) =>
        supabase.from("sessions").update({ sort_order: s.sort_order }).eq("id", s.id)
      )
    );
  };

  const SORT_OPTIONS: { key: typeof sort; label: string; icon: React.ReactNode }[] = [
    { key: "newest", label: s.newest, icon: <ArrowUpDown className="h-3 w-3" /> },
    { key: "oldest", label: s.oldest, icon: <ArrowUpDown className="h-3 w-3" /> },
    { key: "az", label: "A–Z", icon: <ArrowDownAZ className="h-3 w-3" /> },
    { key: "za", label: "Z–A", icon: <ArrowUpAZ className="h-3 w-3" /> },
    { key: "price_asc", label: s.priceUp, icon: <DollarSign className="h-3 w-3" /> },
    { key: "price_desc", label: s.priceDown, icon: <DollarSign className="h-3 w-3" /> },
    { key: "manual", label: s.manual ?? "Manual", icon: <GripVertical className="h-3 w-3" /> },
  ];

  const FILTERS: { key: "all" | "active" | "draft"; label: string }[] = [
    { key: "all", label: s.all },
    { key: "active", label: s.published },
    { key: "draft", label: s.unpublished },
  ];

  const isManual = sort === "manual";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                    <span className="inline-block w-6 h-px bg-border" />
                    {s.products}
                  </p>
                  <h1 className="text-2xl font-light tracking-wide">{s.title}</h1>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate("/dashboard/sessions/new")}
                  className="gap-2 text-xs tracking-wider uppercase font-light"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {s.newSession}
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1 border-b border-border pb-1">
                  {FILTERS.map(({ key, label }) => {
                    const count = key === "all" ? sessions.length : sessions.filter(sess => key === "active" ? sess.status === "active" : sess.status !== "active").length;
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-light transition-colors border-b-2 -mb-px ${
                          filter === key
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label}
                        <span className="ml-1.5 opacity-50">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search + Sort + View toggle */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={s.searchPlaceholder}
                      className="pl-9 h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    {SORT_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSort(key)}
                        className={`px-2.5 py-1 text-[10px] tracking-wider uppercase font-light border transition-colors ${
                          sort === key
                            ? "border-foreground text-foreground bg-foreground/5"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* View mode toggle */}
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
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isManual && (
                  <p className="text-[10px] text-muted-foreground/60 tracking-wide">
                    {s.manualHint ?? "Drag the ⠿ handle to reorder your sessions"}
                  </p>
                )}
              </div>

              {loading ? (
                <SessionsSkeleton />
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-dashed border-border">
                  <Camera className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-light text-muted-foreground">
                      {sessions.length === 0 ? s.noSessionsYet : search ? `${s.noResults} "${search}"` : s.noMatch}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {sessions.length === 0 ? s.createFirst : search ? s.differentSearch : s.differentFilter}
                    </p>
                  </div>
                  {sessions.length === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/dashboard/sessions/new")}
                      className="gap-2 text-xs tracking-wider uppercase font-light mt-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {s.newSession}
                    </Button>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredSessions.map((s) => s.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredSessions.map((session) => (
                        <SortableSessionCard
                          key={session.id}
                          session={session}
                          storeSlug={storeSlug}
                          isManual={isManual}
                          onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
                          onStatusChange={(id, status) =>
                            setSessions((prev) =>
                              prev.map((s) => (s.id === id ? { ...s, status } : s))
                            )
                          }
                          onDelete={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                /* List view */
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredSessions.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col border border-border divide-y divide-border">
                      {/* List header */}
                      <div className={`grid gap-4 px-4 py-2 bg-muted/40 ${isManual ? "grid-cols-[auto_2fr_1fr_1fr_1fr_auto]" : "grid-cols-[2fr_1fr_1fr_1fr_auto]"}`}>
                        {isManual && <span className="w-4" />}
                        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Session</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Price</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light hidden sm:block">Duration</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light hidden md:block">Status</span>
                        <span className="w-20" />
                      </div>
                      {filteredSessions.map((session) => (
                        <SortableSessionRow
                          key={session.id}
                          session={session}
                          storeSlug={storeSlug}
                          isManual={isManual}
                          onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
                          onStatusChange={(id, status) =>
                            setSessions((prev) =>
                              prev.map((s) => (s.id === id ? { ...s, status } : s))
                            )
                          }
                          onDelete={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

/* ─────────────────────────── shared action helpers ─────────────────────────── */

function useSessionActions(
  session: Session,
  storeSlug: string | null,
  onDelete?: (id: string) => void
) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { photographerId } = useAuth();
  const s = t.sessions;
  const [toggling, setToggling] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const bookingUrl = storeSlug
    ? `${window.location.origin}/store/${storeSlug}/${session.slug ?? session.id}`
    : null;

  const handleToggleStatus = async (e: React.MouseEvent, onStatusChange: (id: string, status: string) => void) => {
    e.stopPropagation();
    const newStatus = session.status === "active" ? "draft" : "active";
    setToggling(true);
    const { error } = await supabase
      .from("sessions")
      .update({ status: newStatus })
      .eq("id", session.id)
      .eq("photographer_id", photographerId ?? "");
    setToggling(false);
    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      onStatusChange(session.id, newStatus);
      toast({
        title: newStatus === "active" ? "Session published" : "Session unpublished",
        description: newStatus === "active" ? "Clients can now book this session." : "Session is now hidden from your store.",
      });
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookingUrl) window.open(bookingUrl, "_blank");
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast({ title: s.linkCopied, description: s.bookingUrlCopied });
    } catch {
      toast({ title: s.failedToCopy, variant: "destructive" });
    }
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bookingUrl) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(bookingUrl)}`, "_blank");
  };

  const handleShareEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bookingUrl) return;
    window.open(`mailto:?subject=${encodeURIComponent(session.title)}&body=${encodeURIComponent(bookingUrl)}`, "_blank");
  };

  const openDeleteDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      // Check for linked bookings or sales
      const { data: linkedBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("session_id", session.id)
        .limit(1);

      const hasLinks = linkedBookings && linkedBookings.length > 0;

      if (hasLinks) {
        // Has linked records → just deactivate
        const { error } = await supabase
          .from("sessions")
          .update({ status: "draft" })
          .eq("id", session.id)
          .eq("photographer_id", photographerId ?? "");
        if (error) throw error;
        onDelete?.(session.id);
        toast({
          title: "Session deactivated",
          description: "This session has linked bookings and was deactivated instead of deleted.",
        });
      } else {
        // No links → safe to delete (cascade availability + day configs)
        const { error } = await supabase
          .from("sessions")
          .delete()
          .eq("id", session.id)
          .eq("photographer_id", photographerId ?? "");
        if (error) throw error;
        onDelete?.(session.id);
        toast({ title: "Session deleted" });
      }
    } catch {
      toast({ title: "Failed to delete session", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  return {
    toggling,
    bookingUrl,
    handleToggleStatus,
    handlePreview,
    handleCopyLink,
    handleShareWhatsApp,
    handleShareEmail,
    openDeleteDialog,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteLoading,
    handleConfirmDelete,
    s,
  };
}

/* ─────────────────────────── Sortable Grid Card ─────────────────────────── */

function SortableSessionCard({
  session,
  storeSlug,
  isManual,
  onClick,
  onStatusChange,
  onDelete,
}: {
  session: Session;
  storeSlug: string | null;
  isManual: boolean;
  onClick: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: session.id,
    disabled: !isManual,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SessionCard
        session={session}
        storeSlug={storeSlug}
        isManual={isManual}
        dragHandleProps={isManual ? { ...attributes, ...listeners } : undefined}
        onClick={onClick}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
    </div>
  );
}

/* ─────────────────────────── Sortable List Row ─────────────────────────── */

function SortableSessionRow({
  session,
  storeSlug,
  isManual,
  onClick,
  onStatusChange,
}: {
  session: Session;
  storeSlug: string | null;
  isManual: boolean;
  onClick: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: session.id,
    disabled: !isManual,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SessionRow
        session={session}
        storeSlug={storeSlug}
        isManual={isManual}
        dragHandleProps={isManual ? { ...attributes, ...listeners } : undefined}
        onClick={onClick}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

/* ─────────────────────────── Grid card ─────────────────────────── */

function SessionCard({
  session,
  storeSlug,
  isManual,
  dragHandleProps,
  onClick,
  onStatusChange,
}: {
  session: Session;
  storeSlug: string | null;
  isManual: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onClick: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { t } = useLanguage();
  const s = t.sessions;
  const { toggling, bookingUrl, handleToggleStatus, handlePreview, handleCopyLink, handleShareWhatsApp, handleShareEmail } = useSessionActions(session, storeSlug);

  const priceFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(session.price / 100);

  return (
    <TooltipProvider>
      <div
        onClick={onClick}
        className="group cursor-pointer text-left border border-border hover:border-foreground/20 transition-colors bg-card overflow-hidden flex flex-col"
      >
        {/* Cover image */}
        <div className="h-32 bg-muted relative overflow-hidden">
          {session.cover_image_url ? (
            <img
              src={session.cover_image_url}
              alt={session.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          {/* Drag handle — top-left, only in manual mode */}
          {isManual && (
            <button
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 left-2 p-1 bg-background/80 backdrop-blur-sm rounded-sm text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="absolute top-2 right-2 flex items-center gap-1.5 group/badge">
            {session.session_model === "campaign" && (
              <Badge variant="secondary" className="text-[9px] tracking-wider uppercase font-light bg-primary/10 text-primary border-primary/20">
                Campanha
              </Badge>
            )}
            <button
              onClick={(e) => handleToggleStatus(e, onStatusChange)}
              disabled={toggling}
              className="relative block"
            >
              <Badge
                variant={session.status === "active" ? "default" : "secondary"}
                className="text-[9px] tracking-wider uppercase font-light transition-all group-hover/badge:opacity-0 group-hover/badge:scale-90"
              >
                {session.status === "active" ? s.published : s.unpublished}
              </Badge>
              <Badge
                variant={session.status === "active" ? "destructive" : "default"}
                className="text-[9px] tracking-wider uppercase font-light absolute inset-0 opacity-0 scale-90 group-hover/badge:opacity-100 group-hover/badge:scale-100 transition-all whitespace-nowrap"
              >
                {session.status === "active" ? "Unpublish" : "Publish"}
              </Badge>
            </button>
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2">
          <h3 className="text-sm font-light tracking-wide truncate">{session.title || "Untitled"}</h3>

          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.duration_minutes}min
            </span>
            <span className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {session.num_photos} {s.photos}
            </span>
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {session.location}
              </span>
            )}
            {session.session_model === "campaign" && session.campaign_dates && session.campaign_dates.length > 0 && (
              <span className="flex items-center gap-1 text-primary">
                <span className="font-medium">{session.campaign_dates.length}d</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-base font-light">{priceFormatted}</span>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => handleToggleStatus(e, onStatusChange)}
                    disabled={toggling}
                    className={`transition-colors ${session.status === "active" ? "text-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
                  >
                    {session.status === "active" ? (
                      <Globe className="h-3.5 w-3.5" />
                    ) : (
                      <GlobeLock className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {session.status === "active" ? "Unpublish session" : "Publish session"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handlePreview}
                    disabled={!bookingUrl}
                    className={`transition-colors ${bookingUrl ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {bookingUrl ? s.previewBooking : s.configureStore}
                </TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={!bookingUrl}
                        onClick={(e) => e.stopPropagation()}
                        className={`transition-colors ${bookingUrl ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {bookingUrl ? "Share" : s.configureStore}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={handleCopyLink}>
                    <Copy className="h-3.5 w-3.5" />
                    {s.copyBookingLink}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={handlePreview}>
                    <Link2 className="h-3.5 w-3.5" />
                    Open link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={handleShareWhatsApp}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    Share via WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={handleShareEmail}>
                    <Mail className="h-3.5 w-3.5" />
                    Share via Email
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ─────────────────────────── List row ─────────────────────────── */

function SessionRow({
  session,
  storeSlug,
  isManual,
  dragHandleProps,
  onClick,
  onStatusChange,
}: {
  session: Session;
  storeSlug: string | null;
  isManual: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onClick: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { t } = useLanguage();
  const s = t.sessions;
  const { toggling, bookingUrl, handleToggleStatus, handlePreview, handleCopyLink, handleShareWhatsApp, handleShareEmail } = useSessionActions(session, storeSlug);

  const priceFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(session.price / 100);

  return (
    <TooltipProvider>
      <div
        onClick={onClick}
        className={`grid gap-4 px-4 py-3 items-center hover:bg-muted/30 cursor-pointer transition-colors group ${isManual ? "grid-cols-[auto_2fr_1fr_1fr_1fr_auto]" : "grid-cols-[2fr_1fr_1fr_1fr_auto]"}`}
      >
        {/* Drag handle — list mode */}
        {isManual && (
          <button
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Title + thumbnail */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 bg-muted overflow-hidden">
            {session.cover_image_url ? (
              <img src={session.cover_image_url} alt={session.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-light truncate">{session.title || "Untitled"}</p>
            {session.location && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {session.location}
              </p>
            )}
          </div>
        </div>

        {/* Price */}
        <span className="text-sm font-light">{priceFormatted}</span>

        {/* Duration + photos */}
        <div className="hidden sm:flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {session.duration_minutes}min
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {session.num_photos} {s.photos}
          </span>
        </div>

        {/* Status */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${session.status === "active" ? "bg-green-500" : "bg-muted-foreground/30"}`} />
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-light">
            {session.status === "active" ? s.published : s.unpublished}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-20 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => handleToggleStatus(e, onStatusChange)}
                disabled={toggling}
                className={`p-1.5 transition-colors ${session.status === "active" ? "text-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
              >
                {session.status === "active" ? <Globe className="h-3.5 w-3.5" /> : <GlobeLock className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {session.status === "active" ? "Unpublish" : "Publish"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handlePreview}
                disabled={!bookingUrl}
                className={`p-1.5 transition-colors ${bookingUrl ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Preview</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={!bookingUrl}
                    onClick={(e) => e.stopPropagation()}
                    className={`p-1.5 transition-colors ${bookingUrl ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Share</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={handleCopyLink}>
                <Copy className="h-3.5 w-3.5" />
                {s.copyBookingLink}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={handlePreview}>
                <Link2 className="h-3.5 w-3.5" />
                Open link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={handleShareWhatsApp}>
                <MessageCircle className="h-3.5 w-3.5" />
                Share via WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={handleShareEmail}>
                <Mail className="h-3.5 w-3.5" />
                Share via Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Sessions;
