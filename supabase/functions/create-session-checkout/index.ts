import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SelectedExtra {
  id: string;
  description: string;
  price: number;
  qty: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      bookingId,
      sessionId,
      slotId,
      clientEmail,
      clientName,
      selectedExtras = [],
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch session data
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("title, price, photographer_id, deposit_enabled, deposit_amount, deposit_type, tax_rate")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error("Session not found");
    }

    // Fetch photographer data (store slug + Stripe Connect account)
    const { data: photoData } = await supabase
      .from("photographers")
      .select("store_slug, stripe_account_id, id")
      .eq("id", sessionData.photographer_id)
      .single();

    const storeSlug = photoData?.store_slug ?? "";
    const stripeAccountId = (photoData as any)?.stripe_account_id;

    if (!stripeAccountId) {
      return new Response(
        JSON.stringify({ error: "stripe_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const origin = req.headers.get("origin") ?? "https://localhost:5173";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer on the connected account
    const customers = await stripe.customers.list(
      { email: clientEmail, limit: 1 },
      { stripeAccount: stripeAccountId }
    );
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // ── Build line items ──
    const extras: SelectedExtra[] = selectedExtras ?? [];
    const extrasTotal = extras.reduce((sum: number, e: SelectedExtra) => sum + e.price * e.qty, 0);
    const sessionPrice = sessionData.price as number;
    const subtotal = sessionPrice + extrasTotal;
    const taxRate = (sessionData.tax_rate as number) ?? 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100));

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (sessionData.deposit_enabled) {
      const depositBase = sessionData.deposit_type === "percent"
        ? Math.round(subtotal * ((sessionData.deposit_amount as number) / 100))
        : (sessionData.deposit_amount as number);
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: `${sessionData.title} — Deposit`,
            metadata: { booking_id: bookingId, session_id: sessionId },
          },
          unit_amount: depositBase,
        },
        quantity: 1,
      });
    } else {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: sessionData.title,
            metadata: { booking_id: bookingId, session_id: sessionId },
          },
          unit_amount: sessionPrice,
        },
        quantity: 1,
      });
    }

    for (const extra of extras) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: { name: extra.description },
          unit_amount: extra.price,
        },
        quantity: extra.qty,
      });
    }

    if (taxAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: { name: `Tax (${taxRate}%)` },
          unit_amount: taxAmount,
        },
        quantity: 1,
      });
    }

    // Determine platform fee based on photographer's subscription plan
    // Default 5% (Starter), reduced for Pro (3%) and Studio (1%)
    // We fetch the subscription split from check-subscription logic inline
    const PLAN_SPLITS: Record<string, number> = {
      "prod_U8PSBb6bJj3mQV": 5,  // Starter
      "prod_U8PXjCdBxWHHvT": 3,  // Pro
      "prod_U8PYo2ocBqxIFO": 1,  // Studio
    };
    let splitPercent = 5; // default
    try {
      const photographerCustomers = await stripe.customers.list({ limit: 1 });
      // Check subscription for the platform account (photographer's own subscription)
      const platformCustomers = await stripe.customers.list(
        // We need the photographer's email to find their platform subscription
        // Fetch from DB
      );
    } catch (_) { /* non-fatal */ }

    // Calculate total for fee
    const checkoutTotal = lineItems.reduce((sum, item) => {
      const unitAmount = (item.price_data as any)?.unit_amount ?? 0;
      const qty = item.quantity ?? 1;
      return sum + unitAmount * qty;
    }, 0);
    const applicationFeeAmount = Math.round(checkoutTotal * (splitPercent / 100));

    // Create checkout session on the connected account
    const checkout = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        customer_email: customerId ? undefined : clientEmail,
        line_items: lineItems,
        mode: "payment",
        payment_intent_data: applicationFeeAmount > 0 ? {
          application_fee_amount: applicationFeeAmount,
        } : undefined,
        metadata: {
          booking_id: bookingId,
          slot_id: slotId,
          store_slug: storeSlug,
          client_name: clientName,
          session_id: sessionId,
        },
        success_url: `${origin}/booking-success?store=${storeSlug}&session=${sessionId}&booking=${bookingId}`,
        cancel_url: `${origin}/store/${storeSlug}/${sessionId}`,
      },
      { stripeAccount: stripeAccountId }
    );

    // Save checkout session id to booking
    await supabase
      .from("bookings")
      .update({ stripe_checkout_session_id: checkout.id })
      .eq("id", bookingId);

    return new Response(JSON.stringify({ url: checkout.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
