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
import { forwardedAgentHeaders } from "./lib/supabase/agent";
import { serverCookiesSecure, withAuthCookiePolicy } from "./lib/supabase/cookie-policy";
import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";
import {
  ANON_CATALOGUE_LIMIT,
  ANON_CATALOGUE_WINDOW_SECONDS,
  isPublicCataloguePath,
  PUBLIC_CATALOGUE_API_PATHS,
  publicCatalogueEnabled,
} from "@/lib/catalogue/public-access";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./lib/supabase/env";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { isKnownRoute } from "@/lib/routing/known-routes";
import { listingIsMissing, type ListingCounter } from "@/lib/routing/listing-exists";

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
 *
 * It is not the ONLY check, and it must never be treated as one. Every server
 * action resolves its own session and every read is behind RLS, because a
 * server action is posted to a page's path and a caller can choose a path this
 * gate leaves open. The middleware decides who gets a screen. The action and
 * the policy decide who gets a row.
 */

/**
 * WHAT CHANGED ON 23 SEPTEMBER, AND WHY THE LIST IS THE OTHER WAY UP NOW.
 *
 * The founder's instruction, in his own words: "Remove look around. You must
 * sign in. Nothing inside the platform is visible without signing up or
 * signing in."
 *
 * This file used to hold the closed list: a set of product first segments,
 * with everything else open. That shape answers the wrong question. A route
 * added to the app was PUBLIC until somebody remembered to classify it, and
 * "we forgot" is how a product quietly reopens. The same lesson was paid for
 * one layer down this morning, where a rule that lived in prose rather than in
 * a check took the whole catalogue off the air for eleven and a half hours
 * (ledger section 67): the knowledge was in the repository in three places and
 * the migration shipped anyway.
 *
 * So the list is inverted. PUBLIC is now the enumerated set and everything
 * else needs a session, which makes a new route BORN LOCKED, the same rule
 * rule 21 puts on a database function. Getting this list wrong in the closing
 * direction is a compliance problem rather than a bug, which is why every
 * entry below carries the reason it is there and why
 * `apps/web/tests/gate.spec.mjs` walks all of them with a real browser.
 *
 * WHAT IS DELIBERATELY ACCEPTED WITH IT, so nobody files either as a defect.
 * No listing will be indexed by any search engine, so the landing page is our
 * only public surface: `app/sitemap.ts` therefore publishes no listing URL.
 * And both app stores need reviewer credentials, which makes the seeded demo
 * account a hard requirement rather than a convenience. Both are written up in
 * `docs/STORE_SUBMISSION_NOTES.md`.
 */

/**
 * Open to anybody, matched on the FIRST path segment.
 *
 * Matched on the segment rather than by prefix string, so `/terms` is public
 * and a future `/termsheet` is not public by accident.
 *
 * THE LANDING PAGE AND WHAT SURROUNDS IT. `/` is the founder's named public
 * surface. `about`, `careers`, `contact`, `help` and `docs` are the company
 * and support pages that hang off its footer: they are not inside the
 * platform, and a support page behind a login is a support page the one person
 * who most needs it cannot reach. `/help` additionally mounts the support chat
 * that `/api/support` answers, which is why that endpoint is open below.
 *
 * THE LEGAL AND POLICY PAGES. `terms`, `privacy`, `eula`, `cancellations`,
 * `standards`, `safety`. A privacy notice nobody can read without an account
 * is not a privacy notice. A regulator, an app store reviewer and a person who
 * has lost access to their account must all be able to reach every one of
 * these without signing in.
 *
 * `delete-account` IS NOT OPTIONAL AND IT IS NOT MARKETING. Google Play
 * requires a publicly reachable URL explaining how to request account deletion
 * that works without installing anything and without signing in. It also
 * carries the restore form, which is the one step a person CANNOT perform
 * signed in, because their account is banned for the length of the grace
 * window. Closing this page would lock somebody out of undoing their own
 * deletion.
 *
 * THE DOORS. `sign-in`, `sign-up`, `forgot-password`, `reset-password`, `auth`
 * (which is where every confirmation link lands, and a session is the thing it
 * is about to create) and `start` (the old intro address, a 307). A lock with
 * no door is a wall.
 *
 * `welcome` IS THE FRONT DOOR. First run is the first thing a stranger meets,
 * from the stores and from Sign up or Sign in, so it must answer signed out.
 * It has moved from the closed list to this one and it means the same thing.
 *
 * `offline` is served when there is no network at all, so it cannot depend on
 * an auth call, and `home-or-landing` resolves the word "home" by reading the
 * caller's own cookies and answers `/` for a stranger, which is the honest
 * answer and would become a redirect loop if it were gated.
 *
 * `preview` and `gallery` STAY OUT OF THE GATE ON PURPOSE. They carry their
 * own guard, `previewHarnessIsOpen`, which answers not-found on Vercel
 * unconditionally and off Vercel unless `VALLO_PREVIEW_HARNESS=1`. Gating them
 * as well would break every proof walk in `scripts/design/`, which runs signed
 * out by necessity, and would buy nothing in production where they do not
 * exist.
 */
