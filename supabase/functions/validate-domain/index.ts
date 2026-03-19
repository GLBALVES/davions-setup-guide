import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain");

    if (!domain || typeof domain !== "string") {
      return new Response(null, { status: 400 });
    }

    // Normalize: strip protocol, path, port
    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[/:?#].*$/, "")
      .trim();

    if (!cleanDomain) {
      return new Response(null, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const callerIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("cf-connecting-ip") ??
      "unknown";

    const { data, error } = await supabase
      .from("photographers")
      .select("id")
      .eq("custom_domain", cleanDomain)
      .maybeSingle();

    if (error) {
      console.error(`[validate-domain] DB error for domain="${cleanDomain}" ip=${callerIp}:`, error);
      return new Response(JSON.stringify({ registered: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const registered = !!data;
    console.log(`[validate-domain] ip=${callerIp} domain="${cleanDomain}" → ${registered ? "REGISTERED (200)" : "NOT FOUND (403)"}`);

    if (registered) {
      // Domain exists → allow Caddy to issue TLS
      return new Response(JSON.stringify({ registered: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      // Domain not registered → reject TLS
      return new Response(JSON.stringify({ registered: false }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("validate-domain error:", err);
    return new Response(JSON.stringify({ registered: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
