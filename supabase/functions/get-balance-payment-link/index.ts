import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Public redirect endpoint. Token is base64url(JSON{b: bookingId, e: expEpoch}) + "." + HMAC-SHA256(SERVICE_KEY, payload)
// On hit: validates signature/expiry, calls create-balance-payment-link, redirects 302 to the Stripe URL.

const enc = new TextEncoder();

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}
function b64urlEncode(buf: ArrayBuffer): string {
  const b = String.fromCharCode(...new Uint8Array(buf));
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return b64urlEncode(sig);
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response("missing token", { status: 400 });

    const [payload, sig] = token.split(".");
    if (!payload || !sig) return new Response("bad token", { status: 400 });

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const expectedSig = await hmac(secret, payload);
    if (expectedSig !== sig) return new Response("invalid signature", { status: 403 });

    const data = JSON.parse(b64urlDecode(payload));
    if (!data.b) return new Response("invalid payload", { status: 400 });
    if (data.e && Date.now() / 1000 > data.e) {
      return new Response("link expired", { status: 410 });
    }

    const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const resp = await fetch(`${supaUrl}/functions/v1/create-balance-payment-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ booking_id: data.b, origin: url.origin.replace(/\.supabase\.co$/, ".lovable.app") }),
    });
    const body = await resp.json();
    if (!resp.ok || !body.url) {
      return new Response(`error: ${body.error ?? "unknown"}`, { status: 500 });
    }

    return Response.redirect(body.url, 302);
  } catch (e) {
    return new Response(`error: ${String((e as Error).message ?? e)}`, { status: 500 });
  }
});
