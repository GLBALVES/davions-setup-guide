// Polls a Pagar.me order status (used by frontend while waiting for PIX/boleto).
// Updates booking on confirmation as a safety net (webhook is the primary path).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, pagarmeFetch, markBookingPaid } from "../_shared/pagarme-booking.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, bookingId } = await req.json();
    if (!orderId) throw new Error("orderId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const order = await pagarmeFetch(`/orders/${orderId}`, { method: "GET" });
    const charge = order?.charges?.[0];
    const status = charge?.status ?? order?.status ?? "pending";
    const paidAt = charge?.paid_at ?? null;

    if ((status === "paid" || order?.status === "paid") && bookingId) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("availability_id, payment_status")
        .eq("id", bookingId)
        .maybeSingle();
      if (booking && booking.payment_status !== "paid") {
        await markBookingPaid(supabase, bookingId, booking.availability_id);
      }
    }

    return new Response(
      JSON.stringify({ status, paid_at: paidAt, order_id: orderId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
