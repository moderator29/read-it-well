"use client";

import { Browser } from "@capacitor/browser";
import { CHROME_COLOUR, currentTheme } from "./theme";

/**
 * Anything that is not ours opens in the system browser, never in the shell.
 *
 * THIS IS THE MOST LOAD-BEARING FILE IN THIS FOLDER, AND THE TWO FLOWS IT
 * PROTECTS ARE THE TWO THE BUSINESS RUNS ON.
 *
 * A web view has one page. Navigate it to a third party origin and the
 * application is GONE: no chrome, no back button on iOS, no way to return
 * except whatever that third party chooses to offer. Two flows on this
 * platform do exactly that today, and both are deliberate and correct on the
 * web:
 *
 *   - Paystack checkout. `lib/wallet/actions.ts` and `lib/bookings/checkout.ts`
 *     mint an authorisation URL on Paystack's domain, and the wallet deck and
 *     the checkout pay panel send the browser to it.
 *   - Supabase authorize. `startOAuth` in `lib/auth/actions.ts` redirects to
 *     Supabase, which redirects onward to Google or Apple.
 *
 * The second one is not merely awkward inside a shell, it is IMPOSSIBLE.
 * Google refuses OAuth in an embedded web view outright, by policy and in
 * code, and answers `disallowed_useragent`. Sign in with Google in a naive
 * shell is not a degraded experience, it is a dead button. Opening the system
 * browser is not a workaround, it is the answer Google documents and the only
 * one that works.
 *
 * WHERE THIS INTERCEPTS, AND WHY IT IS NOT AT THE CALL SITES. The call sites
 * belong to the web application and are shared with the website, which must
 * not change at all, so the handoff is installed once at the document level
 * for every outbound navigation rather than being threaded through payment and
 * auth code that has no business knowing a shell exists. Two chokepoints, and
 * between them they cover every way this application leaves its own origin:
 *
 *   1. A capture-phase click on any anchor. Covers ordinary links, including
 *      `target="_blank"`, which never reaches the navigation handler below
 *      because it opens a window rather than navigating this one.
 *
 *   2. The Navigation API's `navigate` event. This is the one that matters for
 *      payments and OAuth, because both arrive as a programmatic assignment to
 *      `window.location`, which cannot be intercepted any other way:
 *      `Location`'s members are `[LegacyUnforgeable]`, so `assign` and `href`
 *      cannot be wrapped, monkey patched or watched. The navigate event is the
 *      only hook the platform gives us for a script-initiated top level
 *      navigation, and it is cancellable for exactly this purpose.
 *
 * WHAT HAPPENS WHERE THE NAVIGATION API IS ABSENT. It is in Chromium from 102,
 * so it covers the Android WebView on every device this ships to, and in
 * Safari from 18.4, so it covers recent iOS and not older iOS. Where it is
 * missing, the programmatic navigation proceeds and Capacitor's own navigation
 * delegate catches it at the native layer instead: it refuses to load a
 * foreign origin in the shell and hands the URL to the operating system, which
 * opens the full browser application. The payment still works and the app is
 * still there behind it. What is lost is the in-app tab, so the person changes
 * application to pay and has to come back by hand. That is a worse experience
 * and it is not a broken one, which is the right shape for a fallback.
 *
 * THE RETURN JOURNEY IS NOT IN THIS FILE. See `deep-links.ts`, which is the
 * other half and which states honestly what it cannot close on its own.
 */

/** A URL worth handing to the system browser, or null to leave it alone. */
function externalHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw, window.location.href);

    /* Only the web. `mailto:`, `tel:`, `whatsapp:` and `geo:` are handled by
       the operating system perfectly well when the web view lets them through,
       and an in-app browser tab cannot open any of them. */
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    /* Ours. Every screen, every route handler, every asset. */
    if (url.origin === window.location.origin) return null;

    return url.href;
  } catch {
    return null;
  }
}

/**
 * Open a third party URL in the system browser, keeping the application alive
 * behind it.
 *
 * `SFSafariViewController` on iOS and a Chrome Custom Tab on Android. Both are
 * a real browser, with the real address bar and the real cookie jar, presented
 * inside our own task so dismissing it returns to exactly the screen the
 * person left. That last property is what makes this the payment answer: the
 * booking is still on screen underneath.
 *
 * The toolbar is painted with the platform's own chrome colour for the theme
 * in force, so the handoff reads as part of Vallo rather than as being thrown
 * out of it.
 */
export async function openExternal(url: string): Promise<void> {
  try {
    await Browser.open({
      url,
      toolbarColor: CHROME_COLOUR[currentTheme()],
      presentationStyle: "fullscreen",
    });
  } catch {
    /*
     * The in-app tab refused. Rather than swallow a payment, fall back to a
     * new window, which Capacitor hands to the operating system browser. It
     * cannot loop back through the interception below, because that watches
     * navigations of THIS window and this opens another one.
     */
    window.open(url, "_blank");
  }
}

/* -------------------------------------------------------------- navigation */

/**
 * The parts of the Navigation API this file uses, declared locally.
 *
 * TypeScript 5.7's DOM library does not describe `window.navigation`, and
 * `lib/ui/history.ts` already reaches for it the same way for `canGoBack`.
 * Structural and minimal on purpose: the two properties read here are stable
 * and everything else about the API is irrelevant to this file.
 */
type NavigateEventLike = Event & {
  readonly destination: { readonly url: string };
  readonly downloadRequest: string | null;
};

type NavigationLike = {
  addEventListener: (
    type: "navigate",
    listener: (event: NavigateEventLike) => void,
  ) => void;
  removeEventListener: (
    type: "navigate",
    listener: (event: NavigateEventLike) => void,
  ) => void;
};

function navigationApi(): NavigationLike | undefined {
  const candidate = (window as unknown as { navigation?: NavigationLike }).navigation;
  return typeof candidate?.addEventListener === "function" ? candidate : undefined;
}

/**
 * Install both chokepoints. Returns the teardown.
 */
export function startExternalLinks(): () => void {
  const onClick = (event: MouseEvent): void => {
    /* Somebody else already decided what this click means. */
    if (event.defaultPrevented) return;
    /* Primary button, no modifier. A modified click asks for something else,
       and on a phone it never happens at all. */
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    /* A download is a file, not a page. The web view saves it. */
    if (anchor.hasAttribute("download")) return;

    const url = externalHttpUrl(anchor.href);
    if (!url) return;

    event.preventDefault();
    void openExternal(url);
  };

  const onNavigate = (event: NavigateEventLike): void => {
    if (event.defaultPrevented) return;
    /* A navigation the platform will not let us stop, for example a traversal
       the person started with the hardware back button. Cancelling is not
       available and preventing it is not wanted. */
    if (!event.cancelable) return;
    if (event.downloadRequest !== null) return;

    const url = externalHttpUrl(event.destination.url);
    if (!url) return;

    event.preventDefault();
    void openExternal(url);
  };

  document.addEventListener("click", onClick, true);
  const navigation = navigationApi();
  navigation?.addEventListener("navigate", onNavigate);

  return () => {
    document.removeEventListener("click", onClick, true);
    navigation?.removeEventListener("navigate", onNavigate);
  };
}
