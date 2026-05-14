// Pagar.me v5 transparent checkout — Boleto
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  prepareBookingOrder,
  pagarmeFetch,
  persistOrderId,
  markBookingPaid,
} from "../_shared/pagarme-booking.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const prep = await prepareBookingOrder(supabase, body);
    const origin = req.headers.get("origin") ?? "";
    const successUrl = `${origin}/booking-success?store=${prep.storeSlug}&session=${body.sessionId}&booking=${prep.bookingId}`;

    if (!prep.paymentRequired) {
      await markBookingPaid(supabase, prep.bookingId, body.slotId);
      return new Response(
        JSON.stringify({ free: true, redirect_url: successUrl, booking_id: prep.bookingId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const orderPayload = {
      items: prep.items,
      customer: prep.customer,
      payments: [
        {
          payment_method: "boleto",
          boleto: {
            instructions: "Pagar até a data de vencimento. Após a confirmação, sua sessão será reservada automaticamente.",
            due_at: dueAt,
            document_number: prep.bookingId.slice(0, 16),
            type: "DM",
          },
          split: prep.split_rules,
        },
      ],
      metadata: prep.metadata,
    };

    const order = await pagarmeFetch("/orders", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    await persistOrderId(supabase, prep.bookingId, order.id, prep.extrasTotal);

    const lastTx = order?.charges?.[0]?.last_transaction ?? {};
    return new Response(
      JSON.stringify({
        order_id: order.id,
        booking_id: prep.bookingId,
        line: lastTx.line ?? null,
        barcode: lastTx.barcode ?? null,
        pdf_url: lastTx.pdf ?? lastTx.url ?? null,
        due_at: lastTx.due_at ?? dueAt,
        amount: prep.amountToCharge,
        redirect_url: successUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("pagarme-create-boleto-order error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
