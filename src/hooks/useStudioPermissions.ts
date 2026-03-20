import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Permissions = Record<string, boolean>;

export interface StudioPermissionsState {
  /** true while fetching */
  loading: boolean;
  /** true if the signed-in user IS the studio owner (photographer) */
  isOwner: boolean;
  /** The resolved photographer_id for data queries.
   *  - Owners: own user.id
   *  - Members: employer's photographer_id */
  photographerId: string | null;
  /** resolved permissions map; owners have all permissions */
  permissions: Permissions;
  /** true iff user has the given permission key (always true for owners) */
  can: (key: string) => boolean;
}

const ALL_TRUE: Permissions = {};

export function useStudioPermissions(): StudioPermissionsState {
  const { user, photographerId: ctxPhotographerId, isOwner: ctxIsOwner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permissions>({});

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // If AuthContext already resolved ownership, no need to re-query photographers/members
    if (ctxIsOwner === true) {
      setPermissions(ALL_TRUE);
      setLoading(false);
      return;
    }

    // ctxIsOwner === false means this is a studio member — fetch their role permissions
    if (ctxIsOwner === false) {
      let cancelled = false;

      async function loadMemberPermissions() {
        setLoading(true);

        // Fetch the member's role_id using email
        const { data: memberRows } = await supabase
          .from("studio_members")
          .select("role_id")
          .eq("email", user!.email ?? "")
          .eq("status", "active")
          .limit(1);

        if (cancelled) return;

        const roleId = memberRows?.[0]?.role_id;

        if (!roleId) {
          setPermissions({});
          setLoading(false);
          return;
        }

        const { data: roleRow } = await supabase
          .from("studio_roles")
          .select("permissions")
          .eq("id", roleId)
          .maybeSingle();

        if (cancelled) return;

        const perms = (roleRow?.permissions ?? {}) as Permissions;
        setPermissions(perms);
        setLoading(false);
      }

      loadMemberPermissions();
      return () => { cancelled = true; };
    }

    // ctxIsOwner === null means AuthContext is still resolving — wait
    // loading stays true until ctxIsOwner resolves
  }, [user, ctxIsOwner]);

  const resolvedIsOwner = ctxIsOwner === true;

  const can = (key: string): boolean => {
    if (resolvedIsOwner) return true;
    return !!permissions[key];
  };

  return {
    loading: ctxIsOwner === null ? true : loading,
    isOwner: resolvedIsOwner,
    photographerId: ctxPhotographerId,
    permissions,
    can,
  };
}
