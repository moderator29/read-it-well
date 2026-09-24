import type { Metadata } from "next";
import { BackButton } from "@/components/site/BackButton";
import { parentOf } from "@/lib/nav/resolve";
import { requireSignedInPage } from "@/lib/actions/signed-in-page";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { listStates } from "@/lib/places/queries";
import { OwnerRegisterForm } from "@/components/supply/OwnerRegisterForm";

/* Back to the declared parent (`route-parents.ts`): this route declared one and drew no control, so Android back closed the app. */
const BACK = parentOf("/profile/setup/owner");

export const metadata: Metadata = {
  title: "Register as an owner",
  robots: { index: false, follow: false },
};

/**
 * THE OWNER'S DOOR, AND IT IS THE ONE THIS DIRECTION EXISTS FOR.
 *
 * `GOVERNING-03`, four screens. Vallo does not remove the agent; Vallo removes
 * the runaround, and that sentence only means anything if a landlord who is
 * not an agent and never will be can list a property. Until this route existed
 * the only way in was `/profile/setup/professional`, the six step agent
 * application, which asks a landlord with one flat in Bwari for an agency's
 * proof set.
 *
 * WHY IT IS A STATIC SEGMENT BESIDE `[role]`. `/profile/setup/[role]` still
 * serves the professional application and still should: it is a real form with
 * real machinery behind it and nothing here replaces it. A static segment wins
 * over a dynamic sibling in Next's router, so `/profile/setup/owner` is this
 * page and every other value still falls through to the wizard. Every existing
 * link to `/profile/setup/owner` in the tree, from the listing pitch, the
 * inspections empty state, the agent dashboard and the application status
 * screen, lands here now, which is the correct destination for all four.
 *
 * WHY IT IS UNDER `/profile` AND NOT `/agent`. Everything under `/agent` is
 * role gated and the entire audience for this page is people who do not have
 * that role yet. That reasoning is inherited from what stood here before and
 * it is still right.
 *
 * THE STATES COME DOWN WITH THE PAGE, the same way `PlaceFields` takes them:
 * 37 rows are small and the screen needs them the moment it opens. The 774
 * local governments arrive only when their picker is opened, because nobody on
 * a metered connection should pay for them before they have decided to answer.
 */
export default async function OwnerRegistrationPage() {
  await requireSignedInPage("/profile/setup/owner");
  const [locale, states] = await Promise.all([getLocale(), listStates()]);
  const t = getDictionary(locale);

  return (
    <>
      <div className="pb-sm">
        <BackButton fallback={BACK.kind === "parent" ? BACK.href : "/profile"} />
      </div>
      <OwnerRegisterForm t={t} states={states} />
    </>
  );
}
