import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Payload {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  templateId?: string;
  stageTrigger?: string;
}

const SAMPLE: Record<string, string> = {
  "{{client_name}}": "Maria Souza",
  "{{project_title}}": "Ensaio Família Souza",
  "{{session_type}}": "Ensaio Família",
  "{{photographer_name}}": "Você",
  "{{shoot_date}}": new Date().toLocaleDateString("pt-BR"),
  "{{gallery_link}}": "https://davions.com/gallery/exemplo",
  "{{studio_name}}": "Davions Studio",
  "{{studio_email}}": "contato@davions.com",
};

function fillSample(html: string): string {
  let out = html;
  for (const [k, v] of Object.entries(SAMPLE)) {
    out = out.split(k).join(v);
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body: Payload = await req.json();
    if (!body.to || !body.subject || !body.html) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
    }

    const { data: studio } = await supabase
      .from("studio_members")
      .select("photographer_id")
      .eq("email", user.email)
      .eq("status", "active")
      .maybeSingle();
    const photographerId = studio?.photographer_id || user.id;

    const { data: photographer } = await supabase
      .from("photographers")
      .select("full_name")
      .eq("id", photographerId)
      .single();

    const senderName = body.fromName?.trim() || photographer?.full_name || "Davions";
    const subject = `[TESTE] ${body.subject}`;
    const html = fillSample(body.html);

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: corsHeaders });
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { name: senderName, email: "noreply@davions.com" },
        to: [{ email: body.to }],
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
      photographer_id: photographerId,
      template_id: body.templateId || null,
      stage_trigger: body.stageTrigger || "test",
      recipient_email: body.to,
      subject,
      status,
      is_test: true,
      error_message: errMsg,
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
