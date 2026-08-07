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
     * Images are the one place a wildcard is correct. Partner hotel photos come
     * from LiteAPI, which serves each property's pictures from whichever CDN
     * that supplier uses, so the host set is not knowable at build time and
     * changes per hotel. `https:` allows any image over TLS and nothing else:
     * `data:` for inline placeholders and `blob:` for a photo being previewed
     * before upload. It cannot execute.
     */
    ["img-src", ["'self'", "data:", "blob:", "https:"]],

    // Self-hosted faces only, and `data:` for nothing. See public/fonts.
    ["font-src", ["'self'"]],

    // The browser talks to us and to Supabase. Nothing else, including no
    // partner API: every provider call in lib/inventory is server side, and
    // this directive is what would catch it if one ever stopped being.
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
     * Forms post to us and to nowhere else. Paystack is reached by NAVIGATION
     * to an authorization_url rather than by a cross-origin form post, so the
     * checkout is unaffected by this; if that ever changes to a posted form,
     * this directive is what will report it before it silently breaks.
     */
    ["form-action", ["'self'"]],

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
