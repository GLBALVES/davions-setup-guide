import { supabase } from "@/integrations/supabase/client";

/* ── Campaigns ── */

export async function fetchCampaigns(photographerId: string) {
  const { data, error } = await supabase
    .from("mkt_email_campaigns")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCampaign(id: string) {
  const { data, error } = await supabase
    .from("mkt_email_campaigns")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertCampaign(campaign: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("mkt_email_campaigns")
    .upsert(campaign as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(id: string) {
  const { error } = await supabase.from("mkt_email_campaigns").delete().eq("id", id);
  if (error) throw error;
}

/* ── Campaign Sequence Emails ── */

export async function fetchCampaignEmails(campaignId: string) {
  const { data, error } = await supabase
    .from("mkt_email_campaign_emails")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("email_order");
  if (error) throw error;
  return data;
}

export async function upsertCampaignEmail(email: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("mkt_email_campaign_emails")
    .upsert(email as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaignEmail(id: string) {
  const { error } = await supabase.from("mkt_email_campaign_emails").delete().eq("id", id);
  if (error) throw error;
}

/* ── Automated (trigger-based) Emails ── */

export async function fetchAutomatedEmails(photographerId: string) {
  const { data, error } = await supabase
    .from("mkt_email_automated")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertAutomatedEmail(item: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("mkt_email_automated")
    .upsert(item as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAutomatedEmail(id: string) {
  const { error } = await supabase.from("mkt_email_automated").delete().eq("id", id);
  if (error) throw error;
}

/* ── One-off (scheduled) Emails ── */

export async function fetchOneoffEmails(photographerId: string) {
  const { data, error } = await supabase
    .from("mkt_email_oneoff")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertOneoffEmail(item: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("mkt_email_oneoff")
    .upsert(item as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOneoffEmail(id: string) {
  const { error } = await supabase.from("mkt_email_oneoff").delete().eq("id", id);
  if (error) throw error;
}
