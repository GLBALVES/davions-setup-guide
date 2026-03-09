import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook error";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;
    const slotId = session.metadata?.slot_id;
    const sessionId = session.metadata?.session_id;

    if (bookingId) {
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", bookingId);
    }

    if (slotId) {
      await supabase
        .from("session_availability")
        .update({ is_booked: true })
        .eq("id", slotId);
    }

    // Send confirmation email via Resend if available
    if (bookingId && sessionId) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          // Fetch booking + session details for email
          const { data: bookingData } = await supabase
            .from("bookings")
            .select("client_email, client_name, booked_date, availability_id")
            .eq("id", bookingId)
            .single();

          const { data: sessionData } = await supabase
            .from("sessions")
            .select("title, confirmation_email_body, duration_minutes, location")
            .eq("id", sessionId)
            .single();

          const { data: availData } = await supabase
            .from("session_availability")
            .select("start_time")
            .eq("id", bookingData?.availability_id)
            .single();

          if (bookingData && sessionData) {
            const emailBody = sessionData.confirmation_email_body
              ? sessionData.confirmation_email_body
                  .replace(/<[^>]*>/g, "") // strip HTML tags for plain text fallback
              : `Hi ${bookingData.client_name}, your session "${sessionData.title}" has been confirmed!`;

            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: "noreply@davions.app",
                to: bookingData.client_email,
                subject: `Booking Confirmed — ${sessionData.title}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
                    <h2 style="font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">${sessionData.title}</h2>
                    <p><strong>Date:</strong> ${bookingData.booked_date}</p>
                    ${availData ? `<p><strong>Time:</strong> ${availData.start_time.slice(0, 5)}</p>` : ""}
                    <p><strong>Duration:</strong> ${sessionData.duration_minutes} minutes</p>
                    ${sessionData.location ? `<p><strong>Location:</strong> ${sessionData.location}</p>` : ""}
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    ${sessionData.confirmation_email_body || `<p>${emailBody}</p>`}
                  </div>
                `,
              }),
            });
          }
        }
      } catch (emailErr) {
        // Non-fatal: log but don't fail the webhook
        console.error("Email send failed:", emailErr);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
