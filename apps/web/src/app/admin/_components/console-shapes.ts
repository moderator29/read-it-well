/**
 * THE SHAPES THE CONSOLE'S PANELS ARE BUILT AGAINST, AND NOTHING ELSE.
 *
 * Types only: no reads live in `app/admin`. Queries belong to
 * `lib/admin/**`, which is the other session's (docs/SESSION_B_SCOPE.md,
 * "Requests"). Each shape below is the return type of a query that does not
 * exist yet and is written up there under the request number in its comment.
 * The panels are drawn fully against these shapes; until a query lands its
 * panel is handed null and says, on the panel, that it is not wired yet.
 *
 * Money is integer kobo throughout and is drawn only through `formatMoney`.
 * Days are Lagos calendar days, `YYYY-MM-DD`; months are `YYYY-MM`.
 */

/** Request A1, `getConsolePulse()`: the overview's strip and four cards. */
export type ConsolePulse = {
  /** Published, non-example listings now, and the same count as it stood seven days ago. */
  listingsLive: number;
  listingsLiveWeekAgo: number;
  /** Profiles created today and yesterday (Lagos days). */
  signupsToday: number;
  signupsYesterday: number;
  /** Money collected (successful charges plus completed wallet deposits), kobo. */
  collectedTodayMinor: number;
  collectedYesterdayMinor: number;
  collectedWeekMinor: number;
  collectedPrevWeekMinor: number;
  /** Listings submitted for review in the last seven days, and the seven before. */
  newSupplyWeek: number;
  newSupplyPrevWeek: number;
  /** Fourteen Lagos days, oldest first, one entry per day, zeros included. */
  daily: { day: string; signups: number; collectedMinor: number; submitted: number; liveAtClose: number }[];
};

/** Request A2, `getCollectedSeries(range)`: "Naira transacted over time". */
export type CollectedRange = "30d" | "90d" | "12m";
export type CollectedSeries = {
  range: CollectedRange;
  /** One bucket per day (30d), week (90d) or month (12m), oldest first, zeros included. */
  buckets: { start: string; amountMinor: number; count: number }[];
};

/** Request A3, `getSupplyByType()`: published non-example listings by kind. */
export type SupplyKind = "rent" | "buy" | "land" | "hotels" | "shortlets" | "restaurants";
export type SupplyByType = { rows: { kind: SupplyKind; count: number }[]; total: number };

/** Request A4, `getNewListingsByRole(months)`: listings created per month by who listed them. */
export type ListingsByRole = {
  months: { month: string; owner: number; agent: number; firm: number }[];
};

/** Request A5, `getJobHealth()`: every scheduled job, both schedulers. */
export type JobOutcome = "ok" | "attention" | "failed";
export type JobHealthRow = {
  name: string;
  scheduler: "vercel" | "pg_cron";
  /** The cron expression as scheduled. */
  cron: string;
  /** The same in words, e.g. "Hourly at :05". */
  schedule: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  lastOutcome: JobOutcome | null;
  /** True when the job has been silent past its allowance. */
  stale: boolean;
  active: boolean;
};
export type JobHealth = { jobs: JobHealthRow[]; checkedAt: string };

/** Request A6, `getNotificationActivity(days)`: every notification the platform sends. */
export type NotificationActivity = {
  windowDays: number;
  byKind: { kind: string; sent: number; read: number; lastSentAt: string | null }[];
  perDay: { day: string; sent: number }[];
  total: number;
};

/** Request A7, `getDemand(range)`: searches recorded, which needs a search event log first. */
export type DemandSeries = {
  buckets: { start: string; searches: number; listings: number }[];
  topAreas: { area: string; searches: number }[];
  searchesVsResults: { start: string; searches: number; withResults: number }[];
  totals: { searches: number; searchesPrev: number };
};

/** Request A8, `getListingViews(range)`: listing detail views, which needs a view log first. */
export type ListingViews = { views: number; viewsPrev: number };

/** Request A9, `getThinAreas(limit)`: areas with the fewest published listings. */
export type ThinAreas = { rows: { area: string; city: string | null; count: number }[] };

/** Request A10, `getBookingOutcomes(range)`: confirmed and completed bookings. */
export type BookingOutcomes = { successful: number; successfulPrev: number };

/** Request A11, `getRefusalReasons(range)`: structured reasons for declines. */
export type RefusalReasons = { rows: { reason: string; count: number }[]; total: number };

/** Request A12, `getAlertTrend()`: open alerts now and a week ago, for the delta. */
export type AlertTrend = { openNow: number; openWeekAgo: number; daily: { day: string; opened: number }[] };
