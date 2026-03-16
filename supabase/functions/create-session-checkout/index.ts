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

// Split % by subscription product ID
const PLAN_SPLITS: Record<string, number> = {
  "prod_U8PSBb6bJj3mQV": 5,  // Starter
  "prod_U8PXjCdBxWHHvT": 3,  // Pro
  "prod_U8PYo2ocBqxIFO": 1,  // Studio
};

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
      .select("title, price, photographer_id, deposit_enabled, deposit_amount, deposit_type, tax_rate, duration_minutes, location")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error("Session not found");
    }

    // Fetch photographer data
    const { data: photoData } = await supabase
      .from("photographers")
      .select("store_slug, stripe_account_id, email")
      .eq("id", sessionData.photographer_id)
      .single();

    const storeSlug = photoData?.store_slug ?? "";
    let stripeAccountId = (photoData as any)?.stripe_account_id as string | null;

    const origin = req.headers.get("origin") ?? "https://localhost:5173";
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // ── Lazy Connect: auto-create account on first checkout ──
    let onboardingRequired = false;
    if (!stripeAccountId) {
      const photographerEmail = (photoData as any)?.email as string | undefined;
      const account = await stripe.accounts.create({
        type: "custom",
        email: photographerEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      onboardingRequired = true;
      // Persist the new account id (no stripe_connected_at yet — onboarding still pending)
      await supabase
        .from("photographers")
        .update({ stripe_account_id: stripeAccountId } as any)
        .eq("id", sessionData.photographer_id);
    }

    // Determine split % from photographer's platform subscription
    let splitPercent = 5; // default
    try {
      const photographerEmail = (photoData as any)?.email;
      if (photographerEmail) {
        const platformCustomers = await stripe.customers.list({ email: photographerEmail, limit: 1 });
        if (platformCustomers.data.length > 0) {
          const subs = await stripe.subscriptions.list({
            customer: platformCustomers.data[0].id,
            status: "active",
            limit: 1,
          });
          if (subs.data.length > 0) {
            const productId = subs.data[0].items.data[0].price.product as string;
            if (PLAN_SPLITS[productId] !== undefined) {
              splitPercent = PLAN_SPLITS[productId];
            }
          }
        }
      }
    } catch (_) { /* non-fatal — use default */ }

    // Check for existing Stripe customer on the connected account
    const customers = await stripe.customers.list(
      { email: clientEmail, limit: 1 },
      { stripeAccount: stripeAccountId }
    );
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // ── Helper: format BRL cents to readable string ──
    const fmt = (cents: number) =>
      (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    // ── Build line items ──
    const extras: SelectedExtra[] = selectedExtras ?? [];
    const extrasTotal = extras.reduce((sum: number, e: SelectedExtra) => sum + e.price * e.qty, 0);
    const sessionPrice = sessionData.price as number;
    const subtotal = sessionPrice + extrasTotal;
    const taxRate = (sessionData.tax_rate as number) ?? 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const fullTotal = subtotal + taxAmount;

    const durationMin = (sessionData.duration_minutes as number) ?? null;
    const location = (sessionData.location as string) ?? null;

    const isDeposit = sessionData.deposit_enabled as boolean;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Build session meta line for description
    const sessionMeta = [
      durationMin ? `${durationMin} min` : null,
      location ?? null,
    ].filter(Boolean).join(" · ");

    // ── Local variable for deposit custom_text (set in deposit branch) ──
    let remainingBalance: number | undefined;

    if (isDeposit) {
      const depositType = sessionData.deposit_type as string;
      const isPercentDeposit = depositType === "percent" || depositType === "percentage";
      const depositBase = isPercentDeposit
        ? Math.round(fullTotal * ((sessionData.deposit_amount as number) / 100))
        : (sessionData.deposit_amount as number);
      remainingBalance = fullTotal - depositBase;

      // Build rich product description visible in Stripe Checkout left panel
      const descLines: string[] = [];
      if (sessionMeta) descLines.push(`📍 ${sessionMeta}`);
      descLines.push(``);
      descLines.push(`Session:  ${fmt(sessionPrice)}`);
      if (extrasTotal > 0) descLines.push(`Add-ons:  ${fmt(extrasTotal)}`);
      if (taxAmount > 0) descLines.push(`Tax (${taxRate}%):  ${fmt(taxAmount)}`);
      descLines.push(`Total session value:  ${fmt(fullTotal)}`);
      descLines.push(``);
      descLines.push(`✅ Paid today (deposit):  ${fmt(depositBase)}`);
      descLines.push(`⏳ Remaining balance:  ${fmt(remainingBalance)}`);

      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: `${sessionData.title} — Deposit`,
            description: descLines.filter(l => l !== undefined).join("\n"),
            metadata: { booking_id: bookingId, session_id: sessionId },
          },
          unit_amount: depositBase,
        },
        quantity: 1,
      });
    } else {
      // Full payment — session line item with context
      const fullDescLines: string[] = [];
      if (sessionMeta) fullDescLines.push(`📍 ${sessionMeta}`);
      if (extrasTotal > 0) fullDescLines.push(`Includes add-ons: ${fmt(extrasTotal)}`);
      if (taxAmount > 0) fullDescLines.push(`Tax (${taxRate}%) included`);

      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: sessionData.title,
            description: fullDescLines.length > 0 ? fullDescLines.join("  ·  ") : undefined,
            metadata: { booking_id: bookingId, session_id: sessionId },
          },
          unit_amount: sessionPrice,
        },
        quantity: 1,
      });

      for (const extra of extras) {
        lineItems.push({
          price_data: {
            currency: "brl",
            product_data: {
              name: extra.description,
              description: extra.qty > 1
                ? `${extra.qty} units × ${fmt(extra.price)} each`
                : undefined,
            },
            unit_amount: extra.price,
          },
          quantity: extra.qty,
        });
      }

      if (taxAmount > 0) {
        lineItems.push({
          price_data: {
            currency: "brl",
            product_data: {
              name: `Tax (${taxRate}%)`,
              description: `Applied on subtotal of ${fmt(subtotal)} (session + add-ons)`,
            },
            unit_amount: taxAmount,
          },
          quantity: 1,
        });
      }
    }

    // Calculate total for application fee
    const checkoutTotal = lineItems.reduce((sum, item) => {
      const unitAmount = (item.price_data as any)?.unit_amount ?? 0;
      const qty = item.quantity ?? 1;
      return sum + unitAmount * qty;
    }, 0);
    const applicationFeeAmount = Math.round(checkoutTotal * (splitPercent / 100));

    // Build deposit-specific custom_text
    const remainingBalance = (globalThis as any).__remainingBalance as number | undefined;
    const depositCustomText = isDeposit && remainingBalance !== undefined
      ? {
          submit: { message: `**Deposit only.** The remaining balance of **${fmt(remainingBalance)}** will be due after your session, before delivery.` },
          after_submit: { message: `Your session is confirmed upon payment. The photographer will collect the remaining ${fmt(remainingBalance)} balance at the time of delivery.` },
        }
      : undefined;

    // Create checkout session on the connected account
    const checkout = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        customer_email: customerId ? undefined : clientEmail,
        line_items: lineItems,
        mode: "payment",
        ...(depositCustomText ? { custom_text: depositCustomText } : {}),
        payment_intent_data: applicationFeeAmount > 0 ? {
          application_fee_amount: applicationFeeAmount,
        } : undefined,
        metadata: {
          booking_id: bookingId,
          slot_id: slotId,
          store_slug: storeSlug,
          client_name: clientName,
          session_id: sessionId,
          is_deposit: isDeposit ? "true" : "false",
        },
        success_url: `${origin}/booking-success?store=${storeSlug}&session=${sessionId}&booking=${bookingId}`,
        cancel_url: `${origin}/store/${storeSlug}/${sessionId}`,
      },
      { stripeAccount: stripeAccountId }
    );

    // Save checkout session id + extras_total to booking
    await supabase
      .from("bookings")
      .update({ stripe_checkout_session_id: checkout.id, extras_total: extrasTotal })
      .eq("id", bookingId);

    return new Response(JSON.stringify({ url: checkout.url, onboarding_required: onboardingRequired }), {
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
