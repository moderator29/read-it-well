import { plural, type PluralForms } from "@vallo/i18n/core";
import type { Board, LeaderKind, Movement, Period, Scope } from "./model";

/**
 * The leaderboards' words, in one place (D76). English; plain; a count is
 * always said with its unit, and nothing here promises a prize, because the
 * boards carry none.
 */

export const LEADERBOARD_TITLE = "Leaderboard";

export const GROUP_LABEL = { referrals: "Referrals", top: "Top on Vallo" } as const;

export const BOARD_LABEL: Record<Board, string> = {
  referrals: "Referrals",
  property: "Agents and landlords",
  hotels: "Hotels and stays",
  restaurants: "Restaurants",
};

/** The short label on the sub-board switch. */
export const BOARD_SHORT: Record<Board, string> = {
  referrals: "Referrals",
  property: "Agents",
  hotels: "Hotels",
  restaurants: "Restaurants",
};

/** What a board counts, as the small unit beside the figure, in the locale's plural forms. */
const UNIT_FORMS: Record<Board, PluralForms> = {
  referrals: { one: "referral", other: "referrals" },
  property: { one: "deal", other: "deals" },
  hotels: { one: "stay", other: "stays" },
  restaurants: { one: "table", other: "tables" },
};

export function unitFor(board: Board, n: number): string {
  return plural(n, UNIT_FORMS[board]);
}

/** One plain line under the title: what the board ranks. */
export const BOARD_MEASURE: Record<Board, string> = {
  referrals: "Ranked by friends who joined with your link.",
  property: "Ranked by rent deals paid through Vallo.",
  hotels: "Ranked by completed stays booked on Vallo.",
  restaurants: "Ranked by completed table reservations.",
};

export const KIND_LABEL: Record<LeaderKind, string> = {
  member: "Member",
  agent: "Agent",
  landlord: "Landlord",
  firm: "Firm",
  hotel: "Hotel",
  resort: "Resort",
  guest_house: "Guest house",
  serviced_apartments: "Serviced apartments",
  shortlet_operator: "Shortlets",
  restaurant: "Restaurant",
};

export const SCOPE_LABEL: Record<Scope, string> = { city: "City", global: "Global" };

export const PERIOD_LABEL: Record<Period, string> = { month: "This month", all: "All time" };

/** The month subtitle: "October 2026". */
export function periodSubtitle(period: Period, now: Date = new Date()): string {
  if (period === "all") return "All time";
  return new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(now);
}

/** Movement said in words, for the screen reader and the tooltip. */
export function movementWords(m: Movement, period: Period): string {
  const since = period === "month" ? "since last month" : "since the start of this month";
  switch (m.direction) {
    case "up":
      return `Up ${m.by} ${since}`;
    case "down":
      return `Down ${m.by} ${since}`;
    case "same":
      return `No change ${since}`;
    case "new":
      return "New on the board";
  }
}

export function placeWord(scope: Scope, placeName: string | null): string {
  return scope === "global" ? "Nigeria" : (placeName ?? "your city");
}

/** The empty board: honest, and it says what to do. */
export function emptyTitle(scope: Scope, placeName: string | null): string {
  return scope === "global" ? "Be the first on Vallo" : `Be the first in ${placeName ?? "your city"}`;
}

export const EMPTY_BODY: Record<Board, string> = {
  referrals: "Nobody has a referral on this board yet. Invite a friend; it counts as soon as they sign up.",
  property: "No rent deal has been paid through Vallo here yet. The first verified agent or landlord to close one takes the top spot.",
  hotels: "No stay has been completed here yet. The first approved hotel to host a guest through Vallo takes the top spot.",
  restaurants: "No reservation has been completed here yet. The first approved restaurant to seat a guest through Vallo takes the top spot.",
};

/** The next step from an empty board, or the explainer. */
export const CLIMB_ACTION: Record<Board, { label: string; href: string }> = {
  referrals: { label: "Invite friends", href: "/settings/invite" },
  property: { label: "Become an agent", href: "/profile/setup" },
  hotels: { label: "Add your hotel", href: "/profile/setup?side=stays" },
  restaurants: { label: "Add your restaurant", href: "/profile/setup?side=stays" },
};

export const NOT_LIVE_TITLE = "Leaderboards open soon";
export const NOT_LIVE_BODY =
  "The boards are built and waiting for their switch. When they open they rank real activity only, so nobody is shown until they have earned a place.";

export const ERROR_TITLE = "The board did not load";
export const ERROR_BODY = "Nothing is wrong with your account. Pull down or try again in a moment.";

/** The "how to climb" explainer, three cards (the Plasma explainer). */
export const CLIMB_STEPS: Record<Board, { title: string; body: string }[]> = {
  referrals: [
    { title: "Share your link", body: "Every friend who signs up with your link is yours. Nobody can claim them after." },
    { title: "It counts when they join", body: "A friend counts the moment they finish signing up with your link." },
    { title: "Climb every month", body: "The month board starts fresh on the first. All time keeps every referral." },
  ],
  property: [
    { title: "Get approved", body: "Only approved agents, landlords and firms are ranked. Approval is free." },
    { title: "Close through Vallo", body: "Each rent deal paid through Vallo counts once, for the listing's agent and their firm." },
    { title: "Climb every month", body: "The month board starts fresh on the first. Your city is where the home is." },
  ],
  hotels: [
    { title: "Get approved", body: "Only approved, published hotels and stays are ranked." },
    { title: "Host through Vallo", body: "Each stay booked on Vallo counts once the guest has checked out." },
    { title: "Climb every month", body: "The month board starts fresh on the first. All time keeps every stay." },
  ],
  restaurants: [
    { title: "Get approved", body: "Only approved, published restaurants are ranked." },
    { title: "Seat guests through Vallo", body: "Each reservation counts once it is marked completed." },
    { title: "Climb every month", body: "The month board starts fresh on the first. All time keeps every table." },
  ],
};

export const EXPLAINER_TITLE = "How to climb";
export const EXPLAINER_DONE = "Got it";

export const PRIVACY_LINE =
  "Boards show a public name, a count and a city. Never an amount, a phone number or an email.";
export const OPT_OUT_LABEL = "Show me on leaderboards";
export const OPT_OUT_BODY = "Turn this off to take yourself off every board. You can come back any time.";

export const SHARE_TITLE = "Share your rank";
export const SHARE_ACTION = "Share";
export const SHARE_COPY = "Copy link";
export const SHARE_COPIED = "Link copied";

export function shareText(rank: number, board: Board, place: string, period: Period): string {
  const when = period === "month" ? "this month" : "of all time";
  return `I'm #${rank} on Vallo's ${BOARD_LABEL[board]} board in ${place}, ${when}.`;
}

export function youPill(rank: number | null): string {
  return rank === null ? "You" : `You, #${rank}`;
}

export const NOT_ON_BOARD = "You are not on this board yet";

/** The earned moment's title, by place: first is said as first. */
const EARNED_TITLE: Partial<Record<number, (place: string) => string>> = {
  1: (place) => `Number one in ${place}.`,
};

export function earnedTitle(rank: number, place: string): string {
  return (EARNED_TITLE[rank] ?? ((p: string) => `Top three in ${p}.`))(place);
}

export function earnedBody(rank: number, board: Board): string {
  return `You are #${rank} on the ${BOARD_LABEL[board]} board. Every count behind it is real activity on Vallo.`;
}
