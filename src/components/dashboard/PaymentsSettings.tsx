import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, AlertCircle, Loader2, CreditCard, Unlink } from "lucide-react";
import {
  loadConnectAndInitialize,
  StripeConnectInstance,
} from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { PagarmeOnboardingModal } from "./PagarmeOnboardingModal";

const PAGARME_COPY = {
  pt: {
    title: "Conta de recebimento (Brasil)",
    pendingTag: "Não configurada",
    activeTag: "Ativa",
    pendingDesc: "Configure sua conta para receber pagamentos dos clientes via Pix, boleto ou cartão.",
    activeDesc: "Sua conta de recebimento está ativa. Os pagamentos caem direto no seu banco.",
    cta: "Configurar agora",
    update: "Atualizar dados",
    statusLabel: "Status",
    recipientLabel: "ID do recebedor",
  },
  en: {
    title: "Payout account (Brazil)",
    pendingTag: "Not configured",
    activeTag: "Active",
    pendingDesc: "Set up your account to accept Pix, boleto and card payments.",
    activeDesc: "Your payout account is active. Funds go straight to your bank.",
    cta: "Set up now",
    update: "Update details",
    statusLabel: "Status",
    recipientLabel: "Recipient ID",
  },
  es: {
    title: "Cuenta de cobro (Brasil)",
    pendingTag: "No configurada",
    activeTag: "Activa",
    pendingDesc: "Configura tu cuenta para recibir pagos por Pix, boleto y tarjeta.",
    activeDesc: "Tu cuenta de cobro está activa. Los pagos van directo a tu banco.",
    cta: "Configurar ahora",
    update: "Actualizar datos",
    statusLabel: "Estado",
    recipientLabel: "ID del recibidor",
  },
};

