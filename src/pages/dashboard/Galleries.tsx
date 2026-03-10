import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GalleryCard } from "@/components/dashboard/GalleryCard";
import { CreateGalleryDialog } from "@/components/dashboard/CreateGalleryDialog";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import logoPrincipal from "@/assets/logo_principal_preto.png";

interface Gallery {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  status: string;
  created_at: string;
  photo_count: number;
  cover_image_url?: string | null;
  expires_at?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  session_title?: string | null;
}

const Galleries = () => {
  const { user, signOut } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editGallery, setEditGallery] = useState<Gallery | null>(null);
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") as "proof" | "final" | null;

  const fetchGalleries = async () => {
    setLoading(true);
    const { data: galleriesData } = await supabase
      .from("galleries")
      .select(`
        id, title, slug, category, status, created_at, cover_image_url, expires_at,
        bookings ( client_name, client_email, sessions ( title ) )
      `)
      .order("created_at", { ascending: false });

    if (galleriesData) {
      const { data: photoCounts } = await supabase
        .from("photos")
        .select("gallery_id");

      const countMap: Record<string, number> = {};
      photoCounts?.forEach((p: { gallery_id: string }) => {
        countMap[p.gallery_id] = (countMap[p.gallery_id] || 0) + 1;
      });

      setGalleries(
        (galleriesData as any[]).map((g) => ({
          ...g,
          category: g.category ?? "proof",
          photo_count: countMap[g.id] || 0,
          cover_image_url: g.cover_image_url ?? null,
          expires_at: g.expires_at ?? null,
          client_name: g.bookings?.client_name ?? null,
          client_email: g.bookings?.client_email ?? null,
          session_title: (g.bookings as any)?.sessions?.title ?? null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  const filtered = type ? galleries.filter((g) => g.category === type) : galleries;
  const heading = type === "proof" ? "Proof Galleries" : type === "final" ? "Final Galleries" : "Galleries";
  const defaultCategory = type ?? "proof";

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
                  New Gallery
                </Button>
              </div>

              <GalleryGrid galleries={filtered} loading={loading} onEdit={setEditGallery} />
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

function GalleryGrid({ galleries, loading, onEdit }: { galleries: Gallery[]; loading: boolean; onEdit: (g: Gallery) => void }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">Loading…</span>
      </div>
    );
  }

  if (galleries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-light text-muted-foreground">No galleries yet</p>
        <p className="text-[10px] text-muted-foreground/60">Create a gallery or upload from Lightroom</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {galleries.map((gallery) => (
        <GalleryCard key={gallery.id} gallery={gallery} onEdit={() => onEdit(gallery)} />
      ))}
    </div>
  );
}

export default Galleries;
