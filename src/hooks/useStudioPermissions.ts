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
  const { user, photographerId: ctxPhotographerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [photographerId, setPhotographerId] = useState<string | null>(null);

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
        setPhotographerId(user!.id);
        setLoading(false);
        return;
      }

      // Otherwise, look for a studio_member record matching this user's email
      const { data: memberRows } = await supabase
        .from("studio_members")
        .select("role_id, status, photographer_id")
        .eq("email", user!.email ?? "")
        .eq("status", "active")
        .limit(1);

      if (cancelled) return;

      const member = memberRows?.[0];

      if (!member || !member.role_id) {
        // Invited but no role yet — no permissions
        setIsOwner(false);
        setPermissions({});
        setPhotographerId(member?.photographer_id ?? null);
        setLoading(false);
        return;
      }

      // Set the employer's photographer_id
      setPhotographerId(member.photographer_id ?? null);

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

  // Prefer the context-resolved value (already available from AuthContext)
  const resolvedPhotographerId = ctxPhotographerId ?? photographerId;

  return { loading, isOwner, photographerId: resolvedPhotographerId, permissions, can };
}
