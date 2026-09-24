"use client";

import { usePathname } from "next/navigation";
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
 * Drawn as a small glass square top left, opposite the language control, in
 * the frame's corner rather than the composition, so nothing the ledger
 * measured moves.
 */
export function AuthBackBar() {
  const pathname = usePathname();
  const target = parentOf(pathname ?? "/");
  if (target.kind !== "parent") return null;

  return (
    <div className="nf-auth__backbar">
      <BackButton fallback={target.href} className="nf-auth__back-btn" />
    </div>
  );
}
