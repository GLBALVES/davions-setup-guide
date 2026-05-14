// Shared logic for Pagar.me transparent checkout edge functions.
// Handles: booking upsert, amount calculation, items, customer, split rules,
// and order finalization (status updates + slot booking).
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getPaymentSettings, buildSplitRules, resolveFeePercent } from "./pagarme-split.ts";

export const PAGARME_BASE = "https://api.pagar.me/core/v5";

export interface SelectedExtra {
  id: string;
  description: string;
  price: number;
  qty: number;
}

export interface BookingInput {
  bookingId?: string;
  sessionId: string;
  slotId?: string;
  bookedDate?: string;
  startTime?: string;
  clientEmail: string;
  clientName: string;
  clientTaxId?: string | null;
  clientPhone?: string | null;
  selectedExtras?: SelectedExtra[];
  contractHtml?: string | null;
  signatureData?: string | null;
}

/**
 * Parse any phone string into Pagar.me's { country_code, area_code, number } shape.
 * Defaults to BR (+55). Returns null when there are not enough digits.
 */
export function parsePhoneForPagarme(raw?: string | null) {
  if (!raw) return null;
  const onlyDigits = String(raw).replace(/\D/g, "");
  if (!onlyDigits) return null;
  // Strip leading country code 55 if present and we have a full BR number
  let digits = onlyDigits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  // Need at least area (2) + 8 digits
  if (digits.length < 10) return null;
  const area = digits.slice(0, 2);
  const number = digits.slice(2, 11); // up to 9 digits
  return { country_code: "55", area_code: area, number };
}

export interface PreparedOrder {
  bookingId: string;
  storeSlug: string;
  sessionTitle: string;
  amountToCharge: number;
  fullTotal: number;
  isDeposit: boolean;
  paymentRequired: boolean;
  items: Array<{ amount: number; description: string; quantity: number; code?: string }>;
  customer: Record<string, unknown>;
  split_rules: ReturnType<typeof buildSplitRules>;
  metadata: Record<string, string>;
  extrasTotal: number;
  photographerId: string;
}

/**
 * Creates/reuses the booking row, computes amounts and returns the
 * pieces needed to build a Pagar.me order. Throws if config is invalid.
 */
