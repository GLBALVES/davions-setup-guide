import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { bookingId, clientEmail, clientName, sessionTitle, bookedDate, startTime } = await req.json();
    if (!bookingId || !clientEmail) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get photographer info
    const { data: photographer } = await supabase.from("photographers").select("full_name, brand_name, email").eq("id", user.id).single();
    const senderName = photographer?.brand_name || photographer?.full_name || "Photographer";

    const origin = req.headers.get("origin") || "https://davions-page-builder.lovable.app";
    const confirmUrl = `${origin}/booking/${bookingId}/confirm`;

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <p style="font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #888; margin-bottom: 24px;">${senderName}</p>
        <h1 style="font-size: 22px; font-weight: 300; margin-bottom: 8px;">Your Session is Booked!</h1>
        <p style="font-size: 14px; color: #666; margin-bottom: 32px;">Hi ${clientName}, here are your booking details:</p>
        <div style="border: 1px solid #e5e5e5; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 15px; font-weight: 400;">${sessionTitle}</p>
          <p style="margin: 0 0 4px; font-size: 13px; color: #666;">📅 ${bookedDate}</p>
          ${startTime ? `<p style="margin: 0; font-size: 13px; color: #666;">🕐 ${startTime}</p>` : ""}
        </div>
        <p style="font-size: 13px; color: #666; margin-bottom: 24px;">Please click the button below to complete your booking — fill in the briefing, review the contract, and proceed with payment.</p>
        <a href="${confirmUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 32px; text-decoration: none; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">Complete Your Booking</a>
        <p style="font-size: 11px; color: #aaa; margin-top: 40px;">If you have any questions, reply directly to this email.</p>
      </div>
    `;

    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: senderName, email: "noreply@davions.com" },
        to: [{ email: clientEmail, name: clientName }],
        replyTo: { email: photographer?.email || "noreply@davions.com", name: senderName },
        subject: `${sessionTitle} — Complete Your Booking`,
        htmlContent: html,
      }),
    });

    const result = await emailRes.json();
    return new Response(JSON.stringify({ sent: true, result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
