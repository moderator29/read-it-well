/**
 * The one place the public domain is written down.
 *
 * WHY THIS FILE EXISTS.
 *
 * The domain used to be a literal, spelled out in about twenty places: three
 * share notices, a handle hint, an area preview, the email sender, the email
 * base URL, the privacy notice, the terms and a dozen test fixtures. When the
 * brand changed from RentMe to Vallo, every one of those became wrong
 * independently, and `apps/web/src/lib/legal/company.ts` records that a stale
 * `support@rentme.ng` had already survived one rename and ended up in a legal
 * document, where a wrong address is a defective notice rather than a typo.
 *
 * So the domain is a constant now, and the next change is one edit.
 *
 * WHAT THIS IS NOT FOR.
 *
 * It is not for building links. `siteUrl()` and `authOrigin()` in `lib/site.ts`
 * do that, and they read the request or the environment, because the host a
 * reader is on is a fact about the request and not a configuration question. A
 * real sign-up once landed on `localhost` because an environment variable was
 * the instrument for something the request already knew.
 *
 * This constant is for the two cases where neither of those can help:
 *
 *   1. Copy that TELLS a person their address, when no link is being made.
 *      Prefer `displayHost()` below, which uses the host the reader is actually
 *      on and falls back to this only when there is no window.
 *   2. A default that has to exist before any request does, such as the email
 *      sender when `EMAIL_FROM` is unset.
 *
 * THE VALUE IS A PLACEHOLDER UNTIL THE FOUNDER CONFIRMS IT.
 *
 * `vallo.ng` follows the `.ng` that the previous domain used and matches a
 * Nigerian company, but nobody has confirmed that it is registered or that it
 * is the domain Vercel will serve. It is written here, once, precisely so that
 * confirming it is a one line change rather than another sweep.
 */

/** The public domain, without a scheme and without a trailing slash. */
export const BRAND_DOMAIN = "vallo.ng";

/** The public origin. Use `siteUrl()` for anything a browser will follow. */
export const BRAND_ORIGIN = `https://${BRAND_DOMAIN}`;

/**
 * The host to show a person in copy, which is the host they are actually on.
 *
 * A reader on a preview deployment, on the native shell's server URL or on
 * localhost is told the truth about where they are, rather than an address
 * that would not work if they typed it. Only when there is no window, which is
 * a server render of copy that has no request to read, does this fall back to
 * the constant.
 */
export function displayHost(): string {
  if (typeof window !== "undefined" && window.location.host.length > 0) {
    return window.location.host;
  }
  return BRAND_DOMAIN;
}
