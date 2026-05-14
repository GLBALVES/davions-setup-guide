// Creates a Pagar.me withdrawal (transfer to default bank account)
// for the authenticated photographer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const amountCents = Number(body?.amount);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return new Response(JSON.stringify({ error: "invalid_amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: photographer } = await supabase
      .from("photographers")
      .select("pagarme_recipient_id")
      .eq("id", userData.user.id)
      .single();
    const recipientId = (photographer as any)?.pagarme_recipient_id;
    if (!recipientId) throw new Error("not_connected");

    const apiKey = Deno.env.get("PAGARME_API_KEY");
    if (!apiKey) throw new Error("Payment provider not configured");
    const auth = "Basic " + btoa(apiKey + ":");

    const res = await fetch(
      `https://api.pagar.me/core/v5/recipients/${recipientId}/withdrawals`,
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountCents }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("[pagarme-create-withdrawal]", data);
      return new Response(
        JSON.stringify({ error: data?.message || "withdrawal_failed", details: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, withdrawal: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    console.error("[pagarme-create-withdrawal]", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
