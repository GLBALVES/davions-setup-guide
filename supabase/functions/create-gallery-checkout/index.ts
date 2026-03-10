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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { galleryId, clientEmail, clientName, clientToken, photoCount } = await req.json();

    if (!galleryId || !clientEmail || !clientToken || !photoCount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch gallery to get price_per_photo, title, slug
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("id, title, slug, price_per_photo, photographer_id")
      .eq("id", galleryId)
      .single();

    if (galleryError || !gallery) {
      return new Response(
        JSON.stringify({ error: "Gallery not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const pricePerPhoto: number = gallery.price_per_photo ?? 0;
    const totalAmount = pricePerPhoto * photoCount;

    if (pricePerPhoto === 0 || totalAmount === 0) {
      // Free gallery — no Stripe needed
      return new Response(
        JSON.stringify({ free: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: clientEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const gallerySlug = gallery.slug ?? galleryId;
    const origin = req.headers.get("origin") ?? "https://davions-page-builder.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : clientEmail,
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: pricePerPhoto,
            product_data: {
              name: `${gallery.title} — Photo Selection`,
              description: `${photoCount} photo${photoCount !== 1 ? "s" : ""} selected`,
            },
          },
          quantity: photoCount,
        },
      ],
      mode: "payment",
      success_url: `${origin}/gallery/${gallerySlug}?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/gallery/${gallerySlug}`,
      metadata: {
        gallery_id: galleryId,
        client_token: clientToken,
        client_name: clientName ?? "",
        photo_count: String(photoCount),
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("create-gallery-checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
