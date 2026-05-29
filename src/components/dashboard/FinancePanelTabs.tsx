import { NavLink } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export function FinancePanelTabs({ active }: { active: "overview" | "revenue" | "payables" | "receivables" | "cashflow" }) {
  const { t } = useLanguage();

  const tabs: { key: typeof active; label: string; to: string; end?: boolean }[] = [
    { key: "overview",    label: t.dashboard.overview,         to: "/dashboard/finance", end: true },
    { key: "revenue",     label: t.nav.revenue,                to: "/dashboard/revenue" },
    { key: "payables",    label: t.nav.payables,               to: "/dashboard/finance/payables" },
    { key: "receivables", label: t.nav.receivables,            to: "/dashboard/finance/receivables" },
    { key: "cashflow",    label: t.nav.cashFlow,               to: "/dashboard/finance/cashflow" },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.end}
            className={`px-3 py-1.5 text-[11px] tracking-[0.15em] uppercase border transition-colors ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
