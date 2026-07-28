import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./lib/supabase/env";

/**
 * Refresh the Supabase auth session on every request.
 *
 * Supabase access tokens are short-lived; without a refresh on navigation a
 * signed-in user would silently fall back to anonymous. This reads the user,
 * which rotates the token when needed, and writes the refreshed cookies onto the
 * response. When Supabase is not yet configured the middleware is a pass-through,
 * so the app runs before any credentials are in place.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Rotates the token when needed. Do not remove: this call is the refresh.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
