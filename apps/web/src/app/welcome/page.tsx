import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";
import { cookies } from "next/headers";
import {
  FIRST_INTEREST_COOKIE,
  firstRunNext,
} from "@/components/app/welcome/first-run-seen";
import { isPropertyType } from "@/lib/interests/schema";
import { loadInterestsState } from "@/lib/interests/queries";
import { planFirstRun } from "./plan";
import { WelcomeIntro } from "./WelcomeIntro";

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
 * A COLD START OPENS ON THE INTRO (`WelcomeIntro`, 29 September): the name,
 * one line, a small scene of the glass objects and the two doors, Get
 * started and Sign in. The four slides are the tour behind it (`?tour=1`).
 *
 * AN ARRIVAL WITH A DESTINATION SKIPS THE SLIDES (V-18). A stranger who was
 * stopped on the way to a search, a listing or a stay opens on the account
 * choice, headed with what they asked for ("Create an account to see homes in
 * Lagos"). The four slides stay for the cold start, where nobody has asked
 * for anything yet and the founder's art is the introduction.
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

  /* The market a landing tile named before they had an account (V-18). */
  const carriedRaw = (await cookies()).get(FIRST_INTEREST_COOKIE)?.value ?? "";
  const carried = isPropertyType(carriedRaw) ? carriedRaw : null;

  const plan = planFirstRun({ session, next, carried });

  /* THE INTRO (the Slate pass, 29 September): a stranger on a cold start
     meets one screen, the name, a moving scene and the two doors, with the
     four slides one tap away as the tour (`?tour=1`). An arrival with a
     destination still opens on the slides' account choice, headed with what
     they asked for (V-18). */
  const tour = (Array.isArray(params.tour) ? params.tour[0] : params.tour) === "1";
  if (plan.kind === "guest" && !plan.arrival && !tour) {
    return <WelcomeIntro t={t} next={plan.next} />;
  }

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
          arrival={plan.arrival}
        />
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
