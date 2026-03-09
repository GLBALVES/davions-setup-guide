import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Clock, MapPin, Image as ImageIcon } from "lucide-react";

interface Photographer {
  id: string;
  full_name: string | null;
  email: string;
  store_slug: string | null;
  bio: string | null;
  hero_image_url: string | null;
}

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
}

const StorePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: photoData } = await supabase
        .from("photographers")
        .select("id, full_name, email, store_slug, bio, hero_image_url")
        .eq("store_slug", slug!)
        .single();

      if (!photoData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPhotographer(photoData as Photographer);

      const { data: sessionData } = await supabase
        .from("sessions")
        .select("id, slug, title, description, price, duration_minutes, num_photos, location, cover_image_url")
        .eq("photographer_id", photoData.id)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      setSessions(sessionData ?? []);
      setLoading(false);
    };

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-light text-muted-foreground">Store not found.</p>
      </div>
    );
  }

  const displayName = photographer?.full_name || photographer?.email || "";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative w-full h-[55vh] min-h-[340px] overflow-hidden">
        {photographer?.hero_image_url ? (
          <img
            src={photographer.hero_image_url}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-foreground" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />

        {/* Hero text */}
        <div className="relative z-10 h-full flex flex-col items-center justify-end pb-12 px-6 text-center">
          <p className="text-[9px] tracking-[0.5em] uppercase text-white/60 mb-3">
            Photography by
          </p>
          <h1 className="text-4xl md:text-5xl font-light tracking-[0.15em] uppercase text-white mb-4">
            {displayName}
          </h1>
          {photographer?.bio && (
            <p className="text-sm font-light text-white/70 max-w-md leading-relaxed">
              {photographer.bio}
            </p>
          )}
          <div className="mt-6 w-8 h-px bg-white/30" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mt-3">
            Book a session
          </p>
        </div>
      </div>

      {/* ── Sessions ── */}
      <main className="max-w-5xl mx-auto px-6 py-14">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Camera className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-light text-muted-foreground">
              No sessions available yet.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground text-center mb-10">
              Available sessions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => {
                const priceFormatted = new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(session.price / 100);

                return (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/store/${slug}/${session.slug ?? session.id}`)}
                    className="group text-left border border-border hover:border-foreground/30 transition-all duration-300 overflow-hidden flex flex-col bg-card"
                  >
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {session.cover_image_url ? (
                        <img
                          src={session.cover_image_url}
                          alt={session.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <h2 className="text-sm font-light tracking-wide">{session.title}</h2>
                      {session.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {session.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mt-auto pt-2">
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

                      <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                        <span className="text-lg font-light">{priceFormatted}</span>
                        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                          Book →
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/50">
          Powered by Davions
        </p>
      </footer>
    </div>
  );
};

export default StorePage;
