import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  buildSplitRules,
  getPaymentSettings,
  resolveFeePercent,
} from "../_shared/pagarme-split.ts";

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

const PAGARME_BASE = "https://api.pagar.me/core/v5";

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
      .select("stripe_account_id, pagarme_recipient_id, business_country, email, business_name, full_name")
      .eq("id", (invoice as any).photographer_id)
      .single();

    const origin = originIn || "https://davions.com";
    const studioName = (photo as any).business_name || (photo as any).full_name || "Studio";
    const country = String((photo as any)?.business_country ?? "").toUpperCase();
    const isBR = country === "BR" || country === "BRA" || country === "BRAZIL" || country === "BRASIL";
    const pagarmeRecipientId = (photo as any)?.pagarme_recipient_id as string | null;

    const successUrl = `${origin}/pay/invoice/${(invoice as any).id}?status=paid`;
    const cancelUrl = `${origin}/pay/invoice/${(invoice as any).id}?status=cancelled`;

    // ── BRAZIL: Pagar.me ──
    if (isBR || pagarmeRecipientId) {
      if (!pagarmeRecipientId) {
        throw new Error("Fotógrafo não concluiu o cadastro no Pagar.me");
      }
      const apiKey = Deno.env.get("PAGARME_API_KEY");
      if (!apiKey) throw new Error("PAGARME_API_KEY not configured");

      const settings = await getPaymentSettings(supabase);
      const feePercent = await resolveFeePercent(
        supabase,
        (invoice as any).photographer_id,
        settings.default_fee_percent,
      );
      const split_rules = buildSplitRules({
        photographerRecipientId: pagarmeRecipientId,
        masterRecipientId: settings.pagarme_master_recipient_id ?? "",
        feePercent,
      });

      const clientEmail = (project as any)?.client_email || "cliente@exemplo.com";
      const clientName = (project as any)?.client_name || clientEmail;

      const orderPayload = {
        items: [{
          amount: amountCents,
          description: ((invoice as any).description || "Cobrança").slice(0, 256),
          quantity: 1,
          code: (invoice as any).id,
        }],
        customer: {
          name: clientName,
          email: clientEmail,
          type: "individual",
        },
        closed: false,
        payments: [{
          payment_method: "checkout",
          checkout: {
            expires_in: 120,
            default_payment_method: "credit_card",
            accepted_payment_methods: ["credit_card", "pix", "boleto"],
            success_url: successUrl,
            customer_editable: true,
            credit_card: {
              installments: [{ number: 1, total: amountCents }],
              statement_descriptor: "DAVIONS",
            },
            pix: { expires_in: 3600 },
            boleto: {
              instructions: "Pagar até a data de vencimento.",
              due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
          split: split_rules,
        }],
        metadata: {
          invoice_id: (invoice as any).id,
          project_id: (invoice as any).project_id,
          payment_kind: "project_invoice",
        },
      };

      const auth = btoa(`${apiKey}:`);
      const resp = await fetch(`${PAGARME_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify(orderPayload),
      });
      const order = await resp.json();
      if (!resp.ok) {
        console.error("Pagar.me order error:", order);
        throw new Error(order?.message ?? "Failed to create Pagar.me order");
      }
      const checkoutUrl =
        order?.checkouts?.[0]?.payment_url ??
        order?.charges?.[0]?.last_transaction?.url ??
        null;
      if (!checkoutUrl) throw new Error("Pagar.me did not return a checkout URL");

      await supabase
        .from("project_invoices")
        .update({ pagarme_order_id: order.id })
        .eq("id", (invoice as any).id);

      return new Response(JSON.stringify({ url: checkoutUrl, provider: "pagarme" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INTERNATIONAL: Stripe Connect ──
    const stripeAccountId = (photo as any)?.stripe_account_id;
    if (!stripeAccountId) throw new Error("Photographer not connected to a payment provider");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

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

    try {
      const acct = await stripe.accounts.retrieve(stripeAccountId);
      if (!(acct as any)?.business_profile?.name && !(acct as any)?.settings?.dashboard?.display_name) {
        await stripe.accounts.update(stripeAccountId, {
          business_profile: { name: studioName },
        });
      }
    } catch (acctErr) {
      console.warn("Could not ensure account business name:", acctErr);
    }

    const checkout = await stripe.checkout.sessions.create(
      {
        customer_email: (project as any)?.client_email || undefined,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
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
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      { stripeAccount: stripeAccountId },
    );

    return new Response(JSON.stringify({ url: checkout.url, provider: "stripe", amount: amountCents }), {
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
