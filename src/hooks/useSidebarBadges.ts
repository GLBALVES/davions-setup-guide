import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SidebarBadges {
  pendingBookings: number;
  draftSessions: number;
}

export function useSidebarBadges(): SidebarBadges {
  const { user, photographerId } = useAuth();
  const [badges, setBadges] = useState<SidebarBadges>({ pendingBookings: 0, draftSessions: 0 });

  useEffect(() => {
    if (!user || !photographerId) return;

    async function fetchCounts() {
      const [bookingsRes, sessionsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", photographerId!)
          .eq("status", "pending"),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", photographerId!)
          .eq("status", "draft"),
      ]);

      setBadges({
        pendingBookings: bookingsRes.count ?? 0,
        draftSessions: sessionsRes.count ?? 0,
      });
    }

    fetchCounts();

    const channel = supabase
      .channel("sidebar-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `photographer_id=eq.${photographerId}` },
        () => fetchCounts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `photographer_id=eq.${photographerId}` },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, photographerId]);

  return badges;
}
