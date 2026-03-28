import { useEffect, useRef } from "react";
import { subscribeToPush } from "@/lib/notifications-api";

const STORAGE_KEY = "push-first-booking-prompted";

/**
 * Prompts the photographer for push permissions the first time they
 * receive a booking. Call with the current bookings count (>0 triggers).
 */
export function useFirstBookingPushPrompt(
  photographerId: string | null,
  bookingsCount: number,
  loading: boolean
) {
  const prompted = useRef(false);

  useEffect(() => {
    if (loading || prompted.current) return;
    if (!photographerId) return;
    if (bookingsCount === 0) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    prompted.current = true;

    const timer = setTimeout(async () => {
      localStorage.setItem(STORAGE_KEY, "1");
      try {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          await subscribeToPush(photographerId);
        }
      } catch (e) {
        console.error("First-booking push prompt failed:", e);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [photographerId, bookingsCount, loading]);
}
