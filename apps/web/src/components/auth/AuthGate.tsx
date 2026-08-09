"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Dictionary } from "@naijafinds/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { authHref, returnHref, type GatedAction } from "./auth-intent";

/**
 * VIEW ONLY, DEFINED ONCE.
 *
 * A signed-out visitor can read the whole marketplace: discovery, the map, a
 * property page, a profile. A marketplace nobody can see cannot be found, by a
 * person or by a search engine, and a store reviewer opening the app to a wall
 * has nothing to review. What a signed-out visitor cannot do is ACT. Save,
 * message, request an inspection, pay, list a property, open the wallet, switch
 * profile, follow, react, post: every one of those asks them to join first.
 *
 * WHY A PRIMITIVE AND NOT A CHECK PER BUTTON. Ten actions across roughly forty
 * controls is forty chances to forget the check, forty copies of the redirect,
 * and forty subtly different answers to the question the gate actually has to
 * get right, which is what happens NEXT. The rule lives here, once. A button
 * says what it is (`action="save"`), and the behaviour, the copy, the intent
 * capture and the return trip are not its problem.
 *
 * THREE WAYS TO USE IT, in order of preference:
 *
 *   <AuthGate action="save"><SaveButton/></AuthGate>
 *       Wraps a control you do not own or do not want to change. Intercepts
 *       activation in the CAPTURE phase, so the child's own handler never runs
 *       for a signed-out visitor.
 *
 *   const { requireAuth } = useRequireAuth();
 *   onClick={() => requireAuth("pay", () => openCheckout())}
 *       For a control you do own. Reads better and can gate a code path that
 *       is not a click at all, e.g. a form submit or a swipe.
 *
 *   const { signedIn } = useRequireAuth();
 *       When the control should look different rather than behave differently.
 *       Use sparingly: a control that is present and works is better than one
 *       that is hidden, because a hidden control cannot advertise the account.
 */

type AuthGateValue = {
  /** True only for a real session, resolved on the server by the layout. */
  signedIn: boolean;
};

/*
 * Defaults to SIGNED OUT.
 *
 * A context default of `true` would mean that any subtree accidentally rendered
 * outside the provider silently ungates every control in it, and it would fail
 * open in exactly the situation nobody tests. Failing closed shows a sign-up
 * prompt to somebody who is already signed in, which is embarrassing and
 * obvious, so it gets fixed.
 */
const AuthGateContext = createContext<AuthGateValue>({ signedIn: false });

export function AuthGateProvider({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ signedIn }), [signedIn]);
  return <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>;
}

export type RequireAuth = {
  signedIn: boolean;
  /**
   * Run `next` if there is a session; otherwise send them to sign up, carrying
   * the current screen and this verb so they arrive back here able to finish.
   *
   * Returns whether the work actually ran, so a caller can decide not to
   * optimistically flip a heart it is about to be redirected away from.
   */
  requireAuth: (action: GatedAction, next?: () => void) => boolean;
  /** The address the gate would send them to. For rendering a real `<a href>`. */
  gateHref: (action: GatedAction) => string;
};

export function useRequireAuth(): RequireAuth {
  const { signedIn } = useContext(AuthGateContext);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const gateHref = useCallback(
    (action: GatedAction) => authHref(returnHref(pathname, params.toString(), action)),
    [pathname, params],
  );

  const requireAuth = useCallback(
    (action: GatedAction, next?: () => void) => {
      if (signedIn) {
        next?.();
        return true;
      }
      router.push(gateHref(action));
      return false;
    },
    [signedIn, router, gateHref],
  );

  return { signedIn, requireAuth, gateHref };
}

/**
 * The wrapper.
 *
 * Renders its child untouched for a signed-in caller, so there is no wrapper
 * element, no extra tab stop and no layout change on the path that matters
 * most. For a signed-out caller it wraps the child in a `display: contents`
 * span carrying capture-phase handlers.
 *
 * `display: contents` because the wrapper must not become a box: these controls
 * sit inside flex rows, grid cells and absolutely positioned overlays, and a
 * plain span would introduce a layout node in all of them.
 *
 * CAPTURE PHASE, deliberately. A bubble-phase handler runs AFTER the child's
 * own onClick, which means the save has already been attempted and the heart
 * has already flipped before we redirect. Capture runs first, and
 * `stopPropagation` stops the event ever reaching the child.
 *
 * Keyboard is handled as well as pointer. A button activated with Enter or
 * Space fires a click event in every browser, but a link activated with Enter
 * does not always, and half the controls behind this gate are links.
 */
export function AuthGate({
  action,
  children,
  className,
}: {
  action: GatedAction;
  children: React.ReactNode;
  /** Applied to the interception wrapper only, so it cannot affect a session. */
  className?: string;
}) {
  const { signedIn, requireAuth } = useRequireAuth();

  if (signedIn) return <>{children}</>;

  const stop = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    requireAuth(action);
  };

  return (
    <span
      className={className}
      style={className ? undefined : { display: "contents" }}
      onClickCapture={stop}
      onKeyDownCapture={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        stop(event);
      }}
    >
      {children}
    </span>
  );
}

/**
 * Sign up and Log in, top right.
 *
 * The order and the weight are the whole design. Sign up is the filled primary
 * because a first-time visitor is the person this screen is for, and log in is
 * the quiet outline beside it because a returning person is looking for it
 * rather than being sold it. Both carry the current screen, so a visitor who
 * signs up from a property page comes back to that property page.
 *
 * Rendered on signed-out screens only; the component decides that itself
 * rather than making every shell ask.
 */
export function SignedOutActions({ t, className }: { t: Dictionary; className?: string }) {
  const { signedIn } = useRequireAuth();
  const pathname = usePathname();
  const params = useSearchParams();

  if (signedIn) return null;

  /*
   * No verb. They did not reach for a control, they reached for the door, so
   * the only thing worth carrying is the screen they were reading.
   */
  const query = params.toString();
  const back = `${pathname}${query ? `?${query}` : ""}`;
  const suffix = `?next=${encodeURIComponent(back)}`;

  return (
    <div className={`flex shrink-0 items-center gap-2 ${className ?? ""}`}>
      <ButtonLink href={`/sign-in${suffix}`} variant="secondary" size="sm">
        {t.common.signIn}
      </ButtonLink>
      <ButtonLink href={`/sign-up${suffix}`} variant="primary" size="sm">
        {t.common.signUp}
      </ButtonLink>
    </div>
  );
}
