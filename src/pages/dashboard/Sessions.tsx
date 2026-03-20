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
import { Plus, Camera, Clock, MapPin, Image as ImageIcon, Calendar, Eye, Share2, Search, ArrowUpDown, ArrowDownAZ, ArrowUpAZ, DollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SessionsSkeleton } from "@/components/dashboard/skeletons/SessionsSkeleton";

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
  const [sort, setSort] = useState<"newest" | "oldest" | "az" | "za" | "price_asc" | "price_desc">("newest");

  const fetchSessions = async () => {
    if (!photographerId) return;
    setLoading(true);
    const [{ data: sessionsData }, { data: photoData }] = await Promise.all([
      supabase.from("sessions").select("*").eq("photographer_id", photographerId).order("created_at", { ascending: false }),
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
    list = [...list].sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "za") return b.title.localeCompare(a.title);
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0;
    });
    return list;
  }, [sessions, filter, search, sort]);

  const SORT_OPTIONS: { key: typeof sort; label: string; icon: React.ReactNode }[] = [
    { key: "newest", label: s.newest, icon: <ArrowUpDown className="h-3 w-3" /> },
    { key: "oldest", label: s.oldest, icon: <ArrowUpDown className="h-3 w-3" /> },
    { key: "az", label: "A–Z", icon: <ArrowDownAZ className="h-3 w-3" /> },
    { key: "za", label: "Z–A", icon: <ArrowUpAZ className="h-3 w-3" /> },
    { key: "price_asc", label: s.priceUp, icon: <DollarSign className="h-3 w-3" /> },
    { key: "price_desc", label: s.priceDown, icon: <DollarSign className="h-3 w-3" /> },
  ];

  const FILTERS: { key: "all" | "active" | "draft"; label: string }[] = [
    { key: "all", label: s.all },
    { key: "active", label: s.published },
    { key: "draft", label: s.unpublished },
  ];

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

                {/* Search + Sort */}
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
                </div>
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      storeSlug={storeSlug}
                      onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

function SessionCard({
  session,
  storeSlug,
  onClick,
}: {
  session: Session;
  storeSlug: string | null;
  onClick: () => void;
}) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const s = t.sessions;

  const priceFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(session.price / 100);

  const bookingUrl = storeSlug
    ? `${window.location.origin}/store/${storeSlug}/${session.slug ?? session.id}`
    : null;

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookingUrl) window.open(bookingUrl, "_blank");
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast({ title: s.linkCopied, description: s.bookingUrlCopied });
    } catch {
      toast({ title: s.failedToCopy, variant: "destructive" });
    }
  };

  return (
    <TooltipProvider>
      <button
        onClick={onClick}
        className="group text-left border border-border hover:border-foreground/20 transition-colors bg-card overflow-hidden flex flex-col"
      >
        <div className="aspect-video bg-muted relative overflow-hidden">
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
          <div className="absolute top-2 right-2">
            <Badge
              variant={session.status === "active" ? "default" : "secondary"}
              className="text-[9px] tracking-wider uppercase font-light"
            >
              {session.status === "active" ? s.published : s.unpublished}
            </Badge>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-light tracking-wide truncate">{session.title || "Untitled"}</h3>
            {session.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{session.description}</p>
            )}
          </div>

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
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-base font-light">{priceFormatted}</span>
            <div className="flex items-center gap-2">
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleShare}
                    disabled={!bookingUrl}
                    className={`transition-colors ${bookingUrl ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {bookingUrl ? s.copyBookingLink : s.configureStore}
                </TooltipContent>
              </Tooltip>

              <span className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1 ml-1">
                <Calendar className="h-3 w-3" />
                {s.manage}
              </span>
            </div>
          </div>
        </div>
      </button>
    </TooltipProvider>
  );
}

export default Sessions;
