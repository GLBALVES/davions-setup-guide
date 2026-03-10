import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function DashboardHeader() {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("photographers")
      .select("business_name, full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const name = (data as unknown as { business_name?: string | null }).business_name
            || data.full_name
            || null;
          setBusinessName(name);
        }
      });
  }, [user]);

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        {businessName ? (
          <span className="text-[11px] tracking-[0.25em] uppercase font-light text-foreground/80 select-none">
            {businessName}
          </span>
        ) : (
          <span className="h-3 w-32 bg-muted animate-pulse rounded-sm" />
        )}
      </div>
    </header>
  );
}
