import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_SPLITS: Record<string, number> = {
  "prod_U8PSBb6bJj3mQV": 5,
  "prod_U8PXjCdBxWHHvT": 3,
  "prod_U8PYo2ocBqxIFO": 1,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoice_id, origin: originIn } = await req.json();
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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    const { data: invoice, error: invErr } = await supabase
      .from("project_invoices")
      .select("id, project_id, photographer_id, description, amount, paid_amount, status")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) throw new Error("Invoice not found");
    if ((invoice as any).status === "paid") throw new Error("Already paid");
    if ((invoice as any).status === "cancelled") throw new Error("Charge cancelled");

    const amountMajor = Number((invoice as any).amount) - Number((invoice as any).paid_amount ?? 0);
    if (amountMajor <= 0) throw new Error("No amount due");
    const amountCents = Math.round(amountMajor * 100);

    const { data: project } = await supabase
      .from("client_projects")
      .select("client_name, client_email")
      .eq("id", (invoice as any).project_id)
      .maybeSingle();

    const { data: photo } = await supabase
      .from("photographers")
      .select("stripe_account_id, email, business_name, full_name")
      .eq("id", (invoice as any).photographer_id)
      .single();

    const stripeAccountId = (photo as any)?.stripe_account_id;
    if (!stripeAccountId) throw new Error("Photographer not connected to Stripe");

    // Determine platform split based on subscription plan
    let splitPercent = 5;
    try {
      const platformCustomers = await stripe.customers.list({ email: (photo as any).email, limit: 1 });
      if (platformCustomers.data.length > 0) {
        const subs = await stripe.subscriptions.list({
          customer: platformCustomers.data[0].id, status: "active", limit: 1,
        });
        if (subs.data.length > 0) {
          const productId = subs.data[0].items.data[0].price.product as string;
          if (PLAN_SPLITS[productId] !== undefined) splitPercent = PLAN_SPLITS[productId];
        }
      }
    } catch (_) {}

    const applicationFeeAmount = Math.round(amountCents * (splitPercent / 100));
    const origin = originIn || "https://davions.com";
    const studioName = (photo as any).business_name || (photo as any).full_name || "Studio";

    const checkout = await stripe.checkout.sessions.create(
      {
        customer_email: (project as any)?.client_email || undefined,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "brl",
            product_data: {
              name: (invoice as any).description || "Cobrança",
              description: `${studioName}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        payment_intent_data: applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : undefined,
        metadata: {
          invoice_id: (invoice as any).id,
          project_id: (invoice as any).project_id,
          payment_kind: "project_invoice",
        },
        success_url: `${origin}/pay/invoice/${(invoice as any).id}?status=paid`,
        cancel_url: `${origin}/pay/invoice/${(invoice as any).id}?status=cancelled`,
      },
      { stripeAccount: stripeAccountId },
    );

    return new Response(JSON.stringify({ url: checkout.url, amount: amountCents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-invoice-payment-link error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
