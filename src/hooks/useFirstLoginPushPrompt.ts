import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPush } from "@/lib/notifications-api";

const STORAGE_KEY = "push-first-login-prompted-v2";

export function useFirstLoginPushPrompt() {
  const { photographerId } = useAuth();

  useEffect(() => {
    if (!photographerId) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(async () => {
      localStorage.setItem(STORAGE_KEY, "1");
      try {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          await subscribeToPush(photographerId);
        }
      } catch (e) {
        console.error("First-login push prompt failed:", e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [photographerId]);
}
