import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreditCard, X } from "lucide-react";
import { PagarmeOnboardingModal } from "./PagarmeOnboardingModal";

const COPY = {
  pt: {
    title: "Configure seu recebimento",
    subtitle: "Para começar a vender e receber pagamentos dos seus clientes, ative sua conta de recebimento.",
    cta: "Configurar agora",
    later: "Mais tarde",
  },
  en: {
    title: "Set up payouts",
    subtitle: "To start selling and receiving customer payments, activate your payout account.",
    cta: "Set up now",
    later: "Later",
  },
  es: {
    title: "Configura tus cobros",
    subtitle: "Para empezar a vender y recibir pagos, activa tu cuenta de cobro.",
    cta: "Configurar ahora",
    later: "Más tarde",
  },
};

const DISMISS_KEY = "pagarme_onboarding_dismissed_until";

export function PagarmePaymentBanner() {
  const { user, photographerId } = useAuth();
  const { lang } = useLanguage();
  const t = COPY[(lang as "pt" | "en" | "es")] ?? COPY.pt;

  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!photographerId || !user) return;

    // Snooze check
    const snooze = localStorage.getItem(DISMISS_KEY);
    if (snooze && Date.now() < Number(snooze)) return;

    (async () => {
      const [{ data }, { data: priv }] = await Promise.all([
        supabase
          .from("photographers")
          .select("business_country")
          .eq("id", photographerId)
          .maybeSingle(),
        (supabase as any)
          .from("photographers_private")
          .select("pagarme_recipient_id")
          .eq("photographer_id", photographerId)
          .maybeSingle(),
      ]);
      if (!data) return;
      const isBR =
        ((data as any).business_country || "").toUpperCase() === "BR" ||
        ((data as any).business_country || "").toLowerCase() === "brasil" ||
        ((data as any).business_country || "").toLowerCase() === "brazil";
      if (isBR && !(priv as any)?.pagarme_recipient_id) setShow(true);
    })();
  }, [photographerId, user]);

  if (!show) return null;

  return (
    <>
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <CreditCard className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-light leading-snug tracking-wide text-foreground">{t.title}</p>
              <p className="max-w-2xl text-[11px] font-light leading-relaxed text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
            <Button size="sm" onClick={() => setOpen(true)} className="h-8 px-4 text-[10px] tracking-[0.22em]">
              {t.cta}
            </Button>
            <button
              onClick={() => {
                // Snooze 24h
                localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 3600 * 1000));
                setShow(false);
              }}
              aria-label={t.later}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <PagarmeOnboardingModal
        open={open}
        onOpenChange={setOpen}
        defaultEmail={user?.email}
        onSuccess={() => {
          setShow(false);
          localStorage.removeItem(DISMISS_KEY);
        }}
      />
    </>
  );
}
