// Shared helper for edge functions to log webhook events to public.webhook_events.
// Use service-role client.
//
// Usage:
//   import { logWebhookEvent } from "../_shared/webhook-log.ts";
//   await logWebhookEvent(supabase, {
//     provider: "stripe",
//     event_type: event.type,
//     external_id: event.id,
//     status: "success",
//     payload: event,
//     duration_ms: Date.now() - start,
//   });

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type WebhookLogEntry = {
  provider: "stripe" | "pagarme" | "brevo" | string;
  event_type?: string | null;
  external_id?: string | null;
  status: "success" | "error";
  error_message?: string | null;
  payload?: unknown;
  duration_ms?: number | null;
};

export async function logWebhookEvent(
  supabase: SupabaseClient,
  entry: WebhookLogEntry
): Promise<void> {
  try {
    await supabase.from("webhook_events").insert({
      provider: entry.provider,
      event_type: entry.event_type ?? null,
      external_id: entry.external_id ?? null,
      status: entry.status,
      error_message: entry.error_message ?? null,
      payload: entry.payload ?? null,
      duration_ms: entry.duration_ms ?? null,
    });
  } catch (err) {
    // Never fail the webhook just because logging failed.
    console.error("[webhook-log] failed to insert log:", err);
  }
}
