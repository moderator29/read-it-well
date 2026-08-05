import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InterestChoices } from "@/components/app/welcome/InterestChoices";
import { LogoMark } from "@/design-system/brand/Logo";
import { loadInterestsState } from "@/lib/interests/queries";

export const metadata: Metadata = {
  title: "What are you here for?",
  robots: { index: false, follow: false },
};

/**
 * First run: the one question.
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

      <div className="relative z-10 w-full max-w-[32rem]">
        <div className="nf-rise flex flex-col items-center text-center">
          <LogoMark size={40} title="RentMe" />
          <h1 className="nf-h2 mt-4">What are you here for?</h1>
          <p className="mt-2 max-w-[26rem] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            Pick as many as you like. We will put those first when you open
            search. Skip if you would rather just look around.
          </p>
        </div>

        <div className="nf-rise mt-7" style={{ animationDelay: "90ms" }}>
          <InterestChoices initial={intent.interests} />
        </div>
      </div>
    </main>
  );
}