export function PaymentsSettings() {
  const { user, photographerId } = useAuth();
  const { lang, t } = useLanguage();
  const { toast } = useToast();
  const pgCopy = (PAGARME_COPY as any)[lang] ?? PAGARME_COPY.pt;

  const [loading, setLoading] = useState(true);
  const [businessCountry, setBusinessCountry] = useState<string>("");
  const [pagarmeRecipientId, setPagarmeRecipientId] = useState<string | null>(null);
  const [pagarmeStatus, setPagarmeStatus] = useState<string | null>(null);
  const [pagarmeOpen, setPagarmeOpen] = useState(false);

  // Stripe Connect
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeConnectedAt, setStripeConnectedAt] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [stripeInstance, setStripeInstance] = useState<StripeConnectInstance | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadStatus = async () => {
    if (!photographerId) return;
    const { data } = await supabase
      .from("photographers")
      .select("business_country, pagarme_recipient_id, pagarme_kyc_status, stripe_account_id, stripe_connected_at")
      .eq("id", photographerId)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setBusinessCountry(d.business_country ?? "");
      setPagarmeRecipientId(d.pagarme_recipient_id ?? null);
      setPagarmeStatus(d.pagarme_kyc_status ?? null);
      setStripeAccountId(d.stripe_account_id ?? null);
      setStripeConnectedAt(d.stripe_connected_at ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { loadStatus(); }, [photographerId]);

  const isBR =
    (businessCountry || "").toUpperCase() === "BR" ||
    (businessCountry || "").toLowerCase() === "brasil" ||
    (businessCountry || "").toLowerCase() === "brazil";

  // ── Stripe handlers ──
  const handleActivateStripe = async () => {
    if (!user) return;
    setConnectingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { Authorization: `Bearer ${session?.access_token}` };

      const { data: accountData, error: accountError } = await supabase.functions.invoke(
        "create-stripe-connect-account",
        { headers: authHeader }
      );
      if (accountError || !accountData?.stripe_account_id) {
        throw new Error(accountError?.message ?? "Failed to create payment account");
      }
      const accountId = accountData.stripe_account_id;

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        "create-stripe-account-session",
        { body: { stripe_account_id: accountId }, headers: authHeader }
      );
      if (sessionError || !sessionData?.client_secret) {
        throw new Error(sessionError?.message ?? "Failed to create account session");
      }

      const publishableKey = sessionData.publishable_key;
      if (!publishableKey) throw new Error("Stripe publishable key not configured");

      const clientSecret = sessionData.client_secret;
      const instance = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => clientSecret,
        locale: "en-US",
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#000000",
            fontFamily: "inherit",
            borderRadius: "2px",
            colorBackground: "#ffffff",
            colorText: "#111111",
            colorSecondaryText: "#6b7280",
            colorBorder: "#e5e7eb",
            spacingUnit: "10px",
          },
        },
      });

      setStripeAccountId(accountId);
      setStripeInstance(instance);
      setShowOnboarding(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setConnectingStripe(false);
  };

  const handleOnboardingExit = async () => {
    await loadStatus();
    setShowOnboarding(false);
    setStripeInstance(null);
    toast({ title: "Payment setup saved", description: "Your payment account has been updated." });
  };

  const handleDisconnectStripe = async () => {
    if (!user) return;
    setDisconnectingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("stripe-connect-disconnect", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw new Error(error.message);
      setStripeAccountId(null);
      setStripeConnectedAt(null);
      setShowOnboarding(false);
      setStripeInstance(null);
      toast({ title: "Payments deactivated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDisconnectingStripe(false);
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">{t.common.loading}</p>;
  }

  // ── BR: Pagar.me UI ──
  if (isBR) {
    const isActive = !!pagarmeRecipientId;
    return (
      <div className="flex flex-col gap-5">
        <div className={`flex items-center gap-2 text-[11px] tracking-wider uppercase font-light px-3 py-1.5 border border-border w-fit ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
          {isActive ? <Check className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
          {isActive ? pgCopy.activeTag : pgCopy.pendingTag}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {isActive ? pgCopy.activeDesc : pgCopy.pendingDesc}
        </p>

        {isActive && (
          <div className="border border-border p-5 flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{pgCopy.recipientLabel}</p>
              <p className="text-sm font-mono font-light tracking-wide break-all">{pagarmeRecipientId}</p>
            </div>
            {pagarmeStatus && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{pgCopy.statusLabel}</p>
                <p className="text-xs font-light text-muted-foreground capitalize">{pagarmeStatus}</p>
              </div>
            )}
          </div>
        )}

        <div>
          <Button
            size="sm"
            onClick={() => setPagarmeOpen(true)}
            className="gap-2 text-xs tracking-wider uppercase font-light"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {isActive ? pgCopy.update : pgCopy.cta}
          </Button>
        </div>

        <PagarmeOnboardingModal
          open={pagarmeOpen}
          onOpenChange={setPagarmeOpen}
          defaultEmail={user?.email}
          onSuccess={loadStatus}
        />
      </div>
    );
  }

  // ── Non-BR: Stripe Connect UI (existing) ──
  return (
    <div className="flex flex-col gap-6">
      {stripeAccountId && !stripeConnectedAt && !showOnboarding && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-border bg-muted/40 p-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-light tracking-wide text-foreground">{t.settings.paymentAccountPending}</p>
              <p className="text-[11px] text-muted-foreground font-light leading-relaxed">{t.settings.paymentPendingDesc}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleActivateStripe}
            disabled={connectingStripe}
            className="gap-2 text-xs tracking-wider uppercase font-light shrink-0"
          >
            {connectingStripe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t.settings.completeSetup}
          </Button>
        </div>
      )}

      {stripeAccountId && !showOnboarding ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-light px-3 py-1.5 border border-border w-fit text-foreground">
            <Check className="h-3 w-3" />
            {t.settings.activated}
          </div>
          <div className="border border-border p-5 flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{t.settings.paymentAccount}</p>
              <p className="text-sm font-mono font-light tracking-wide break-all">{stripeAccountId}</p>
            </div>
            {stripeConnectedAt && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{t.settings.connectedOn}</p>
                <p className="text-xs font-light text-muted-foreground">
                  {new Date(stripeConnectedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{t.settings.paymentsGoDirectly}</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleActivateStripe}
              disabled={connectingStripe}
              className="gap-2 text-xs tracking-wider uppercase font-light"
            >
              {connectingStripe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t.settings.updateDetails}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectStripe}
              disabled={disconnectingStripe}
              className="gap-2 text-xs tracking-wider uppercase font-light border-destructive/40 text-destructive hover:bg-destructive/5"
            >
              {disconnectingStripe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
              {t.settings.deactivate}
            </Button>
          </div>
        </div>
      ) : showOnboarding && stripeInstance ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-light tracking-wide">{t.settings.paymentSetup}</p>
              <p className="text-[10px] text-muted-foreground tracking-wider">{t.settings.fillDetailsToReceive}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOnboardingExit}
              className="text-[11px] tracking-widest uppercase font-light h-8 px-4"
            >
              {t.settings.close}
            </Button>
          </div>
          <div className="rounded-none overflow-hidden">
            <ConnectComponentsProvider connectInstance={stripeInstance}>
              <ConnectAccountOnboarding onExit={handleOnboardingExit} />
            </ConnectComponentsProvider>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-light px-3 py-1.5 border border-border w-fit text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            {t.settings.notActivated}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.settings.connectYourAccount}</p>
          <div className="border border-border p-5 flex flex-col gap-3">
            <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{t.settings.howItWorks}</p>
            {t.settings.paymentSteps.map((step: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground shrink-0 w-4">{i + 1}.</span>
                <p className="text-[11px] font-light leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <div>
            <Button
              size="sm"
              onClick={handleActivateStripe}
              disabled={connectingStripe}
              className="gap-2 text-xs tracking-wider uppercase font-light"
            >
              {connectingStripe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
              {connectingStripe ? t.settings.settingUp : t.settings.activatePayment}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact status indicator for the Profile tab. */
export function PaymentsStatusCard({ onNavigate }: { onNavigate: () => void }) {
  const { photographerId } = useAuth();
  const { lang } = useLanguage();
  const [state, setState] = useState<"loading" | "active" | "pending" | "none">("loading");

  const COPY: Record<string, { title: string; active: string; pending: string; none: string; cta: string }> = {
    pt: {
      title: "Recebimento de pagamentos",
      active: "Conta ativa — você já pode receber pagamentos.",
      pending: "Configuração incompleta — finalize para começar a receber.",
      none: "Ainda não configurado.",
      cta: "Gerenciar",
    },
    en: {
      title: "Payment account",
      active: "Account active — you can receive payments.",
      pending: "Setup incomplete — finish to start receiving.",
      none: "Not configured yet.",
      cta: "Manage",
    },
    es: {
      title: "Cuenta de cobros",
      active: "Cuenta activa — ya puedes recibir pagos.",
      pending: "Configuración incompleta — finalízala para recibir.",
      none: "Aún no configurada.",
      cta: "Gestionar",
    },
  };
  const c = COPY[lang] ?? COPY.pt;

  useEffect(() => {
    if (!photographerId) return;
    (async () => {
      const { data } = await supabase
        .from("photographers")
        .select("business_country, pagarme_recipient_id, stripe_account_id, stripe_connected_at")
        .eq("id", photographerId)
        .maybeSingle();
      if (!data) { setState("none"); return; }
      const d = data as any;
      const isBR =
        (d.business_country || "").toUpperCase() === "BR" ||
        (d.business_country || "").toLowerCase() === "brasil" ||
        (d.business_country || "").toLowerCase() === "brazil";
      if (isBR) {
        setState(d.pagarme_recipient_id ? "active" : "none");
      } else {
        if (d.stripe_account_id && d.stripe_connected_at) setState("active");
        else if (d.stripe_account_id) setState("pending");
        else setState("none");
      }
    })();
  }, [photographerId]);

  const dotClass =
    state === "active" ? "bg-emerald-500"
    : state === "pending" ? "bg-amber-500"
    : "bg-muted-foreground/40";

  const message = state === "active" ? c.active : state === "pending" ? c.pending : c.none;

  return (
    <div className="border border-border rounded-md p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />
        <div className="min-w-0">
          <p className="text-xs font-light tracking-wide text-foreground">{c.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {state === "loading" ? "…" : message}
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onNavigate} className="text-[10px] tracking-wider uppercase font-light shrink-0">
        {c.cta}
      </Button>
    </div>
  );
}