const PUBLIC_SEGMENTS = new Set([
  // The company and support surfaces around the landing page.
  "about",
  "careers",
  "contact",
  "docs",
  "help",
  // Legal and policy. Never close one of these.
  "cancellations",
  "eula",
  "privacy",
  "safety",
  "standards",
  "terms",
  // Compliance: the Play Store deletion URL and the only route back from a
  // deletion already started.
  "delete-account",
  // The doors.
  "auth",
  "forgot-password",
  "reset-password",
  "sign-in",
  "sign-up",
  "start",
  "welcome",
  // Serving with no network, and resolving which home the caller means.
  // `open` is where the native app starts (STORE-04): it answers /home for a
  // session and /welcome or the open catalogue for anybody else.
  "home-or-landing",
  "open",
  "offline",
  // Development harnesses, closed by their own guard in production.
  "gallery",
  "preview",
]);

/**
 * Open, matched on the EXACT path, because these are files rather than trees.
 *
 * `/` is the landing page. `/robots.txt` and `/sitemap.xml` are read by
 * crawlers that have no session and never will, and a sitemap behind a login
 * is a sitemap nothing can fetch. `/opengraph-image.jpg` is what an unfurler
 * fetches when somebody pastes our address into a chat, so it is public for
 * the same reason.
 *
 * Everything else a browser fetches without a session already leaves the
 * middleware alone through the matcher at the foot of this file: the static
 * chunks, the brand and icon directories, the fonts, the PWA assets,
 * `/.well-known/`, `/sw.js` and `/manifest.webmanifest`.
 */
const PUBLIC_PATHS = new Set(["/", "/robots.txt", "/sitemap.xml", "/opengraph-image.jpg"]);

