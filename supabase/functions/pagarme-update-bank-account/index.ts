// Updates the default bank account of the authenticated photographer's
// payment recipient. Whitelabel — UI never mentions Pagar.me.
//
// PATCH https://api.pagar.me/core/v5/recipients/{recipient_id}/default-bank-account
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type BankPayload = {
  holder_name: string;
  holder_type?: "individual" | "company";
  holder_document: string;
  bank: string;            // 3-digit bank code
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  type: "checking" | "savings";
};

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const apiKey = Deno.env.get("PAGARME_API_KEY");
    if (!apiKey) throw new Error("Payment provider not configured");

    const body = (await req.json()) as BankPayload;
    if (!body || !body.holder_name || !body.bank || !body.account_number) {
      throw new Error("Invalid bank account payload");
    }

    const { data: photo, error: photoErr } = await supabase
      .from("photographers")
      .select("pagarme_recipient_id")
      .eq("id", userId)
      .maybeSingle();
    if (photoErr) throw photoErr;
    const recipientId = (photo as any)?.pagarme_recipient_id as string | null;
    if (!recipientId) throw new Error("not_connected");

    const payload = {
      holder_name: body.holder_name,
      holder_type: body.holder_type ?? "individual",
      holder_document: onlyDigits(body.holder_document),
      bank: onlyDigits(body.bank).padStart(3, "0"),
      branch_number: onlyDigits(body.branch_number),
      branch_check_digit: body.branch_check_digit
        ? onlyDigits(body.branch_check_digit)
        : undefined,
      account_number: onlyDigits(body.account_number),
      account_check_digit: body.account_check_digit,
      type: body.type,
    };

    const auth = "Basic " + btoa(apiKey + ":");
    const res = await fetch(
      `https://api.pagar.me/core/v5/recipients/${recipientId}/default-bank-account`,
      {
        method: "PATCH",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();

    if (!res.ok) {
      console.error("[pagarme-update-bank-account] error", data);
      return new Response(
        JSON.stringify({
          error: data?.message || "Failed to update bank account",
          details: data,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, recipient: { id: data?.id, status: data?.status } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[pagarme-update-bank-account]", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
