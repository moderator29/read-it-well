/**
 * THE LANDING PAGE'S ROOMS, in English (Track M): the AI showcase, the
 * journey, the bento, the two worlds, the map, the FAQ and the closing call
 * to action. (How Vallo protects you and the cities marquee were cut from
 * the page, with their words.)
 *
 * Its own file for the reason `price-check.en.ts` gives: `en.ts` is five
 * thousand lines and several builders write to it at once.
 *
 * WHAT IS NOT HERE, ON PURPOSE: any sentence about money. The payment gate,
 * what stands behind a payment, the inspection fee, refunds and payouts are answered by the
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
  ai: {
    overline: "Vallo AI",
    title: "Ask in plain words. Get real places back.",
    body: "Ask in English, Yorùbá, Hausa or Igbo, in your own words.",
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
    /* The three labels the questions are grouped under (UIUX item 11). */
    groups: {
      property: "Renting and buying",
      stays: "Stays and the app",
      money: "Money and safety",
    },
    items: [
      {
        key: "what",
        q: "What is Vallo?",
        a: "A place to rent, buy or stay across Nigeria, and to book a table. Homes, land, shops, offices, hotels, shortlets and guest houses are listed by the people behind them, and the conversation, the agreement and the payment stay in one account.",
      },
      { key: "pay", q: "How does paying work?" },
      { key: "inspection", q: "Do I pay to inspect a property?" },
      { key: "standing", q: "What stands behind my payment?" },
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
    body: "Start with a search. Every message, agreement and payment after it stays on the record.",
    join: "Create your account",
    signIn: "Sign in",
  },
  /*
   * "Hands on": the deck of product moments you can move by hand
   * (`StackRoom.tsx`, the founder's reference 40). Every moment is an
   * example and says so; the names, slots and figures below are
   * illustrations of what the screens show, never inventory or a person.
   * The viewing and payment cards' sentences are the money constants and
   * are not here.
   */
  stack: {
    overline: "Hands on",
    title: "Four moments of a move, as you will see them.",
    body: "Examples drawn from the screens you will use. Move them around.",
    hint: "Drag a card, or flick it to see the next.",
    prev: "Previous card",
    next: "Next card",
    position: "{n} of {total}",
    cards: {
      listing: {
        title: "Every cost on the card",
        body: "The move-in total adds the caution deposit and the agency, legal and agreement fees the listing states, not just the rent.",
      },
      viewing: { title: "Book the viewing" },
      agent: {
        title: "Know who is behind it",
        body: "Every listing names who is behind it, and a person reviews every agent application by hand before they can publish.",
      },
      pay: { title: "Pay once you both agree" },
    },
    ui: {
      example: "Example",
      listingTitle: "Two bedroom flat",
      place: "Lekki Phase 1, Lagos",
      rent: "Rent",
      perYear: "/yr",
      moveIn: "Move-in total",
      caution: "Caution",
      agency: "Agency",
      legal: "Legal",
      agreement: "Agreement",
      viewing: "Book a viewing",
      date: "Saturday 4 October",
      slots: ["10:00", "11:30", "14:00", "16:30"],
      chosen: "Chosen",
      open: "Open",
      noFee: "No inspection fee",
      agentInitials: "TA",
      agentName: "Tunde A.",
      agentRole: "Agent, Lekki",
      reviewed: "Application reviewed by a person",
      named: "Named on every listing",
      record: "Messages kept on the record",
      bank: "Straight to their bank",
    },
  },
  /*
   * The journey (Track M, second pass; no phone since 29 September): four
   * numbered step cards. The money chapters' bodies are NOT here: Inspect,
   * Agree and Move in print `NO_INSPECTION_FEE`, `PAYMENT_GATE_SENTENCE` and
   * `NO_CUSTODY_SENTENCE` from `lib/money/copy.ts`. The `screen` labels are
   * the few product words shown as small chips on each card.
   */
  journey: {
    overline: "From search to keys",
    title: "Four steps, one record",
    body: "Nothing moves on until the step before it is done.",
    steps: [
      { key: "find", label: "Find", title: "Find the place", body: "Search homes, land and stays across Nigeria, with the move-in total printed before you call anybody." },
      { key: "inspect", label: "Inspect", title: "See it for yourself" },
      { key: "agree", label: "Agree", title: "Agree before anything is paid" },
      { key: "move", label: "Move in", title: "Pay, and move in" },
    ],
    screen: {
      search: "Search Lagos",
      inspection: "Inspection",
      booked: "Booked",
      you: "You",
      owner: "Owner",
      approved: "Approved by Vallo",
      paid: "Paid",
      theirBank: "Straight to their bank",
    },
  },
  bento: {
    overline: "What's inside",
    title: "Everything the move needs.",
    body: "Search, stays, the assistant, agreements and messages, side by side.",
    cards: {
      rent: { title: "Rent and buy", body: "Homes, land, shops and offices, with the move-in total printed on the card." },
      stays: {
        title: "Vallo Stays",
        body: "Hotels, shortlets and guest houses, with the free nights and the full total before you book.",
        /* The kinds the Stays side lists (lib/stays/types.ts), shown on the
           tall card from 64rem. */
        chips: ["Hotels", "Shortlets", "Guest houses", "Resorts"],
      },
      ai: {
        title: "Vallo AI",
        body: "Ask in English, Yorùbá, Hausa or Igbo. It names only places that are on Vallo.",
        /* The four languages it answers in. */
        chips: ["English", "Yorùbá", "Hausa", "Igbo"],
      },
      price: { title: "Price Check", body: "What similar places nearby are advertised for, or a plain \"not enough to tell\"." },
      agree: { title: "Agreements", body: "Both of you confirm the agreement before any payment opens." },
      messages: { title: "Messages", body: "Every conversation with the lister stays on the platform, so there is a record." },
      feed: { title: "Around", body: "Places, posts and people near you, from the same account." },
    },
  },
  worlds: {
    overline: "Pick your side",
    property: {
      label: "Property",
      title: "Somewhere to live, or to own",
      body: "Rent by the year or buy outright. The agent is named, the inspection comes before any money, and the agreement is on the record.",
      cta: "Explore properties",
    },
    stays: {
      label: "Stays",
      title: "Somewhere to stay tonight",
      body: "Hotels, shortlets and guest houses by the night, with the dates that are free and the full total before you book.",
      cta: "Explore stays",
    },
    flip: "Flip to",
  },
  map: {
    overline: "Where Vallo lives",
    title: "Built for the whole of Nigeria",
    body: "Search any of these cities, or anywhere else you know.",
    /* The label over the city chips in the category room (UIUX item 9). */
    cities: "Cities",
  },
  badges: {
    appleSmall: "Download on the",
    apple: "App Store",
    googleSmall: "GET IT ON",
    google: "Google Play",
    /** Under a badge whose store listing is not live yet (no URL set). A fact about today, never a date promise. */
    comingSoon: "Not in the store yet",
  },
};
