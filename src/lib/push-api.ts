import { supabase } from "@/integrations/supabase/client";

export async function fetchPushNotifications(photographerId: string) {
  const { data, error } = await supabase
    .from("mkt_push_notifications")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertPushNotification(item: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("mkt_push_notifications")
    .upsert(item as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePushNotification(id: string) {
  const { error } = await supabase.from("mkt_push_notifications").delete().eq("id", id);
  if (error) throw error;
}