/**
 * The API routes that answer WITHOUT a session, by exact path, and why each
 * one has to.
 *
 * A GATE THAT ONLY REDIRECTS PAGE REQUESTS WHILE THE DATA ROUTES STILL ANSWER
 * IS NOT A GATE, IT IS A CURTAIN. `/api/map/listings` served the whole
 * catalogue inside a bounding box to anybody who asked, and the map on
 * `/search` is the only thing that calls it.
 *
 * ENUMERATED AS THE OPEN SET, NOT THE CLOSED ONE, for the same reason as the
 * page list: a new endpoint is then born closed. Every entry here carries its
 * own guard, and none of them is a session:
 *
 *   webhooks           a signature over the body, from Paystack, Yellow Card
 *                      and Supabase's own auth hook. The sender has no cookie
 *                      and never will.
 *   cron               a bearer secret through `lib/cron/run.ts`, including
 *                      `/api/push/drain`, which pg_net calls every five
 *                      minutes, and `/api/paystack/reconcile`.
 *   browser telemetry  `/api/csp-report` is named in the Reporting-Endpoints
 *                      header this middleware stamps on EVERY response,
 *                      including the sign-in page's, and `/api/client-error`
 *                      is posted by the error boundaries. Closing either one
 *                      would mean the only reports we ever received came from
 *                      people who were already signed in.
 *   the service worker `/api/push/sw` is fetched as a script by the browser's
 *                      service worker registration.
 *   support            `/api/support` answers the chat mounted on the PUBLIC
 *                      `/help` page. Somebody locked out is exactly who needs
 *                      it.
 *
 *   the VAPID key  `/api/push/key` answers the PUBLIC half of the key pair,
 *                      and a browser cannot call `pushManager.subscribe`
 *                      without it. Gating it was a real defect: on 23
 *                      September the founder tried to register the first
 *                      device this platform has ever had and got
 *                      `{"error":"Sign in to use this."}` from inside a home
 *                      screen web app, which keeps its own cookie store and so
 *                      had no session. The route's own header said all along
 *                      that "publishing it is the intended use, not a leak",
 *                      and its variable is literally named `NEXT_PUBLIC_`.
 *                      Two parts of this codebase disagreed about one route
 *                      and the wall won. It is open now and the three that
 *                      matter stay shut.
 *
 * Closed by absence, and checked: `/api/assistant`, `/api/crypto/*`,
 * `/api/documents/[id]`, `/api/map/listings`, `/api/push/register`,
 * `/api/push/revoke` and `/api/push/self-test`. Those three write or send;
 * the key only tells a browser who to bind a subscription to.
 */
const PUBLIC_API_PATHS = new Set([
  "/api/auth/email-hook",
  "/api/client-error",
  "/api/cron/account-purge",
  "/api/cron/canary",
  "/api/cron/complete-stays",
  "/api/cron/email-outbox",
  "/api/cron/hold-sweep",
  "/api/cron/inventory-drift",
  "/api/cron/pg-cron-watch",
  "/api/cron/saved-search-alerts",
  "/api/csp-report",
  "/api/health/catalogue",
  "/api/push/key",
  "/api/paystack/reconcile",
  "/api/paystack/webhook",
  "/api/push/drain",
  "/api/push/sw",
  "/api/support",
  "/api/yellowcard/webhook",
]);

/**
 * May a caller with no session have this path at all?
 *
 * Exported so `proxy.test.ts` can put every route on this platform through the
 * same function the running middleware uses, rather than through a second copy
 * of the rule that can agree with itself while disagreeing with the product.
 */
export function isPublicPath(
  path: string,
  options: { publicCatalogue?: boolean } = {},
): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  /* STORE-P2-04: the founder's switch, VALLO_PUBLIC_CATALOGUE. It can only
     ADD the six read-only catalogue segments; it cannot open an account
     surface, and of the API only the map's pins, which the search page calls
     and which carry their own per-address limit
     (`lib/catalogue/public-access.ts`). */
  if (options.publicCatalogue && isPublicCataloguePath(path)) return true;
  if (options.publicCatalogue && PUBLIC_CATALOGUE_API_PATHS.has(path)) return true;
  /* An API path is decided by its WHOLE path and never by its first segment,
     because `api` is not a public tree: exactly sixteen endpoints under it
     answer a caller with no session and the rest do not. */
  if (isApiPath(path)) return PUBLIC_API_PATHS.has(path);
  const [, first = ""] = path.split("/");
  return PUBLIC_SEGMENTS.has(first);
}

/**
 * A top-level page load, as opposed to Next's RSC navigation fetches and the
 * intent prefetches a listing card fires on hover or touch. Only these count
 * against a stranger's catalogue allowance: a person scrolling a list would
 * otherwise spend several counts per page they never opened, and a refusal
 * sent to an RSC fetch surfaces as a broken navigation, not a sentence.
 */
