import type { EulerTokenResponse } from "@/types/database";

/**
 * Euler Stream OAuth endpoints (from their official docs).
 * https://www.eulerstream.com/docs/oauth
 */
export const EULER_AUTHORIZE_URL =
  "https://www.eulerstream.com/tiktok/oauth/authorize";
export const EULER_TOKEN_URL =
  "https://tiktok.eulerstream.com/tiktok/oauth/token";
export const EULER_REVOKE_URL =
  "https://tiktok.eulerstream.com/tiktok/oauth/revoke";

/**
 * Scopes requested during authorization — these must exactly match the scopes
 * registered on your Euler Stream app, or authorization will fail. Taken from
 * the authorize URL registered in the Euler Stream dashboard:
 *   webcast:fetch            — pull a live stream's gift/feed data
 *   webcast:rankings         — leaderboard / rankings data
 *   webcast:bulk_live_check  — check whether a set of handles are live
 *   webcast:user_earnings    — per-user earnings data
 *   webcast:sign_url         — sign URLs for stream access
 *   webcast:chat             — live chat messages
 *   webcast:mute             — mute users in a stream
 *   webcast:ban              — ban users from a stream
 *   webcast:comments         — comment events
 *   webcast:moderators       — moderator roster
 *   webcast:live_analytics   — real-time analytics
 *   webcast:sensitive_words  — sensitive-word moderation
 *   user:info                — basic profile info
 */
export const EULER_OAUTH_SCOPES = [
  "webcast:fetch",
  "webcast:rankings",
  "webcast:bulk_live_check",
  "webcast:user_earnings",
  "webcast:sign_url",
  "webcast:chat",
  "webcast:mute",
  "webcast:ban",
  "webcast:comments",
  "webcast:moderators",
  "webcast:live_analytics",
  "webcast:sensitive_words",
  "user:info",
];

/**
 * Read the Euler client credentials from the server environment. These are
 * registered as secrets (EULER_CLIENT_ID / EULER_CLIENT_SECRET) and must
 * only ever be read inside a server-only execution boundary.
 */
export function getEulerClientCredentials() {
  const clientId = process.env.EULER_CLIENT_ID;
  const clientSecret = process.env.EULER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Euler Stream OAuth is not configured. Set EULER_CLIENT_ID and EULER_CLIENT_SECRET in your secrets.",
    );
  }
  return { clientId, clientSecret };
}

/**
 * Build the redirect URI for the Euler OAuth flow. Uses the request origin so
 * it works on both preview and published deployments.
 */
export function buildRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

/**
 * Build the full authorize URL the browser navigates to. The client_id is
 * public; the secret never appears here. A random `state` value is returned
 * for CSRF protection and must be verified in the callback.
 */
export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}): string {
  const url = new URL(EULER_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    (params.scopes ?? EULER_OAUTH_SCOPES).join(" "),
  );
  url.searchParams.set("state", params.state);
  return url.toString();
}

/**
 * Exchange an authorization code for access/refresh tokens. Runs server-side
 * only — the client_secret is required and must never reach the browser.
 */
export async function exchangeCodeForTokens(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<EulerTokenResponse["data"]> {
  const res = await fetch(EULER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });

  const json = (await res.json()) as EulerTokenResponse;

  if (!res.ok || !json?.data?.access_token) {
    throw new Error(
      `Euler token exchange failed: ${json?.message ?? res.statusText}`,
    );
  }

  return json.data;
}

/**
 * Compute absolute expiry timestamps (ISO strings) from the relative
 * `expires_in` / `refresh_expires_in` seconds returned by Euler Stream.
 */
export function computeExpiryTimes(
  expiresIn: number,
  refreshExpiresIn: number,
) {
  const now = Date.now();
  return {
    expiresAt: new Date(now + expiresIn * 1000).toISOString(),
    refreshExpiresAt: new Date(now + refreshExpiresIn * 1000).toISOString(),
  };
}
