import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, createNonce } from "./lib/security/csp";
import { safeReturnPath } from "./lib/security/return-path";
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

export async function middleware(request: NextRequest) {
  /*
   * The Content Security Policy, built fresh for this request.
   *
   * It goes on the REQUEST as well as the response, and that is not
   * belt-and-braces. Next reads the nonce back out of the request's policy in
   * order to stamp it onto the inline scripts it emits itself, so a policy set
   * only on the response would forbid Next's own hydration payload and leave
   * every page dead on arrival. `app/layout.tsx` reads the same nonce from
   * `x-nonce` for the one inline script this codebase writes by hand.
   *
   * Built before the `isSupabaseConfigured` gate below, because a deployment
   * waiting on its keys still serves real HTML to real browsers and has no
   * business serving it unprotected.
   */
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  /**
   * A response carrying the policy, derived from the request as it stands right
   * now.
   *
   * Recomputed rather than captured once, because Supabase's `setAll` writes
   * refreshed auth cookies onto `request.cookies` and then rebuilds the
   * response so the page sees them. Taking a copy of the headers up front would
   * hand that rebuild the pre-refresh cookie header and quietly undo the token
   * rotation this middleware exists to perform.
   */
  const secured = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", policy);
    const next = NextResponse.next({ request: { headers } });
    next.headers.set("content-security-policy", policy);
    return next;
  };

  let response = secured();

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
        response = secured();
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
    const [, first = ""] = request.nextUrl.pathname.split("/");
    if (PRODUCT_SEGMENTS.has(first)) {
      const target = request.nextUrl.clone();
      target.pathname = "/sign-in";
      target.search = "";
      /* Sign-up would be the friendlier guess, but somebody who typed a
         product address is far more likely to already have an account than
         not, and the sign-in screen offers the way to create one. */
      const back = safeReturnPath(request.nextUrl.pathname, request.nextUrl.search);
      if (back) target.searchParams.set("next", back);
      target.searchParams.set("notice", "sign-in-required");
      const redirect = NextResponse.redirect(target);
      /* A redirect carries no markup, so nothing here needs a nonce, but the
         policy still travels with it: `form-action` and `frame-ancestors` are
         the two that matter on a 307, and a response without a policy is a
         response an injected page can point at. */
      redirect.headers.set("content-security-policy", policy);
      return redirect;
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
