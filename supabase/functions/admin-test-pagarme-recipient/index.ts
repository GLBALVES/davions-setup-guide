import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const recipientId = (body?.recipientId || "").trim();
    if (!recipientId) {
      return new Response(JSON.stringify({ error: "recipientId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("PAGARME_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "PAGARME_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = "Basic " + btoa(apiKey + ":");

    const recRes = await fetch(`https://api.pagar.me/core/v5/recipients/${recipientId}`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });
    const recipient = await recRes.json();

    let balance: any = null;
    if (recRes.ok) {
      const balRes = await fetch(
        `https://api.pagar.me/core/v5/recipients/${recipientId}/balance`,
        { headers: { Authorization: auth, "Content-Type": "application/json" } }
      );
      if (balRes.ok) balance = await balRes.json();
    }

    return new Response(
      JSON.stringify({
        ok: recRes.ok,
        status: recipient?.status ?? null,
        name: recipient?.name ?? null,
        document: recipient?.document ?? null,
        balance,
        raw: recRes.ok ? null : recipient,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
