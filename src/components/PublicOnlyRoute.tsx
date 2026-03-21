import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard/projects" replace />;
  }

  return <>{children}</>;
};

export default PublicOnlyRoute;
