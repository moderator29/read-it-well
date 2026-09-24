import { parseCookieHeader, serializeCookieHeader, type CookieOptions } from "@supabase/ssr";

/**
 * SEC-07: how the session cookies are written, wherever they are written.
 *
 * `@supabase/ssr` writes its auth cookies with `Secure` off, `HttpOnly` off
 * and a 400-day lifetime, and it re-applies the 400 days itself after merging
 * any `cookieOptions` it is given (0.12.3 `cookies.js`), so passing options is
 * not enough. Every writer therefore runs the options through
 * `withAuthCookiePolicy`: the server client, the proxy and the browser client.
 *
 *   - Secure on HTTPS, so the refresh token is never sent in clear on a first
 *     plain-HTTP request or a captive portal. Development on http://localhost
 *     keeps working: the server only sets it in production, the browser only
 *     on an https page.
 *   - 30 days, not 400. The lifetime slides: the proxy and the browser rewrite
 *     the cookie every time the token rotates (about hourly while in use), so
 *     somebody who uses Vallo stays signed in and a cookie left on an unused
 *     device goes stale in a month.
 *   - SameSite=Lax and Path=/ as before.
 *
 * `HttpOnly` stays off: the browser client (uploads, realtime) reads the
 * session from these cookies. Moving that behind the server is its own piece
 * of work (SEC-07 pass two).
 *
 * A removal (maxAge 0) stays a removal.
 */
export const AUTH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function withAuthCookiePolicy(
  options: CookieOptions | undefined,
  secure: boolean,
): CookieOptions {
  const maxAge = options?.maxAge;
  return {
    ...options,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: typeof maxAge === "number" && maxAge > 0 ? Math.min(maxAge, AUTH_COOKIE_MAX_AGE_SECONDS) : maxAge,
  };
}

/** On the server: Secure in production. */
export function serverCookiesSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * The browser client's cookie methods: the same as `@supabase/ssr`'s own
 * document.cookie adapter, with the policy applied on the way out.
 */
export function browserCookieMethods(
  env: () => { doc: { cookie: string }; https: boolean } = () => ({
    doc: document,
    https: location.protocol === "https:",
  }),
) {
  return {
    getAll() {
      return parseCookieHeader(env().doc.cookie).map(({ name, value }) => ({ name, value: value ?? "" }));
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      const { doc, https } = env();
      for (const { name, value, options } of cookiesToSet) {
        doc.cookie = serializeCookieHeader(name, value, withAuthCookiePolicy(options, https));
      }
    },
  };
}
