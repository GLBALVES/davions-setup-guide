import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  path: string;
  done: boolean;
}

const DISMISSED_KEY = "onboarding_dismissed_v1";

export function OnboardingChecklist() {
  const { photographerId } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [steps, setSteps] = useState<ChecklistStep[]>([
    {
      key: "profile",
      label: t.onboarding.stepProfile,
      description: t.onboarding.stepProfileDesc,
      path: "/dashboard/settings",
      done: false,
    },
    {
      key: "session",
      label: t.onboarding.stepSession,
      description: t.onboarding.stepSessionDesc,
      path: "/dashboard/sessions/new",
      done: false,
    },
    {
      key: "store",
      label: t.onboarding.stepStore,
      description: t.onboarding.stepStoreDesc,
      path: "/dashboard/website",
      done: false,
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(DISMISSED_KEY) === "true"
  );

  // Update labels when language changes
  useEffect(() => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.key === "profile") return { ...s, label: t.onboarding.stepProfile, description: t.onboarding.stepProfileDesc };
        if (s.key === "session") return { ...s, label: t.onboarding.stepSession, description: t.onboarding.stepSessionDesc };
        if (s.key === "store") return { ...s, label: t.onboarding.stepStore, description: t.onboarding.stepStoreDesc };
        return s;
      })
    );
  }, [t]);

  useEffect(() => {
    if (!photographerId || dismissed) {
      setLoading(false);
      return;
    }

    async function checkProgress() {
      const [profileRes, sessionsRes, siteRes] = await Promise.all([
        supabase
          .from("photographers")
          .select("full_name, business_name, bio")
          .eq("id", photographerId!)
          .maybeSingle(),
        supabase
          .from("sessions")
          .select("id")
          .eq("photographer_id", photographerId!)
          .limit(1),
        supabase
          .from("photographer_site")
          .select("tagline, site_hero_image_url, store_slug")
          .eq("photographer_id", photographerId!)
          .maybeSingle(),
      ]);

      const profile = profileRes.data as any;
      const hasSessions = (sessionsRes.data?.length ?? 0) > 0;
      const site = siteRes.data as any;

      const slugRes = await supabase
        .from("photographers")
        .select("store_slug")
        .eq("id", photographerId!)
        .maybeSingle();
      const hasStoreSlug = !!(slugRes.data as any)?.store_slug;

      const profileDone = !!(profile?.full_name || profile?.business_name) && !!profile?.bio;
      const sessionDone = hasSessions;
      const storeDone = hasStoreSlug || !!(site?.tagline || site?.site_hero_image_url);

      setSteps((prev) =>
        prev.map((s) => {
          if (s.key === "profile") return { ...s, done: profileDone };
          if (s.key === "session") return { ...s, done: sessionDone };
          if (s.key === "store") return { ...s, done: storeDone };
          return s;
        })
      );

      setLoading(false);
    }

    checkProgress();
  }, [photographerId, dismissed]);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  useEffect(() => {
    if (!loading && allDone) {
      const timer = setTimeout(() => {
        localStorage.setItem(DISMISSED_KEY, "true");
        setDismissed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, allDone]);

  if (loading || dismissed) return null;

  const progressPct = Math.round((completedCount / steps.length) * 100);
  const ob = t.onboarding;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border border-border rounded-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3">
            <Sparkles className="h-3.5 w-3.5 text-foreground/60" />
            <div>
              <p className="text-xs font-light tracking-wide">
                {allDone ? ob.allSet : ob.gettingStarted}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {ob.stepsCompleted(completedCount, steps.length)}
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
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="divide-y divide-border">
          {steps.map((step, idx) => (
            <motion.button
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => !step.done && navigate(step.path)}
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
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>

              {!step.done && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-foreground transition-colors" />
              )}
            </motion.button>
          ))}
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
                {ob.allDoneMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
