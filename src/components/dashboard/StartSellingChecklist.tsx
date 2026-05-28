import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Circle, ChevronRight, X, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISSED_KEY = "start_selling_dismissed_v1";

const COPY = {
  pt: {
    title: "Comece a vender",
    subtitle: (done: number, total: number) => `${done} de ${total} etapas concluídas`,
    allDone: "Tudo pronto para vender",
    allDoneMsg: "Sua loja está pronta para receber clientes.",
    dismiss: "Dispensar",
    steps: {
      payment: { label: "Configure seu recebimento", desc: "Ative sua conta para receber pagamentos." },
      sessionType: { label: "Crie um tipo de sessão", desc: "Defina pacotes e preços que poderá vender." },
      store: { label: "Publique sua loja", desc: "Personalize sua URL e capa para os clientes." },
      share: { label: "Compartilhe sua loja", desc: "Envie o link aos clientes e divulgue nas redes." },
    },
  },
  en: {
    title: "Start selling",
    subtitle: (done: number, total: number) => `${done} of ${total} steps complete`,
    allDone: "Ready to sell",
    allDoneMsg: "Your store is ready to receive clients.",
    dismiss: "Dismiss",
    steps: {
      payment: { label: "Set up payouts", desc: "Activate your account to receive payments." },
      sessionType: { label: "Create a session type", desc: "Define packages and prices to sell." },
      store: { label: "Publish your store", desc: "Customize your URL and cover for clients." },
      share: { label: "Share your store", desc: "Send the link to clients and share on social." },
    },
  },
  es: {
    title: "Empieza a vender",
    subtitle: (done: number, total: number) => `${done} de ${total} pasos completados`,
    allDone: "Listo para vender",
    allDoneMsg: "Tu tienda está lista para recibir clientes.",
    dismiss: "Descartar",
    steps: {
      payment: { label: "Configura tus cobros", desc: "Activa tu cuenta para recibir pagos." },
      sessionType: { label: "Crea un tipo de sesión", desc: "Define paquetes y precios para vender." },
      store: { label: "Publica tu tienda", desc: "Personaliza tu URL y portada para los clientes." },
      share: { label: "Comparte tu tienda", desc: "Envía el enlace a clientes y compártelo en redes." },
    },
  },
};

type StepKey = "payment" | "sessionType" | "store" | "share";

interface Step {
  key: StepKey;
  path: string;
  done: boolean;
}

export function StartSellingChecklist() {
  const { photographerId } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = COPY[(lang as "pt" | "en" | "es")] ?? COPY.pt;

  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "true"
  );
  const [steps, setSteps] = useState<Step[]>([
    { key: "payment", path: "/dashboard/finance/pagarme", done: false },
    { key: "sessionType", path: "/dashboard/personalize", done: false },
    { key: "store", path: "/dashboard/website", done: false },
    { key: "share", path: "/dashboard/website", done: false },
  ]);

  useEffect(() => {
    if (!photographerId || dismissed) {
      setLoading(false);
      return;
    }

    (async () => {
      const [photogRes, privRes, typesRes, siteRes] = await Promise.all([
        supabase
          .from("photographers")
          .select("business_country, store_slug, stripe_account_id")
          .eq("id", photographerId)
          .maybeSingle(),
        (supabase as any)
          .from("photographers_private")
          .select("pagarme_recipient_id")
          .eq("photographer_id", photographerId)
          .maybeSingle(),
        (supabase as any)
          .from("session_types")
          .select("id")
          .eq("photographer_id", photographerId)
          .limit(1),
        (supabase as any)
          .from("photographer_site")
          .select("tagline, site_hero_image_url")
          .eq("photographer_id", photographerId)
          .maybeSingle(),
      ]);

      const photog: any = photogRes.data || {};
      const priv: any = privRes.data || {};
      const country = (photog.business_country || "").toLowerCase();
      const isBR = country === "br" || country === "brasil" || country === "brazil";

      const paymentDone = isBR
        ? !!priv.pagarme_recipient_id
        : !!photog.stripe_account_id;
      const sessionTypeDone = (typesRes.data?.length ?? 0) > 0;
      const site: any = siteRes.data || {};
      const storeDone = !!photog.store_slug && !!(site.tagline || site.site_hero_image_url);
      // Share step considered done once user has store_slug AND has marked share dismissed via localStorage
      const shareDone = !!photog.store_slug && localStorage.getItem("start_selling_share_done") === "true";

      setSteps((prev) =>
        prev.map((s) => {
          if (s.key === "payment") return { ...s, done: paymentDone };
          if (s.key === "sessionType") return { ...s, done: sessionTypeDone };
          if (s.key === "store") return { ...s, done: storeDone };
          if (s.key === "share") return { ...s, done: shareDone };
          return s;
        })
      );
      setLoading(false);
    })();
  }, [photographerId, dismissed]);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  useEffect(() => {
    if (!loading && allDone) {
      const timer = setTimeout(() => {
        localStorage.setItem(DISMISSED_KEY, "true");
        setDismissed(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [loading, allDone]);

  if (loading || dismissed) return null;

  const progressPct = Math.round((completedCount / steps.length) * 100);

  const handleStepClick = (step: Step) => {
    if (step.done) return;
    if (step.key === "share") {
      localStorage.setItem("start_selling_share_done", "true");
    }
    navigate(step.path);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="start-selling"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border border-border rounded-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-3.5 w-3.5 text-foreground/60" />
            <div>
              <p className="text-xs font-light tracking-wide">
                {allDone ? t.allDone : t.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t.subtitle(completedCount, steps.length)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-28 h-1 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-foreground rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{progressPct}%</span>
            </div>

            <button
              onClick={() => {
                localStorage.setItem(DISMISSED_KEY, "true");
                setDismissed(true);
              }}
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
              aria-label={t.dismiss}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="divide-y divide-border">
          {steps.map((step, idx) => {
            const copy = t.steps[step.key];
            return (
              <motion.button
                key={step.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleStepClick(step)}
                disabled={step.done}
                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                  step.done
                    ? "opacity-50 cursor-default"
                    : "hover:bg-muted/30 cursor-pointer group"
                }`}
              >
                <span className="shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                  ) : (
                    <Circle className="h-4 w-4 text-border group-hover:text-muted-foreground transition-colors" />
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs tracking-wide ${
                      step.done ? "line-through text-muted-foreground" : "text-foreground font-light"
                    }`}
                  >
                    {copy.label}
                  </p>
                  {!step.done && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{copy.desc}</p>
                  )}
                </div>

                {!step.done && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-foreground transition-colors" />
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 py-3 bg-foreground/5 border-t border-border"
            >
              <p className="text-[10px] text-muted-foreground text-center tracking-wide">
                {t.allDoneMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
