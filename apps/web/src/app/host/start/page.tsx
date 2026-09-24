import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { StaysDoors } from "@/components/host/StaysDoors";

export const metadata: Metadata = {
  title: "Add a listing account",
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
export default async function HostStartPage() {
  const t = getDictionary(await getLocale());
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <StaysDoors />
    </HostShell>
  );
}
