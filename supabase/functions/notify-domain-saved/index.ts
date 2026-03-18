import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { domain, photographerName, photographerEmail, action } = await req.json();

    if (!domain) {
      return new Response(JSON.stringify({ error: "Missing domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isRemoval = action === "removed";

    // Calculate domain type and DNS records (only needed for new domains)
    const parts = domain.split(".");
    const isSubdomain = parts.slice(1).length >= 2;
    const subName = isSubdomain ? parts[0] : null;
  const verifyValue = `lovable_verify=${domain.replace(/\./g, "_")}`;

  const vpsIp = Deno.env.get("VPS_IP") || "147.93.112.182";
  const aRecords = isSubdomain
    ? [`A     ${subName}    →  ${vpsIp}`]
    : [
        `A     @           →  ${vpsIp}`,
        `A     www         →  ${vpsIp}`,
      ];
  const dnsBlock = [...aRecords, `TXT   _lovable    →  ${verifyValue}`].join("\n");

    const domainType = isSubdomain ? "Subdomain" : "Root Domain";
    const now = new Date().toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });

    const studioLabel = photographerName || photographerEmail || "Unknown";

    const emailHtml = isRemoval ? `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:18px;font-weight:600;margin-bottom:4px;">Custom domain removed</h2>
  <p style="color:#666;font-size:13px;margin-top:0;">A photographer has removed their custom domain. You may want to remove it from the Lovable project settings as well.</p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px 0;color:#888;width:140px;">Studio</td>
      <td style="padding:10px 0;font-weight:500;">${studioLabel}</td>
    </tr>
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px 0;color:#888;">Email</td>
      <td style="padding:10px 0;">${photographerEmail || "—"}</td>
    </tr>
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px 0;color:#888;">Domain removed</td>
      <td style="padding:10px 0;font-family:monospace;">${domain}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#888;">Date (UTC)</td>
      <td style="padding:10px 0;">${now}</td>
    </tr>
  </table>

  <p style="font-size:13px;color:#444;margin-top:24px;">
    <strong>Action needed:</strong> Remove this domain from the Lovable project settings if it was previously added.
  </p>
</body>
</html>` : `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:18px;font-weight:600;margin-bottom:4px;">New custom domain saved</h2>
  <p style="color:#666;font-size:13px;margin-top:0;">A photographer just configured a custom domain. SSL will be provisioned automatically via Caddy once DNS propagates.</p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px 0;color:#888;width:140px;">Studio</td>
      <td style="padding:10px 0;font-weight:500;">${studioLabel}</td>
    </tr>
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px 0;color:#888;">Email</td>
      <td style="padding:10px 0;">${photographerEmail || "—"}</td>
    </tr>
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px 0;color:#888;">Domain</td>
      <td style="padding:10px 0;font-family:monospace;">${domain}</td>
    </tr>
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px 0;color:#888;">Type</td>
      <td style="padding:10px 0;">${domainType}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#888;">Date (UTC)</td>
      <td style="padding:10px 0;">${now}</td>
    </tr>
  </table>

  <h3 style="font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#888;margin-bottom:8px;">DNS records to configure</h3>
  <pre style="background:#f5f5f5;border:1px solid #e0e0e0;padding:16px;font-size:13px;line-height:1.8;border-radius:4px;overflow-x:auto;">${dnsBlock}</pre>

  <p style="font-size:13px;color:#444;margin-top:24px;">
    <strong>Action needed:</strong> Add this domain in the Lovable project settings so it resolves correctly.
  </p>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Davions <noreply@davions.com>",
        to: ["team@davions.com"],
        subject: isRemoval ? `Custom domain removed — ${domain}` : `New custom domain — ${domain}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend error:", body);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-domain-saved error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
