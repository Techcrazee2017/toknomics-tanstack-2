import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Loader2, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useCompleteTikTokOAuth } from "@/lib/auth";

/**
 * Euler Stream OAuth callback handler.
 *
 * Euler Stream redirects here with ?code=...&state=... after the user scans the
 * QR code and approves the TikTok data access. The flow:
 *   1. Require a signed-in session (identity is email/password; TikTok is only
 *      a data authorization). If not signed in, send to the home sign-in.
 *   2. Verify the `state` against the value we stashed in sessionStorage when
 *      starting the flow (CSRF protection).
 *   3. Call the protected server function to exchange the code for tokens
 *      (the client secret is used server-side) and persist them to the
 *      caller's row in tiktok_oauth_tokens.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const completeOAuth = useCompleteTikTokOAuth();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "signin"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Must be signed in first — TikTok connection is per-account.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setStatus("signin");
          return;
        }

        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const storedState = sessionStorage.getItem("euler_oauth_state");

        if (!code || !state) {
          setStatus("error");
          setError("Missing authorization code in the callback.");
          return;
        }

        if (!storedState || storedState !== state) {
          setStatus("error");
          setError(
            "Security state mismatch. Please try connecting TikTok again.",
          );
          sessionStorage.removeItem("euler_oauth_state");
          return;
        }

        sessionStorage.removeItem("euler_oauth_state");

        await completeOAuth(code, state);
        setStatus("success");
        setTimeout(() => navigate("/"), 1200);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Unknown error during TikTok connection.",
        );
      }
    };

    handleCallback();
  }, [navigate, completeOAuth]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {status === "loading" && (
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting your TikTok…</p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-success" />
          <p className="mb-2 font-semibold">TikTok connected</p>
          <p className="text-muted-foreground">
            Redirecting to your dashboard…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="max-w-md text-center">
          <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <p className="mb-2 font-semibold">Connection failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="mt-4"
          >
            Back to dashboard
          </Button>
        </div>
      )}

      {status === "signin" && (
        <div className="max-w-md text-center">
          <LogIn className="mx-auto mb-4 h-10 w-10 text-primary" />
          <p className="mb-2 font-semibold">Sign in required</p>
          <p className="mb-4 text-sm text-muted-foreground">
            You need a TokNomics account before connecting TikTok. Please sign
            in and try again.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            Back to sign in
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
