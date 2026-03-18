import { useEffect, useState } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, HelpCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import seloPreto from "@/assets/selo_preto.png";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BugReportDialog } from "@/components/dashboard/BugReportDialog";
import { HelpAssistantPanel } from "@/components/dashboard/HelpAssistantPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Lang } from "@/lib/i18n/translations";

const LANG_OPTIONS: { value: Lang; flag: string; label: string }[] = [
  { value: "en", flag: "🇺🇸", label: "EN" },
  { value: "pt", flag: "🇧🇷", label: "PT" },
  { value: "es", flag: "🇪🇸", label: "ES" },
];

export function DashboardHeader() {
  const { user } = useAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const { lang, setLang } = useLanguage();

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("photographers")
      .select("business_name, full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: { business_name?: string | null; full_name?: string | null } | null }) => {
        if (data) {
          const name = data.business_name || data.full_name || null;
          setBusinessName(name);
        }
      });
  }, [user]);

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />

        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.img
              key="seal"
              src={seloPreto}
              alt="Davions"
              className="h-6 w-6 object-contain"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            />
          ) : businessName ? (
            <motion.span
              key="business-name"
              className="text-[11px] tracking-[0.25em] uppercase font-light text-foreground/80 select-none"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {businessName}
            </motion.span>
          ) : (
            <motion.span
              key="skeleton"
              className="h-3 w-32 bg-muted animate-pulse rounded-sm inline-block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1">
        {/* Language selector */}
        <div className="flex items-center gap-0.5 mr-2">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLang(opt.value)}
              className={`h-7 px-2 text-[10px] tracking-wider uppercase font-light rounded-sm transition-colors duration-200 ${
                lang === opt.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span className="mr-1">{opt.flag}</span>
              {opt.label}
            </button>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/dashboard/help")}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
            >
              <HelpCircle size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Help Center</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setBugDialogOpen(true)}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
            >
              <Bug size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Report a bug</TooltipContent>
        </Tooltip>
      </div>

      <BugReportDialog open={bugDialogOpen} onOpenChange={setBugDialogOpen} />
    </header>
  );
}
