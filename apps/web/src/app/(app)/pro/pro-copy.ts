import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * THE WORDS OF /pro, IN ENGLISH, IN ONE PLACE.
 *
 * Kept beside the route rather than in `@vallo/i18n` for one reason: the
 * founder has not decided what Pro costs or exactly what it includes, and a
 * namespace translated into Yoruba, Hausa and Igbo before that decision would
 * be translated twice. When he decides, this file moves to a `pro` namespace
 * key for key (the shape is already the dictionary's shape) and the page
 * reads it from `getDictionary`. Listed in the P6 hand-back.
 *
 * WHAT THE PLANS SAY, AND WHERE IT COMES FROM. The four plans and what each
 * covers are the founder's own lists (`founder-corpus/02-master-prompt.md`
 * section 30, "Professional products"; `03-full-product-prompt.md` "Agent Pro,
 * Owner Pro, Hospitality Pro, Business Pro"). The reason under each benefit
 * says what the tool is for, never a number it achieves. Nothing here is a
 * price, a quota, a saving or a date, because none exists.
 */

export type ProBenefit = { claim: string; reason: string; icon: UiIconName };

export type ProPlanCard = {
  key: "agent" | "owner" | "hospitality" | "business";
  name: string;
  /** The segmented pill's word. */
  short: string;
  /** The two-line promise under the name. */
  line: string;
  /** The founder's own list for this plan, four benefits. */
  benefits: ProBenefit[];
};

export const PRO_COPY = {
  metaTitle: "Vallo Pro",
  title: "Vallo Pro",

  hero: {
    /** The headline under the explainer; the last word is set in brand blue. */
    lead: "Go deeper with",
    last: "Pro.",
    body: "Pro adds tools to the workspace you already run: your leads, your calendar, your numbers. Everything free on Vallo today stays free.",
    /** The UI fragment that breaks out of the phone. */
    fragment: {
      source: "Agent mode",
      title: "Pro view",
      line: "Appears in your workspace once you hold a plan",
      words: ["Leads", "Clients", "Analytics"],
    },
  },

  plan: {
    label: "Your plan",
    signedOutTitle: "Sign in to see your plan",
    signedOutBody: "Your plan lives with your account.",
    signIn: "Sign in",
    unknownTitle: "We could not check your plan just now",
    unknownBody: "Nothing has changed on your account. Try again in a moment.",
    retry: "Try again",
    freeBody: "Everything you use today is included, at no cost.",
    heldBody: "Turn on Pro view from the switch in your workspace.",
    heldSoon: "Its tools arrive in your workspace as they open.",
    /** `{date}` is a long date. */
    heldUntil: "Current until {date}",
    heldOpen: "No end date",
    current: "Current",
  },

  /**
   * The plan page (GOVERNING-plasma-tier-detail-core, D74): a segmented plan
   * pill, the plan's metal card, its name and promise, the price line, a
   * three-stat strip, the benefit rows, and "Continue with <plan>".
   */
  detail: {
    pickLabel: "Plans",
    tag: "Pro",
    /** The price line, in grey, until the founder sets a price. */
    priceComing: "Price coming. Nothing is charged until you choose.",
    stats: {
      /** `{count}` is a number. */
      tools: "Tools",
      price: "Price",
      priceValue: "Coming",
      charged: "Charged today",
      chargedValue: "Nothing",
    },
    /** `{plan}` is the plan's name. */
    continue: "Continue with {plan}",
    /** Where "Cancel anytime. Terms apply." sits on the paywall reference. */
    fine: "No price is set yet, so nothing can be charged.",
    /** Shown only when the database offers a plan by name. */
    offeredLabel: "Offered now",
    offeredNote: "Its price is shown in full before you pay.",
  },

  /** The one plain sheet behind "Continue" (A.11's single gate). */
  gate: {
    /** `{plan}` is the plan's name. */
    title: "{plan} is not on sale yet",
    body: "When it opens, we will tell you, with its price and everything it includes on one page before anything is charged.",
    settings: "Choose what reaches you",
    signIn: "Sign in",
    close: "Close",
  },

  promises: {
    label: "How Pro will work",
    rows: [
      {
        icon: "sparkle",
        title: "Free stays free",
        sub: "Listing, messaging and saving stay free. Pro adds depth, it never takes something away.",
      },
      {
        icon: "eye",
        title: "No locked buttons",
        sub: "The Pro switch appears in your workspace only once you hold a plan. Nobody else ever sees a greyed control.",
      },
      {
        icon: "receipt",
        title: "The price, before you pay",
        sub: "What a plan costs and what it includes are shown on one plain sheet before anything is charged.",
      },
    ] as { icon: UiIconName; title: string; sub: string }[],
  },
} as const;

export const PRO_PLAN_CARDS: ProPlanCard[] = [
  {
    key: "agent",
    name: "Agent Pro",
    short: "Agent",
    line: "For agents who run many listings and many people.",
    benefits: [
      { claim: "Leads and clients", reason: "Every enquiry and every client in one place.", icon: "users" },
      { claim: "Follow-ups", reason: "Who is waiting on you, and since when.", icon: "clock" },
      { claim: "Portfolio", reason: "Your listings as one body of work.", icon: "grid" },
      { claim: "Analytics", reason: "What each listing is doing, week by week.", icon: "chart-bar" },
    ],
  },
  {
    key: "owner",
    name: "Owner Pro",
    short: "Owner",
    line: "For owners who let what they own.",
    benefits: [
      { claim: "Tenants and rent", reason: "Who lives where, and what is due.", icon: "key" },
      { claim: "Expenses", reason: "What each property costs you to keep.", icon: "receipt" },
      { claim: "Maintenance", reason: "Repairs asked for, booked and done.", icon: "clipboard-list" },
      { claim: "Documents", reason: "Agreements and receipts, filed by property.", icon: "file-text" },
    ],
  },
  {
    key: "hospitality",
    name: "Hospitality Pro",
    short: "Hotels",
    line: "For hotels, shortlets and guest houses.",
    benefits: [
      { claim: "Reservations", reason: "Every stay, from request to checkout.", icon: "calendar-booking" },
      { claim: "Calendar", reason: "Rooms and dates on one timeline.", icon: "calendar-check" },
      { claim: "Housekeeping", reason: "Which room is ready, and which is next.", icon: "concierge-bell" },
      { claim: "Revenue", reason: "What each room earned, night by night.", icon: "trending-up" },
    ],
  },
  {
    key: "business",
    name: "Business Pro",
    short: "Business",
    line: "For businesses with a place people visit.",
    benefits: [
      { claim: "Bookings", reason: "Tables, slots and visits in one list.", icon: "calendar-clock" },
      { claim: "Offers", reason: "What you are offering, and to whom.", icon: "price-tag" },
      { claim: "Customers", reason: "The people who come back.", icon: "user-check" },
      { claim: "Analytics", reason: "How people find you, week by week.", icon: "chart-bar" },
    ],
  },
];
