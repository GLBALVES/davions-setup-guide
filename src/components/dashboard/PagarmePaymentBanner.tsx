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
      const { data } = await supabase
        .from("photographers")
        .select("business_country, pagarme_recipient_id")
        .eq("id", photographerId)
        .maybeSingle();
      if (!data) return;
      const isBR =
        (data.business_country || "").toUpperCase() === "BR" ||
        (data.business_country || "").toLowerCase() === "brasil" ||
        (data.business_country || "").toLowerCase() === "brazil";
      if (isBR && !data.pagarme_recipient_id) setShow(true);
    })();
  }, [photographerId, user]);

  if (!show) return null;

  return (
    <>
      <div className="border border-border bg-muted/20 px-5 py-4 flex items-center gap-4">
        <div className="shrink-0 w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center">
          <CreditCard className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-light tracking-wide">{t.title}</p>
          <p className="text-[11px] text-muted-foreground font-light leading-relaxed">{t.subtitle}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">
          {t.cta}
        </Button>
        <button
          onClick={() => {
            // Snooze 24h
            localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 3600 * 1000));
            setShow(false);
          }}
          aria-label={t.later}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
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
