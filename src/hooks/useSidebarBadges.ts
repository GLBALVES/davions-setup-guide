import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SidebarBadges {
  pendingBookings: number;
  draftSessions: number;
}

export function useSidebarBadges(): SidebarBadges {
  const { user } = useAuth();
  const [badges, setBadges] = useState<SidebarBadges>({ pendingBookings: 0, draftSessions: 0 });

  useEffect(() => {
    if (!user) return;

    async function fetchCounts() {
      const [bookingsRes, sessionsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", user!.id)
          .eq("status", "pending"),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", user!.id)
          .eq("status", "draft"),
      ]);

      setBadges({
        pendingBookings: bookingsRes.count ?? 0,
        draftSessions: sessionsRes.count ?? 0,
      });
    }

    fetchCounts();

    // Realtime subscription for bookings changes
    const channel = supabase
      .channel("sidebar-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `photographer_id=eq.${user.id}` },
        () => fetchCounts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `photographer_id=eq.${user.id}` },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return badges;
}
