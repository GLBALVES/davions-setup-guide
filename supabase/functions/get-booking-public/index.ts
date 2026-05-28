import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Public endpoint: returns booking details needed for confirmation/success pages.
 * Only exposes fields necessary for the client-facing flow.
 * Uses service_role to bypass RLS since anon no longer has SELECT on bookings.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id } = await req.json();

    if (!booking_id || typeof booking_id !== "string") {
      return new Response(
        JSON.stringify({ error: "booking_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(booking_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid booking_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, status, payment_status, booked_date, session_id, photographer_id, availability_id, client_name, client_email, stripe_checkout_session_id")
      .eq("id", booking_id)
      .single();

    if (error || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [sessionRes, availabilityRes, photographerRes, clientRes, customFieldsRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("title, duration_minutes, location, num_photos, cover_image_url, briefing_id, contract_text, contract_id, price, session_model")
        .eq("id", booking.session_id)
        .single(),
      booking.availability_id
        ? supabase
            .from("session_availability")
            .select("start_time, end_time")
            .eq("id", booking.availability_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("photographers")
        .select("full_name, store_slug, business_name, business_address, business_city, business_state, business_zip, business_country, business_phone, email")
        .eq("id", booking.photographer_id)
        .single(),
      booking.client_email
        ? supabase
            .from("clients")
            .select("full_name, phone, tax_id, birth_date, address_street, address_city, address_state, address_zip, address_country, instagram")
            .eq("photographer_id", booking.photographer_id)
            .eq("email", booking.client_email)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("contract_custom_fields")
        .select("id, field_key, field_label, default_value, value_source, mapped_key, client_prompt, client_input_type, required")
        .eq("photographer_id", booking.photographer_id),
    ]);

    const session = sessionRes.data;
    if (session?.contract_id) {
      const { data: contractTemplate } = await supabase
        .from("contracts")
        .select("body")
        .eq("id", session.contract_id)
        .maybeSingle();
    let briefing: any = null;
    let alreadySubmittedBriefing = false;
    if (session?.briefing_id) {
      const [{ data: brData }, { data: existingResp }] = await Promise.all([
        supabase.from("briefings").select("id, name, questions").eq("id", session.briefing_id).single(),
        supabase
          .from("booking_briefing_responses")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("briefing_id", session.briefing_id)
          .maybeSingle(),
      ]);
      briefing = brData ?? null;
      alreadySubmittedBriefing = !!existingResp;
    }

    return new Response(
      JSON.stringify({
        booking,
        session,
        availability: availabilityRes.data,
        photographer: photographerRes.data,
        client: clientRes.data,
        contractCustomFields: customFieldsRes.data ?? [],
        briefing,
        alreadySubmittedBriefing,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-booking-public error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
