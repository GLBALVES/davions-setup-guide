import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonError(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: require authenticated photographer ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Missing authorization", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return jsonError("Not authenticated", 401);
    const photographerId = userData.user.id;

    // ── Parse & validate body ──
    const body = await req.json();
    const {
      session_id,
      date,
      start_time,
      end_time,
      client_name,
      client_email,
      client_phone,
      status = "confirmed",
      payment_status = "pending",
    } = body;

    if (!session_id || typeof session_id !== "string") return jsonError("session_id is required");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("date must be YYYY-MM-DD");
    if (!start_time || !/^\d{2}:\d{2}$/.test(start_time)) return jsonError("start_time must be HH:MM");
    if (!client_email || typeof client_email !== "string" || !client_email.includes("@"))
      return jsonError("Valid client_email is required");

    const finalClientName = (client_name ?? "").trim() || client_email.split("@")[0];
    const finalEndTime = end_time || (() => {
      const [h, m] = start_time.split(":").map(Number);
      const total = h * 60 + m + 60;
      return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    })();

    // ── Verify session belongs to this photographer ──
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("id, title, photographer_id")
      .eq("id", session_id)
      .single();

    if (sessionError || !sessionData) return jsonError("Session not found", 404);
    if (sessionData.photographer_id !== photographerId)
      return jsonError("Session does not belong to this photographer", 403);

    // ── Check availability conflicts (warn only — manual bookings can override) ──
    const { data: existingSlots } = await supabase
      .from("session_availability")
      .select("id, start_time, end_time")
      .eq("photographer_id", photographerId)
      .eq("date", date)
      .eq("is_booked", true);

    const hasConflict = (existingSlots ?? []).some((slot: any) => {
      return slot.start_time < finalEndTime && slot.end_time > start_time;
    });

    // ── Create availability slot ──
    const { data: availData, error: availError } = await supabase
      .from("session_availability")
      .insert({
        photographer_id: photographerId,
        session_id,
        date,
        start_time,
        end_time: finalEndTime,
        is_booked: true,
      })
      .select("id")
      .single();

    if (availError) return jsonError(`Failed to create slot: ${availError.message}`, 500);

    // ── Insert booking ──
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        photographer_id: photographerId,
        session_id,
        availability_id: availData.id,
        booked_date: date,
        client_name: finalClientName,
        client_email: client_email.trim(),
        status,
        payment_status,
      })
      .select("id")
      .single();

    if (bookingError) return jsonError(`Failed to create booking: ${bookingError.message}`, 500);

    // ── Create notification ──
    await supabase.from("notifications").insert({
      photographer_id: photographerId,
      type: "success",
      event: "new_booking",
      title: `New Booking — ${finalClientName}`,
      body: `${sessionData.title} confirmed for ${date}.`,
      metadata: { session_id, booking_id: bookingData.id },
    });

    // ── Upsert client record ──
    if (client_email.trim()) {
      const clientPayload: Record<string, any> = {
        photographer_id: photographerId,
        email: client_email.trim(),
        full_name: finalClientName,
      };
      if (client_phone) clientPayload.phone = client_phone;

      await supabase.from("clients").upsert(clientPayload, { onConflict: "photographer_id,email" });
    }

    return new Response(
      JSON.stringify({
        id: bookingData.id,
        has_conflict: hasConflict,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("create-booking error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
