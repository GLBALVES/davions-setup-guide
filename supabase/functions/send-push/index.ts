import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- helpers ---

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

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const r = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { r.set(a, off); off += a.length; }
  return r;
}

// --- HKDF (RFC 5869) ---

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", salt.length ? salt : new Uint8Array(32), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
  const infoKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const t = new Uint8Array(await crypto.subtle.sign("HMAC", infoKey, concat(info, new Uint8Array([1]))));
  return t.slice(0, length);
}

// --- RFC 8291 aes128gcm encryption ---

function buildInfo(label: string, context: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  // "Content-Encoding: <label>\0" + context
  return concat(enc.encode("Content-Encoding: "), enc.encode(label), new Uint8Array([0]), context);
}

async function encryptPayload(
  clientPubRaw: Uint8Array,
  authSecret: Uint8Array,
  payload: Uint8Array
): Promise<{ body: Uint8Array; serverPubRaw: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  // Import client public key and derive shared secret
  const clientPub = await crypto.subtle.importKey("raw", clientPubRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientPub }, serverKeys.privateKey, 256));

  // RFC 8291 key derivation
  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const keyInfoInput = concat(new TextEncoder().encode("WebPush: info\0"), clientPubRaw, serverPubRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfoInput, 32);

  // Salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Context for CEK and nonce derivation (just the key_info/nonce_info labels with no extra context for aes128gcm)
  const cekInfo = buildInfo("aes128gcm", new Uint8Array(0));
  const nonceInfo = buildInfo("nonce", new Uint8Array(0));

  const contentKey = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad payload: payload + delimiter(0x02) for aes128gcm
  const paddedPayload = concat(payload, new Uint8Array([2]));

  // Encrypt
  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload));

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const idlen = new Uint8Array([65]); // uncompressed P-256 key length
  const header = concat(salt, rs, idlen, serverPubRaw);

  return { body: concat(header, ciphertext), serverPubRaw };
}

// --- VAPID JWT (ES256) ---

async function createVapidAuth(
  endpoint: string,
  vapidPub: Uint8Array,
  vapidPriv: Uint8Array
): Promise<{ authorization: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const enc = new TextEncoder();

  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64url(enc.encode(JSON.stringify({
    aud: audience,
    exp: now + 43200,
    sub: "mailto:noreply@davions.app",
  })));
  const unsigned = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC", crv: "P-256",
      x: b64url(vapidPub.slice(1, 33)),
      y: b64url(vapidPub.slice(33, 65)),
      d: b64url(vapidPriv),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)));
  const jwt = `${unsigned}.${b64url(sig)}`;

  return {
    authorization: `vapid t=${jwt}, k=${b64url(vapidPub)}`,
  };
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photographer_id, title, body, url } = await req.json();
    console.log("[send-push] Request:", { photographer_id, title });

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

    console.log("[send-push] Subs found:", subs?.length ?? 0, "err:", subsError?.message ?? "none");

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscriptions" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const vapidPubRaw = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivRaw = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidPub = b64urlDecode(vapidPubRaw);
    const vapidPriv = b64urlDecode(vapidPrivRaw);
    const payloadBytes = new TextEncoder().encode(JSON.stringify({ title, body: body || "", url: url || "/dashboard" }));

    let sent = 0;
    const removeIds: string[] = [];
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        const clientPub = b64urlDecode(sub.p256dh);
        const clientAuth = b64urlDecode(sub.auth);

        const { body: encBody } = await encryptPayload(clientPub, clientAuth, payloadBytes);
        const vapidHeaders = await createVapidAuth(sub.endpoint, vapidPub, vapidPriv);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            ...vapidHeaders,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            TTL: "86400",
          },
          body: encBody,
        });

        console.log("[send-push]", sub.id, res.status, res.statusText);

        if (res.status === 410 || res.status === 404) {
          removeIds.push(sub.id);
        } else if (res.status === 401 || res.status === 403) {
          // VAPID mismatch or auth error — stale subscription, remove it
          const txt = await res.text();
          console.error("[send-push] Auth error, removing sub:", sub.id, txt.slice(0, 200));
          removeIds.push(sub.id);
          errors.push(`${res.status}: ${txt.slice(0, 120)}`);
        } else if (res.ok || res.status === 201) {
          sent++;
        } else {
          const txt = await res.text();
          console.error("[send-push] Failed", res.status, txt.slice(0, 200));
          errors.push(`${res.status}: ${txt.slice(0, 120)}`);
        }
      } catch (e) {
        console.error("[send-push] Error for sub", sub.id, e);
        errors.push(String(e).slice(0, 120));
      }
    }

    if (removeIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", removeIds);
      console.log("[send-push] Cleaned", removeIds.length, "stale subs");
    }

    const result = { sent, cleaned: removeIds.length, total: subs.length, errors: errors.length > 0 ? errors : undefined };
    console.log("[send-push] Result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-push] Top-level error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
