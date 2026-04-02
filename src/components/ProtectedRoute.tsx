import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PendingApprovalScreen from "@/components/PendingApprovalScreen";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    if (!user) { setCheckingApproval(false); return; }

    const check = async () => {
      const { data } = await (supabase as any)
        .from("photographers")
        .select("approval_status")
        .eq("id", user.id)
        .maybeSingle();
      setApprovalStatus(data?.approval_status ?? "approved");
      setCheckingApproval(false);
    };
    check();
  }, [user]);

  if (loading || checkingApproval) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin routes bypass approval check
  const isAdminRoute = location.pathname.startsWith("/admin");

  // If user is pending and not accessing admin, show pending screen
  if (approvalStatus === "pending" && !isAdminRoute) {
    return <PendingApprovalScreen />;
  }

  if (approvalStatus === "rejected" && !isAdminRoute) {
    return <PendingApprovalScreen />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
