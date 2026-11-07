/**
 * Next.js 15 App Router — TikTok OAuth Callback Handler
 *
 * File: app/auth/callback/route.ts
 *
 * This is a REFERENCE file for the Next.js production deployment.
 * The Vite dev preview uses src/pages/AuthCallback.tsx instead.
 *
 * Flow:
 * 1. Supabase SSR exchanges the TikTok authorization code for a session.
 * 2. Extract TikTok profile details (user ID, handle, avatar, display name).
 * 3. Sanitize unique_id (strip @, lowercase).
 * 4. Upsert into the profiles table.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

/** Strip leading @ and normalize to lowercase. */
function sanitizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  // Exchange the authorization code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    // eslint-disable-next-line no-console
    console.error("[OAuth] Code exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const user = data.session.user;

  // Extract TikTok profile details from user metadata
  const tiktokUserId =
    user.app_metadata?.provider_id ?? user.id;
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
    // eslint-disable-next-line no-console
    console.error("[OAuth] Could not extract TikTok handle from metadata");
    return NextResponse.redirect(`${origin}/?error=no_handle`);
  }

  // Upsert into profiles table
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
    // eslint-disable-next-line no-console
    console.error("[OAuth] Profile upsert failed:", upsertError.message);
    // Don't block — the trigger on profiles will also handle tracked_targets
  }

  // The DB trigger `trigger_profile_to_target` automatically upserts
  // unique_id into tracked_targets with is_registered_user = true.

  return NextResponse.redirect(`${origin}${next}`);
}