export async function prepareBookingOrder(
  supabase: SupabaseClient,
  input: BookingInput
): Promise<PreparedOrder> {
  const {
    bookingId: existingBookingId,
    sessionId,
    slotId,
    bookedDate,
    clientEmail,
    clientName,
    selectedExtras = [],
    contractHtml = null,
    signatureData = null,
    clientTaxId = null,
    clientPhone = null,
  } = input;

  // ── Session ──
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select("title, price, photographer_id, deposit_enabled, deposit_amount, deposit_type, tax_rate, payment_required")
    .eq("id", sessionId)
    .single();
  if (sessionError || !sessionData) throw new Error("Session not found");

  const paymentRequired = (sessionData as any).payment_required !== false;

  // ── Photographer ──
  const { data: photoData } = await supabase
    .from("photographers")
    .select("store_slug, pagarme_recipient_id")
    .eq("id", sessionData.photographer_id)
    .single();

  const storeSlug = (photoData as any)?.store_slug ?? "";
  const recipientId = (photoData as any)?.pagarme_recipient_id as string | null;
  if (!recipientId) throw new Error("Photographer has not finished Pagar.me onboarding (recipient missing)");

  // ── Create or reuse booking ──
  let bookingId = existingBookingId;
  if (!bookingId) {
    const insertPayload: Record<string, unknown> = {
      session_id: sessionId,
      availability_id: slotId,
      photographer_id: sessionData.photographer_id,
      client_name: clientName,
      client_email: clientEmail,
      status: "pending",
      payment_status: "pending",
      booked_date: bookedDate,
    };
    if (typeof contractHtml === "string" && contractHtml.length > 0)
      insertPayload.contract_html_snapshot = contractHtml;
    if (typeof signatureData === "string" && signatureData.startsWith("data:image"))
      insertPayload.contract_signature_data = signatureData;
    if (typeof clientTaxId === "string" && clientTaxId.trim().length > 0)
      insertPayload.client_tax_id = clientTaxId.trim();

    const { data: newBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert(insertPayload)
      .select("id")
      .single();
    if (bookingError || !newBooking) throw new Error(bookingError?.message ?? "Failed to create booking");
    bookingId = newBooking.id;
  }

  // ── Amounts ──
  const extras: SelectedExtra[] = selectedExtras ?? [];
  const extrasTotal = extras.reduce((s, e) => s + e.price * e.qty, 0);
  const sessionPrice = sessionData.price as number;
  const subtotal = sessionPrice + extrasTotal;
  const taxRate = (sessionData.tax_rate as number) ?? 0;
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const fullTotal = subtotal + taxAmount;

  const isDeposit = sessionData.deposit_enabled as boolean;
  let amountToCharge = fullTotal;
  if (isDeposit) {
    const depositType = sessionData.deposit_type as string;
    const isPercent = depositType === "percent" || depositType === "percentage";
    amountToCharge = isPercent
      ? Math.round(fullTotal * ((sessionData.deposit_amount as number) / 100))
      : (sessionData.deposit_amount as number);
  }

  // ── Items ──
  const items: PreparedOrder["items"] = [];
  if (isDeposit) {
    items.push({
      amount: amountToCharge,
      description: `${sessionData.title} — Sinal`.slice(0, 256),
      quantity: 1,
      code: bookingId!,
    });
  } else {
    items.push({
      amount: sessionPrice,
      description: (sessionData.title as string).slice(0, 256),
      quantity: 1,
      code: bookingId!,
    });
    for (const e of extras) {
      items.push({ amount: e.price, description: e.description.slice(0, 256), quantity: e.qty });
    }
    if (taxAmount > 0) {
      items.push({ amount: taxAmount, description: `Imposto (${taxRate}%)`, quantity: 1 });
    }
  }

  // ── Customer ──
  const docDigits = (clientTaxId ?? "").replace(/\D/g, "");
  const customer: Record<string, unknown> = {
    name: clientName || clientEmail,
    email: clientEmail,
    type: docDigits.length === 14 ? "company" : "individual",
  };
  if (docDigits.length === 11 || docDigits.length === 14) {
    customer.document = docDigits;
    customer.document_type = docDigits.length === 14 ? "CNPJ" : "CPF";
  }
  const phone = parsePhoneForPagarme(clientPhone);
  if (phone) {
    customer.phones = { mobile_phone: phone };
  }

  // ── Split ──
  const settings = await getPaymentSettings(supabase);
  const feePercent = await resolveFeePercent(
    supabase,
    sessionData.photographer_id as string,
    settings.default_fee_percent
  );
  const split_rules = buildSplitRules({
    photographerRecipientId: recipientId,
    masterRecipientId: settings.pagarme_master_recipient_id ?? "",
    feePercent,
  });

  return {
    bookingId: bookingId!,
    storeSlug,
    sessionTitle: sessionData.title as string,
    amountToCharge,
    fullTotal,
    isDeposit,
    paymentRequired,
    items,
    customer,
    split_rules,
    metadata: {
      booking_id: bookingId!,
      session_id: sessionId,
      store_slug: storeSlug,
      is_deposit: isDeposit ? "true" : "false",
      payment_kind: isDeposit ? "deposit" : "full",
    },
    extrasTotal,
    photographerId: sessionData.photographer_id as string,
  };
}

export async function pagarmeFetch(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get("PAGARME_API_KEY");
  if (!apiKey) throw new Error("PAGARME_API_KEY not configured");
  const auth = btoa(`${apiKey}:`);
  const resp = await fetch(`${PAGARME_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error("Pagar.me API error:", JSON.stringify(data));
    const detail = data?.errors
      ? Object.entries(data.errors).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ")
      : data?.message ?? "Pagar.me request failed";
    throw new Error(detail);
  }
  return data;
}

export async function persistOrderId(supabase: SupabaseClient, bookingId: string, orderId: string, extrasTotal: number) {
  await supabase
    .from("bookings")
    .update({ pagarme_order_id: orderId, extras_total: extrasTotal })
    .eq("id", bookingId);
}

export async function markBookingPaid(
  supabase: SupabaseClient,
  bookingId: string,
  slotId?: string | null
) {
  await supabase
    .from("bookings")
    .update({ status: "confirmed", payment_status: "paid" })
    .eq("id", bookingId);
  if (slotId) {
    await supabase.from("session_availability").update({ is_booked: true }).eq("id", slotId);
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
