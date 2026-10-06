/**
 * STANDING STREAKS, AS THIS LAYER IS ALLOWED TO KNOW THEM (founder directive
 * D17, north star 15.1).
 *
 * Session 2 owns the counting, the pause rule and the ledger (cross-session
 * contract, "Streaks"). None of it exists yet: there is no streak table, RPC
 * or job in this repository or on Session 2's branch (searched 6 October;
 * the only `streak` in the schema is a push transport's `failure_streak`). So
 * this file is the SHAPE the display reads, written down as request W7-R6,
 * and the components render only where a page holds a real `Streak` from
 * Session 2. Nothing here counts anything.
 *
 * THE RULES THAT KEEP IT TRUSTWORTHY, which the display enforces where it can:
 *   - a streak counts a real-world behaviour with a counterparty, never an
 *     app-open: there is no kind below for a login, a session or a visit;
 *   - never broken by not needing the product: between tenancies it is
 *     PAUSED and says so, with the count kept;
 *   - breaking is quiet: the count restarts, the history is kept, and a
 *     missed window mark is drawn hollow, never red, never a flame going out;
 *   - no leaderboard, no comparison with anybody, nothing purchasable: there
 *     is no field here for another member.
 */
export const STREAK_KINDS = [
  "onTimeRent",
  "replyTime",
  "disputeFree",
  "freshness",
  "inspections",
  "completeListing",
] as const;

export type StreakKind = (typeof STREAK_KINDS)[number];

/** One window in the run, oldest first: kept, missed, or not yet reached. */
export type StreakMark = "kept" | "missed" | "open";

/** What Session 2 returns per streak (W7-R6). */
export type Streak = {
  kind: StreakKind;
  /** The current run. Zero after a break; the history is in `best` and the marks. */
  current: number;
  /** The longest run ever. */
  best: number;
  /** Paused: nothing to count right now (between tenancies, no listing live). */
  state: "running" | "paused";
  /** The most recent windows, oldest first, at most twelve. */
  window: StreakMark[];
  /** When `current` began, YYYY-MM-DD, or null at zero. */
  since: string | null;
};

/** The unit each kind counts in, as a key of `experienceFeatures.streaks.unit`. */
export const STREAK_UNIT: Readonly<Record<StreakKind, "payments" | "weeks" | "months" | "confirmations" | "inspections" | "healthMonths">> = {
  onTimeRent: "payments",
  replyTime: "weeks",
  disputeFree: "months",
  freshness: "confirmations",
  inspections: "inspections",
  completeListing: "healthMonths",
};

/** At most twelve marks are drawn, the most recent last. */
export function visibleMarks(window: readonly StreakMark[]): StreakMark[] {
  return window.slice(-12);
}

/** How many of the drawn windows were kept, for the marks' accessible name. */
export function keptCount(window: readonly StreakMark[]): { kept: number; total: number } {
  const shown = visibleMarks(window).filter((mark) => mark !== "open");
  return { kept: shown.filter((mark) => mark === "kept").length, total: shown.length };
}
