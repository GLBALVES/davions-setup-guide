// Pagar.me v5 transparent checkout — PIX
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
    const input = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const prep = await prepareBookingOrder(supabase, input);
    const origin = req.headers.get("origin") ?? "";
    const successUrl = `${origin}/booking-success?store=${prep.storeSlug}&session=${input.sessionId}&booking=${prep.bookingId}`;

    if (!prep.paymentRequired) {
      await markBookingPaid(supabase, prep.bookingId, input.slotId);
      return new Response(
        JSON.stringify({ free: true, redirect_url: successUrl, booking_id: prep.bookingId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const orderPayload = {
      items: prep.items,
      customer: prep.customer,
      payments: [
        {
          payment_method: "pix",
          pix: {
            expires_in: 3600,
            additional_information: [
              { name: "Booking", value: prep.bookingId.slice(0, 8) },
            ],
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
        qr_code_text: lastTx.qr_code ?? null,
        qr_code_url: lastTx.qr_code_url ?? null,
        expires_at: lastTx.expires_at ?? null,
        amount: prep.amountToCharge,
        redirect_url: successUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("pagarme-create-pix-order error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
