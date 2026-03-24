import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Brevo sends webhook events as an array of objects.
// We only care about hard bounces (event: "hard_bounce") for SSL alert emails.
// Ref: https://developers.brevo.com/docs/transactional-email-webhooks

interface BrevoEvent {
  event: string;
  email?: string;
  "message-id"?: string;
  date?: string;
  reason?: string;
  tag?: string;
  tags?: string[];
  subject?: string;
  [key: string]: unknown;
}

// Try to extract the photographer custom domain from the recipient email or tags.
// SSL alert emails are sent to team@davions.com and contain domain info in the subject/tags.
function extractDomain(evt: BrevoEvent): string | null {
  // Check tags first (Brevo allows tagging transactional emails)
  const tags: string[] = Array.isArray(evt.tags)
    ? evt.tags
    : typeof evt.tag === "string"
    ? [evt.tag]
    : [];

  const domainTag = tags.find((t) => t.startsWith("domain:"));
  if (domainTag) return domainTag.replace("domain:", "").trim();

  // Fall back to parsing the subject (e.g. "⚠️ Novo alerta SSL: 2 domínio(s) — Davions")
  // We cannot reliably extract a single domain from the subject when multiple are affected,
  // so we just return null and let the UI show email-level context.
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();

    // Brevo sends either a single object or an array
    const events: BrevoEvent[] = Array.isArray(body) ? body : [body];

    // Filter only hard bounce events
    const hardBounces = events.filter(
      (e) => e.event === "hard_bounce" || e.event === "bounce"
    );

    if (hardBounces.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, message: "No hard bounces in payload" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = hardBounces.map((evt) => ({
      email: evt.email ?? "unknown",
      event: evt.event,
      domain: extractDomain(evt),
      message_id: evt["message-id"] ?? null,
      reason: evt.reason ?? null,
      brevo_event_at: evt.date ? new Date(evt.date).toISOString() : null,
      raw_payload: evt,
    }));

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/ssl_email_bounces`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("DB insert error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to persist bounce events", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Stored ${rows.length} hard bounce(s):`, rows.map((r) => r.email));

    return new Response(
      JSON.stringify({ ok: true, processed: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("brevo-webhook error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
