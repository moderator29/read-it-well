/**
 * THE LANDING PAGE'S NEW ROOMS, in English (Track M): how Vallo protects you,
 * the AI showcase, the FAQ and the closing call to action.
 *
 * Its own file for the reason `price-check.en.ts` gives: `en.ts` is five
 * thousand lines and several builders write to it at once.
 *
 * WHAT IS NOT HERE, ON PURPOSE: any sentence about money. The payment gate,
 * the Guarantee, the inspection fee, refunds and payouts are answered by the
 * constants in `apps/web/src/lib/money/copy.ts`, and the landing components
 * read them from there, so a money sentence exists once and cannot drift
 * between the FAQ and the checkout. The FAQ below carries only the QUESTION
 * for those five, keyed by the constant that answers it.
 *
 * Every other sentence names its mechanism or says nothing. The assistant
 * scripts are an example conversation and are labelled as one on the page;
 * each reply describes what the assistant is told to do in
 * `app/api/assistant/route.ts` and nothing more.
 *
 * The other three locales inherit this through the fallback until a speaker
 * translates it.
 */
export const landingRoomsEn = {
  protect: {
    overline: "How Vallo protects you",
    title: "Three rules the product will not bend",
    body: "Each one is a step in the product, not a line in a brochure. Nobody can skip it, including us.",
    gate: { title: "The agreement comes first" },
    guarantee: { title: "The Vallo Guarantee", more: "How the Guarantee works" },
    inspection: { title: "No inspection fee" },
  },
  ai: {
    overline: "Vallo AI",
    title: "Ask in plain words. Get real places back.",
    body: "The assistant searches the same listings you do, in English, Yorùbá, Hausa or Igbo. It only names places that are on Vallo, and it links every one.",
    caption: "An example conversation",
    replay: "Play again",
    cta: "Ask the assistant",
    you: "You",
    name: "Vallo AI",
    lawyer: "Ask a lawyer before you pay",
    scripts: [
      {
        user: "A flat to rent. What will it cost me to move in?",
        reply:
          "Here are two on Vallo. On each one the move-in total adds the caution deposit and the agency, legal and agreement fees the listing states, not just the rent.",
      },
      {
        user: "Somewhere to stay this weekend",
        reply:
          "These two stays are on Vallo. Open one to see which nights are free and the full total before you book.",
      },
      {
        user: "Is the title on this land good?",
        reply:
          "I can't tell you a title is good. I can show you what the listing claims, and a lawyer should look at the documents before you pay anything.",
      },
    ],
  },
  faq: {
    overline: "Questions",
    title: "Questions, answered",
    body: "The short answers. The Help Centre has the long ones.",
    help: "Visit the Help Centre",
    items: [
      {
        key: "what",
        q: "What is Vallo?",
        a: "A place to rent, buy or stay across Nigeria, and to book a table. Homes, land, shops, offices, hotels, shortlets and guest houses are listed by the people behind them, and the conversation, the agreement and the payment stay in one account.",
      },
      { key: "pay", q: "How does paying work?" },
      { key: "inspection", q: "Do I pay to inspect a property?" },
      { key: "guarantee", q: "What is the Vallo Guarantee?" },
      {
        key: "lister",
        q: "How do I know who is behind a listing?",
        a: "A person reviews every agent application by hand before they can publish, and every listing names who is behind it. The Verified tick appears only once a person at Vallo has checked that agent's ID.",
      },
      {
        key: "stays",
        q: "Can I book hotels and shortlets?",
        a: "Yes. Vallo Stays lists hotels, shortlets, resorts, guest houses and serviced apartments, and restaurants take table bookings. You see which dates are free and the full total before you book.",
      },
      {
        key: "list",
        q: "Can I list my property?",
        a: "Yes, whatever it is: a room, a flat, a house, a shop, an office or land. Apply to become an agent, and a person reviews every application by hand. Only approved agents can publish.",
      },
      { key: "payout", q: "How do owners and agents get paid?" },
      { key: "refund", q: "How do refunds work?" },
      {
        key: "ai",
        q: "What can the AI assistant do?",
        a: "It searches the same listings you do, in English, Yorùbá, Hausa or Igbo, and links every place it names. It knows what moving in costs, not just the rent. It will not tell you a land title is good: it says what the listing claims and sends you to a lawyer.",
      },
      {
        key: "report",
        q: "What if something looks wrong?",
        a: "Report the listing or the conversation from the menu beside it, and it goes to the Vallo team to review.",
      },
      {
        key: "apps",
        q: "Is there an app?",
        a: "Vallo runs in the browser on any phone or computer, and you can add it to your home screen from the browser menu. Where the iPhone and Android apps are available, their store badges appear on this page.",
      },
    ],
  },
  close: {
    title: "Find the place. Keep the record.",
    body: "Search homes, land and stays across Nigeria, and keep every message, agreement and payment in one account.",
    join: "Create your account",
  },
  badges: {
    appleSmall: "Download on the",
    apple: "App Store",
    googleSmall: "GET IT ON",
    google: "Google Play",
  },
};
