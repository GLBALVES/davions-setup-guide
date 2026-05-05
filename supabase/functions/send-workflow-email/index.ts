import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Payload {
  photographer_id: string;
  trigger: string;
  recipient_email: string;
  recipient_name?: string;
  vars?: Record<string, string>;
  project_id?: string;
  booking_id?: string;
  gallery_id?: string;
  /** if true, will skip dispatch dedupe check */
  force?: boolean;
}

function fill(html: string, vars: Record<string, string>): string {
  let out = html || "";
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v ?? "");
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: Payload = await req.json();
    const { photographer_id, trigger, recipient_email, vars = {}, project_id, booking_id, gallery_id, force } = body;

    if (!photographer_id || !trigger || !recipient_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedupe (per project/booking/gallery + trigger)
    if (!force) {
      const { data: already } = await supabase
        .from("workflow_email_dispatched")
        .select("id")
        .eq("photographer_id", photographer_id)
        .eq("trigger", trigger)
        .eq("project_id", project_id ?? null)
        .eq("booking_id", booking_id ?? null)
        .eq("gallery_id", gallery_id ?? null)
        .maybeSingle();
      if (already) {
        return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: tpl } = await supabase
      .from("workflow_email_templates")
      .select("*")
      .eq("photographer_id", photographer_id)
      .eq("stage_trigger", trigger)
      .maybeSingle();

    if (!tpl || !tpl.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "template_disabled_or_missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: photographer } = await supabase
      .from("photographers")
      .select("full_name, email")
      .eq("id", photographer_id)
      .single();

    const mergedVars: Record<string, string> = {
      client_name: body.recipient_name || "",
      photographer_name: photographer?.full_name || "",
      studio_name: photographer?.full_name || "Davions",
      studio_email: photographer?.email || "",
      ...vars,
    };

    const subject = fill(tpl.subject, mergedVars);
    const html = fill(tpl.html_content, mergedVars);
    const senderName = (tpl.from_name?.trim() || photographer?.full_name || "Davions");

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { name: senderName, email: "noreply@davions.com" },
        to: [{ email: recipient_email, name: body.recipient_name }],
        bcc: tpl.bcc_email ? [{ email: tpl.bcc_email }] : undefined,
        subject,
        htmlContent: html,
      }),
    });

    let status = "sent";
    let errMsg: string | null = null;
    if (!res.ok) {
      status = "error";
      errMsg = await res.text();
    }

    await supabase.from("workflow_email_logs").insert({
      photographer_id,
      template_id: tpl.id,
      stage_trigger: trigger,
      recipient_email,
      subject,
      status,
      is_test: false,
      error_message: errMsg,
    });

    if (status === "sent") {
      await supabase.from("workflow_email_dispatched").insert({
        photographer_id,
        trigger,
        project_id: project_id ?? null,
        booking_id: booking_id ?? null,
        gallery_id: gallery_id ?? null,
        recipient_email,
      });
    }

    if (!res.ok) {
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
