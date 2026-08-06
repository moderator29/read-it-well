/**
 * The Content Security Policy.
 *
 * This was the largest outstanding security item in `KNOWN_GAPS.md`. Every
 * other security header was already set at the edge in `next.config.ts`, and a
 * CSP was left out because the ones that are easy to write are the ones worth
 * nothing: a policy carrying `script-src 'unsafe-inline'` stops no injection
 * that anybody actually attempts, and it costs the same to serve as a real one.
 *
 * WHY A NONCE AND NOT A HASH LIST. Next streams the RSC payload to the browser
 * inside a run of inline `self.__next_f.push(...)` scripts whose contents change
 * with the page, the locale and the data, so their hashes are not knowable at
 * build time and could not be enumerated in a static header. A per-request
 * nonce is the only mechanism that covers them. Next reads the nonce out of the
 * `Content-Security-Policy` header on the INCOMING request and stamps it onto
 * every script it emits itself, which is why the middleware sets the policy on
 * the request as well as on the response.
 *
 * WHY THAT IS AFFORDABLE HERE. A nonce cannot be baked into a statically
 * prerendered page, so on most Next applications this trade buys security with
 * the loss of static generation. It costs this platform nothing, because the
 * root layout already awaits `getLocale()`, which reads `cookies()`, so every
 * route in the app was dynamically rendered long before this file existed.
 *
 * WHY `strict-dynamic`. Without it the policy has to name every origin any
 * script might come from, and that allowlist rots the moment a chunk moves.
 * With it, the nonced Next bootstrap is trusted to load the chunks it knows
 * about, and an injected `<script src>` in some other element is not, which is
 * the actual threat. `'self' https:` trails it as the fallback for browsers too
 * old to understand `strict-dynamic`; those browsers ignore `strict-dynamic`
 * and read the allowlist, and browsers that understand it ignore the allowlist.
 */

/** The hosts the browser genuinely talks to, kept in one place so the policy and the reasoning cannot drift apart. */
const MAPTILER_ORIGIN = "https://api.maptiler.com";
const CARTO_TILE_ORIGIN = "https://basemaps.cartocdn.com";
const UNSPLASH_ORIGIN = "https://images.unsplash.com";

/**
 * Where Paystack takes a payer.
 *
 * `lib/payments/paystack.ts` calls `https://api.paystack.co` from the server
 * and hands back an `authorization_url` on this host, which the browser is then
 * sent to. Both `WalletDeck` and `PayPanel` reach it with
 * `window.location.assign`, and `lib/wallet/actions.ts` reaches it with a
 * server-side `redirect()`, which is the case that matters here. See the note
 * on `form-action` below for why a payments host appears in a form directive.
 */
const PAYSTACK_CHECKOUT_ORIGIN = "https://checkout.paystack.com";

/**
 * A fresh nonce, 128 bits, base64.
 *
 * Web Crypto rather than `node:crypto` because the middleware runs on the Edge
 * runtime, where the Node module is not available. `btoa` over a binary string
 * is the Edge-safe way to base64 the bytes, since `Buffer` is not there either.
 */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * The Supabase origin the browser is allowed to reach, derived from the public
 * project URL rather than hardcoded, so the policy follows the environment the
 * way the image allowlist in `next.config.ts` already does.
 *
 * Returns an empty string when the URL is absent or malformed, which is a
 * designed state on this platform and not an error: the owner adds environment
 * keys personally, and a build without them serves signed-out surfaces. An
 * empty string simply contributes no origin to the policy.
 */
function supabaseOrigins(): { http: string; socket: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.length === 0) return { http: "", socket: "" };
  try {
    const { origin, host } = new URL(url);
    /* Realtime is a WebSocket to the same host, and `connect-src` does not
       infer wss: from https:, so it has to be named separately. */
    return { http: origin, socket: `wss://${host}` };
  } catch {
    return { http: "", socket: "" };
  }
}

