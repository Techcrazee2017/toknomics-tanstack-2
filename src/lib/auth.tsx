import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useServerFn } from "@tanstack/react-start";
import type { Profile } from "@/types/database";
import {
  getEulerAuthorizeUrl,
  completeEulerOAuth,
  disconnectTikTok,
} from "@/lib/euler-oauth.functions";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  tiktokConnected: boolean;
  tiktokConnecting: boolean;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  connectTikTok: () => Promise<void>;
  disconnectTikTokAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);

  const getAuthorizeUrl = useServerFn(getEulerAuthorizeUrl);
  const completeOAuth = useServerFn(completeEulerOAuth);
  const disconnect = useServerFn(disconnectTikTok);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      })
      .catch((error: unknown) => {
        console.error("Could not restore the authentication session", error);
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setTiktokConnected(false);
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  // Check TikTok (Euler Stream) connection status whenever the session changes.
  useEffect(() => {
    if (!session?.user) {
      setTiktokConnected(false);
      return;
    }
    supabase
      .from("tiktok_oauth_tokens")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setTiktokConnected(!!data));
  }, [session]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTiktokConnected(false);
  }, []);

  const connectTikTok = useCallback(async () => {
    if (typeof window === "undefined") return;
    setTiktokConnecting(true);
    try {
      const { authorizeUrl, state } = await getAuthorizeUrl({
        data: { origin: window.location.origin },
      });
      // Stash CSRF state for verification in the callback.
      sessionStorage.setItem("euler_oauth_state", state);
      window.location.assign(authorizeUrl);
    } catch (err) {
      setTiktokConnecting(false);
      throw err;
    }
  }, [getAuthorizeUrl]);

  const disconnectTikTokAccount = useCallback(async () => {
    await disconnect();
    setTiktokConnected(false);
  }, [disconnect]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        tiktokConnected,
        tiktokConnecting,
        signUp,
        signIn,
        signOut,
        connectTikTok,
        disconnectTikTokAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Exposed for the OAuth callback page to complete the flow. The callback reads
 * the stashed CSRF state, calls the protected server function to exchange the
 * code for tokens, and stores them against the signed-in user.
 */
export function useCompleteTikTokOAuth() {
  const completeOAuth = useServerFn(completeEulerOAuth);
  return useCallback(
    async (code: string, state: string) => {
      if (typeof window === "undefined") {
        throw new Error("OAuth callback can only complete in the browser.");
      }
      return completeOAuth({
        data: { code, state, origin: window.location.origin },
      });
    },
    [completeOAuth],
  );
}
