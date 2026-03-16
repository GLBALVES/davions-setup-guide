import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, checkoutSessionId } = await req.json();

    if (!bookingId || !checkoutSessionId) {
      return new Response(
        JSON.stringify({ error: "bookingId and checkoutSessionId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the booking to get the photographer's stripe account
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, payment_status, photographer_id, session_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already confirmed — return early
    if (booking.status === "confirmed") {
      return new Response(
        JSON.stringify({ confirmed: true, alreadyConfirmed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get photographer's Stripe Connect account
    const { data: photographer } = await supabase
      .from("photographers")
      .select("stripe_account_id")
      .eq("id", booking.photographer_id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve checkout session from Stripe
    const stripeOptions = photographer?.stripe_account_id
      ? { stripeAccount: photographer.stripe_account_id }
      : undefined;

    const session = await stripe.checkout.sessions.retrieve(
      checkoutSessionId,
      {},
      stripeOptions
    );

    const isPaid =
      session.payment_status === "paid" ||
      session.status === "complete";

    if (!isPaid) {
      return new Response(
        JSON.stringify({ confirmed: false, paymentStatus: session.payment_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect deposit vs full payment from metadata
    const wasDeposit = session.metadata?.is_deposit === "true";

    // Update booking to confirmed
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: wasDeposit ? "deposit_paid" : "paid",
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark the availability slot as booked
    const slotId = session.metadata?.slot_id;
    if (slotId) {
      await supabase
        .from("session_availability")
        .update({ is_booked: true })
        .eq("id", slotId);
    }

    // Send confirmation email if RESEND_API_KEY is available
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey && booking.session_id) {
        const { data: bookingDetails } = await supabase
          .from("bookings")
          .select("client_email, client_name, booked_date, availability_id")
          .eq("id", bookingId)
          .single();

        const { data: sessionData } = await supabase
          .from("sessions")
          .select("title, confirmation_email_body, duration_minutes, location")
          .eq("id", booking.session_id)
          .single();

        const { data: availData } = bookingDetails?.availability_id
          ? await supabase
              .from("session_availability")
              .select("start_time")
              .eq("id", bookingDetails.availability_id)
              .single()
          : { data: null };

        if (bookingDetails && sessionData) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "noreply@davions.app",
              to: bookingDetails.client_email,
              subject: `Booking Confirmed — ${sessionData.title}`,
              html: `
                <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
                  <h2 style="font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">${sessionData.title}</h2>
                  <p><strong>Date:</strong> ${bookingDetails.booked_date}</p>
                  ${availData ? `<p><strong>Time:</strong> ${availData.start_time.slice(0, 5)}</p>` : ""}
                  <p><strong>Duration:</strong> ${sessionData.duration_minutes} minutes</p>
                  ${sessionData.location ? `<p><strong>Location:</strong> ${sessionData.location}</p>` : ""}
                  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                  ${sessionData.confirmation_email_body || `<p>Hi ${bookingDetails.client_name}, your booking has been confirmed!</p>`}
                </div>
              `,
            }),
          });
        }
      }
    } catch (emailErr) {
      // Non-fatal
      console.error("Email send failed:", emailErr);
    }

    return new Response(
      JSON.stringify({ confirmed: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("confirm-booking error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
