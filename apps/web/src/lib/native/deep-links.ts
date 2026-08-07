"use client";

import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

/**
 * The way back in. The other half of `external-links.ts`.
 *
 * Sending somebody to Paystack or to Google in the system browser is only half
 * a flow. The half that decides whether it was worth doing is what happens
 * when the third party finishes and redirects. Both of ours redirect to a URL
 * on OUR OWN ORIGIN:
 *
 *   - Paystack returns to `/wallet?funded=1&reference=...` or to
 *     `/checkout/<id>?paid=1&reference=...`, built in `lib/wallet/actions.ts`
 *     and `lib/bookings/checkout.ts`.
 *   - Supabase returns to `/auth/callback?code=...&next=...`, built in
 *     `lib/auth/actions.ts`.
 *
 * When the operating system has been told that those addresses belong to this
 * application, it does not open them in the browser at all. It hands them to
 * the app, which is what this listener receives. So the person taps "Pay", the
 * tab opens, they pay, and the tab closes itself and puts them back on their
 * booking with the payment already reflected. That is the whole point.
 *
 * WHY A FULL PAGE NAVIGATION AND NOT `router.replace`.
 *
 * Two independent reasons, and either one alone would settle it.
 *
 * First, `/auth/callback` is a Route Handler, not a page. The Next client
 * router cannot navigate to one; it has to be requested by the browser.
 *
 * Second, and this is the subtle one that decides whether sign in actually
 * works: THE SESSION COOKIES MUST LAND IN THE WEB VIEW'S COOKIE JAR, NOT THE
 * BROWSER'S. An in-app browser tab shares cookies with Safari or Chrome, not
 * with us. If the code to session exchange happened in that tab, the person
 * would be signed in inside the tab and still signed out inside the
 * application. Handing the callback URL to the web view instead means our own
 * server route runs against our own request, and it can complete because the
 * PKCE verifier cookie is already here: `startOAuth` ran as a server action
 * from this web view, so Supabase's verifier cookie was set on this cookie jar
 * before the person ever left.
 *
 * WHAT THIS FILE CANNOT CLOSE ON ITS OWN, STATED PLAINLY RATHER THAN IMPLIED.
 *
 * None of the above happens until the association between the domain and the
 * application exists, and none of it is in this folder:
 *
 *   - Android needs `/.well-known/assetlinks.json` served from the origin,
 *     plus an `android:autoVerify` intent filter for the domain in the
 *     manifest.
 *   - iOS needs `/.well-known/apple-app-site-association` served from the
 *     origin with no extension and the JSON content type, plus the associated
 *     domains entitlement on the target.
 *
 * `public/.well-known/`, `android/` and `ios/` are all held by other agents.
 * Until those land, this listener is correct and never fires: the redirect
 * opens as an ordinary page inside the in-app tab, and the person has to
 * dismiss the tab by hand to get back. For Paystack that is survivable,
 * because payment is settled by the server-to-server webhook rather than by
 * the return trip, so the money is already recorded and a refresh shows it.
 * For OAuth it is not survivable: the exchange happens in the tab's cookie jar
 * and the application stays signed out. Sign in with Google is therefore NOT
 * closed on the native shell until the association files ship.
 *
 * One further risk that is worth writing down because it is easy to miss on
 * iOS specifically. A universal link is only honoured when the operating
 * system intercepts the request; if the in-app tab loads
 * `/auth/callback?code=...` itself first, the route handler consumes the
 * single-use code in the wrong jar and the application's own attempt then
 * fails as already used. This is reasoned from how the flow is built, not
 * observed on a device, and it is the first thing to check on the first real
 * sign in.
 */

/** A path on our own origin, or null for anything else. */
function pathOnThisOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export async function startDeepLinks(): Promise<() => void> {
  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    /*
     * Close the tab first, unconditionally. It has served its purpose the
     * moment the operating system decided this URL belongs to us, and leaving
     * it up would put the destination behind a browser sheet the person then
     * has to dismiss. Failure is ignored: on a cold start there was no tab.
     */
    void Browser.close().catch(() => {});

    const path = pathOnThisOrigin(url);
    /* A custom scheme, or a link for some other host. Nothing here knows what
       to do with it, and guessing at a route from an unrecognised URL is how
       an application ends up navigable from outside itself. */
    if (!path) return;

    window.location.assign(path);
  });

  return () => {
    void handle.remove();
  };
}