export function isDocumentRequest(request: { headers: Headers }): boolean {
  const headers = request.headers;
  if (headers.get("rsc") === "1" || headers.has("next-router-prefetch")) return false;
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`.toLowerCase();
  if (purpose.includes("prefetch")) return false;
  const dest = headers.get("sec-fetch-dest");
  return dest === null || dest === "document";
}

/** An `/api` path, which is answered rather than redirected. See `refuse`. */
export function isApiPath(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

/**
 * Stamp the policy on a response, whichever response it turned out to be.
 *
 * This middleware has three exits: the early one when Supabase is not
 * configured, the redirect that sends a signed-out visitor to sign in, and the
 * ordinary pass-through. A CSP applied to only the last of those is a CSP with
 * holes in it exactly where a visitor is least authenticated, so every exit
 * goes through here instead of setting the header itself.
 */
/** The visitor's own User-Agent, capped, or nothing at all. See the call site. */
function forwardedAgent(request: NextRequest): Record<string, string> {
  return forwardedAgentHeaders(request.headers.get("user-agent"));
}

function withSecurityPolicy(response: NextResponse, nonce: string): NextResponse {
  response.headers.set(cspHeaderName(), contentSecurityPolicy(nonce));
  response.headers.set("Reporting-Endpoints", REPORTING_ENDPOINTS);
  return response;
}

/** An address no route matches: a closed harness request, or an unknown one, is rewritten here to get the site's 404. */
export const HARNESS_CLOSED_PATH = "/_harness-closed";

/** The development harness trees, `/preview` and `/gallery`. */
export function isHarnessPath(pathname: string): boolean {
  return /^\/(preview|gallery)(\/|$)/.test(pathname);
}

export async function proxy(request: NextRequest) {
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

  /*
   * STORE-17: A CLOSED HARNESS IS A REAL 404, DECIDED BEFORE ANY RENDER.
   *
   * The harness layout's own `notFound()` runs after the root `loading.tsx`
   * has started the stream, so the status was already 200 and the page
   * beside it had streamed its list of preview decks into the payload. The
   * rewrite goes to an address no route matches, so Next answers with the
   * site's not-found page and a 404 status, and nothing of the harness is
   * rendered at all.
   */
  if (isHarnessPath(request.nextUrl.pathname) && !previewHarnessIsOpen(process.env)) {
    const closed = request.nextUrl.clone();
    closed.pathname = HARNESS_CLOSED_PATH;
    closed.search = "";
    return withSecurityPolicy(NextResponse.rewrite(closed, { request }), nonce);
  }

  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return withSecurityPolicy(response, nonce);
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    /*
     * WHOSE DEVICE THIS IS, PASSED ON RATHER THAN OVERWRITTEN. SEC-5.
     *
     * GoTrue stamps `auth.sessions.user_agent` from the User-Agent header of
     * whichever request last touched the session. That request is this one, so
     * every row in the table read `Vercel Edge Functions`: the runtime's own
     * fetch agent, describing our server. `/settings/devices` asks somebody
     * "do you recognise this device", and until this line the only honest
     * answer it could give was that the device was not recorded.
     *
     * Forwarding the browser's own header fixes it at the source rather than
     * building a second session store beside the real one. The value is
     * attacker controlled, as every request header is, and it is never
     * rendered: `lib/security/device.ts` maps it onto a fixed list of browser
     * and platform names and returns nothing else, so the worst a crafted
     * header achieves is a row reading "Unrecognised device".
     *
     * Capped, because the header goes into a column and a database is not the
     * place to discover somebody sent a megabyte. Absent on a request with no
     * User-Agent, in which case nothing is set and GoTrue records what it
     * always did.
     *
     * The IP is deliberately NOT forwarded. Supabase's own proxy decides what
     * `auth.sessions.ip` holds and an X-Forwarded-For from us is a claim it may
     * or may not honour, which is the difference between a fact and a guess.
     * That is why `my_sessions()` does not return the column and why the screen
     * shows no location at all.
     */
    global: { headers: forwardedAgent(request) },
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
          response.cookies.set(name, value, withAuthCookiePolicy(options, serverCookiesSecure(request.nextUrl.protocol)));
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
    const publicCatalogue = publicCatalogueEnabled();

    /* A stranger reading the open catalogue is counted per address, so the
       switch cannot be used to walk every listing at machine speed. Only the
       pages are counted; a person reads a few a minute. */
    if (publicCatalogue && isPublicCataloguePath(path) && isDocumentRequest(request)) {
      const verdict = await consume({
        bucket: "anon_catalogue",
        subject: subjectForIp(ipFromHeaders(request.headers)),
        limit: ANON_CATALOGUE_LIMIT,
        windowSeconds: ANON_CATALOGUE_WINDOW_SECONDS,
      });
      if (!verdict.allowed) {
        /* A page, so a page answers: the sign-in screen with the reason, and
           the address they wanted kept. Sign in and browsing carries on. */
        const target = request.nextUrl.clone();
        target.pathname = "/sign-in";
        target.search = "";
        const back = safeReturnPath(request.nextUrl.pathname, request.nextUrl.search);
        if (back) target.searchParams.set("next", back);
        target.searchParams.set("notice", "catalogue-paced");
        const response = NextResponse.redirect(target);
        response.headers.set("retry-after", String(verdict.retryAfterSeconds));
        response.headers.set("cache-control", "no-store");
        return withSecurityPolicy(response, nonce);
      }
    }

    if (!isPublicPath(path, { publicCatalogue })) {
      /*
       * AN API ROUTE IS ANSWERED, NEVER REDIRECTED.
       *
       * A 307 to an HTML sign-in page is not something a `fetch` can do
       * anything with: it follows the redirect, receives a page, and the
       * caller then tries to read JSON out of it. The refusal has to be
       * readable by the thing that made the request, so it is a 401 with the
       * reason in it and `no-store` so nothing caches a refusal.
       */
      if (isApiPath(path)) {
        return withSecurityPolicy(
          NextResponse.json(
            { error: "Sign in to use this.", code: "sign-in-required" },
            { status: 401, headers: { "cache-control": "no-store" } },
          ),
          nonce,
        );
      }

      /* OPS-17: an address this app does not answer at is a 404 for a
         stranger too, not a trip to the sign-in screen. */
      if (!isKnownRoute(path)) {
        const missing = request.nextUrl.clone();
        missing.pathname = HARNESS_CLOSED_PATH;
        missing.search = "";
        return withSecurityPolicy(NextResponse.rewrite(missing, { request }), nonce);
      }

      const target = request.nextUrl.clone();
      target.pathname = "/sign-in";
      target.search = "";
      /* Sign-up would be the friendlier guess, but somebody who typed a
         product address is far more likely to already have an account than
         not, and the sign-in screen offers the way to create one.

         THE DEEP LINK IS THE WHOLE POINT OF THIS PARAMETER. Every listing
         address anybody shares now lands here first, so a `next` that is
         dropped turns every shared link on the platform into a dead end. It
         rides through `/sign-in`, `/sign-in/email` and `/auth/callback`
         already; `safeReturnPath` is what keeps it a path and not somebody
         else's host. */
      const back = safeReturnPath(request.nextUrl.pathname, request.nextUrl.search);
      if (back) target.searchParams.set("next", back);
      target.searchParams.set("notice", "sign-in-required");
      return withSecurityPolicy(NextResponse.redirect(target), nonce);
    }
  }

  /* OPS-17: a listing page for a listing that is not there answers 404 before
     the stream starts. Documents only: a prefetch or an RSC fetch goes on to
     the page, which renders the not-found state itself. The refreshed session
     cookies on `response` are carried over. */
  if (request.method === "GET" && isDocumentRequest(request)) {
    const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
    if (await listingIsMissing(path, supabase as unknown as ListingCounter)) {
      const missing = request.nextUrl.clone();
      missing.pathname = HARNESS_CLOSED_PATH;
      missing.search = "";
      const rewritten = NextResponse.rewrite(missing, { request });
      for (const cookie of response.cookies.getAll()) rewritten.cookies.set(cookie);
      return withSecurityPolicy(rewritten, nonce);
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
