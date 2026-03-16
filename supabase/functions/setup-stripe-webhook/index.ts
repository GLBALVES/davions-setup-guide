import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseProjectId = "pjcegphrngpedujeatrl";
    const webhookUrl = `https://${supabaseProjectId}.supabase.co/functions/v1/session-booking-webhook`;

    // Check if webhook already exists
    const listRes = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", {
      headers: {
        Authorization: `Bearer ${stripeKey}`,
      },
    });

    const listData = await listRes.json();
    const existing = listData.data?.find((w: { url: string }) => w.url === webhookUrl);

    if (existing) {
      return new Response(
        JSON.stringify({
          message: "Webhook already exists",
          webhook_id: existing.id,
          url: existing.url,
          status: existing.status,
          // Note: secret is only returned on creation, not retrieval
          note: "Webhook already registered. If you need to reset the signing secret, delete the existing webhook first.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new webhook endpoint
    const body = new URLSearchParams({
      url: webhookUrl,
      "enabled_events[]": "checkout.session.completed",
      description: "Davions booking confirmation webhook",
    });

    const createRes = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const webhookData = await createRes.json();

    if (!createRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to create webhook", details: webhookData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        webhook_id: webhookData.id,
        url: webhookData.url,
        signing_secret: webhookData.secret,
        message: "Webhook created successfully! Save the signing_secret as STRIPE_WEBHOOK_SECRET.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
