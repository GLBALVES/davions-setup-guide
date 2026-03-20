import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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
  /** true = studio owner, false = studio member, null = still resolving */
  isOwner: boolean | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  photographerId: null,
  isOwner: null,
  signOut: async () => {},
});

interface ResolvedIdentity {
  photographerId: string;
  isOwner: boolean;
}

async function resolveIdentity(userId: string, userEmail: string): Promise<ResolvedIdentity> {
  // Run both queries in parallel: check if photographer (owner) AND check studio_members
  const [photographerResult, memberResult] = await Promise.all([
    supabase
      .from("photographers")
      .select("id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("studio_members")
      .select("photographer_id")
      .eq("email", userEmail)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  // If user has a photographers record → they are the owner
  if (photographerResult.data) {
    return { photographerId: userId, isOwner: true };
  }

  // If user is an active studio member → use employer's photographer_id
  if (memberResult.data?.photographer_id) {
    return { photographerId: memberResult.data.photographer_id, isOwner: false };
  }

  // Fallback: treat as owner (new signup flow)
  return { photographerId: userId, isOwner: true };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [photographerId, setPhotographerId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  // Flag to prevent double-initialization from getSession + onAuthStateChange
  const initialized = useRef(false);

  useEffect(() => {
    // Safety timeout: if Supabase never responds, unblock the UI after 5s
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const applySession = async (session: Session | null) => {
      clearTimeout(safetyTimer);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const identity = await resolveIdentity(
          session.user.id,
          session.user.email ?? ""
        );
        setPhotographerId(identity.photographerId);
        setIsOwner(identity.isOwner);
      } else {
        setPhotographerId(null);
        setIsOwner(null);
      }
      setLoading(false);
    };

    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // On initial load, getSession() handles it. After that, always apply.
        if (!initialized.current) return;
        await applySession(session);
      }
    );

    // Bootstrap: get current session once
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        initialized.current = true;
        await applySession(session);
      })
      .catch(() => {
        initialized.current = true;
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
    // After sign-out the listener fires, but reset immediately for responsiveness
    initialized.current = true;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, photographerId, isOwner, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
