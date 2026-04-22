import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const {
      photographerId,
      name,
      email,
      message,
      pageId,
      pageTitle,
      formLabel,
      sourceUrl,
    } = body || {};

    if (!photographerId || !name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof name !== "string" || name.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isEmail(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof message !== "string" || message.length > 5000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get photographer info
    const { data: photographer, error: pErr } = await supabase
      .from("photographers")
      .select("id, email, full_name, business_name")
      .eq("id", photographerId)
      .maybeSingle();

    if (pErr || !photographer) {
      return new Response(JSON.stringify({ error: "Photographer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save submission
    await supabase.from("form_submissions").insert({
      photographer_id: photographerId,
      page_id: pageId || null,
      page_title: pageTitle || "",
      form_label: formLabel || "Contact Form",
      source_url: sourceUrl || null,
      data: { name, email, message },
    });

    const studioName =
      (photographer as any).business_name ||
      photographer.full_name ||
      "Studio";
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
    const safeStudio = escapeHtml(studioName);

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (BREVO_API_KEY && photographer.email) {
      // Email to photographer
      const ownerHtml = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9f9f9;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e5e5;">
        <tr><td style="padding:40px 48px 0;">
          <p style="margin:0 0 32px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#999;">${safeStudio}</p>
          <h1 style="margin:0 0 24px;font-size:22px;font-weight:300;letter-spacing:0.05em;color:#111;">New contact form submission</h1>
          <p style="margin:0 0 8px;font-size:13px;color:#666;"><strong>Name:</strong> ${safeName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#666;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin:24px 0 8px;font-size:13px;color:#666;"><strong>Message:</strong></p>
          <div style="margin:0 0 40px;font-size:14px;color:#444;line-height:1.8;">${safeMessage}</div>
        </td></tr>
        <tr><td style="padding:24px 48px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#ccc;">Powered by Davions</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: studioName, email: "noreply@davions.com" },
          to: [{ email: photographer.email, name: photographer.full_name || studioName }],
          replyTo: { email, name },
          subject: `New contact: ${name}`,
          htmlContent: ownerHtml,
        }),
      }).catch((e) => console.error("Owner email error:", e));

      // Confirmation copy to client
      const clientHtml = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9f9f9;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e5e5;">
        <tr><td style="padding:40px 48px 0;">
          <p style="margin:0 0 32px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#999;">${safeStudio}</p>
          <h1 style="margin:0 0 24px;font-size:22px;font-weight:300;letter-spacing:0.05em;color:#111;">We received your message</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.8;">Hi ${safeName}, thank you for reaching out. Here's a copy of what you sent — we'll get back to you as soon as possible.</p>
          <div style="margin:0 0 40px;padding:16px;background:#fafafa;border-left:2px solid #ddd;font-size:13px;color:#555;line-height:1.7;">${safeMessage}</div>
        </td></tr>
        <tr><td style="padding:24px 48px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#ccc;">Powered by Davions</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: studioName, email: "noreply@davions.com" },
          to: [{ email, name }],
          replyTo: { email: photographer.email, name: photographer.full_name || studioName },
          subject: `Copy of your message to ${studioName}`,
          htmlContent: clientHtml,
        }),
      }).catch((e) => console.error("Client email error:", e));
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-contact-form error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
