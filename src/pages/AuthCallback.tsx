import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sanitizeHandle } from "@/lib/handle";

/**
 * OAuth callback handler.
 * In a Next.js App Router setup this would be app/auth/callback/route.ts.
 * Here we handle the TikTok OAuth redirect client-side: exchange code for
 * session, extract profile details, and upsert into the profiles table.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          setStatus("error");
          setError(sessionError?.message ?? "No session returned from TikTok.");
          return;
        }

        const user = sessionData.session.user;
        const tiktokUserId = user.app_metadata?.provider_id ?? user.id;
        const rawHandle =
          user.user_metadata?.user_name ??
          user.user_metadata?.unique_id ??
          user.user_metadata?.preferred_username ??
          "";
        const uniqueId = sanitizeHandle(rawHandle);
        const displayName =
          user.user_metadata?.name ?? user.user_metadata?.full_name ?? null;
        const avatarUrl =
          user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;

        if (!uniqueId) {
          setStatus("error");
          setError("Could not extract TikTok handle from OAuth response.");
          return;
        }

        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            tiktok_user_id: String(tiktokUserId),
            unique_id: uniqueId,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
          { onConflict: "id" },
        );

        if (upsertError) {
          setStatus("error");
          setError(upsertError.message);
          return;
        }

        setStatus("success");
        setTimeout(() => navigate("/"), 1500);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Unknown error during OAuth callback.",
        );
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {status === "loading" && (
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Completing TikTok sign-in…</p>
        </div>
      )}
      {status === "success" && (
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-success" />
          <p className="text-muted-foreground">
            Sign-in successful! Redirecting…
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="max-w-md text-center">
          <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <p className="mb-2 font-semibold">Sign-in failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-sm text-primary underline"
          >
            Back to home
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
