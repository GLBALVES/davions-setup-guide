import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the photographer's current effective platform transaction fee percent.
 * Source of truth: subscription_plans.transaction_fee_percent for the active plan
 * + currency, falling back to a default per plan key if the row is missing.
 */
const PLAN_DEFAULT_FEE: Record<string, number> = {
  starter: 5,
  pro: 3,
  studio: 1,
};

export function usePlatformFee() {
  const { user } = useAuth();
  const [feePercent, setFeePercent] = useState<number>(0);
  const [planKey, setPlanKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const subRes = await supabase.functions.invoke("check-subscription", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sub = subRes.data;
        if (!sub?.subscribed || !sub.plan) {
          if (!cancelled) { setFeePercent(0); setPlanKey(null); setLoading(false); }
          return;
        }

        // Try to find the configured fee for this plan in any currency (use photographer's default first)
        const { data: pg } = await supabase
          .from("photographers")
          .select("business_country")
          .eq("id", user.id)
          .maybeSingle();
        const country = (pg?.business_country ?? "").toUpperCase();
        const currency =
          country.startsWith("BR") ? "BRL" :
          country === "MX" ? "MXN" : "USD";

        const { data: planRow } = await supabase
          .from("subscription_plans")
          .select("transaction_fee_percent")
          .eq("plan_key", sub.plan)
          .eq("currency", currency)
          .maybeSingle();

        const fee = planRow?.transaction_fee_percent != null
          ? Number(planRow.transaction_fee_percent)
          : (PLAN_DEFAULT_FEE[sub.plan] ?? 0);

        if (!cancelled) {
          setFeePercent(fee);
          setPlanKey(sub.plan);
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setFeePercent(0); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { feePercent, planKey, loading };
}
