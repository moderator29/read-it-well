/**
 * Session 3's copy for the landing page and the public site (W1).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 *
 * WHAT IS NEW HERE AND WHAT IS NOT. The landing reuses the words it already
 * had wherever they are honest (`landingRooms`, `publicDoors`, `trustVisible`,
 * `reel`, the brand lines under `landing`). Only the lines nothing else says
 * are written here: the name of each layer of the platform, the one sentence
 * per layer that no existing key carries, and the public menu's descriptions.
 * Every line says what the product does today and nothing it cannot show.
 */
export const experienceLandingEn = {
  /**
   * THE PLATFORM BAND: the layers of the operating system for physical spaces
   * (north star 10 A, the handoff's "Space OS narrative"), one tab each. The
   * band's title is the positioning line (`landing.positioning`): it is not
   * the page's first line, which D1 reserves for the slogan, and this is the
   * place on the page an investor reads for the category.
   */
  os: {
    overline: "One platform",
    lede: "Every stage of a space, from the first search to running it, on one account.",
    tabsLabel: "The parts of Vallo",
    layers: {
      trust: { tab: "Trust" },
      discover: { tab: "Discover" },
      intelligence: { tab: "Intelligence" },
      transactions: { tab: "Transactions" },
      operations: {
        tab: "Operations",
        title: "Your space, managed.",
        body: "Owners, agents and hosts run their listings, enquiries, viewings and bookings from one desk, on the same account.",
      },
      ecosystem: { tab: "Ecosystem" },
    },
    /** Over the example credential: what a lister would see, and nothing more. */
    passportShown: "Shown only in the conversations the renter chooses",
    /** Over the example desk. */
    deskLabel: "What a desk looks like",
    /** The example conversation's caption is `landingRooms.ai.caption`. */
  },
  /**
   * THE MOVE-IN BAND: the argument the platform was built on, as its own band
   * (north star 10 A). The title and the lede are existing keys; this is only
   * the line under the example figure saying which rent it was worked out on.
   */
  moveIn: {
    /** `{amount}` is the example's yearly rent. */
    onRent: "On a yearly rent of {amount}",
  },
  /**
   * THE PUBLIC MENU (reference 7086): each door with one line saying what is
   * behind it. The labels are `publicDoors.nav` and `landing.face.nav`.
   */
  menu: {
    groups: {
      check: "Before you pay",
      list: "List on Vallo",
      company: "Vallo",
    },
    checkAgent: "Paste a number or a VA- code and see whether it is a Vallo agent.",
    checkReceipt: "Confirm a Vallo receipt is real, with no account.",
    moveInCost: "Add up the rent and every fee you were quoted.",
    guides: "Plain answers to read before you pay for a home or a stay.",
    safety: "What to watch for, and how to report something wrong.",
    forAgents: "Publish homes, land, shops and offices once a person has reviewed your application.",
    forHosts: "Take stay bookings and table reservations in one inbox.",
    forLandlords: "List your own property, with or without an agent.",
    about: "Who is building Vallo, and why.",
    help: "Answers to common questions, and how to reach a person.",
    docs: "How each part of Vallo works, in detail.",
    careers: "Open roles at Vallo.",
    contact: "Write to the support desk.",
  },
  /**
   * THE DOCUMENTS (stage 9, W1b): the few lines the indexes in the help
   * centre, the guides and the policy pages need that no existing key says.
   * The rows' own words are the articles' and chapters' (never rewritten).
   */
  docs: {
    help: {
      topics: "Browse by topic",
      policies: "Safety and policy",
      /** `{count}` answers in a topic. */
      answers: "{count} answers",
      answerOne: "1 answer",
    },
  },
};
