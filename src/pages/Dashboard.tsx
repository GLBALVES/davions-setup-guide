import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { GalleryCard } from "@/components/dashboard/GalleryCard";
import { CreateGalleryDialog } from "@/components/dashboard/CreateGalleryDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Image, FolderOpen, CheckCircle } from "lucide-react";
import logoPrincipal from "@/assets/logo_principal_preto.png";

interface Gallery {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  status: string;
  created_at: string;
  photo_count: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchGalleries = async () => {
    setLoading(true);
    const { data: galleriesData } = await supabase
      .from("galleries")
      .select("id, title, slug, category, status, created_at")
      .order("created_at", { ascending: false });

    if (galleriesData) {
      // Get photo counts per gallery
      const { data: photoCounts } = await supabase
        .from("photos")
        .select("gallery_id");

      const countMap: Record<string, number> = {};
      photoCounts?.forEach((p: { gallery_id: string }) => {
        countMap[p.gallery_id] = (countMap[p.gallery_id] || 0) + 1;
      });

      setGalleries(
        galleriesData.map((g) => ({
          ...g,
          category: (g as Record<string, unknown>).category as string ?? "proof",
          photo_count: countMap[g.id] || 0,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  const proofGalleries = galleries.filter((g) => g.category === "proof");
  const finalGalleries = galleries.filter((g) => g.category === "final");
  const totalPhotos = galleries.reduce((sum, g) => sum + g.photo_count, 0);

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

          {/* Content */}
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            {/* Stats */}
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  Overview
                </p>
                <h1 className="text-2xl font-light tracking-wide">Dashboard</h1>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={FolderOpen} label="Total Galleries" value={galleries.length} />
                <StatCard icon={Image} label="Total Photos" value={totalPhotos} />
                <StatCard icon={CheckCircle} label="Proof Galleries" value={proofGalleries.length} />
                <StatCard icon={FolderOpen} label="Final Galleries" value={finalGalleries.length} />
              </div>

              {/* Gallery Tabs */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                    <span className="inline-block w-6 h-px bg-border" />
                    Galleries
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="gap-2 text-xs tracking-wider uppercase font-light"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Gallery
                  </Button>
                </div>

                <Tabs defaultValue="all">
                  <TabsList className="bg-secondary/50 rounded-none border border-border">
                    <TabsTrigger value="all" className="rounded-none text-xs tracking-wider uppercase font-light">
                      All ({galleries.length})
                    </TabsTrigger>
                    <TabsTrigger value="proof" className="rounded-none text-xs tracking-wider uppercase font-light">
                      Proof ({proofGalleries.length})
                    </TabsTrigger>
                    <TabsTrigger value="final" className="rounded-none text-xs tracking-wider uppercase font-light">
                      Final ({finalGalleries.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <GalleryGrid galleries={galleries} loading={loading} />
                  </TabsContent>
                  <TabsContent value="proof" className="mt-4">
                    <GalleryGrid galleries={proofGalleries} loading={loading} />
                  </TabsContent>
                  <TabsContent value="final" className="mt-4">
                    <GalleryGrid galleries={finalGalleries} loading={loading} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </main>
        </div>
      </div>

      <CreateGalleryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchGalleries}
      />
    </SidebarProvider>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="border border-border p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-light">{label}</span>
      </div>
      <span className="text-2xl font-light">{value}</span>
    </div>
  );
}

function GalleryGrid({ galleries, loading }: { galleries: Gallery[]; loading: boolean }) {
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
        <GalleryCard key={gallery.id} gallery={gallery} />
      ))}
    </div>
  );
}

export default Dashboard;
