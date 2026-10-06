"use client";

import { useAuthPath } from "./useAuthPath";
import { BackButton } from "@/components/site/BackButton";
import { parentOf } from "@/lib/nav/resolve";

/**
 * The way back on the auth screens.
 *
 * Every screen in this group declares a parent in `lib/nav/route-parents.ts`
 * (`/sign-in` and `/sign-up` to `/welcome`, the email steps to their chooser,
 * the code to the sign-up form, the reset and the recovery to `/sign-in`),
 * and none drew a control, so Android's hardware back closed the app. One
 * mount here covers them all, in the shape `app/(site)/SiteBackBar.tsx`
 * established: it asks the same resolver the control runs, and a route with
 * no declared parent, or a ROOT, draws nothing.
 *
 * Drawn as the first cell of the auth screen's top bar (the end cell is empty:
 * language is changed in Settings only); the bar keeps the cell when this
 * draws nothing, so the wordmark under it never moves.
 */
export function AuthBackBar() {
  const target = parentOf(useAuthPath());
  if (target.kind !== "parent") return null;

  return <BackButton fallback={target.href} className="nf-auth__back-btn" />;
}
