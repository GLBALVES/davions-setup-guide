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

    // Fetch photographer data (store slug + Stripe key)
    const { data: photoData } = await supabase
      .from("photographers")
      .select("store_slug, stripe_secret_key")
      .eq("id", sessionData.photographer_id)
      .single();

    const storeSlug = photoData?.store_slug ?? "";
    const stripeKey = (photoData as any)?.stripe_secret_key ?? Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "stripe_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const origin = req.headers.get("origin") ?? "https://localhost:5173";

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: clientEmail, limit: 1 });
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
      // Charge only deposit + extras + tax
      const depositBase = sessionData.deposit_type === 'percent'
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

    // Add extras as individual line items
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

    // Add tax as separate line item if applicable
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

    // Create checkout session
    const checkout = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : clientEmail,
      line_items: lineItems,
      mode: "payment",
      metadata: {
        booking_id: bookingId,
        slot_id: slotId,
        store_slug: storeSlug,
        client_name: clientName,
        session_id: sessionId,
      },
      success_url: `${origin}/booking-success?store=${storeSlug}&session=${sessionId}&booking=${bookingId}`,
      cancel_url: `${origin}/store/${storeSlug}/${sessionId}`,
    });

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
