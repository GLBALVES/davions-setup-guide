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
    const { booking_id, origin: originIn } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
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

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, photographer_id, client_email, client_name, payment_status, status, session_id, extras_total, booked_date, deposit_paid_amount, total_paid_amount, sessions(title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate)")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) throw new Error("Booking not found");
    if (booking.status === "cancelled") throw new Error("Booking cancelled");
    if (booking.payment_status === "paid") throw new Error("Already paid in full");

    const s: any = (booking as any).sessions;
    if (!s?.deposit_enabled) throw new Error("Session has no deposit/balance flow");

    const sessionPrice = s.price as number;
    const extrasTotal = (booking as any).extras_total ?? 0;
    const subtotal = sessionPrice + extrasTotal;
    const taxRate = (s.tax_rate as number) ?? 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const fullTotal = subtotal + taxAmount;
    const isPercent = s.deposit_type === "percent" || s.deposit_type === "percentage";
    const computedDeposit = isPercent
      ? Math.round(fullTotal * ((s.deposit_amount as number) / 100))
      : (s.deposit_amount as number);
    const amountAlreadyPaid = (booking as any).total_paid_amount ?? (booking as any).deposit_paid_amount ?? computedDeposit;
    const remainingBalance = fullTotal - amountAlreadyPaid;

    if (remainingBalance <= 0) throw new Error("No balance due");

    const { data: photo } = await supabase
      .from("photographers")
      .select("stripe_account_id, store_slug, email")
      .eq("id", booking.photographer_id)
      .single();

    const stripeAccountId = (photo as any)?.stripe_account_id;
    if (!stripeAccountId) throw new Error("Photographer not connected to Stripe");

    // Determine split
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

    const applicationFeeAmount = Math.round(remainingBalance * (splitPercent / 100));
    const origin = originIn || "https://davions.com";

    const checkout = await stripe.checkout.sessions.create(
      {
        customer_email: booking.client_email,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "brl",
            product_data: {
              name: `${s.title} — Balance`,
              description: `Remaining balance for booking on ${booking.booked_date}`,
            },
            unit_amount: remainingBalance,
          },
          quantity: 1,
        }],
        payment_intent_data: applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : undefined,
        metadata: {
          booking_id: booking.id,
          session_id: booking.session_id,
          payment_kind: "balance_due",
          is_deposit: "false",
        },
        success_url: `${origin}/booking-success?booking=${booking.id}&balance=paid`,
        cancel_url: `${origin}/`,
      },
      { stripeAccount: stripeAccountId },
    );

    return new Response(JSON.stringify({ url: checkout.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-balance-payment-link error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
