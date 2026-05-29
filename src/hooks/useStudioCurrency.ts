import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Map of business country (ISO-2 or "BR-like" strings) to currency/locale/symbol
const COUNTRY_TO_CURRENCY: Record<string, { currency: string; locale: string; symbol: string }> = {
  BR: { currency: "BRL", locale: "pt-BR", symbol: "R$" },
  MX: { currency: "MXN", locale: "es-MX", symbol: "MX$" },
  AR: { currency: "MXN", locale: "es-AR", symbol: "MX$" },
  CO: { currency: "MXN", locale: "es-CO", symbol: "MX$" },
  CL: { currency: "MXN", locale: "es-CL", symbol: "MX$" },
  PE: { currency: "MXN", locale: "es-PE", symbol: "MX$" },
  UY: { currency: "MXN", locale: "es-UY", symbol: "MX$" },
  PY: { currency: "MXN", locale: "es-PY", symbol: "MX$" },
  BO: { currency: "MXN", locale: "es-BO", symbol: "MX$" },
  VE: { currency: "MXN", locale: "es-VE", symbol: "MX$" },
  EC: { currency: "MXN", locale: "es-EC", symbol: "MX$" },
  ES: { currency: "MXN", locale: "es-ES", symbol: "MX$" },
};

const DEFAULT = { currency: "USD", locale: "en-US", symbol: "$" };

export interface StudioCurrency {
  currency: string;
  locale: string;
  symbol: string;
  /** Format cents (integer) as money in the studio currency. */
  fmt: (cents: number) => string;
  /** Format a major-unit value (e.g. raw dollars/reais) as money. */
  fmtUnits: (units: number) => string;
  /** Loading state for the studio currency lookup. */
  loading: boolean;
}

function buildFormatters(entry: { currency: string; locale: string; symbol: string }, loading: boolean): StudioCurrency {
  const nf = new Intl.NumberFormat(entry.locale, { style: "currency", currency: entry.currency });
  return {
    ...entry,
    loading,
    fmt: (cents: number) => nf.format((cents ?? 0) / 100),
    fmtUnits: (units: number) => nf.format(units ?? 0),
  };
}

/**
 * Returns the photographer's display currency derived from `photographers.business_country`
 * (with an optional `business_currency` override). Defaults to USD until loaded.
 */
export function useStudioCurrency(): StudioCurrency {
  const { user } = useAuth();
  const [entry, setEntry] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("photographers")
        .select("business_country, business_currency")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const override = (data as any)?.business_currency?.toString().toUpperCase();
      const country = (data as any)?.business_country?.toString().toUpperCase().slice(0, 2);
      if (override && ["USD", "BRL", "MXN", "EUR", "GBP"].includes(override)) {
        const locale = override === "BRL" ? "pt-BR" : override === "MXN" ? "es-MX" : override === "EUR" ? "es-ES" : "en-US";
        setEntry({ currency: override, locale, symbol: override === "BRL" ? "R$" : override === "MXN" ? "MX$" : override === "EUR" ? "€" : "$" });
      } else if (country && COUNTRY_TO_CURRENCY[country]) {
        setEntry(COUNTRY_TO_CURRENCY[country]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return buildFormatters(entry, loading);
}
