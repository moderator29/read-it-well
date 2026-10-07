/**
 * Get Started, as four cards (`apps/web/src/app/welcome/WelcomeIntro.tsx`):
 * the founder's reference 3 (the Vallo onboarding cards, "Find your space.",
 * 1 / 4) as the governing direction, with reference 13 (the store
 * screenshots, "Learn. Create. Get paid.") for the first card's huge
 * three-line headline with full stops, its trust line where the store art
 * has award laurels, and the app fragment on the second card.
 * docs/design/PREMIUM-STANDARD.md.
 *
 * Each headline is written as its lines; the component lights the last word
 * of the last line, or the whole last line where `litLine` says so. Every
 * line here is something the product does today: agents are checked by a
 * person, the move-in total is shown before a visit, payments run through
 * licensed providers and Vallo never holds the money (ADR 0003, D73; no
 * provider is named here), and homes, stays, restaurants and workspaces are
 * all live. THERE IS NO AWARD AND NO COUNT: the trust line says something
 * true instead, and the fragment's figures are the landing's own labelled
 * example.
 */
export const getStartedEn = {
  label: "Get started with Vallo",
  /** The counter top right, "1 / 4". */
  counter: "{n} / {total}",
  /** Each card's accessible name. */
  cardOf: "{n} of {total}",
  next: "Next",
  previous: "Previous",
  getStarted: "Get started",
  haveAccount: "I already have an account",
  /** The first card's trust line, where store art puts its laurels. */
  trust: "Every agent checked by a person",
  /** The second card's app fragment: the move-in total, as an example. */
  fragment: {
    example: "Example",
    title: "Move-in total",
    rent: "Rent",
    fees: "Fees and caution",
    label: "An example move-in total: rent and every fee, in one figure",
  },
  cards: [
    {
      lines: ["Find.", "Check.", "Move in."],
      litLine: true,
      body: "Homes to rent, buy and stay in, all in one search.",
      scene: "A lit villa above its pool at night, with a glass map pin over it",
    },
    {
      lines: ["Know what", "you’re getting."],
      litLine: false,
      body: "The full move-in cost, before you go to see it.",
      scene: "A lit house behind its gate at night, with an example move-in total in front of it",
    },
    {
      lines: ["We never hold", "your money."],
      litLine: false,
      body: "Every payment runs through a licensed provider, not through us.",
      scene: "A lit tower entrance at dusk, with a glass wallet and a lock",
    },
    {
      lines: ["Live, stay,", "dine and work."],
      litLine: false,
      body: "Homes, stays, restaurants and workspaces, on one platform.",
      scene: "A lit restaurant lounge at night, with a glass phone holding a home and a booking",
    },
  ],
};
