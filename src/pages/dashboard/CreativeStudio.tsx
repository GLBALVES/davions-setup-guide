import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Palette } from "lucide-react";

export default function CreativeStudio() {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <Palette className="h-12 w-12 text-muted-foreground/40" />
            <h1 className="text-xl font-light tracking-wide text-muted-foreground">
              Creative Studio — Coming soon
            </h1>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
