// Shared helper to snapshot the platform transaction fee onto a booking
// at the moment of payment confirmation.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const PLAN_DEFAULT_FEE: Record<string, number> = {
  starter: 5,
  pro: 3,
  studio: 1,
};

/**
 * Resolves the photographer's current effective fee percent.
 * Tries app_payment_settings.davions_commission_percent as default, then
 * subscription_plans (plan_key + currency) for an override, then the
 * built-in PLAN_DEFAULT_FEE map. Always returns a finite number ≥ 0.
 */
export async function resolvePhotographerFeePercent(
  supabase: SupabaseClient,
  photographerId: string,
): Promise<number> {
  // Global default
  let fallback = 5;
  try {
    const { data: settings } = await supabase
      .from("app_payment_settings")
      .select("davions_commission_percent")
      .limit(1)
      .maybeSingle();
    const v = Number((settings as any)?.davions_commission_percent);
    if (Number.isFinite(v)) fallback = v;
  } catch { /* ignore */ }

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
  if (Number.isFinite(v)) return v;
  return PLAN_DEFAULT_FEE[planKey] ?? fallback;
}

/**
 * Persists platform_fee_percent + platform_fee_amount (in cents) onto a booking.
 * `totalPaidCents` is the cumulative amount paid by the client at this point.
 * Safe to call multiple times — the snapshot reflects the latest known totals.
 */
export async function snapshotPlatformFee(
  supabase: SupabaseClient,
  bookingId: string,
  totalPaidCents: number,
): Promise<void> {
  if (!bookingId || !Number.isFinite(totalPaidCents) || totalPaidCents <= 0) return;
  try {
    const { data: bk } = await supabase
      .from("bookings")
      .select("photographer_id")
      .eq("id", bookingId)
      .maybeSingle();
    const photographerId = (bk as any)?.photographer_id as string | undefined;
    if (!photographerId) return;

    const feePercent = await resolvePhotographerFeePercent(supabase, photographerId);
    const feeAmount = Math.round(totalPaidCents * (feePercent / 100));

    await supabase
      .from("bookings")
      .update({
        platform_fee_percent: feePercent,
        platform_fee_amount: feeAmount,
      })
      .eq("id", bookingId);
  } catch (err) {
    console.error("snapshotPlatformFee failed:", err);
  }
}
