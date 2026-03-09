import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Camera, Clock, MapPin, Image as ImageIcon, Calendar, Eye, Share2 } from "lucide-react";
import logoPrincipal from "@/assets/logo_principal_preto.png";

interface Session {
  id: string;
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "draft">("all");

  const fetchSessions = async () => {
    setLoading(true);
    const [{ data: sessionsData }, { data: photoData }] = await Promise.all([
      supabase.from("sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("photographers").select("store_slug").eq("id", user!.id).single(),
    ]);
    setSessions(sessionsData ?? []);
    setStoreSlug(photoData?.store_slug ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (filter === "active") return s.status === "active";
    if (filter === "draft") return s.status !== "active";
    return true;
  });

  const FILTERS: { key: "all" | "active" | "draft"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Published" },
    { key: "draft", label: "Unpublished" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <img src={logoPrincipal} alt="Davions" className="h-5 w-auto" />
            </div>
          </header>

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                    <span className="inline-block w-6 h-px bg-border" />
                    Products
                  </p>
                  <h1 className="text-2xl font-light tracking-wide">Sessions</h1>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate("/dashboard/sessions/new")}
                  className="gap-2 text-xs tracking-wider uppercase font-light"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Session
                </Button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1 border-b border-border pb-1">
                {FILTERS.map(({ key, label }) => {
                  const count = key === "all" ? sessions.length : sessions.filter(s => key === "active" ? s.status === "active" : s.status !== "active").length;
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

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
                    Loading…
                  </span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-dashed border-border">
                  <Camera className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-light text-muted-foreground">
                      {sessions.length === 0 ? "No sessions yet" : "No sessions match this filter"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {sessions.length === 0 ? "Create your first bookable session product" : "Try a different filter"}
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
                      New Session
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
  onClick,
}: {
  session: Session;
  onClick: () => void;
}) {
  const priceFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(session.price / 100);

  return (
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
            {session.status === "active" ? "Published" : "Unpublished"}
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
            {session.num_photos} photos
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
          <span className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Manage
          </span>
        </div>
      </div>
    </button>
  );
}

export default Sessions;
