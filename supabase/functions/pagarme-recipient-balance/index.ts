// Returns Pagar.me recipient balance, recent balance operations and withdrawals
// for the authenticated photographer. Whitelabel — UI never mentions Pagar.me.
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

    const { data: photographer } = await supabase
      .from("photographers")
      .select("pagarme_recipient_id, pagarme_kyc_status")
      .eq("id", userData.user.id)
      .single();

    const recipientId = (photographer as any)?.pagarme_recipient_id;
    if (!recipientId) {
      return new Response(
        JSON.stringify({ error: "not_connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const apiKey = Deno.env.get("PAGARME_API_KEY");
    if (!apiKey) throw new Error("Payment provider not configured");
    const auth = "Basic " + btoa(apiKey + ":");

    const base = `https://api.pagar.me/core/v5/recipients/${recipientId}`;
    const headers = { Authorization: auth, "Content-Type": "application/json" };

    const [balanceRes, opsRes, withdrawalsRes, recipientRes] = await Promise.all([
      fetch(`${base}/balance`, { headers }),
      fetch(`${base}/balance/operations?size=30`, { headers }),
      fetch(`${base}/withdrawals?size=20`, { headers }),
      fetch(`${base}`, { headers }),
    ]);

    const balance = await balanceRes.json();
    const operations = await opsRes.json();
    const withdrawals = await withdrawalsRes.json();
    const recipient = await recipientRes.json();

    return new Response(
      JSON.stringify({
        balance,
        operations: operations?.data ?? [],
        withdrawals: withdrawals?.data ?? [],
        bank_account: recipient?.default_bank_account ?? null,
        kyc_status: recipient?.status ?? (photographer as any)?.pagarme_kyc_status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("[pagarme-recipient-balance]", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
