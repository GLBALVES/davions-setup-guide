// Creates a Pagar.me v5 hosted Checkout for a booking, with split between
// Davions master recipient and the photographer's recipient.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getPaymentSettings, buildSplitRules } from "../_shared/pagarme-split.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SelectedExtra {
  id: string;
  description: string;
  price: number; // cents
  qty: number;
}

const PAGARME_BASE = "https://api.pagar.me/core/v5";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      bookingId: existingBookingId,
      sessionId,
      slotId,
      bookedDate,
      startTime,
      clientEmail,
      clientName,
      selectedExtras = [],
      contractHtml = null,
      signatureData = null,
      clientTaxId = null,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const apiKey = Deno.env.get("PAGARME_API_KEY");
    if (!apiKey) throw new Error("PAGARME_API_KEY not configured");

    // ── Session ──
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("title, price, photographer_id, deposit_enabled, deposit_amount, deposit_type, tax_rate, duration_minutes, location, payment_required")
      .eq("id", sessionId)
      .single();
    if (sessionError || !sessionData) throw new Error("Session not found");

    const paymentRequired = (sessionData as any).payment_required !== false;

    // ── Photographer ──
    const { data: photoData } = await supabase
      .from("photographers")
      .select("store_slug, pagarme_recipient_id, pagarme_kyc_status, business_country")
      .eq("id", sessionData.photographer_id)
      .single();

    const storeSlug = photoData?.store_slug ?? "";
    const recipientId = (photoData as any)?.pagarme_recipient_id as string | null;
    if (!recipientId) {
      throw new Error("Photographer has not finished Pagar.me onboarding (recipient missing)");
    }

    const origin = req.headers.get("origin") ?? "https://localhost:5173";

    // ── Create or reuse booking ──
    let bookingId = existingBookingId as string | undefined;
    if (!bookingId) {
      const insertPayload: Record<string, unknown> = {
        session_id: sessionId,
        availability_id: slotId,
        photographer_id: sessionData.photographer_id,
        client_name: clientName,
        client_email: clientEmail,
        status: "pending",
        payment_status: "pending",
        booked_date: bookedDate,
      };
      if (typeof contractHtml === "string" && contractHtml.length > 0)
        insertPayload.contract_html_snapshot = contractHtml;
      if (typeof signatureData === "string" && signatureData.startsWith("data:image"))
        insertPayload.contract_signature_data = signatureData;
      if (typeof clientTaxId === "string" && clientTaxId.trim().length > 0)
        insertPayload.client_tax_id = clientTaxId.trim();

      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert(insertPayload)
        .select("id")
        .single();
      if (bookingError || !newBooking) throw new Error(bookingError?.message ?? "Failed to create booking");
      bookingId = newBooking.id;
    }

    // ── Free booking ──
    if (!paymentRequired) {
      await supabase
        .from("bookings")
        .update({ status: "confirmed", payment_status: "not_required" })
        .eq("id", bookingId);
      if (slotId) await supabase.from("session_availability").update({ is_booked: true }).eq("id", slotId);
      const successUrl = `${origin}/booking-success?store=${storeSlug}&session=${sessionId}&booking=${bookingId}`;
      return new Response(JSON.stringify({ url: successUrl, free: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── Compute amount in cents (Pagar.me uses cents/centavos) ──
    const extras: SelectedExtra[] = selectedExtras ?? [];
    const extrasTotal = extras.reduce((s, e) => s + e.price * e.qty, 0);
    const sessionPrice = sessionData.price as number;
    const subtotal = sessionPrice + extrasTotal;
    const taxRate = (sessionData.tax_rate as number) ?? 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const fullTotal = subtotal + taxAmount;

    const isDeposit = sessionData.deposit_enabled as boolean;
    let amountToCharge = fullTotal;
    if (isDeposit) {
      const depositType = sessionData.deposit_type as string;
      const isPercent = depositType === "percent" || depositType === "percentage";
      amountToCharge = isPercent
        ? Math.round(fullTotal * ((sessionData.deposit_amount as number) / 100))
        : (sessionData.deposit_amount as number);
    }

    // ── Build items ──
    const items: Array<{ amount: number; description: string; quantity: number; code?: string }> = [];
    if (isDeposit) {
      items.push({
        amount: amountToCharge,
        description: `${sessionData.title} — Sinal`.slice(0, 256),
        quantity: 1,
        code: bookingId,
      });
    } else {
      items.push({
        amount: sessionPrice,
        description: (sessionData.title as string).slice(0, 256),
        quantity: 1,
        code: bookingId,
      });
      for (const e of extras) {
        items.push({ amount: e.price, description: e.description.slice(0, 256), quantity: e.qty });
      }
      if (taxAmount > 0) {
        items.push({ amount: taxAmount, description: `Imposto (${taxRate}%)`, quantity: 1 });
      }
    }

    // ── Split rules (computed against amountToCharge) ──
    const settings = await getPaymentSettings(supabase);
    const split_rules = buildSplitRules({
      amount: amountToCharge,
      photographerRecipientId: recipientId,
      settings,
    });

    // ── Customer ──
    const docDigits = (clientTaxId ?? "").replace(/\D/g, "");
    const customer: Record<string, unknown> = {
      name: clientName || clientEmail,
      email: clientEmail,
      type: docDigits.length === 14 ? "company" : "individual",
    };
    if (docDigits.length === 11 || docDigits.length === 14) {
      customer.document = docDigits;
      customer.document_type = docDigits.length === 14 ? "CNPJ" : "CPF";
    }

    const successUrl = `${origin}/booking-success?store=${storeSlug}&session=${sessionId}&booking=${bookingId}`;

    // ── Pagar.me v5 Order with hosted Checkout ──
    const orderPayload = {
      items,
      customer,
      closed: false,
      payments: [
        {
          payment_method: "checkout",
          checkout: {
            expires_in: 120,
            default_payment_method: "credit_card",
            accepted_payment_methods: ["credit_card", "pix", "boleto"],
            success_url: successUrl,
            customer_editable: true,
            credit_card: {
              installments: [{ number: 1, total: amountToCharge }],
              statement_descriptor: "DAVIONS",
            },
            pix: {
              expires_in: 3600,
            },
            boleto: {
              instructions: "Pagar até a data de vencimento.",
              due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
          split: split_rules,
        },
      ],
      metadata: {
        booking_id: bookingId,
        session_id: sessionId,
        store_slug: storeSlug,
        is_deposit: isDeposit ? "true" : "false",
        payment_kind: isDeposit ? "deposit" : "full",
      },
    };

    const auth = btoa(`${apiKey}:`);
    const resp = await fetch(`${PAGARME_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
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

    if (!checkoutUrl) {
      console.error("No checkout url in order:", order);
      throw new Error("Pagar.me did not return a checkout URL");
    }

    await supabase
      .from("bookings")
      .update({
        pagarme_order_id: order.id,
        extras_total: extrasTotal,
      })
      .eq("id", bookingId);

    return new Response(JSON.stringify({ url: checkoutUrl, provider: "pagarme" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-pagarme-booking-checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