/**
 * Build the policy for one request.
 *
 * `development` relaxes exactly two things and nothing else. Turbopack's
 * refresh runtime compiles modules with `eval`, and the dev overlay talks to
 * the dev server over a WebSocket, so a production-grade policy makes `next
 * dev` unusable. Both relaxations are keyed off `NODE_ENV`, which the
 * production build sets for us, so neither can reach a deployment.
 */
export function contentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  const supabase = supabaseOrigins();

  const connect = [
    "'self'",
    supabase.http,
    supabase.socket,
    /* Leaflet fetches its tiles as images, but MapTiler's client also probes
       the style endpoint over fetch, and a blocked probe fails the map open
       rather than loudly. */
    MAPTILER_ORIGIN,
    CARTO_TILE_ORIGIN,
    isDevelopment ? "ws://localhost:*" : "",
  ].filter((source) => source.length > 0);

  const image = [
    "'self'",
    /* `blob:` is how a chosen photo is previewed before it is uploaded, and
       `data:` covers the inline SVG the icon system paints from tokens. */
    "blob:",
    "data:",
    UNSPLASH_ORIGIN,
    supabase.http,
    MAPTILER_ORIGIN,
    CARTO_TILE_ORIGIN,
  ].filter((source) => source.length > 0);

  const script = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https:",
    isDevelopment ? "'unsafe-eval'" : "",
  ].filter((source) => source.length > 0);

  const directives: string[] = [
    `default-src 'self'`,
    `script-src ${script.join(" ")}`,
    /*
     * WHY STYLES ARE NOT NONCED.
     *
     * React writes a `style` prop out as a `style` attribute, and every one of
     * those is governed by `style-src-attr`, which a nonce cannot cover because
     * an attribute has nowhere to carry one. Nonce-ing stylesheets while
     * leaving attributes inline would forbid nothing and would break the
     * platform's own inline styling, and the exposure it buys is small: the
     * damage an attacker does with injected CSS is real but bounded, where
     * injected script is total. Scripts are where the strictness went.
     */
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${image.join(" ")}`,
    /* The seven Inter faces are self-hosted. Nothing else loads a font. */
    `font-src 'self'`,
    `connect-src ${connect.join(" ")}`,
    /* The offline shell in `public/sw.js`, plus any blob worker a library starts. */
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    /* Nothing on this platform embeds a third party, and nothing may embed us.
       `frame-ancestors` is the modern half of the `X-Frame-Options: DENY` that
       is already set, and unlike that header it is honoured everywhere. */
    `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    /* Stops an injected `<base>` from re-pointing every relative URL on the
       page, which is the cheapest way to turn one injection into all of them. */
    `base-uri 'self'`,
    /*
     * WHY TWO OUTSIDE ORIGINS ARE ON A FORM DIRECTIVE.
     *
     * `form-action 'self'` alone would be correct for every form on this
     * platform, because every one of them posts to a server action on this
     * origin. The catch is what happens AFTER the post. Two server actions
     * finish with a `redirect()` to somebody else: `signInWithProvider` sends
     * the person to Supabase's authorize endpoint, which onward-redirects to
     * Google or Apple, and `fundWallet` sends them to Paystack's checkout.
     *
     * With JavaScript running, neither is a form navigation: the action is a
     * fetch and the router performs the move, which `form-action` does not
     * govern. Without JavaScript, Next degrades the action to a real form POST,
     * and the redirect that follows IS part of the form navigation. Browsers
     * disagree here, and the ones that check the redirect chain (Firefox does,
     * Chromium historically does not) would block sign-in with Google and every
     * card payment, on the slowest connections, in a way no test in this
     * repository would catch and no user could report usefully.
     *
     * So the two destinations are named. Nothing else is, and neither of these
     * can receive a form POST from us in the first place: they are redirect
     * targets, which is exactly the narrow thing being allowed.
     */
    `form-action ${["'self'", supabase.http, PAYSTACK_CHECKOUT_ORIGIN].filter((source) => source.length > 0).join(" ")}`,
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
