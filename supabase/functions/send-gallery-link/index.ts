import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { galleryId, clientEmail, clientName } = await req.json();
    if (!galleryId || !clientEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch gallery (must belong to the authenticated photographer)
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("id, title, access_code, status, photographer_id")
      .eq("id", galleryId)
      .eq("photographer_id", user.id)
      .single();

    if (galleryError || !gallery) {
      return new Response(JSON.stringify({ error: "Gallery not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch photographer name
    const { data: photographer } = await supabase
      .from("photographers")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const photographerName = photographer?.full_name || "Your Photographer";
    const galleryUrl = `${req.headers.get("origin") || "https://app.davions.com"}/gallery/${galleryId}`;
    const greeting = clientName ? `Hi ${clientName},` : "Hi,";

    const hasCode = Boolean(gallery.access_code);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;">
        <tr><td style="padding:40px 48px 0;">
          <p style="margin:0 0 32px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#999;">${photographerName}</p>
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:300;letter-spacing:0.05em;color:#111;">${gallery.title}</h1>
          <p style="margin:0 0 32px;font-size:13px;color:#777;">Your gallery is ready to view.</p>
          <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.7;">${greeting}<br><br>
            ${photographerName} has shared your gallery with you. Click the button below to view your photos.
          </p>

          ${hasCode ? `
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#f5f5f5;border:1px solid #e5e5e5;width:100%;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#999;">Access Code</p>
              <p style="margin:0;font-size:22px;font-family:Courier New,monospace;letter-spacing:0.3em;color:#111;font-weight:bold;">${gallery.access_code}</p>
              <p style="margin:6px 0 0;font-size:11px;color:#aaa;">You'll need this code to unlock the gallery.</p>
            </td></tr>
          </table>` : ""}

          <table cellpadding="0" cellspacing="0" style="margin:0 0 40px;">
            <tr><td>
              <a href="${galleryUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 32px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;">View Gallery</a>
            </td></tr>
          </table>

          <p style="margin:0 0 4px;font-size:11px;color:#bbb;">Or copy this link:</p>
          <p style="margin:0 0 40px;font-size:11px;color:#999;word-break:break-all;">${galleryUrl}</p>

        </td></tr>
        <tr><td style="padding:24px 48px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#ccc;">Powered by Davions</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please set RESEND_API_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Davions <noreply@davions.com>",
        to: [clientEmail],
        subject: `Your gallery is ready — ${gallery.title}`,
        html: htmlBody,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
