import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function b64url(arr: Uint8Array): string {
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function createVapidAuth(endpoint: string, vapidPub: Uint8Array, vapidPriv: Uint8Array) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const enc = new TextEncoder();

  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64url(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: now + 43200,
        sub: "mailto:noreply@davions.app",
      })
    )
  );
  const unsigned = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: b64url(vapidPub.slice(1, 33)),
      y: b64url(vapidPub.slice(33, 65)),
      d: b64url(vapidPriv),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned))
  );

  return {
    authorization: `vapid t=${unsigned}.${b64url(sig)}, k=${b64url(vapidPub)}`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photographer_id, title } = await req.json();

    if (!photographer_id || !title) {
      return new Response(JSON.stringify({ error: "photographer_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint")
      .eq("photographer_id", photographer_id);

    console.log("[send-push] Request:", { photographer_id, title });
    console.log("[send-push] Subs found:", subs?.length ?? 0, "err:", subsError?.message ?? "none");

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, cleaned: 0, total: 0, mode: "payloadless" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPub = b64urlDecode(Deno.env.get("VAPID_PUBLIC_KEY") ?? "");
    const vapidPriv = b64urlDecode(Deno.env.get("VAPID_PRIVATE_KEY") ?? "");

    let sent = 0;
    const removeIds: string[] = [];
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        const vapidHeaders = await createVapidAuth(sub.endpoint, vapidPub, vapidPriv);
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            ...vapidHeaders,
            TTL: "86400",
            Urgency: "normal",
          },
        });

        console.log("[send-push]", sub.id, res.status, res.statusText);

        if (res.ok || res.status === 201) {
          sent++;
          continue;
        }

        const text = await res.text();
        errors.push(`${res.status}: ${text.slice(0, 120)}`);

        if ([401, 403, 404, 410].includes(res.status)) {
          removeIds.push(sub.id);
        }
      } catch (error) {
        console.error("[send-push] Sub error", sub.id, error);
        errors.push(String(error).slice(0, 120));
      }
    }

    if (removeIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", removeIds);
      console.log("[send-push] Cleaned", removeIds.length, "stale subs");
    }

    const result = {
      sent,
      cleaned: removeIds.length,
      total: subs.length,
      mode: "payloadless",
      errors: errors.length ? errors : undefined,
    };

    console.log("[send-push] Result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-push] Top-level error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
