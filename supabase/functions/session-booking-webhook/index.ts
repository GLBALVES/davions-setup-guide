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

    // Bug fix: correctly detect deposit vs full payment
    const wasDeposit = session.metadata?.is_deposit === "true";

    if (bookingId) {
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: wasDeposit ? "deposit_paid" : "paid",
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

    // Send emails via Resend if available
    if (bookingId && sessionId) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          // Fetch booking + session + photographer details for email
          const { data: bookingData } = await supabase
            .from("bookings")
            .select("client_email, client_name, booked_date, availability_id, photographer_id")
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

          const { data: photographerData } = await supabase
            .from("photographers")
            .select("email, full_name, business_name")
            .eq("id", bookingData?.photographer_id)
            .single();

          if (bookingData && sessionData) {
            const timeStr = availData ? availData.start_time.slice(0, 5) : "";

            // 1. Confirmation email to the client
            const emailBody = sessionData.confirmation_email_body
              ? sessionData.confirmation_email_body
                  .replace(/<[^>]*>/g, "")
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
                    ${timeStr ? `<p><strong>Time:</strong> ${timeStr}</p>` : ""}
                    <p><strong>Duration:</strong> ${sessionData.duration_minutes} minutes</p>
                    ${sessionData.location ? `<p><strong>Location:</strong> ${sessionData.location}</p>` : ""}
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    ${sessionData.confirmation_email_body || `<p>${emailBody}</p>`}
                  </div>
                `,
              }),
            });

            // 2. Notification email to the photographer
            if (photographerData?.email) {
              const studioName = photographerData.business_name || photographerData.full_name || "Your Studio";
              const paymentLabel = wasDeposit ? "Deposit paid" : "Full payment received";

              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${resendKey}`,
                },
                body: JSON.stringify({
                  from: "noreply@davions.app",
                  to: photographerData.email,
                  subject: `New Booking — ${bookingData.client_name} booked ${sessionData.title}`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
                      <h2 style="font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">New Booking Confirmed</h2>
                      <p style="color: #555; margin-bottom: 24px;">A new booking has been confirmed for <strong>${studioName}</strong>.</p>

                      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                          <td style="padding: 8px 0; color: #888; width: 140px;">Client</td>
                          <td style="padding: 8px 0; font-weight: 500;">${bookingData.client_name}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #888;">Email</td>
                          <td style="padding: 8px 0;">${bookingData.client_email}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #888;">Session</td>
                          <td style="padding: 8px 0; font-weight: 500;">${sessionData.title}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #888;">Date</td>
                          <td style="padding: 8px 0;">${bookingData.booked_date}</td>
                        </tr>
                        ${timeStr ? `
                        <tr>
                          <td style="padding: 8px 0; color: #888;">Time</td>
                          <td style="padding: 8px 0;">${timeStr}</td>
                        </tr>` : ""}
                        ${sessionData.location ? `
                        <tr>
                          <td style="padding: 8px 0; color: #888;">Location</td>
                          <td style="padding: 8px 0;">${sessionData.location}</td>
                        </tr>` : ""}
                        <tr>
                          <td style="padding: 8px 0; color: #888;">Duration</td>
                          <td style="padding: 8px 0;">${sessionData.duration_minutes} minutes</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #888;">Payment</td>
                          <td style="padding: 8px 0; color: #16a34a; font-weight: 500;">${paymentLabel}</td>
                        </tr>
                      </table>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                      <p style="font-size: 12px; color: #aaa;">This notification was sent automatically by Davions.</p>
                    </div>
                  `,
                }),
              });
            }
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
