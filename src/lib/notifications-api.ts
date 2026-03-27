import { supabase } from "@/integrations/supabase/client";

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
