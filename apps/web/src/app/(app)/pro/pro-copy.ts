import type { UiIconName } from "@/design-system/icons/UiIcon";
import type { PlanPerk, PlanQuotaKey } from "./pro-state";

/**
 * THE WORDS OF /pro, IN ENGLISH, IN ONE PLACE.
 *
 * Kept beside the route rather than in `@vallo/i18n` until paying for a plan
 * opens: the sheet behind "Continue" changes then, and a namespace translated
 * into Yoruba, Hausa and Igbo before that would be translated twice. When it
 * opens, this file moves to a `pro` namespace key for key (the shape is
 * already the dictionary's shape). Listed in the P6 hand-back.
 *
 * WHAT THE PLANS SAY, AND WHERE IT COMES FROM. The two plans are the
 * founder's rulings of 8 October (DIRECTIVES D83): Vallo Pro for an
 * individual agent or landlord, Vallo Business for an agency, hotel or
 * serviced apartments. NO FIGURE LIVES HERE: the price, the monthly quotas,
 * the list of what each plan includes and the trial's length are read from
 * the plan rows (`pro-state.ts`). This file only words them: `{price}`,
 * `{count}` and `{days}` are filled from the database, and a perk or quota
 * the database names that has no words here is not drawn. The reason under
 * each benefit says what it is, never a number it achieves.
 */

export type ProBenefit = { claim: string; reason: string; icon: UiIconName };

/** The words for a plan the database describes, by its `plan_key`. */
export type ProPlanWords = {
  /** The segmented pill's word. */
  short: string;
  /** Who the plan is for, under its name. */
  line: string;
  /** The small word on the metal card. */
  tag: string;
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
   * pill, the plan's metal card, its name and who it is for, the price line,
   * a three-stat strip, what it includes, and "Continue with <plan>".
   */
  detail: {
    pickLabel: "Plans",
    /** `{price}` is a formatted amount read from the plan row. */
    price: "{price} a month",
    /** `{days}` is the trial length read from the settings row. */
    trial: "{days}-day free trial",
    stats: {
      included: "Included",
      price: "A month",
      trial: "Free trial",
      /** `{days}` is a whole number of days. */
      trialValue: "{days} days",
    },
    /** `{plan}` is the plan's name. */
    continue: "Continue with {plan}",
    /** Where "Cancel anytime. Terms apply." sits on the paywall reference. */
    fine: "Not on sale yet, so nothing can be charged.",
    /** When the plan rows could not be read. */
    none: "The plans could not be shown just now. Nothing has changed on your account.",
  },

  /** The one plain sheet behind "Continue" (A.11's single gate). */
  gate: {
    /** `{plan}` is the plan's name. */
    title: "{plan} is not on sale yet",
    body: "Paying for a plan is not open yet. When it opens, we will tell you, with the price, the free trial and everything included on one page before anything is charged.",
    settings: "Choose what reaches you",
    signIn: "Sign in",
    close: "Close",
  },

  /** What a plan includes, worded. `{count}` is the monthly quota from the plan's grant. */
  quotas: {
    listing_boost: {
      one: "{count} Boost a month",
      other: "{count} Boosts a month",
      reason: "A week in a marked slot on your area's page and its searches.",
      icon: "trending-up",
    },
    listing_spotlight: {
      one: "{count} Spotlight a month",
      other: "{count} Spotlights a month",
      reason: "Two weeks in the Promoted carousel at the top of your area and its searches.",
      icon: "eye",
    },
    listing_featured: {
      one: "{count} Featured a month",
      other: "{count} Featured a month",
      reason: "A month on the front door, the city page, your area and matching searches.",
      icon: "grid",
    },
    listing_prime: {
      one: "{count} Everywhere a month",
      other: "{count} Everywhere a month",
      reason: "Everything Featured gets, plus the saved-search and area digests and the map.",
      icon: "chart-bar",
    },
  } as Record<PlanQuotaKey, { one: string; other: string; reason: string; icon: UiIconName }>,

  perks: {
    deep_analytics: { claim: "Deep analytics", reason: "What each listing is doing, week by week.", icon: "chart-bar" },
    pro_badge: { claim: "Pro badge", reason: "Shows you hold Vallo Pro. It is not a verification mark.", icon: "circle-check" },
    priority_support: { claim: "Priority support", reason: "Your questions are answered before the general queue.", icon: "users" },
    team_members: { claim: "Team members", reason: "Your colleagues work under one account.", icon: "user-check" },
    command_centre: { claim: "Command centre", reason: "Your listings, bookings and enquiries in one view.", icon: "clipboard-list" },
    bulk_tools: { claim: "Bulk tools", reason: "Change many listings at once.", icon: "file-text" },
    export: { claim: "Export", reason: "Take your records out as a file.", icon: "receipt" },
  } as Record<PlanPerk, ProBenefit>,

  promises: {
    label: "How Pro will work",
    rows: [
      {
        icon: "circle-check",
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

/**
 * The plans' words, by `plan_key`. A plan row whose key is not here is still
 * drawn, under its own name from the row, with no line under it.
 */
export const PRO_PLAN_WORDS: Record<string, ProPlanWords> = {
  pro: { short: "Pro", line: "For an individual agent or landlord.", tag: "Pro" },
  business: { short: "Business", line: "For an agency, a hotel or serviced apartments.", tag: "Top plan" },
};
