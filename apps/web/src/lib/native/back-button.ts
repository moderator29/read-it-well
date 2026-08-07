"use client";

import { App } from "@capacitor/app";
import { canGoBackInApp } from "@/lib/ui/history";

/**
 * Android's hardware back button, given the same meaning it has in every other
 * application on the phone.
 *
 * Unhandled, that button does nothing at all in a Capacitor web view, and a
 * store reviewer will press it inside the first minute. It is not a nice to
 * have on Android: it is the primary way a very large number of people leave a
 * screen, and an app that ignores it feels broken in a way that has nothing to
 * do with how good the screen was.
 *
 * THREE ANSWERS, IN THE ORDER A PERSON EXPECTS THEM.
 *
 * 1. An overlay is open, so back closes the overlay. This is what back does
 *    natively and it is the case people hit most often, because sheets and
 *    drawers are where a phone spends its time. Getting this wrong means the
 *    press either leaves the screen with a sheet still animating over it, or
 *    quits the application entirely while somebody was reading a filter panel.
 *
 * 2. There is a screen of ours behind this one, so back goes back. The
 *    question is asked through `canGoBackInApp()`, which is the platform's own
 *    answer to it and is used by every PageHeader on the platform. It is NOT
 *    re-derived here, and it is not read from `history.state.idx`: that field
 *    is a Next router internal which Next 16 stopped writing, and reading it
 *    is precisely the bug documented at the top of `lib/ui/history.ts` that
 *    silently disabled every back control on the platform.
 *
 * 3. There is nothing behind this screen, so back leaves the application.
 *    `App.exitApp()` rather than a push to `/home`, because on Android the
 *    back button at the root of an application is how you put it down. A shell
 *    that instead bounces the person to a home screen they did not ask for is
 *    a screen with no way out, which is the one thing a back button must never
 *    become.
 *
 * The listener event carries its own `canGoBack`, and it is deliberately not
 * used. That value is the WEB VIEW's history, which includes entries this
 * application did not create and cannot return to sensibly. The platform's
 * question is narrower and better: is there a screen of OURS behind this one.
 */

/**
 * Is an overlay currently up?
 *
 * `lib/ui/use-overlay.ts` is the single implementation behind all twenty-two
 * overlays on the platform, and while any of them is open it holds the body
 * scroll lock. That lock is an observable fact about the document, so it is
 * read here rather than adding a second registry that could disagree with the
 * first. Exporting the counter from that module would be cleaner and is not
 * done for one reason: it is not this agent's file to change, and a read of an
 * existing effect cannot break the surface it observes.
 */
function overlayIsOpen(): boolean {
  return document.body.style.overflow === "hidden";
}

/**
 * Ask the top overlay to close, the same way the Escape key does.
 *
 * `useOverlay` binds Escape on the document in the capture phase, and a
 * dispatched event reaches capture listeners on its own target, so this is the
 * same code path a keyboard user takes rather than a parallel one that could
 * rot. Stacked overlays close one per press, innermost first, which is the
 * behaviour people expect and the reason this does not try to close them all.
 */
function dismissTopOverlay(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
  );
}

export async function startBackButton(goBack: () => void): Promise<() => void> {
  const handle = await App.addListener("backButton", () => {
    if (overlayIsOpen()) {
      dismissTopOverlay();
      return;
    }
    if (canGoBackInApp()) {
      goBack();
      return;
    }
    void App.exitApp();
  });

  return () => {
    void handle.remove();
  };
}
