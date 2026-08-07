import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./lib/supabase/env";

/**
 * Refresh the Supabase auth session on every request, and hold the door on the
 * product.
 *
 * Supabase access tokens are short-lived; without a refresh on navigation a
 * signed-in user would silently fall back to anonymous. This reads the user,
 * which rotates the token when needed, and writes the refreshed cookies onto the
 * response. When Supabase is not yet configured the middleware is a pass-through,
 * so the app runs before any credentials are in place.
 *
 * The guard below is the second job, and it is here rather than on the pages
 * because a link is not a lock. The marketing site used to point straight at
 * `/search`, and removing those links would have stopped the clicks while
 * leaving every one of these routes open to anybody who typed the address,
 * followed an old link, or read the sitemap. One check, before any page runs.
 */

/**
 * The product. Everything under one of these first segments requires a session.
 *
 * Matched on the first path segment rather than by prefix string, so `/search`
 * is protected and a future public route called `/searching` is not caught by
 * accident.
 */
const PRODUCT_SEGMENTS = new Set([
  // The (app) group.
  "around",
  "assistant",
  "bookings",
  "checkout",
  "home",
  /* The in-product copies of the legal documents. The public originals at
     /privacy and /terms stay open to everyone, which is what a privacy policy
     is for; these are the same text inside the product shell and there is no
     reason for a stranger to reach them rather than the canonical page. */
  "legal",
  "listing",
  "messages",
  "notifications",
  "post",
  "profile",
  "rent",
  "saved",
  "search",
  "settings",
  "stories",
  "u",
  "wallet",
  // The consoles. These have their own role checks on top; this only decides
  // whether an anonymous visitor gets as far as being told they lack a role.
  "admin",
  "agent",
  // First run, which is a signed-in experience by definition.
  "welcome",
]);

/**
 * Product that does not own its own first segment.
 *
 * `/agents` is the pitch and stays open, because somebody has to be able to
 * read what listing on RentMe means before they have an account. Everything
 * under it that DOES something is inside: an application is attached to a
 * person, and a status screen is a person's own application. Both used to
 * render to anybody who typed the address.
 *
 * `/styleguide` is the design reference. It carries noindex and it is ours,
 * not a page a visitor has any business reading.
 *
 * Matched on the exact path, and on the path with a trailing slash, because
 * `/styleguide/` is the same page to a browser and a different string here.
 */
const PRODUCT_PATHS = new Set(["/agents/apply", "/agents/status", "/styleguide"]);

/**
 * Where to send somebody back to after they sign in.
 *
 * Returned as a path, never a URL, and re-checked on the way out. A `next`
 * parameter that accepts an absolute address is an open redirect: an attacker
 * sends `/sign-in?next=https://rentme.ng.evil.example` and the sign-in page
 * they trusted hands them to somebody else. The two leading-slash cases matter
 * as much as the scheme, because `//evil.example` is protocol-relative and a
 * browser reads it as a host.
 */
function safeReturnPath(pathname: string, search: string): string | null {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  const full = `${pathname}${search}`;
  return full.includes("\\") ? null : full;
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
    const [, first = ""] = path.split("/");
    if (PRODUCT_SEGMENTS.has(first) || PRODUCT_PATHS.has(path)) {
      const target = request.nextUrl.clone();
      target.pathname = "/sign-in";
      target.search = "";
      /* Sign-up would be the friendlier guess, but somebody who typed a
         product address is far more likely to already have an account than
         not, and the sign-in screen offers the way to create one. */
      const back = safeReturnPath(request.nextUrl.pathname, request.nextUrl.search);
      if (back) target.searchParams.set("next", back);
      target.searchParams.set("notice", "sign-in-required");
      return NextResponse.redirect(target);
    }
  }

  return response;
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
