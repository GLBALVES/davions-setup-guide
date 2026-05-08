import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTRACT_VARIABLES = [
  "client_name", "client_email", "client_phone", "client_tax_id", "client_address",
  "session_title", "session_date", "session_time", "session_duration", "session_price",
  "num_photos", "includes", "selected_addons", "total_amount", "deposit_amount",
  "balance_amount", "photographer_name", "studio_name", "studio_address", "studio_email",
];

function normalizeToken(v: string): string {
  return v.replace(/&nbsp;/gi, " ").trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
}
function escapeRegExp(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function applyVariableValue(html: string, key: string, label: string, value: string): string {
  const nKey = normalizeToken(key);
  const nLabel = normalizeToken(label);
  const isMatch = (t: string) => {
    const n = normalizeToken(t);
    return n === nKey || n === nLabel;
  };
  return html
    .replace(
      new RegExp(`<span\\b(?=[^>]*\\bdata-variable=(["'])${escapeRegExp(key)}\\1)[^>]*>[\\s\\S]*?<\\/span>`, "gi"),
      value
    )
    .replace(/\[\[\s*([^\]]+?)\s*\]\]/g, (m, t) => (isMatch(t) ? value : m))
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, t) => (isMatch(t) ? value : m));
}

function resolveContract(
  html: string,
  data: Record<string, string>,
  customFields: Array<{ field_key: string; field_label: string; default_value?: string; value_source?: string; mapped_key?: string | null }>,
  customValues: Record<string, string>
): string {
  let result = CONTRACT_VARIABLES.reduce((acc, key) => applyVariableValue(acc, key, key, data[key] ?? ""), html);
  for (const cf of customFields) {
    const source = cf.value_source ?? "static";
    let val = "";
    if (source === "client_input") val = customValues[cf.field_key] ?? data[cf.field_key] ?? cf.default_value ?? "";
    else if (source === "mapped" && cf.mapped_key) val = data[cf.mapped_key] ?? customValues[cf.field_key] ?? cf.default_value ?? "";
    else val = data[cf.field_key] ?? customValues[cf.field_key] ?? cf.default_value ?? "";
    result = applyVariableValue(result, cf.field_key, cf.field_label, val);
  }
  return result
    .replace(/<span\b(?=[^>]*\bdata-variable=(["']))[^>]*>[\s\S]*?<\/span>/gi, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/\{\{[^}]+\}\}/g, "");
}

function fmtMoneyCents(cents: number, currency = "BRL", locale = "pt-BR"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format((cents ?? 0) / 100);
  } catch {
    return `${((cents ?? 0) / 100).toFixed(2)}`;
  }
}
function fmtDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  } catch { return d; }
}
function fmtTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id || !uuidRegex.test(booking_id)) {
      return new Response(JSON.stringify({ error: "Invalid booking_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .maybeSingle();
    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", (booking as any).session_id)
      .maybeSingle();
    if (!session || !(session as any).contract_text) {
      return new Response(JSON.stringify({ error: "No contract template on session" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: photographer } = await supabase
      .from("photographers")
      .select("full_name, business_name, business_address, business_city, business_state, business_zip, business_country, email")
      .eq("id", (booking as any).photographer_id)
      .maybeSingle();

    // Try to load existing client info from clients table
    const { data: client } = await supabase
      .from("clients")
      .select("full_name, phone, tax_id, address_street, address_city, address_state, address_zip, address_country")
      .eq("photographer_id", (booking as any).photographer_id)
      .eq("email", (booking as any).client_email)
      .maybeSingle();

    // Custom fields + values
    const { data: customFields } = await supabase
      .from("contract_custom_fields")
      .select("*")
      .eq("session_id", (session as any).id);

    const { data: cfValues } = await supabase
      .from("booking_custom_field_values")
      .select("field_key, value")
      .eq("booking_id", booking_id);

    const customValues: Record<string, string> = {};
    for (const row of cfValues ?? []) customValues[(row as any).field_key] = (row as any).value ?? "";

    // Bonuses + selected addons
    const { data: bonuses } = await supabase
      .from("session_bonuses")
      .select("text")
      .eq("session_id", (session as any).id)
      .order("position", { ascending: true });

    const { data: addonRows } = await supabase
      .from("booking_addons")
      .select("quantity, unit_price, description")
      .eq("booking_id", booking_id);

    const sessPrice = (session as any).price ?? 0;
    const taxRate = (session as any).tax_rate ?? 0;
    const extras = (addonRows ?? []).reduce((s: number, r: any) => s + (r.unit_price ?? 0) * (r.quantity ?? 1), 0);
    const sub = sessPrice + extras;
    const tax = Math.round(sub * (taxRate / 100));
    const total = sub + tax;
    const isPercent = (session as any).deposit_type === "percent" || (session as any).deposit_type === "percentage";
    const dep = (session as any).deposit_enabled
      ? (isPercent ? Math.round(total * (((session as any).deposit_amount ?? 0) / 100)) : ((session as any).deposit_amount ?? 0))
      : 0;

    const fullAddress = [
      (client as any)?.address_street,
      (client as any)?.address_city,
      (client as any)?.address_state,
      (client as any)?.address_zip,
      (client as any)?.address_country,
    ].map((s) => (s || "").trim()).filter(Boolean).join(", ");

    const data: Record<string, string> = {
      client_name: (client as any)?.full_name || (booking as any).client_name || "",
      client_email: (booking as any).client_email || "",
      client_phone: (client as any)?.phone || "",
      client_tax_id: (booking as any).client_tax_id || (client as any)?.tax_id || "",
      client_address: fullAddress,
      session_title: (session as any).title || "",
      session_date: fmtDate((booking as any).booked_date),
      session_time: fmtTime((booking as any).booked_time),
      session_duration: (session as any).duration_minutes ? `${(session as any).duration_minutes} min` : "",
      session_price: fmtMoneyCents(sessPrice),
      num_photos: (session as any).num_photos > 0 ? String((session as any).num_photos) : "—",
      includes: (bonuses ?? []).length > 0
        ? `<ul>${(bonuses as any[]).map((b) => `<li>${b.text}</li>`).join("")}</ul>`
        : "—",
      selected_addons: (addonRows ?? []).length > 0
        ? `<ul>${(addonRows as any[]).map((i) => `<li>${i.quantity}× ${i.description} — ${fmtMoneyCents(i.unit_price * i.quantity)}</li>`).join("")}</ul>`
        : "—",
      total_amount: fmtMoneyCents(total),
      deposit_amount: (session as any).deposit_enabled ? fmtMoneyCents(dep) : "—",
      balance_amount: fmtMoneyCents(total - dep),
      photographer_name: (photographer as any)?.full_name || "",
      studio_name: (photographer as any)?.business_name || (photographer as any)?.full_name || "",
      studio_address: [
        (photographer as any)?.business_address,
        (photographer as any)?.business_city,
        (photographer as any)?.business_state,
        (photographer as any)?.business_zip,
        (photographer as any)?.business_country,
      ].map((s) => (s || "").trim()).filter(Boolean).join(", "),
      studio_email: (photographer as any)?.email || "",
    };

    const html = resolveContract((session as any).contract_text, data, (customFields as any) ?? [], customValues);
    const signedAt = (booking as any).contract_signed_at ?? new Date().toISOString();

    await supabase.from("bookings").update({
      contract_html_snapshot: html,
      contract_signed_at: signedAt,
      contract_locked: true,
    }).eq("id", booking_id);

    await supabase.from("client_projects").update({
      signed_contract_html: html,
      contract_signed_at: signedAt,
    }).eq("booking_id", booking_id);

    return new Response(JSON.stringify({ ok: true, length: html.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("backfill-contract-snapshot error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
