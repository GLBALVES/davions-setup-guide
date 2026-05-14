// Shared helper to build Pagar.me split_rules.
//
// Rule (per user spec):
//   - The configured "transaction_fee_percent" is the APP's total cut.
//   - The APP absorbs the Pagar.me processing fee out of its own share.
//   - The photographer always receives (100 - feePercent)% gross, with no
//     processing fee deduction on their side.
//
// Example: amount 100, app fee 7%, pagar.me fee 5
//   master      → 7  − 5 (pagar.me fee) = 2
//   photographer → 93

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type PaymentSettings = {
  pagarme_master_recipient_id: string | null;
  default_fee_percent: number;
};

export async function getPaymentSettings(
  supabase: SupabaseClient
): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from("app_payment_settings")
    .select("pagarme_master_recipient_id, davions_commission_percent")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load payment settings: ${error.message}`);
  if (!data) throw new Error("No payment settings configured");
  return {
    pagarme_master_recipient_id: data.pagarme_master_recipient_id,
    default_fee_percent: Number(data.davions_commission_percent ?? 5),
  };
}

/**
 * Resolves the operation fee % for a given photographer based on their
 * `plan_key` and `business_currency`, falling back to the global default.
 */
export async function resolveFeePercent(
  supabase: SupabaseClient,
  photographerId: string,
  fallback: number
): Promise<number> {
  const { data: photo } = await supabase
    .from("photographers")
    .select("plan_key, business_currency")
    .eq("id", photographerId)
    .maybeSingle();

  const planKey = (photo as any)?.plan_key as string | null;
  const currency = ((photo as any)?.business_currency as string) || "BRL";
  if (!planKey) return fallback;

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("transaction_fee_percent")
    .eq("plan_key", planKey)
    .eq("currency", currency)
    .maybeSingle();

  const v = Number((plan as any)?.transaction_fee_percent);
  return Number.isFinite(v) ? v : fallback;
}

export function buildSplitRules(params: {
  photographerRecipientId: string;
  masterRecipientId: string;
  feePercent: number;
}) {
  const { photographerRecipientId, masterRecipientId } = params;
  if (!masterRecipientId) throw new Error("Master recipient ID not configured in admin payments panel");
  if (!photographerRecipientId) throw new Error("Photographer recipient ID is missing");

  const fee = Math.max(0, Math.min(100, Number(params.feePercent)));

  return [
    {
      // App share — absorbs Pagar.me processing fee
      recipient_id: masterRecipientId,
      amount: fee,
      type: "percentage" as const,
      options: {
        charge_processing_fee: true,
        charge_remainder_fee: true,
        liable: false,
      },
    },
    {
      // Photographer share — never charged the processing fee
      recipient_id: photographerRecipientId,
      amount: 100 - fee,
      type: "percentage" as const,
      options: {
        charge_processing_fee: false,
        charge_remainder_fee: false,
        liable: true,
      },
    },
  ];
}
