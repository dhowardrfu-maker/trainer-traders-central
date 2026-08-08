import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // getSession() is the authoritative source for initial auth state.
    // We only set loading=false here, once we have a definitive answer.
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!mounted) return;
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
    });

    // onAuthStateChange handles subsequent changes only (sign in, sign out,
    // token refresh). It does NOT set loading — that would race with
    // getSession() and could briefly set user=null before the session is
    // restored, causing premature redirects to /auth on first page load.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // If they arrived via a ?ref=username link (stashed in localStorage
      // by App.tsx on first load, since the referral link takes them to
      // /auth before an account exists), attribute it now that they have a
      // session. claim_referral no-ops safely if already attributed.
      if (newSession?.user) {
        const pendingRef = localStorage.getItem("pending_referral");
        if (pendingRef) {
          localStorage.removeItem("pending_referral");
          void supabase.rpc("claim_referral", { _ref_user_id: pendingRef });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};