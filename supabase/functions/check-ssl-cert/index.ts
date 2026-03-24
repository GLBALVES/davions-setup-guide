const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CrtShEntry {
  common_name: string;
  not_after: string;
  not_before: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain");

    if (!domain || typeof domain !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing domain query param" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .trim();

    const crtUrl = `https://crt.sh/?q=${encodeURIComponent(cleanDomain)}&output=json`;

    const res = await fetch(crtUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ domain: cleanDomain, expiresAt: null, error: `crt.sh returned ${res.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw: CrtShEntry[] = await res.json();

    if (!Array.isArray(raw) || raw.length === 0) {
      return new Response(
        JSON.stringify({ domain: cleanDomain, expiresAt: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = Date.now();

    // Find the cert with the furthest not_after that hasn't expired yet
    const validCerts = raw.filter((c) => {
      if (!c.not_after) return false;
      return new Date(c.not_after).getTime() > now;
    });

    // Sort descending by not_after
    validCerts.sort(
      (a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime()
    );

    const best = validCerts[0] ?? null;

    // If all certs are expired, find the most recently expired one
    if (!best) {
      const allSorted = [...raw].sort(
        (a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime()
      );
      const latest = allSorted[0];
      return new Response(
        JSON.stringify({
          domain: cleanDomain,
          expiresAt: latest?.not_after ? new Date(latest.not_after).toISOString() : null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        domain: cleanDomain,
        expiresAt: new Date(best.not_after).toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-ssl-cert error:", err);
    return new Response(
      JSON.stringify({ error: String(err), expiresAt: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
