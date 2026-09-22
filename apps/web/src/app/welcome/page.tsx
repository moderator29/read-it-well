import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";
import {
  FIRST_RUN_COOKIE,
  firstRunNext,
  isFirstRunSeen,
} from "@/components/app/welcome/first-run-seen";
import { loadInterestsState } from "@/lib/interests/queries";
import { planFirstRun } from "./plan";

export const metadata: Metadata = {
  title: "Two worlds. One platform.",
  robots: { index: false, follow: false },
};

/**
 * Get started: the first thing a person sees.
 *
 * What opens on a first launch from the stores, and what a stranger meets the
 * first time they press Sign up or Sign in. Four slides on one stage (the two
 * sides and the coin, what verified means, how paying safely works, and the
 * choice), skippable, shown once, ending on Sign in, Create an account or
 * Look around first. Governing image: `2A49E2F7` at the repository root.
 *
 * REACHABLE SIGNED OUT. It used to redirect a stranger to sign in, and the
 * proxy did the same before the page even ran; both are gone, because the
 * person this screen is for has no account yet.
 *
 * WHO SEES WHAT is `planFirstRun` in `./plan.ts`, a pure function with its
 * own test. This file only gathers the three facts it needs: the session and
 * its profile flags, whether this device has been shown first run, and where
 * the person was going (`?next=`).
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
  const deviceSeen = isFirstRunSeen((await cookies()).get(FIRST_RUN_COOKIE)?.value);
  const session = await loadInterestsState();

  const plan = planFirstRun({ session, deviceSeen, next });
  if (plan.kind === "redirect") redirect(plan.to);

  if (plan.kind === "guest") {
    return (
      <WelcomeStage>
        <FirstRun
          t={t}
          interests={[]}
          showCards
          asked
          viewer="guest"
          next={plan.next}
          startAtChoice={plan.startAt === "choice"}
        />
      </WelcomeStage>
    );
  }

  /* The profile's flags, with this device's memory folded into `welcomeSeen`
     by the plan, so somebody who read the slides before signing up goes
     straight to the one question. */
  const intent = plan.intent;
  return (
    <WelcomeStage>
      <FirstRun
        t={t}
        interests={intent.interests}
        showCards={!intent.welcomeSeen}
        asked={intent.asked}
        viewer="member"
        next={plan.next}
      />
    </WelcomeStage>
  );
}
