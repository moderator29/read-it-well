/**
 * V-11: THE APP NEVER OPENS ON THE WEBSITE.
 *
 * A store install used to open `/`, the marketing landing page, with its site
 * header, newsletter field, careers link and store badges. That is the
 * literal description of an App Review 4.2 rejection ("a repackaged
 * website"), and it is the first second a reviewer spends in the binary.
 *
 * ---------------------------------------------------------------------------
 * HOW THE SHELL IS RECOGNISED, AND WHY NOT BY `server.url`.
 *
 * The obvious fix is to point Capacitor's `server.url` at
 * `/home-or-landing?app=1`. Read against the bridge source in
 * `node_modules/@capacitor`, it breaks the app on both platforms:
 *
 *   iOS      `WebViewDelegationHandler` treats a navigation as the app's own
 *            only if its URL STARTS WITH `serverURL`. With a path and query in
 *            `serverURL`, a tap to `/home` does not, and is handed to Safari.
 *   Android  `Bridge.setAllowedOriginRules` adds the raw server URL to the
 *            origin rules of the JavaScript bridge, where a path is not an
 *            origin.
 *   and      `server.appStartPath` (Capacitor 7.3+) is no better on iOS:
 *            `loadWebView` refuses to start unless a LOCAL FILE exists at
 *            webDir + appStartPath, and `appendingPathComponent` escapes `?`.
 *
 * So `server.url` stays the bare origin and the shell announces itself
 * instead: `capacitor.config.ts` sets `appendUserAgent` to `SHELL_UA_MARK`,
 * and the server, which sees that on every request, sends the shell's first
 * request for `/` to `/home-or-landing?app=1` before anything renders. The
 * `app=1` parameter is kept as the explicit form of the same request, so the
 * start can be tested from a browser and named in the store notes.
 *
 * This is not cloaking: the shell is not a link unfurler, the content is not
 * a listing, and what differs is where the product's own front door is.
 */

/**
 * Appended to the web view's user agent by `capacitor.config.ts`. The same
 * token as `NATIVE_UA_TOKEN` in `lib/auth/providers.ts`, which the sign-in
 * screen reads to leave out doors a web view cannot complete: the shell
 * announces itself once, and both readers hear it. Written out rather than
 * imported so this module stays free of the auth layer.
 */
export const SHELL_UA_MARK = "VALLO-NATIVE";

/** Does this user agent belong to the Vallo store shell? */
export function isShellUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return userAgent.includes(SHELL_UA_MARK);
}

/** Was this request made by, or on behalf of, the store shell? */
export function isShellRequest(input: {
  userAgent: string | null | undefined;
  app?: string | null;
}): boolean {
  return input.app === "1" || isShellUserAgent(input.userAgent);
}

/**
 * Where the shell opens. Never `/`.
 *
 *   signed in                          `/home`
 *   signed out, first run not seen     `/welcome` (the four slides are the
 *                                      most native-looking screens we have)
 *   signed out, first run seen         `/sign-in`
 *
 * Unconfigured (no platform keys) is treated as signed out, which lands on
 * `/welcome`: a screen that renders without a database, rather than `/home`,
 * which cannot.
 */
export function shellStartPath(input: { signedIn: boolean; firstRunSeen: boolean }): string {
  if (input.signedIn) return "/home";
  return input.firstRunSeen ? "/sign-in" : "/welcome";
}

/** The shell's own start address, for the landing page's redirect. */
export const SHELL_START = "/home-or-landing?app=1";
