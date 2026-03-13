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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { galleryId, sessionId, clientEmail } = await req.json();

    if (!galleryId) {
      return new Response(
        JSON.stringify({ error: "Missing galleryId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch gallery + booking link
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("id, photographer_id, booking_id")
      .eq("id", galleryId)
      .single();

    if (galleryError || !gallery) {
      return new Response(
        JSON.stringify({ error: "Gallery not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // ── Validate client email against booking ────────────────────────────────
    if (gallery.booking_id && clientEmail) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("client_email")
        .eq("id", gallery.booking_id)
        .single();

      if (booking?.client_email) {
        if (booking.client_email.trim().toLowerCase() !== clientEmail.trim().toLowerCase()) {
          return new Response(
            JSON.stringify({ error: "email_mismatch" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
          );
        }
      }
    }

    // Fetch extension days from settings
    const { data: settings } = await supabase
      .from("gallery_settings")
      .select("key, value")
      .eq("photographer_id", gallery.photographer_id)
      .in("key", ["default_expiry_days"]);

    const extensionDays = parseInt(
      (settings ?? []).find((s: { key: string }) => s.key === "default_expiry_days")?.value ?? "30",
      10
    );

    // If sessionId provided, verify with Stripe before extending
    if (sessionId) {
      const { data: photoData } = await supabase
        .from("photographers")
        .select("stripe_account_id")
        .eq("id", gallery.photographer_id)
        .single();

      const stripeAccountId = (photoData as any)?.stripe_account_id;

      if (stripeAccountId) {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
          apiVersion: "2025-08-27.basil",
        });

        try {
          const checkoutSession = await stripe.checkout.sessions.retrieve(
            sessionId,
            {},
            { stripeAccount: stripeAccountId }
          );

          if (checkoutSession.payment_status !== "paid") {
            return new Response(
              JSON.stringify({ error: "Payment not completed" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
            );
          }
        } catch (stripeErr) {
          console.error("Stripe verify error:", stripeErr);
          return new Response(
            JSON.stringify({ error: "Could not verify payment" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
      }
    }

    // Extend expires_at
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + extensionDays);

    const { error: updateError } = await supabase
      .from("galleries")
      .update({ expires_at: newExpiry.toISOString() })
      .eq("id", galleryId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, expires_at: newExpiry.toISOString(), extension_days: extensionDays }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("confirm-gallery-reactivation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
