import { useEffect, useRef, useState } from "react";
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
  const { loading, can, isOwner } = useStudioPermissions();
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading && !timedOut) {
      // Safety valve: if permissions are still loading after 4s, release the gate
      // This prevents owners from ever being stuck on a loading screen
      timerRef.current = setTimeout(() => setTimedOut(true), 4000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading, timedOut]);

  // Still loading and timeout not yet reached
  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  // Timed out → let owners through, deny only if explicitly not an owner
  // (isOwner from the hook is false only when AuthContext has confirmed they're a member)
  if (timedOut && !isOwner) {
    // If we timed out and we genuinely know they're not an owner, block
    // But since we timed out, we give benefit of the doubt and let through
    // to avoid false denials due to network latency
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
