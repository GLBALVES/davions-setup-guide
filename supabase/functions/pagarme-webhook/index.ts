// Pagar.me v5 webhook receiver.
// Authenticated via Basic Auth (configured in Pagar.me dashboard).
// Logs every event to public.webhook_events with success/error status + duration.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { logWebhookEvent } from "../_shared/webhook-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Optional Basic Auth validation
  const expectedAuth = Deno.env.get("PAGARME_WEBHOOK_AUTH");
  if (expectedAuth) {
    const provided = req.headers.get("authorization") ?? "";
    if (provided !== `Basic ${expectedAuth}` && provided !== expectedAuth) {
      await logWebhookEvent(supabase, {
        provider: "pagarme",
        status: "error",
        error_message: "Unauthorized: invalid Basic Auth",
        duration_ms: Date.now() - startedAt,
      });
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });
    }
  }

  const body = await req.text();
  let event: any;
  try {
    event = JSON.parse(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logWebhookEvent(supabase, {
      provider: "pagarme",
      status: "error",
      error_message: `Invalid JSON: ${message}`,
      duration_ms: Date.now() - startedAt,
    });
    return new Response(`Bad Request: ${message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const eventType: string = event?.type ?? event?.event ?? "unknown";
    const externalId: string =
      event?.id ?? event?.data?.id ?? event?.data?.charge?.id ?? null;

    // Handle key Pagar.me v5 events
    const data = event?.data ?? {};
    const metadata = data?.metadata ?? data?.charges?.[0]?.metadata ?? {};
    const bookingId: string | undefined = metadata?.booking_id;

    if (bookingId) {
      if (eventType === "charge.paid" || eventType === "order.paid") {
        const amountPaid =
          data?.amount ?? data?.paid_amount ?? data?.charges?.[0]?.amount ?? 0;
        const wasDeposit = metadata?.is_deposit === "true";
        const paymentKind = metadata?.payment_kind;

        if (paymentKind === "balance_due") {
          const { data: prior } = await supabase
            .from("bookings")
            .select("deposit_paid_amount")
            .eq("id", bookingId)
            .maybeSingle();
          const newTotalPaid =
            (prior?.deposit_paid_amount ?? 0) + amountPaid;
          await supabase
            .from("bookings")
            .update({
              payment_status: "paid",
              total_paid_amount: newTotalPaid,
            })
            .eq("id", bookingId);
        } else {
          await supabase
            .from("bookings")
            .update({
              status: "confirmed",
              payment_status: wasDeposit ? "deposit_paid" : "paid",
              deposit_paid_amount: wasDeposit ? amountPaid : null,
              total_paid_amount: wasDeposit ? null : amountPaid,
            })
            .eq("id", bookingId);
        }
      } else if (
        eventType === "charge.payment_failed" ||
        eventType === "order.payment_failed"
      ) {
        await supabase
          .from("bookings")
          .update({ status: "failed", payment_status: "failed" })
          .eq("id", bookingId);
      }
    }

    await logWebhookEvent(supabase, {
      provider: "pagarme",
      event_type: eventType,
      external_id: externalId,
      status: "success",
      payload: event,
      duration_ms: Date.now() - startedAt,
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logWebhookEvent(supabase, {
      provider: "pagarme",
      event_type: event?.type ?? event?.event,
      external_id: event?.id ?? event?.data?.id,
      status: "error",
      error_message: message,
      payload: event,
      duration_ms: Date.now() - startedAt,
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
