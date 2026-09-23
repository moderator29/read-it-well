import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";
import { firstRunNext } from "@/components/app/welcome/first-run-seen";
import { loadInterestsState } from "@/lib/interests/queries";
import { planFirstRun } from "./plan";

export const metadata: Metadata = {
  title: "Two worlds. One platform.",
  robots: { index: false, follow: false },
};

/**
 * Get started: the first thing a person sees.
 *
 * What opens on a first launch from the stores, what shows every time
 * somebody taps Get started on the landing page (signed in or not, seen or
 * not: the founder's rule of 23 September), and what a stranger meets the
 * first time they press Sign up or Sign in. Four slides on one stage (the two
 * sides and the coin, what verified means, talk first and pay on Vallo, and
 * the ending), skippable. A stranger ends on Create account and Sign in;
 * somebody signed in ends on one Continue into the app. Governing image:
 * `2A49E2F7` in docs/design/references/.
 *
 * REACHABLE SIGNED OUT, and it never redirects: `planFirstRun` in `./plan.ts`
 * (a pure function with its own test) only chooses the ending.
 *
 * Rendered outside the app shell on purpose: a dock underneath would offer six
 * more ways out of a screen that has exactly the ones it names.
 */
export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = getDictionary(await getLocale());
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = firstRunNext(rawNext);
  const session = await loadInterestsState();

  const plan = planFirstRun({ session, next });

  if (plan.kind === "guest") {
    return (
      <WelcomeStage>
        <FirstRun t={t} interests={[]} showCards asked viewer="guest" next={plan.next} />
      </WelcomeStage>
    );
  }

  return (
    <WelcomeStage>
      <FirstRun
        t={t}
        interests={plan.intent.interests}
        showCards
        asked={plan.intent.asked}
        viewer="member"
        next={plan.next}
      />
    </WelcomeStage>
  );
}
