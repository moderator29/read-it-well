import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { forWelcome } from "@/components/auth/auth-copy";
import { forFirstRun } from "@/components/app/welcome/welcome-copy";
import { getLocale } from "@/lib/locale";
import { FirstRun } from "@/components/app/welcome/FirstRun";
import { WelcomeStage } from "@/components/app/welcome/WelcomeStage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  FIRST_INTEREST_COOKIE,
  FIRST_RUN_COOKIE,
  isFirstRunSeen,
  firstRunNext,
  isSignUpForm,
} from "@/components/app/welcome/first-run-seen";
import { isPropertyType } from "@/lib/interests/schema";
import { loadInterestsState } from "@/lib/interests/queries";
import { planFirstRun } from "./plan";
import { resolveSession } from "@/lib/actions/session";
import { listStates } from "@/lib/places/queries";
import { WelcomeIntro } from "./WelcomeIntro";

export const metadata: Metadata = {
  title: "Two worlds. One platform.",
  robots: { index: false, follow: false },
};

/**
 * Get started: the first thing a person sees.
 *
 * What opens on a first launch from the stores, the first time somebody taps
 * Get started on the landing page, and what a stranger meets the first time
 * they press Sign up or Sign in. ONCE: a device or an account that has seen
 * it goes straight on (the founder, 29 September; `planFirstRun`). Four slides on one stage (the two
 * sides and the coin, what verified means, talk first and pay on Vallo, and
 * the ending), skippable. A stranger ends on Create account and Sign in;
 * somebody signed in ends on one Continue into the app. Governing image:
 * `2A49E2F7` in docs/design/references/.
 *
 * REACHABLE SIGNED OUT. `planFirstRun` in `./plan.ts` (a pure function with
 * its own test) chooses between skipping and which ending to show.
 *
 * A COLD START OPENS ON THE INTRO (`WelcomeIntro`): since 6 October the
 * monotone Get Started (D13), the mark where the startup's lockup settles,
 * the slogan, the product explanation and the two doors, Get started and
 * Sign in. Get started carries `next=/welcome`, so a new account lands on the
 * question beat below rather than relying on `/home` to send it back here
 * (`doors.ts`). The four slides are the tour behind it (`?tour=1`), unchanged.
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
  const jar = await cookies();
  const carriedRaw = jar.get(FIRST_INTEREST_COOKIE)?.value ?? "";
  const carried = isPropertyType(carriedRaw) ? carriedRaw : null;
  const seen = isFirstRunSeen(jar.get(FIRST_RUN_COOKIE)?.value);

  const tour = (Array.isArray(params.tour) ? params.tour[0] : params.tour) === "1";
  const plan = planFirstRun({ session, next, carried, seen, tour });
  /* Seen once, then out of the way (the founder, 29 September). */
  if (plan.kind === "skip") redirect(plan.to);

  /* THE INTRO (monotone since 6 October, D13): a stranger on a cold start
     meets one screen, the mark, the slogan and the two doors, with the
     four slides one tap away as the tour (`?tour=1`). An arrival with a
     destination still opens on the slides' account choice, headed with what
     they asked for (V-18). */
  if (plan.kind === "guest" && !plan.arrival && !plan.choice && !tour) {
    return <WelcomeIntro t={forWelcome(t)} next={plan.next} />;
  }

  if (plan.kind === "guest") {
    return (
      <WelcomeStage>
        <FirstRun
          t={forFirstRun(t)}
          interests={[]}
          showCards
          asked
          viewer="guest"
          next={plan.next}
          arrival={plan.arrival}
          atChoice={plan.choice === true}
          fromSignUpForm={tour && isSignUpForm(plan.next)}
        />
      </WelcomeStage>
    );
  }

  /* A1: what the one-screen sign-up no longer asks, asked here once the
     account exists and only while the interests question is still open.
     Where somebody stays is skipped when the profile already holds it. */
  const asks = plan.intent.asked ? null : await arrivalAsks();

  return (
    <WelcomeStage>
      <FirstRun
        t={forFirstRun(t)}
        interests={plan.intent.interests}
        /* A17: a device that has already been shown the steps (the intro or
           the tour, before the account existed) goes straight to the
           question after sign-up rather than through the steps again; asked
           for (`?tour=1`), the steps show. */
        showCards={tour || !seen}
        asked={plan.intent.asked}
        viewer="member"
        next={plan.next}
        asks={asks}
      />
    </WelcomeStage>
  );
}

/** The member's answers so far, for `ArrivalAsks`; null when it cannot read. */
async function arrivalAsks() {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const { data: row } = await session.supabase
    .from("profiles")
    .select("state_code")
    .eq("id", session.user.id)
    .maybeSingle();
  const askPlace = !row?.state_code;
  const heard = session.user.user_metadata?.hear_about;
  return {
    states: askPlace ? await listStates() : [],
    askPlace,
    hearAbout: typeof heard === "string" && heard ? heard : null,
  };
}
