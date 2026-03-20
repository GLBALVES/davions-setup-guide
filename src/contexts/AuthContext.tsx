import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ── Identity cache ─────────────────────────────────────────────────────────────
// Persists across navigations so resolveIdentity only runs ONCE per login session.
// Keyed by userId — invalidates automatically on account switch / sign-out.
interface ResolvedIdentity {
  photographerId: string;
  isOwner: boolean;
}

const identityCache = new Map<string, ResolvedIdentity>();

async function resolveIdentity(userId: string, userEmail: string): Promise<ResolvedIdentity> {
  // Return cached result immediately — avoids repeated DB round-trips on navigation
  if (identityCache.has(userId)) {
    return identityCache.get(userId)!;
  }

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

  let identity: ResolvedIdentity;

  // If user has a photographers record → they are the owner
  if (photographerResult.data) {
    identity = { photographerId: userId, isOwner: true };
  }
  // If user is an active studio member → use employer's photographer_id
  else if (memberResult.data?.photographer_id) {
    identity = { photographerId: memberResult.data.photographer_id, isOwner: false };
  }
  // Fallback: treat as owner (new signup flow)
  else {
    identity = { photographerId: userId, isOwner: true };
  }

  identityCache.set(userId, identity);
  return identity;
}

// ── Context ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  session: Session | null;
  /** True only while waiting for getSession() — becomes false as soon as we know auth state */
  loading: boolean;
  /** True while resolving photographerId/isOwner after session is confirmed */
  identityLoading: boolean;
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
  identityLoading: false,
  photographerId: null,
  isOwner: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [photographerId, setPhotographerId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  // Flag to prevent double-initialization from getSession + onAuthStateChange
  const initialized = useRef(false);
  // Track in-flight resolve to prevent duplicate calls
  const resolvingFor = useRef<string | null>(null);

  const resetIdentity = () => {
    setPhotographerId(null);
    setIsOwner(null);
    setIdentityLoading(false);
  };

  const applySession = async (incomingSession: Session | null) => {
    setSession(incomingSession);
    setUser(incomingSession?.user ?? null);

    // Unblock auth gate immediately — auth state is now known
    setLoading(false);

    if (incomingSession?.user) {
      const userId = incomingSession.user.id;
      const userEmail = incomingSession.user.email ?? "";

      // If we already have a cached/resolved identity for this user, apply it instantly
      if (identityCache.has(userId)) {
        const cached = identityCache.get(userId)!;
        setPhotographerId(cached.photographerId);
        setIsOwner(cached.isOwner);
        return;
      }

      // Prevent duplicate in-flight resolves
      if (resolvingFor.current === userId) return;
      resolvingFor.current = userId;

      setIdentityLoading(true);
      try {
        const identity = await resolveIdentity(userId, userEmail);
        // Only apply if still the same user
        if (resolvingFor.current === userId) {
          setPhotographerId(identity.photographerId);
          setIsOwner(identity.isOwner);
        }
      } finally {
        if (resolvingFor.current === userId) {
          resolvingFor.current = null;
          setIdentityLoading(false);
        }
      }
    } else {
      resetIdentity();
    }
  };

  useEffect(() => {
    // Safety timeout: if Supabase never responds, unblock the UI after 5s
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // On initial load, getSession() handles it. After that, always apply.
        if (!initialized.current) return;

        // TOKEN_REFRESHED fires when returning to the tab — just update session
        // silently without re-running identity resolution (avoids full reload flash).
        if (event === "TOKEN_REFRESHED") {
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }

        if (event === "SIGNED_OUT") {
          // Clear everything immediately
          setSession(null);
          setUser(null);
          setLoading(false);
          resetIdentity();
          return;
        }

        await applySession(session);
      }
    );

    // Bootstrap: get current session once
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        initialized.current = true;
        clearTimeout(safetyTimer);
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
    // Clear identity cache and local state immediately for instant UI response
    if (user?.id) identityCache.delete(user.id);
    resolvingFor.current = null;
    setUser(null);
    setSession(null);
    setPhotographerId(null);
    setIsOwner(null);

    // Then tell Supabase to sign out (fires SIGNED_OUT event, handled above)
    await supabase.auth.signOut();
    initialized.current = true;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, identityLoading, photographerId, isOwner, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
