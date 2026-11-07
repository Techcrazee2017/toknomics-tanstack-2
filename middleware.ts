/**
 * Next.js 15 Middleware — Supabase Session Refresh
 *
 * File: middleware.ts
 *
 * Reference file for Next.js production deployment.
 * Refreshes the Supabase auth session on every request and protects
 * authenticated routes.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Allow public routes
  if (pathname === "/" || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  // Create a Supabase client that can write cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          const response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          return response;
        },
      },
    },
  );

  // Refresh session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // Redirect unauthenticated users to the login page
    return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
