import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";
import { loadInterestsState } from "@/lib/interests/queries";

export const metadata: Metadata = {
  title: "Two worlds. One platform.",
  robots: { index: false, follow: false },
};

/**
 * First run: the two worlds, then the one question.
 *
 * The opener says what this place is (two sides, one account, the coin
 * between them) and can be skipped. The question after it asks what the
 * reader is here for. `FirstRun` owns the order; this file owns who is
 * allowed to see it at all.
 *
 * Rendered outside the app shell on purpose. This screen has exactly two ways
 * out, Continue and Skip, and both of them land on home. A tab bar underneath
 * would offer six more, which is how a first-run screen becomes a thing people
 * navigate past rather than answer.
 *
 * It is also its own guard rather than trusting whoever linked here. Three
 * redirects, in the order they matter:
 *
 *   signed out            to sign in. There is no row to write an answer to.
 *   already done          to home. Both halves seen means both halves seen,
 *                         whether the answer was nine choices or a skip.
 *   platform unconfigured to home. Nothing can be saved, so nothing is asked.
 */
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const t = getDictionary(await getLocale());
  const intent = await loadInterestsState();

  if (intent.state === "signed-out") redirect("/sign-in");
  if (intent.state === "unconfigured") redirect("/home");
  /* Nothing left to show. Both halves of first run are done, so this screen
     has no reason to exist for this person and never will again. */
  if ((intent.asked || intent.interests.length > 0) && intent.welcomeSeen) redirect("/home");

  return (
    <WelcomeStage>
      <FirstRun
        t={t}
        interests={intent.interests}
        showCards={!intent.welcomeSeen}
        asked={intent.asked || intent.interests.length > 0}
      />
    </WelcomeStage>
  );
}
