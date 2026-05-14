// Pagar.me v5 transparent checkout — Credit Card
// Card data is sent server-side over HTTPS and tokenized on Pagar.me's side
// inside the order payload (the `card` object). Card data is never persisted.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  prepareBookingOrder,
  pagarmeFetch,
  persistOrderId,
  markBookingPaid,
} from "../_shared/pagarme-booking.ts";

interface CardInput {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  holder_document?: string;
  billing_address?: {
    line_1: string;
    zip_code: string;
    city: string;
    state: string;
    country: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const card = body.card as CardInput;
    const installments = Math.max(1, Math.min(12, Number(body.installments ?? 1)));

    if (!card?.number || !card?.cvv) throw new Error("Card data missing");

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
        JSON.stringify({ free: true, status: "paid", redirect_url: successUrl, booking_id: prep.bookingId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const cleanNumber = card.number.replace(/\s+/g, "");
    const cardPayload: Record<string, unknown> = {
      number: cleanNumber,
      holder_name: card.holder_name,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      cvv: card.cvv,
    };
    if (card.billing_address) {
      cardPayload.billing_address = card.billing_address;
    }

    const orderPayload = {
      items: prep.items,
      customer: prep.customer,
      payments: [
        {
          payment_method: "credit_card",
          credit_card: {
            installments,
            statement_descriptor: "DAVIONS",
            card: cardPayload,
            operation_type: "auth_and_capture",
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

    const charge = order?.charges?.[0];
    const status = charge?.status ?? order?.status ?? "pending";

    if (status === "paid") {
      await markBookingPaid(supabase, prep.bookingId, body.slotId);
    } else if (status === "failed" || status === "canceled" || status === "refused") {
      const reason =
        charge?.last_transaction?.acquirer_message ??
        charge?.last_transaction?.gateway_response?.errors?.[0]?.message ??
        "Pagamento recusado";
      await supabase
        .from("bookings")
        .update({ payment_status: "failed" })
        .eq("id", prep.bookingId);
      return new Response(
        JSON.stringify({ status: "failed", error: reason, order_id: order.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        status,
        order_id: order.id,
        booking_id: prep.bookingId,
        redirect_url: successUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("pagarme-create-card-order error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
