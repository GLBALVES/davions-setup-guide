import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const { booking_id } = await req.json();
    if (!booking_id || typeof booking_id !== "string") {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, photographer_id, client_name, booked_date, session_id")
      .eq("id", booking_id)
      .maybeSingle();

    if (bErr || !booking) {
      console.error("[notify-briefing-response] booking lookup failed", bErr);
      return new Response(JSON.stringify({ error: "booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("title")
      .eq("id", booking.session_id)
      .maybeSingle();

    const sessionTitle = (session as any)?.title || "Session";
    const clientName = booking.client_name || "Client";

    const title = `Briefing answered — ${clientName}`;
    const body = `${clientName} submitted the briefing for ${sessionTitle}.`;

    // Check preferences (default in_app=true, browser_push=false)
    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("in_app, browser_push")
      .eq("photographer_id", booking.photographer_id)
      .eq("event", "briefing_response")
      .maybeSingle();

    const inApp = pref ? (pref as any).in_app : true;
    const push = pref ? (pref as any).browser_push : false;

    if (inApp) {
      await supabase.from("notifications").insert({
        photographer_id: booking.photographer_id,
        type: "info",
        event: "briefing_response",
        title,
        body,
        metadata: { booking_id: booking.id, session_id: booking.session_id },
      });
    }

    if (push) {
      try {
        await supabase.functions.invoke("send-push", {
          body: {
            photographer_id: booking.photographer_id,
            title,
            body,
            url: `/dashboard/schedule`,
          },
        });
      } catch (e) {
        console.error("[notify-briefing-response] push failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-briefing-response] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
