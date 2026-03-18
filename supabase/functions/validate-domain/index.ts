import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const { data, error } = await supabase
      .from("photographers")
      .select("id")
      .eq("custom_domain", cleanDomain)
      .maybeSingle();

    if (error) {
      console.error("validate-domain DB error:", error);
      return new Response(null, { status: 500 });
    }

    if (data) {
      // Domain exists → allow Caddy to issue TLS
      return new Response(null, { status: 200 });
    } else {
      // Domain not registered → reject TLS
      return new Response(null, { status: 403 });
    }
  } catch (err) {
    console.error("validate-domain error:", err);
    return new Response(null, { status: 500 });
  }
});
