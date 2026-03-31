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

// --- Web Push Encryption (RFC 8291 / aes128gcm) ---

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  // HKDF-Extract: PRK = HMAC-SHA256(key=salt, data=ikm)
  const actualSalt = salt.length ? salt : new Uint8Array(32);
  const saltKey = await crypto.subtle.importKey("raw", actualSalt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));

  // HKDF-Expand: OKM = HMAC-SHA256(key=PRK, data=info || 0x01)
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

async function encryptPayload(
  clientPubB64: string,
  clientAuthB64: string,
  payload: Uint8Array
): Promise<Uint8Array | null> {
  try {
    const clientPub = b64urlDecode(clientPubB64);
    const clientAuth = b64urlDecode(clientAuthB64);
    const enc = new TextEncoder();

    // Generate ephemeral ECDH key pair
    const serverKeys = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );

    const serverPubRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", serverKeys.publicKey)
    );

    // Import client public key
    const clientKey = await crypto.subtle.importKey(
      "raw",
      clientPub,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    // ECDH shared secret
    const sharedSecret = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "ECDH", public: clientKey },
        serverKeys.privateKey,
        256
      )
    );

    // HKDF extract with auth as salt, shared secret as IKM
    // info for PRK: "WebPush: info\0" + clientPub + serverPub
    const prkInfo = concatBytes(
      enc.encode("WebPush: info\0"),
      clientPub,
      serverPubRaw
    );

    // IKM for final HKDF
    const ikm = await hkdf(sharedSecret, clientAuth, prkInfo, 32);

    // Generate 16-byte salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive content encryption key (CEK) and nonce
    const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
    const nonceInfo = enc.encode("Content-Encoding: nonce\0");

    const cek = await hkdf(ikm, salt, cekInfo, 16);
    const nonce = await hkdf(ikm, salt, nonceInfo, 12);

    // Pad payload: add delimiter byte 0x02 then zero padding
    // Minimal padding: just the delimiter
    const paddedPayload = new Uint8Array(payload.length + 1);
    paddedPayload.set(payload);
    paddedPayload[payload.length] = 2; // delimiter

    // AES-128-GCM encrypt
    const aesKey = await crypto.subtle.importKey(
      "raw",
      cek,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce },
        aesKey,
        paddedPayload
      )
    );

    // Build aes128gcm header:
    // salt (16) + rs (4, big-endian uint32) + idlen (1) + keyid (65 = serverPub)
    const rs = 4096;
    const header = new Uint8Array(16 + 4 + 1 + serverPubRaw.length);
    header.set(salt, 0);
    // rs as big-endian uint32
    header[16] = (rs >> 24) & 0xff;
    header[17] = (rs >> 16) & 0xff;
    header[18] = (rs >> 8) & 0xff;
    header[19] = rs & 0xff;
    // idlen
    header[20] = serverPubRaw.length;
    // keyid = server public key
    header.set(serverPubRaw, 21);

    return concatBytes(header, ciphertext);
  } catch (err) {
    console.error("[send-push] Encryption failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photographer_id, title, body, url } = await req.json();

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
      .select("id, endpoint, p256dh, auth")
      .eq("photographer_id", photographer_id);

    console.log("[send-push] Request:", { photographer_id, title });
    console.log("[send-push] Subs found:", subs?.length ?? 0, "err:", subsError?.message ?? "none");

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, cleaned: 0, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPub = b64urlDecode(Deno.env.get("VAPID_PUBLIC_KEY") ?? "");
    const vapidPriv = b64urlDecode(Deno.env.get("VAPID_PRIVATE_KEY") ?? "");

    const payloadJson = JSON.stringify({
      title: title || "Davions",
      body: body || "",
      url: url || "/dashboard",
    });
    const payloadBytes = new TextEncoder().encode(payloadJson);

    let sent = 0;
    const removeIds: string[] = [];
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        const vapidHeaders = await createVapidAuth(sub.endpoint, vapidPub, vapidPriv);

        // Try encrypted payload first, fall back to payloadless
        let fetchHeaders: Record<string, string> = {
          ...vapidHeaders,
          TTL: "86400",
          Urgency: "normal",
        };
        let fetchBody: Uint8Array | null = null;

        if (sub.p256dh && sub.auth) {
          const encrypted = await encryptPayload(sub.p256dh, sub.auth, payloadBytes);
          if (encrypted) {
            fetchHeaders["Content-Type"] = "application/octet-stream";
            fetchHeaders["Content-Encoding"] = "aes128gcm";
            fetchBody = encrypted;
          }
        }

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: fetchHeaders,
          body: fetchBody,
        });

        console.log("[send-push]", sub.id, res.status, res.statusText, fetchBody ? "encrypted" : "payloadless");

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
      mode: "encrypted",
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
