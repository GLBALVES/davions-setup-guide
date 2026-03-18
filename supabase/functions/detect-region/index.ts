import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map country codes to currency info
const COUNTRY_CURRENCY_MAP: Record<string, { currency: string; locale: string; symbol: string }> = {
  BR: { currency: "BRL", locale: "pt", symbol: "R$" },
  MX: { currency: "MXN", locale: "es", symbol: "MX$" },
  AR: { currency: "MXN", locale: "es", symbol: "MX$" }, // LatAm → MXN pricing
  CO: { currency: "MXN", locale: "es", symbol: "MX$" },
  CL: { currency: "MXN", locale: "es", symbol: "MX$" },
  PE: { currency: "MXN", locale: "es", symbol: "MX$" },
  VE: { currency: "MXN", locale: "es", symbol: "MX$" },
  EC: { currency: "MXN", locale: "es", symbol: "MX$" },
  BO: { currency: "MXN", locale: "es", symbol: "MX$" },
  PY: { currency: "MXN", locale: "es", symbol: "MX$" },
  UY: { currency: "MXN", locale: "es", symbol: "MX$" },
  GT: { currency: "MXN", locale: "es", symbol: "MX$" },
  HN: { currency: "MXN", locale: "es", symbol: "MX$" },
  SV: { currency: "MXN", locale: "es", symbol: "MX$" },
  NI: { currency: "MXN", locale: "es", symbol: "MX$" },
  CR: { currency: "MXN", locale: "es", symbol: "MX$" },
  PA: { currency: "MXN", locale: "es", symbol: "MX$" },
  DO: { currency: "MXN", locale: "es", symbol: "MX$" },
  CU: { currency: "MXN", locale: "es", symbol: "MX$" },
  ES: { currency: "MXN", locale: "es", symbol: "MX$" },
};

const DEFAULT_REGION = { country: "US", currency: "USD", locale: "en", symbol: "$" };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get IP from headers
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("cf-connecting-ip") ?? "";

    // Skip geo lookup for private/local IPs
    const isPrivate = !ip || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip === "::1";

    let country = "US";

    if (!isPrivate && ip) {
      try {
        const geoRes = await fetch(`https://ip-api.com/json/${ip}?fields=countryCode`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData?.countryCode) country = geoData.countryCode;
        }
      } catch {
        // Fallback to USD on geo lookup failure
      }
    }

    const regionData = COUNTRY_CURRENCY_MAP[country];
    const result = regionData
      ? { country, currency: regionData.currency, locale: regionData.locale, symbol: regionData.symbol }
      : { ...DEFAULT_REGION, country };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ...DEFAULT_REGION, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Always return 200 with fallback
    });
  }
});
