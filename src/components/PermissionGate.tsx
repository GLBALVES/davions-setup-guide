import { useEffect, useRef, useState } from "react";
import { ShieldOff } from "lucide-react";
import { useStudioPermissions } from "@/hooks/useStudioPermissions";
import { useAuth } from "@/contexts/AuthContext";

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
  const { identityLoading } = useAuth();
  const { loading, can, isOwner } = useStudioPermissions();
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Combine both loading signals — gate is loading if auth identity or permissions are still resolving
  const isLoading = identityLoading || loading;

  useEffect(() => {
    if (isLoading && !timedOut) {
      // Safety valve: release the gate after 2s to prevent owners from ever getting stuck
      timerRef.current = setTimeout(() => setTimedOut(true), 2000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, timedOut]);

  // Still loading and timeout not yet reached
  if (isLoading && !timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  // Timed out → give benefit of the doubt to avoid false denials
  if (timedOut) {
    return <>{children}</>;
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
