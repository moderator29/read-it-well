import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Add a workspace",
  robots: { index: false, follow: false },
};

/**
 * /host/start: the three stays doors. `GOVERNING-09` screen three.
 *
 * WHY A ROUTE OF ITS OWN RATHER THAN THE WIZARD'S FIRST STEP. The wizard's
 * first step asks which of three HOST TYPES somebody is, which is the shape of
 * the proof we will ask them for and the right question for a form. It is the
 * wrong first question for a person: nobody thinks of themselves as a
 * registered hospitality business. This screen asks the question they can
 * answer, and `lib/host/doors.ts` translates it into the two the wizard needs.
 *
 * NO SESSION IS REQUIRED TO READ IT. Choosing a door writes nothing, and the
 * wizard behind it already sends a signed-out person to sign in and brings
 * them back. Asking somebody to sign in before they have been told what they
 * are signing up to is how a supply side stays empty.
 */
/* V-75. ONE "Add a workspace" chooser with both groups. This address was the
   second chooser, stays only, and it never mentioned the property doors; it
   now opens the one chooser with the Stays group first. */
export default function HostStartPage(): never {
  permanentRedirect("/profile/setup?side=stays");
}
