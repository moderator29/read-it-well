"use client";

import { App } from "@capacitor/app";
import { isAppRoot } from "@/lib/nav/resolve";
import { isInPageStep } from "@/lib/nav/in-page-step";

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
 * 2. This screen is the ROOT of the product's hierarchy, so back leaves the
 *    application. `App.exitApp()` rather than a push to `/home`, because on
 *    Android the back button at the root of an application is how you put it
 *    down. A shell that instead bounces the person to a home screen they did
 *    not ask for is a screen with no way out, which is the one thing a back
 *    button must never become.
 *
 * 2a. Before 2: this history entry is a STEP INSIDE the screen (a welcome
 *    slide, sign up's second step; see `lib/nav/in-page-step.ts`), so back
 *    returns to the previous step through history, exactly as the browser's
 *    back does. Without this, a slide or a step on a root such as `/welcome`
 *    would close the app mid-intro, and a step anywhere else would jump to
 *    the parent and throw the person's answers away.
 *
 * 3. Anything else has a parent, so back goes to the parent. `goBack` is
 *    handed in by `NativeRuntime`, which owns the router and the current path
 *    and runs the same `chooseBack` every drawn back control on the platform
 *    runs.
 *
 * QUESTION 2 USED TO BE `canGoBackInApp()`, AND THAT IS THE DEFECT.
 *
 * "Is there a screen of ours behind this one" is not "is this the root". A
 * person who opened a message from a push notification, or landed anywhere
 * through a redirect or a sign-in bounce, has a history entry behind them that
 * is not their parent - and on a genuinely cold deep link has none at all, so
 * the old answer was NO and this handler CLOSED THE APPLICATION on somebody
 * standing inside a conversation. The hierarchy answers both halves: `isAppRoot`
 * is a fact about the screen rather than about how the person got to it, and it
 * is false for every route in `lib/nav/route-parents.ts` bar the declared tops.
 * An undeclared route answers false too, so the failure direction is a harmless
 * navigation rather than the shell disappearing.
 *
 * The listener event carries its own `canGoBack`, and it is deliberately not
 * used. That value is the WEB VIEW's history, which includes entries this
 * application did not create and cannot return to sensibly. It is the same
 * proxy question, one layer further away.
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
    if (isInPageStep(window.history?.state)) {
      window.history.back();
      return;
    }
    /* `location.pathname` is kept current by the History API on every client
       navigation, so it is the live screen rather than the one this listener
       was bound on. */
    if (isAppRoot(window.location.pathname)) {
      void App.exitApp();
      return;
    }
    goBack();
  });

  return () => {
    void handle.remove();
  };
}
