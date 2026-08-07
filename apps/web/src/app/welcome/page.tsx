import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { loadInterestsState } from "@/lib/interests/queries";

export const metadata: Metadata = {
  title: "What are you here for?",
  robots: { index: false, follow: false },
};

/**
 * First run: three cards, then the one question.
 *
 * The cards say what this place is and can be slid through or skipped. The
 * question after them asks what the reader is here for. `FirstRun` owns the
 * order; this file owns who is allowed to see it at all.
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
 *   already asked         to home. Asked once means asked once, whether the
 *                         answer was nine choices or a skip.
 *   platform unconfigured to home. Nothing can be saved, so nothing is asked.
 *
 * Anybody who reaches the form has an empty `interests` and has never been
 * asked, which is exactly the condition the gate on `/home` tests for.
 */
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const t = getDictionary(await getLocale());
  const intent = await loadInterestsState();

  if (intent.state === "signed-out") redirect("/sign-in");
  if (intent.state === "unconfigured") redirect("/home");
  if (intent.asked || intent.interests.length > 0) redirect("/home");

  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10 sm:py-12"
    >
      <div className="nf-aurora" aria-hidden="true" />
      <div className="nf-grid-veil" aria-hidden="true" />

      <FirstRun t={t} interests={intent.interests} />
    </main>
  );
}
