import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Price IDs per plan per currency ─────────────────────────────────────────
export const REGIONAL_PLANS = {
  starter: {
    USD: { price_id: "price_1TA8dwHHNUkUYwCFqxyHaXwX", amount: 29, display: "$29" },
    BRL: { price_id: "price_1TCIusHHNUkUYwCFhGtLRSMG", amount: 59, display: "R$59" },
    MXN: { price_id: "price_1TCIwDHHNUkUYwCFJ0k9SNVO", amount: 15, display: "MX$15" },
  },
  pro: {
    USD: { price_id: "price_1TA8iRHHNUkUYwCFWoTJx7FD", amount: 69, display: "$69" },
    BRL: { price_id: "price_1TCIvJHHNUkUYwCFaxbbfmYw", amount: 149, display: "R$149" },
    MXN: { price_id: "price_1TCIwdHHNUkUYwCFDe0bc1LR", amount: 35, display: "MX$35" },
  },
  studio: {
    USD: { price_id: "price_1TA8j8HHNUkUYwCFxFY4uY1U", amount: 129, display: "$129" },
    BRL: { price_id: "price_1TCIvhHHNUkUYwCFIe4qEyU6", amount: 279, display: "R$279" },
    MXN: { price_id: "price_1TCIx7HHNUkUYwCFkTcWOYnb", amount: 65, display: "MX$65" },
  },
} as const;

export type SupportedCurrency = "USD" | "BRL" | "MXN";
export type PlanKey = keyof typeof REGIONAL_PLANS;

export interface RegionInfo {
  country: string;
  currency: SupportedCurrency;
  locale: string;
  symbol: string;
  loading: boolean;
}

const DEFAULT_REGION: RegionInfo = {
  country: "US",
  currency: "USD",
  locale: "en",
  symbol: "$",
  loading: true,
};

const RegionContext = createContext<RegionInfo>(DEFAULT_REGION);

const CACHE_KEY = "davions_region_cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCachedRegion(): Omit<RegionInfo, "loading"> | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedRegion(data: Omit<RegionInfo, "loading">) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // ignore
  }
}

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [region, setRegion] = useState<RegionInfo>(DEFAULT_REGION);

  useEffect(() => {
    const cached = getCachedRegion();
    if (cached) {
      setRegion({ ...cached, loading: false });
      return;
    }

    supabase.functions
      .invoke("detect-region")
      .then(({ data, error }) => {
        if (error || !data) {
          setRegion({ ...DEFAULT_REGION, loading: false });
          return;
        }

        const currency = (["USD", "BRL", "MXN"].includes(data.currency)
          ? data.currency
          : "USD") as SupportedCurrency;

        const regionData: Omit<RegionInfo, "loading"> = {
          country: data.country ?? "US",
          currency,
          locale: data.locale ?? "en",
          symbol: data.symbol ?? "$",
        };

        setCachedRegion(regionData);
        setRegion({ ...regionData, loading: false });
      })
      .catch(() => {
        setRegion({ ...DEFAULT_REGION, loading: false });
      });
  }, []);

  return <RegionContext.Provider value={region}>{children}</RegionContext.Provider>;
};

export const useRegion = () => useContext(RegionContext);

/** Returns the correct price_id and display info for a given plan based on the current region */
export function usePlanPrice(planKey: PlanKey) {
  const { currency } = useRegion();
  const plan = REGIONAL_PLANS[planKey];
  return plan[currency] ?? plan["USD"];
}
