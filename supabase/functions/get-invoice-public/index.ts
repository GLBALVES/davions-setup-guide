import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: inv, error } = await supabase
      .from("project_invoices")
      .select("id, description, amount, paid_amount, status, photographer_id, items")
      .eq("id", invoice_id)
      .maybeSingle();

    if (error || !inv) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: photo } = await supabase
      .from("photographers")
      .select("business_name, full_name, logo_url")
      .eq("id", (inv as any).photographer_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        id: (inv as any).id,
        description: (inv as any).description,
        amount: Number((inv as any).amount),
        paid_amount: Number((inv as any).paid_amount ?? 0),
        status: (inv as any).status,
        items: (inv as any).items ?? [],
        studio_name:
          (photo as any)?.business_name ||
          (photo as any)?.full_name ||
          null,
        studio_logo: (photo as any)?.logo_url ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
