import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, client_token, contract_html, client_tax_id, signature_data } =
      await req.json();

    if (
      !booking_id ||
      !uuidRegex.test(booking_id) ||
      typeof contract_html !== "string" ||
      contract_html.length > 200_000 ||
      typeof client_token !== "string" ||
      client_token.length < 16 ||
      client_token.length > 256
    ) {
      return jsonResp({ error: "Invalid payload" }, 400);
    }

    if (
      typeof client_tax_id !== "undefined" &&
      client_tax_id !== null &&
      (typeof client_tax_id !== "string" || client_tax_id.length > 64)
    ) {
      return jsonResp({ error: "Invalid tax id" }, 400);
    }

    if (
      typeof signature_data !== "undefined" &&
      signature_data !== null &&
      (typeof signature_data !== "string" ||
        !signature_data.startsWith("data:image") ||
        signature_data.length > 1_500_000)
    ) {
      return jsonResp({ error: "Invalid signature" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Token-based ownership check (client_token was issued when booking was created)
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, contract_locked, client_token")
      .eq("id", booking_id)
      .maybeSingle();

    if (!existing) {
      return jsonResp({ error: "Booking not found" }, 404);
    }

    const storedToken = (existing as { client_token?: string | null }).client_token ?? "";
    // Constant-time compare to mitigate timing attacks
    if (
      !storedToken ||
      storedToken.length !== client_token.length ||
      !timingSafeEqual(storedToken, client_token)
    ) {
      return jsonResp({ error: "Forbidden" }, 403);
    }

    if ((existing as { contract_locked?: boolean }).contract_locked === true) {
      return jsonResp({ ok: true, locked: true }, 200);
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

    const { error } = await supabase.from("bookings").update(updates).eq("id", booking_id);

    if (error) {
      console.error("register-contract-acceptance update error:", error);
      return jsonResp({ error: "Failed to save contract" }, 500);
    }

    return jsonResp({ ok: true }, 200);
  } catch (err) {
    console.error("register-contract-acceptance error:", err);
    return jsonResp(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
