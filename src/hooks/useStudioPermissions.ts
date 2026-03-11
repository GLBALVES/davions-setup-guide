import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Permissions = Record<string, boolean>;

export interface StudioPermissionsState {
  /** true while fetching */
  loading: boolean;
  /** true if the signed-in user IS the studio owner (photographer) */
  isOwner: boolean;
  /** resolved permissions map; owners have all permissions */
  permissions: Permissions;
  /** true iff user has the given permission key (always true for owners) */
  can: (key: string) => boolean;
}

const ALL_TRUE: Permissions = {};

export function useStudioPermissions(): StudioPermissionsState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({});

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      // Check if the user has a photographers record (= they ARE the owner)
      const { data: photographer } = await supabase
        .from("photographers")
        .select("id")
        .eq("id", user!.id)
        .maybeSingle();

      if (cancelled) return;

      if (photographer) {
        setIsOwner(true);
        setPermissions(ALL_TRUE);
        setLoading(false);
        return;
      }

      // Otherwise, look for a studio_member record matching this user's email
      const { data: memberRows } = await supabase
        .from("studio_members")
        .select("role_id, status")
        .eq("email", user!.email ?? "")
        .eq("status", "active")
        .limit(1);

      if (cancelled) return;

      const member = memberRows?.[0];

      if (!member || !member.role_id) {
        // Invited but no role yet — no permissions
        setIsOwner(false);
        setPermissions({});
        setLoading(false);
        return;
      }

      // Fetch the role's permissions
      const { data: roleRow } = await supabase
        .from("studio_roles")
        .select("permissions")
        .eq("id", member.role_id)
        .maybeSingle();

      if (cancelled) return;

      const perms = (roleRow?.permissions ?? {}) as Permissions;
      setIsOwner(false);
      setPermissions(perms);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  const can = (key: string): boolean => {
    if (isOwner) return true;
    return !!permissions[key];
  };

  return { loading, isOwner, permissions, can };
}
