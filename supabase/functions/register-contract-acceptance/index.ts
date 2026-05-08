import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, contract_html, client_tax_id, signature_data } = await req.json();

    if (!booking_id || !uuidRegex.test(booking_id) || typeof contract_html !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Skip if already locked (post-payment)
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, contract_locked")
      .eq("id", booking_id)
      .maybeSingle();

    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((existing as any).contract_locked === true) {
      return new Response(
        JSON.stringify({ ok: true, locked: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const xff = req.headers.get("x-forwarded-for") ?? "";
    const ip = xff.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;
    const ua = req.headers.get("user-agent") || null;

    const updates: Record<string, unknown> = {
      contract_html_snapshot: contract_html,
      contract_signed_ip: ip,
      contract_signed_user_agent: ua,
    };
    if (typeof client_tax_id === "string") {
      updates.client_tax_id = client_tax_id.trim() || null;
    }
    if (typeof signature_data === "string" && signature_data.startsWith("data:image")) {
      updates.contract_signature_data = signature_data;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", booking_id);

    if (error) {
      console.error("register-contract-acceptance update error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save contract" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("register-contract-acceptance error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
