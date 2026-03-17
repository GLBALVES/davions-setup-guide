import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ArrowUpCircle, ShoppingCart, Wrench, Users2, Building2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FinancePayables() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const UPCOMING_CATEGORIES = [
    { icon: ShoppingCart, label: "Supplier Invoices",   desc: "Track payments to equipment & prop suppliers." },
    { icon: Wrench,       label: "Equipment & Repairs", desc: "Lens repairs, camera services, accessories." },
    { icon: Users2,       label: "Contractors",         desc: "Assistants, second shooters, retouchers." },
    { icon: Building2,    label: "Studio & Rent",       desc: "Studio rental, coworking, location fees." },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8">

              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />{t.finance.sectionLabel}
                </p>
                <h1 className="text-2xl font-light tracking-wide">Payables</h1>
              </div>

              <div className="border border-dashed border-border flex flex-col items-center justify-center py-20 gap-5 text-center">
                <div className="h-12 w-12 rounded-full border border-border flex items-center justify-center">
                  <ArrowUpCircle className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-light text-foreground mb-1">Payables — Coming Soon</p>
                  <p className="text-xs text-muted-foreground/60 max-w-sm font-light leading-relaxed">
                    Track your business expenses, vendor invoices, and outgoing payments in one place.
                    Coming in a future update.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Planned Categories</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {UPCOMING_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="border border-border p-5 flex flex-col gap-3 opacity-50">
                      <cat.icon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-normal">{cat.label}</p>
                      <p className="text-[10px] text-muted-foreground/70 font-light leading-relaxed">{cat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
