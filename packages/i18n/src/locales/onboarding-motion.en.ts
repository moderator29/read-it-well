/**
 * Get started, the one onboarding (`components/app/welcome/FirstRun.tsx` and
 * `OnboardingScenes.tsx`): the four slides' words and the chips over their art.
 *
 * THE FOUNDER, 7 October 2026: "make it more clean and reflect our actual
 * platform. Make it premium and reduce the texts." So each slide is one
 * headline in two parts (the second in blue) and at most one short line under
 * it, never a paragraph; and the four slides are the platform as it is:
 * Homes and Stays (with restaurants), who you deal with (the tick and the
 * Record), talking first and paying on Vallo, and the account.
 *
 * Every figure is labelled Example and every other chip is a plain feature
 * word, so nothing here claims more than the product does. "Checked" is said
 * of an agent's ID by a person, which the KYC desk backs (`lib/trust/claims.ts`).
 */
export const onboardingMotionEn = {
  continue: "Continue",
  example: "Example",
  progress: "Your progress",
  /* The small counter over each step's title (the founder, 8 October 2026:
     "add those 1 of 4, 2 of 4"). */
  count: "{n} of {total}",
  slides: {
    worlds: {
      titleA: "Homes. Stays.",
      titleB: "Restaurants.",
      line: "Rent, buy, book a stay or a table.",
    },
    know: {
      titleA: "Know who",
      titleB: "you deal with.",
      line: "The tick means a person checked their ID.",
    },
    talk: {
      titleA: "Talk first.",
      titleB: "Pay when sure.",
      line: "Message, inspect, then pay on Vallo.",
    },
    ready: {
      titleA: "Ready when",
      titleB: "you are.",
      line: "Search, save, message and book.",
      /* Under a heading that names where they were going (V-18). */
      wallLine: "New accounts are free.",
    },
    member: {
      titleA: "You are in.",
      titleB: "Make it yours.",
      lineAsk: "One question, then home.",
      lineDone: "Home is ready.",
    },
  },
  worlds: {
    homes: "Homes",
    homesHint: "Rent and buy",
    stays: "Stays",
    staysHint: "Hotels, shortlets, tables",
    label: "A home and a hotel on the hills, with Homes and Stays beside them",
  },
  know: {
    badge: "Verified",
    record: "The Vallo Record",
    recordHint: "Counted from what happened on Vallo",
    label: "A shield and an ID card under a scanning frame, with the agent's Record beside them",
  },
  talk: {
    ask: "Is Saturday at 11 good for an inspection?",
    pay: "Pay on Vallo",
    label: "A question to an agent, then an example payment on Vallo",
  },
  moveIn: {
    total: "Move-in total",
    rent: "Rent",
    agency: "Agency fee",
    caution: "Caution",
    label: "An open arch and keys, with an example move-in total",
  },
};
