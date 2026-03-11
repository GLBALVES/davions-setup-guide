import { ShieldOff } from "lucide-react";
import { useStudioPermissions } from "@/hooks/useStudioPermissions";

interface PermissionGateProps {
  permKey: string;
  children: React.ReactNode;
}

/**
 * Wraps a route/page and shows an "Access Denied" screen
 * if the current user does not have the required permission.
 * Studio owners always pass through.
 */
export default function PermissionGate({ permKey, children }: PermissionGateProps) {
  const { loading, can } = useStudioPermissions();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  if (!can(permKey)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
        <ShieldOff className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-xs tracking-widest uppercase text-foreground font-light mb-1">
            Access Denied
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            You don't have permission to view this page. Contact your studio owner to request access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
