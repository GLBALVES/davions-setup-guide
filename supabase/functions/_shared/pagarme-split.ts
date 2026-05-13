// Shared helper used by Pagar.me checkout edge functions to build split_rules
// based on the platform-wide settings stored in app_payment_settings.
//
// Usage:
//   import { getPaymentSettings, buildSplitRules } from "../_shared/pagarme-split.ts";
//   const settings = await getPaymentSettings(supabase);
//   const split_rules = buildSplitRules({
//     amount: 100_00,
//     photographerRecipientId: photographer.pagarme_recipient_id,
//     settings,
//   });

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type PaymentSettings = {
  pagarme_master_recipient_id: string | null;
  davions_commission_percent: number;
  charge_processing_fee: boolean;
};

export async function getPaymentSettings(
  supabase: SupabaseClient
): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from("app_payment_settings")
    .select("pagarme_master_recipient_id, davions_commission_percent, charge_processing_fee")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load payment settings: ${error.message}`);
  if (!data) throw new Error("No payment settings configured");

  return {
    pagarme_master_recipient_id: data.pagarme_master_recipient_id,
    davions_commission_percent: Number(data.davions_commission_percent ?? 5),
    charge_processing_fee: Boolean(data.charge_processing_fee ?? true),
  };
}

/**
 * Builds Pagar.me v5 split_rules with two recipients:
 *  - Davions master: receives `commission_percent`. If `charge_processing_fee` is
 *    true, this recipient absorbs the Pagar.me processing fee (subtracted from
 *    its share). Otherwise the photographer absorbs it.
 *  - Photographer: receives the remainder, marked as liable for chargebacks.
 *
 * Amounts are in cents.
 */
export function buildSplitRules(params: {
  amount: number;
  photographerRecipientId: string;
  settings: PaymentSettings;
}) {
  const { settings, photographerRecipientId } = params;

  if (!settings.pagarme_master_recipient_id) {
    throw new Error("Master recipient ID not configured in admin payments panel");
  }
  if (!photographerRecipientId) {
    throw new Error("Photographer recipient ID is missing");
  }

  const commission = Math.max(0, Math.min(100, settings.davions_commission_percent));
  const chargeFee = settings.charge_processing_fee;

  return [
    {
      recipient_id: settings.pagarme_master_recipient_id,
      amount: commission,
      type: "percentage" as const,
      options: {
        charge_processing_fee: chargeFee,
        charge_remainder_fee: chargeFee,
        liable: false,
      },
    },
    {
      recipient_id: photographerRecipientId,
      amount: 100 - commission,
      type: "percentage" as const,
      options: {
        charge_processing_fee: !chargeFee,
        charge_remainder_fee: !chargeFee,
        liable: true,
      },
    },
  ];
}
