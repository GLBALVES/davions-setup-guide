import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** The resolved photographer/studio owner ID for this session.
   *  - For studio owners: equals user.id
   *  - For studio members: equals the employer's photographer_id
   *  Null while loading or unauthenticated. */
  photographerId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  photographerId: null,
  signOut: async () => {},
});

async function resolvePhotographerId(userId: string): Promise<string> {
  // Check if the user is a studio member with an active status
  const { data: memberRow } = await supabase
    .from("studio_members")
    .select("photographer_id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  // If member, return employer's id; otherwise return own id
  if (memberRow?.photographer_id) {
    return memberRow.photographer_id;
  }
  return userId;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [photographerId, setPhotographerId] = useState<string | null>(null);

  useEffect(() => {
    // Safety timeout: if Supabase never responds, unblock the UI after 5s
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(safetyTimer);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const pid = await resolvePhotographerId(session.user.id);
          setPhotographerId(pid);
        } else {
          setPhotographerId(null);
        }
        setLoading(false);
      }
    );

    // Then get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(safetyTimer);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const pid = await resolvePhotographerId(session.user.id);
        setPhotographerId(pid);
      } else {
        setPhotographerId(null);
      }
      setLoading(false);
    }).catch(() => {
      clearTimeout(safetyTimer);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, photographerId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
