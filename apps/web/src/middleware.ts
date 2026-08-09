import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  contentSecurityPolicy,
  createNonce,
  cspHeaderName,
  NONCE_HEADER,
  REPORTING_ENDPOINTS,
} from "@/lib/security/csp";
import { safeReturnPath } from "@/lib/security/return-path";
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
 *
 * WHAT CHANGED, and why it matters more than it looks.
 *
 * This set used to hold `search`, `listing`, `rent`, `around`, `u` and `post`,
 * which meant an anonymous visitor could not see a single property. A shared
 * listing link hit a sign-in wall. Google could not index one page of
 * inventory. An app store reviewer would have opened the app, been asked to
 * register, and had no way to see that the product does anything.
 *
 * A property marketplace that cannot be seen cannot be found, and being found
 * is most of what a marketplace is for. So browsing is open and DOING is what
 * costs an account: saving, messaging, requesting an inspection, paying,
 * listing, the wallet, and everything in the consoles. That line is drawn in
 * two places and they have to agree. Here, for whole routes. And in the client
 * gate, for the individual controls on a page a stranger is allowed to read.
 *
 * Anything holding somebody's own data, their money, or somebody else's
 * attention stays behind the wall.
 */
const PRODUCT_SEGMENTS = new Set([
  // The (app) group.
  "assistant",
  "bookings",
  "checkout",
  "home",
  /* The in-product copies of the legal documents. The public originals at
     /privacy and /terms stay open to everyone, which is what a privacy policy
     is for; these are the same text inside the product shell and there is no
     reason for a stranger to reach them rather than the canonical page. */
  "legal",
  "messages",
  "notifications",
  "profile",
  "saved",
  "settings",
  /* Stories expire and count their viewers, so a view is a write against
     somebody's post. There is nothing to read here anonymously. */
  "stories",
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
 * The two agent addresses that used to be listed here are gone with the
 * `/agents` tree: setting a profile up is `/profile/setup/[role]` and an
 * application's state is `/profile/application`, both of which live under
 * `profile`, which is already a protected first segment. So the rule that
 * guarded them still applies and no longer needs naming twice.
 *
 * `/styleguide` is the design reference. It carries noindex and it is ours,
 * not a page a visitor has any business reading.
 *
 * Matched on the exact path, and on the path with a trailing slash, because
 * `/styleguide/` is the same page to a browser and a different string here.
 */
const PRODUCT_PATHS = new Set(["/styleguide"]);

/**
 * Stamp the policy on a response, whichever response it turned out to be.
 *
 * This middleware has three exits: the early one when Supabase is not
 * configured, the redirect that sends a signed-out visitor to sign in, and the
 * ordinary pass-through. A CSP applied to only the last of those is a CSP with
 * holes in it exactly where a visitor is least authenticated, so every exit
 * goes through here instead of setting the header itself.
 */
function withSecurityPolicy(response: NextResponse, nonce: string): NextResponse {
  response.headers.set(cspHeaderName(), contentSecurityPolicy(nonce));
  response.headers.set("Reporting-Endpoints", REPORTING_ENDPOINTS);
  return response;
}

export async function middleware(request: NextRequest) {
  /*
   * One nonce per request, minted before anything else so that every exit below
   * shares it. It travels two ways at once and needs to: forward on the REQUEST
   * headers, where the root layout reads it to mark its two before-paint
   * scripts as ours, and back on the RESPONSE headers inside the policy itself.
   * If those two ever disagreed, the theme and data-saver scripts would be
   * blocked and every first paint would flash the wrong theme.
   */
  const nonce = createNonce();
  request.headers.set(NONCE_HEADER, nonce);

  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return withSecurityPolicy(response, nonce);
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
      return withSecurityPolicy(NextResponse.redirect(target), nonce);
    }
  }

  return withSecurityPolicy(response, nonce);
}

export const config = {
  // Run on everything except static assets and image files.
  /*
   * THE EXTENSION RULE THAT USED TO BE HERE WAS A HOLE.
   *
   * It ended `|.*\.(?:svg|png|jpg|...)$`, which excluded ANY path ending in one
   * of those, not only paths under an asset directory. Every dynamic route on
   * this platform accepts such a suffix inside its own parameter, so the
   * middleware simply did not run for them. Measured against a production
   * build: `/checkout/abc.png`, `/listing/abc.png`, `/messages/abc.svg` and
   * `/u/somebody.png` all returned 200 with full HTML, no Content Security
   * Policy and no nonce.
   *
   * Three things were lost on those responses. The policy was absent entirely,
   * so an injected inline script would execute on a page where it could not on
   * the same route without the suffix. The signed-out gate below was never
   * consulted. And the Supabase token refresh, which the comment at the top of
   * this file says must not be removed, did not run.
   *
   * No data leak sat behind it: those pages call `resolveSession()` with RLS
   * behind that, so they render their signed-out state. It was a defence in
   * depth bypass rather than a breach, and it is closed by anchoring on the
   * directories that hold assets rather than on how a path happens to end.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|icons/|fonts/|pwa/|\\.well-known/|sw\\.js$|manifest\\.webmanifest$).*)",
  ],
};
