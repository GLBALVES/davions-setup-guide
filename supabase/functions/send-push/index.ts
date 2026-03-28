import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Web Push helpers (VAPID + RFC 8291 encryption) ---

function base64urlToUint8Array(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const r = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) {
    r.set(a, off);
    off += a.length;
  }
  return r;
}

async function hkdfExtractExpand(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
  const infoKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const t = new Uint8Array(await crypto.subtle.sign("HMAC", infoKey, concatUint8(info, new Uint8Array([1]))));
  return t.slice(0, length);
}

function createInfo(type: string, clientPublic: Uint8Array, serverPublic: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const header = encoder.encode("Content-Encoding: ");
  const nul = new Uint8Array([0]);
  const cLen = new Uint8Array(2);
  new DataView(cLen.buffer).setUint16(0, clientPublic.length, false);
  const sLen = new Uint8Array(2);
  new DataView(sLen.buffer).setUint16(0, serverPublic.length, false);
  return concatUint8(header, typeBytes, nul, encoder.encode("P-256"), nul, cLen, clientPublic, sLen, serverPublic);
}

async function encryptPayload(
  clientPublicKey: Uint8Array,
  clientAuthSecret: Uint8Array,
  payload: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  const clientKey = await crypto.subtle.importKey("raw", clientPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKeys.privateKey, 256));

  const encoder = new TextEncoder();
  const authInfo = encoder.encode("Content-Encoding: auth\0");
  const prk = await hkdfExtractExpand(clientAuthSecret, sharedSecret, authInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cekInfo = createInfo("aesgcm", clientPublicKey, serverPublicKey);
  const contentKey = await hkdfExtractExpand(salt, prk, cekInfo, 16);

  const nonceInfo = createInfo("nonce", clientPublicKey, serverPublicKey);
  const nonce = await hkdfExtractExpand(salt, prk, nonceInfo, 12);

  const paddedPayload = concatUint8(new Uint8Array(2), payload);
  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload));

  return { ciphertext: encrypted, salt, serverPublicKey };
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: Uint8Array,
  vapidPrivateKey: Uint8Array
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = uint8ArrayToBase64url(
    new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: "mailto:noreply@davions.app" }))
  );
  const unsignedToken = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: uint8ArrayToBase64url(vapidPublicKey.slice(1, 33)),
      y: uint8ArrayToBase64url(vapidPublicKey.slice(33, 65)),
      d: uint8ArrayToBase64url(vapidPrivateKey),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsignedToken)));
  const token = `${unsignedToken}.${uint8ArrayToBase64url(sig)}`;

  return {
    authorization: `WebPush ${token}`,
    cryptoKey: `p256ecdsa=${uint8ArrayToBase64url(vapidPublicKey)}`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photographer_id, title, body, url } = await req.json();
    console.log("[send-push] Request received:", { photographer_id, title, body: body?.slice(0, 50) });

    if (!photographer_id || !title) {
      return new Response(JSON.stringify({ error: "photographer_id and title required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("photographer_id", photographer_id);

    console.log("[send-push] Subscriptions found:", subs?.length ?? 0, "error:", subsError?.message ?? "none");

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscriptions" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const vapidPubRaw = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivRaw = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    console.log("[send-push] VAPID keys present:", { pub: vapidPubRaw.length > 0, priv: vapidPrivRaw.length > 0 });

    const vapidPub = base64urlToUint8Array(vapidPubRaw);
    const vapidPriv = base64urlToUint8Array(vapidPrivRaw);
    const payloadBytes = new TextEncoder().encode(JSON.stringify({ title, body: body || "", url: url || "/dashboard" }));

    let sent = 0;
    const expiredIds: string[] = [];
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        console.log("[send-push] Processing subscription:", sub.id, "endpoint:", sub.endpoint.slice(0, 60));
        
        const clientPub = base64urlToUint8Array(sub.p256dh);
        const clientAuth = base64urlToUint8Array(sub.auth);
        console.log("[send-push] Client keys decoded - p256dh length:", clientPub.length, "auth length:", clientAuth.length);

        const { ciphertext, salt, serverPublicKey } = await encryptPayload(clientPub, clientAuth, payloadBytes);
        console.log("[send-push] Payload encrypted, ciphertext length:", ciphertext.length);

        const vapidHeaders = await createVapidAuthHeader(sub.endpoint, vapidPub, vapidPriv);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            ...vapidHeaders,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aesgcm",
            Encryption: `salt=${uint8ArrayToBase64url(salt)}`,
            "Crypto-Key": `dh=${uint8ArrayToBase64url(serverPublicKey)};${vapidHeaders.cryptoKey}`,
            TTL: "86400",
          },
          body: ciphertext,
        });

        console.log("[send-push] Push response:", res.status, res.statusText);

        if (res.status === 410 || res.status === 404) {
          expiredIds.push(sub.id);
          console.log("[send-push] Subscription expired/gone:", sub.id);
        } else if (res.ok || res.status === 201) {
          sent++;
          console.log("[send-push] Push sent successfully to:", sub.id);
        } else {
          const responseBody = await res.text();
          console.error(`[send-push] Push failed ${res.status} for ${sub.endpoint}: ${responseBody}`);
          errors.push(`${res.status}: ${responseBody.slice(0, 200)}`);
        }
      } catch (e) {
        console.error("[send-push] Push error for sub", sub.id, ":", e);
        errors.push(String(e));
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
      console.log("[send-push] Cleaned up expired subs:", expiredIds.length);
    }

    const result = { sent, expired: expiredIds.length, errors: errors.length > 0 ? errors : undefined };
    console.log("[send-push] Final result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-push] Top-level error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
