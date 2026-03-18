import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPECTED_IP = "185.158.133.1";
const CNAME_TARGET = "davions.com";

const COMPOUND_TLDS = [
  "com.br","net.br","org.br","edu.br","gov.br",
  "co.uk","com.au","co.nz","com.ar","com.mx","com.co",
];

function getRootDomain(domain: string): string {
  const parts = domain.split(".");
  const lastTwo = parts.slice(-2).join(".");
  const rootPartsCount = COMPOUND_TLDS.includes(lastTwo) ? 3 : 2;
  return parts.slice(-rootPartsCount).join(".");
}

function getExpectedTxtValue(domain: string): string {
  return `lovable_verify=${domain.replace(/\./g, "_")}`;
}

async function resolveA(hostname: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(8000) }
    );
    const json = await res.json();
    if (!json.Answer) return [];
    return (json.Answer as { type: number; data: string }[])
      .filter((r) => r.type === 1) // A record
      .map((r) => r.data.trim());
  } catch {
    return [];
  }
}

async function resolveCNAME(hostname: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=CNAME`,
      { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(8000) }
    );
    const json = await res.json();
    if (!json.Answer) return [];
    return (json.Answer as { type: number; data: string }[])
      .filter((r) => r.type === 5) // CNAME record
      .map((r) => r.data.replace(/\.$/, "").trim().toLowerCase());
  } catch {
    return [];
  }
}

async function resolveTXT(hostname: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=TXT`,
      { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(8000) }
    );
    const json = await res.json();
    if (!json.Answer) return [];
    return (json.Answer as { type: number; data: string }[])
      .filter((r) => r.type === 16) // TXT record
      .map((r) => r.data.replace(/^"|"$/g, "").trim());
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "Missing domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanDomain = domain.toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .trim();

    const rootDomain = getRootDomain(cleanDomain);
    const parts = cleanDomain.split(".");
    const lastTwo = parts.slice(-2).join(".");
    const rootPartsCount = COMPOUND_TLDS.includes(lastTwo) ? 3 : 2;
    const isSubdomain = parts.length > rootPartsCount;

    const expectedTxt = getExpectedTxtValue(cleanDomain);
    const txtHost = `_lovable.${rootDomain}`;

    // Run DNS lookups in parallel
    const [aRecords, txtRecords] = await Promise.all([
      resolveA(cleanDomain),
      resolveTXT(txtHost),
    ]);

    const aOk = aRecords.includes(EXPECTED_IP);
    const txtOk = txtRecords.some((t) => t.includes(expectedTxt));

    // Domain is active only if the A record resolves directly to the expected IP.
    // CNAME to davions.com is NOT a valid path: davions.com resolves to 185.158.133.1
    // which is a Cloudflare-owned IP, causing Error 1000 for any third-party CF account.
    const status = aOk ? "active" : "pending";

    return new Response(JSON.stringify({
      status,
      dns: {
        a: { ok: aOk, found: aRecords, expected: EXPECTED_IP },
        txt: { ok: txtOk, found: txtRecords, expected: expectedTxt, host: txtHost },
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-domain error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
