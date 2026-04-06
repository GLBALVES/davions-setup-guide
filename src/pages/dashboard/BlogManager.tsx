import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText } from "lucide-react";

export default function BlogManager() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <h1 className="text-xl font-light tracking-wide text-muted-foreground">
              Blog — Coming soon
            </h1>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
