import { supabase } from "@/integrations/supabase/client";

let vapidPublicKeyCache: string | null = null;

export type NotificationRow = {
  id: string;
  photographer_id: string;
  type: string;
  title: string;
  body: string;
  event: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

export async function fetchNotifications(photographerId: string, limit = 30) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationRow[];
}

export async function fetchUnreadCount(photographerId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("photographer_id", photographerId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function markAllAsRead(photographerId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true } as any)
    .eq("photographer_id", photographerId)
    .eq("read", false);
  if (error) throw error;
}

export type NotificationPreference = {
  id: string;
  photographer_id: string;
  event: string;
  in_app: boolean;
  email: boolean;
  browser_push: boolean;
};

export const NOTIFICATION_EVENTS = [
  "new_booking",
  "payment_received",
  "payment_failed",
  "new_chat_message",
  "new_bug_report",
] as const;

export async function fetchNotificationPreferences(photographerId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("photographer_id", photographerId);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationPreference[];
}

export async function upsertNotificationPreference(pref: Partial<NotificationPreference> & { photographer_id: string; event: string }) {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(pref as any, { onConflict: "photographer_id,event" });
  if (error) throw error;
}

// --- Web Push subscription ---

async function getVapidPublicKey(): Promise<string> {
  if (vapidPublicKeyCache) return vapidPublicKeyCache;

  const { data, error } = await supabase.functions.invoke("get-push-public-key");
  if (error) throw error;

  const publicKey = (data as { publicKey?: string } | null)?.publicKey;
  if (!publicKey) throw new Error("Missing VAPID public key");

  vapidPublicKeyCache = publicKey;
  return publicKey;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function subscribeToPush(photographerId: string): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const vapidPublicKey = await getVapidPublicKey();

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // Always unsubscribe and re-subscribe to ensure VAPID key consistency
    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (_) { /* ignore */ }
      subscription = null;
    }

    const appServerKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey.buffer as ArrayBuffer,
    });

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");
    if (!key || !auth) return false;

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        photographer_id: photographerId,
        endpoint: subscription.endpoint,
        p256dh: uint8ArrayToBase64url(new Uint8Array(key)),
        auth: uint8ArrayToBase64url(new Uint8Array(auth)),
      } as any,
      { onConflict: "photographer_id,endpoint" }
    );

    if (error) {
      console.error("Failed to save push subscription:", error);
      return false;
    }
    console.log("[push] Subscription saved successfully");
    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}
