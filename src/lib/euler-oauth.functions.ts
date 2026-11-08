import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildAuthorizeUrl,
  buildRedirectUri,
  computeExpiryTimes,
  exchangeCodeForTokens,
  getEulerClientCredentials,
} from "./euler-oauth.server";

/**
 * Start the Euler Stream OAuth flow. Returns the authorize URL the browser
 * should navigate to (full-page redirect). The client_id is public; the
 * secret stays server-side. A CSRF `state` value is generated and stashed in
 * sessionStorage for verification in the callback.
 */
export const getEulerAuthorizeUrl = createServerFn({ method: "GET" })
  .validator((data) =>
    z
      .object({
        origin: z.string().url(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { clientId } = getEulerClientCredentials();
    const redirectUri = buildRedirectUri(data.origin);
    const state = crypto.randomUUID();

    return {
      authorizeUrl: buildAuthorizeUrl({ clientId, redirectUri, state }),
      state,
    };
  });

/**
 * Complete the Euler Stream OAuth flow: exchange the authorization code for
 * tokens (server-side, using the client secret) and persist them to the
 * caller's row in tiktok_oauth_tokens. RLS scopes the write to the caller.
 */
export const completeEulerOAuth = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        code: z.string().min(1),
        state: z.string().min(1),
        origin: z.string().url(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { clientId, clientSecret } = getEulerClientCredentials();
    const redirectUri = buildRedirectUri(data.origin);

    const tokens = await exchangeCodeForTokens({
      code: data.code,
      redirectUri,
      clientId,
      clientSecret,
    });

    const { expiresAt, refreshExpiresAt } = computeExpiryTimes(
      tokens.expires_in,
      tokens.refresh_expires_in,
    );

    // Upsert the caller's token row. RLS enforces user_id = auth.uid().
    const { error } = await context.supabase.from("tiktok_oauth_tokens").upsert(
      {
        user_id: context.userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type ?? "Bearer",
        expires_at: expiresAt,
        refresh_expires_at: refreshExpiresAt,
        scopes: tokens.scopes ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(`Could not save TikTok connection: ${error.message}`);
    }

    return { connected: true, scopes: tokens.scopes ?? [] };
  });

/**
 * Disconnect TikTok: delete the caller's stored Euler Stream tokens.
 */
export const disconnectTikTok = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("tiktok_oauth_tokens")
      .delete()
      .eq("user_id", context.userId);

    if (error) {
      throw new Error(`Could not disconnect TikTok: ${error.message}`);
    }

    return { disconnected: true };
  });
