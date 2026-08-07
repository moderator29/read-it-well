import "server-only";

/**
 * The agent's own numbers, and only the ones the database can actually answer.
 *
 * This is the read behind /agent/analytics. It is deliberately narrow. An
 * analytics screen is the single easiest place on a marketplace to publish a
 * lie, because a chart with a plausible shape reads as fact whether or not
 * anything behind it is real, and a host will price a flat, turn down a guest
 * or take out a loan on the strength of it. So the rule this file is built to
 * is the same one that keeps getPlatformStats() returning null: if the data
 * cannot answer the question, the question is not asked. Nothing here
 * estimates, projects, annualises, extrapolates or fills a gap with a
 * representative figure. There is no sample series anywhere in this module,
 * and an empty result is a true statement rather than a failure.
 *
 * Every read goes through the caller's own RLS-bound client, which is the same
 * decision bookings-queries.ts and reservations-queries.ts made and for the
 * same reason: bookings_host_select, ledger_host_select, reviews_select,
 * availability_select and listings_owner_all already say who may read what, so
 * restating any of it here would create a second copy of the access rule that
 * can drift from the first. Unlike the bookings board this file never reaches
 * for the service role at all, because none of these figures needs a name, an
 * email or anything else a host's own client is not allowed to see.
 *
 * THREE QUESTIONS ARE DELIBERATELY NOT ANSWERED HERE, and each absence is a
 * decision rather than an oversight:
 *
 *   - Views. Nothing on this platform counts a view of a listing. post_views
 *     exists but belongs to the social feed and keys on posts.id, so it cannot
 *     be joined to a listing at all. With no numerator there is no view count,
 *     and with no view count there is no view-to-booking conversion rate. Both
 *     would have to be invented, so neither is offered.
 *
 *   - Saves. saved_items is owner-only by policy (saved_items_own, "for all
 *     using auth.uid() = user_id"), so a host's own client cannot read it, and
 *     the service role would be bypassing a policy that was written to be
 *     strict rather than filling a hole somebody forgot. Even setting the
 *     privacy question aside the number would be wrong: a signed-out visitor's
 *     saves live in localStorage and a cookie (lib/saved/local.ts) and never
 *     become rows, so a database count is short by an amount that is not
 *     merely unknown but unknowable. A figure that undercounts by an
 *     unmeasurable margin is worse than no figure, because a host would act on
 *     it.
 *
 *   - Historical occupancy as a percentage. Nights sold can be counted exactly.
 *     The denominator cannot: a percentage of capacity needs to know how many
 *     listings were published on each past night, and listings carries one
 *     published_at and one current status rather than a history of either, so a
 *     listing paused last March would silently rewrite last March's occupancy
 *     every time this page is opened. Forward occupancy over the next thirty
 *     nights IS answerable, because the denominator is today's published count
 *     and today is a fact, so that is the one this file computes.
 *
 * All money is integer kobo and stays that way. Nothing here writes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { AgentContext, ListingStatus } from "./listings-queries";
import { readAgentEarnings, type AgentEarnings, type EarningsMonth } from "./earnings-queries";
import { HOLD_WINDOW_HOURS } from "./bookings-schema";
import { lagosToday } from "./calendar-schema";

type Db = SupabaseClient<Database>;

type BookingStatus = Database["public"]["Enums"]["booking_status"];

/**
 * Where every request a host has ever received currently stands.
 *
 * Grouped by outcome rather than by who caused it, because only the outcome is
 * knowable for all five groups. A CONFIRMED booking may have been accepted by
 * the host from the bookings board or confirmed by the guest paying for an
 * instant-book listing, and lumping those under "you accepted" would credit a
 * host with work they did not do. The one figure that genuinely is about the
 * host's own behaviour, the time they take to answer, is computed from state
 * events that carry their user id as the actor and nothing else.
 */
export type RequestOutcomes = {
  /** Every booking row ever written against this agent's listings. */
  received: number;
  confirmed: number;
  cancelled: number;
  /** Still PENDING and still inside the hold window, so still theirs to answer. */
  waiting: number;
  /**
   * Still PENDING with the hold window already behind it.
   *
   * These are requests nobody answered. The sweep that is supposed to cancel
   * them (private.release_stale_booking_holds) needs pg_cron, which is not
   * enabled on this project, so in practice they sit at PENDING for ever and
   * this is the only place a host is told how many of them there are.
   */
  lapsed: number;
  /** How many requests carry a state change the host themselves recorded. */
  answered: number;
  /** Middle value of those answers, in whole hours. Null when they answered none. */
  medianAnswerHours: number | null;
  /**
   * Whether the answering history could be read at all.
   *
   * This field exists because without it the screen has one rendering for two
   * opposite facts. A host who has genuinely never answered a request and a
   * host whose booking_state_events read failed both arrive at `answered: 0`
   * and `medianAnswerHours: null`, and telling the second one "you have not
   * answered a request yet" is a false statement about their own conduct on
   * the surface they are most likely to be judged by. False keeps the count
   * and the median blank AND changes the sentence.
   */
  answerTimingReadable: boolean;
};

/** One listing's record, from the four tables that can speak about it. */
export type ListingPerformance = {
  listingId: string;
  title: string;
  status: ListingStatus;
  requests: number;
  confirmed: number;
  /** Nights across CONFIRMED bookings, as the booking itself recorded them. */
  nightsSold: number;
  /** Sum of the agent's share on settled ledger rows for this listing. Kobo. */
  settledShareMinor: number;
  reviews: number;
  /** Mean rating, unrounded. Null when nobody has reviewed it. */
  rating: number | null;
};

/**
 * How much of the near calendar is already spoken for.
 *
 * The window is short on purpose. A host can act on the next month; a figure
 * covering the next year would be dominated by nights nobody has had the
 * chance to book yet and would read as failure rather than as emptiness.
 */
export type CalendarPressure = {
  windowNights: number;
  /** Published listings only, because only a published listing can be booked. */
  listings: number;
  /** listings multiplied by windowNights. The denominator, stated plainly. */
  offeredNights: number;
  /** Nights carrying a settled stay. Written by the settlement path, not by hand. */
  bookedNights: number;
  /** Nights the host closed themselves. Not lost business, so counted apart. */
  blockedNights: number;
};

export type ReviewStanding = {
  count: number;
  /** Mean rating, unrounded. Null when there are no reviews at all. */
  average: number | null;
};

/**
 * Everything the analytics screen renders.
 *
 * Each section is independently nullable, and null means exactly one thing:
 * that read failed and we do not know the answer. It never means zero. An
 * agent with no bookings gets a RequestOutcomes full of zeroes, which is a
 * true and useful statement; an agent whose bookings read errored gets null,
 * and the screen says so rather than telling them they have never had a
 * request. Conflating those two is how an outage becomes a business decision.
 */
export type AgentAnalytics = {
  earnings: AgentEarnings;
  /**
   * The bars, already laid out. Computed here rather than in the component so
   * the rule about which months may appear on a chart lives with the rest of
   * the honesty rules in this file, where the next person changing it will see
   * why. Empty whenever the ledger is empty or unreadable.
   */
  trend: SettledPoint[];
  requests: RequestOutcomes | null;
  listings: ListingPerformance[] | null;
  calendar: CalendarPressure | null;
  reviews: ReviewStanding | null;
};

/**
 * A single settled month on the trend, already flattened for drawing.
 *
 * Carries the parts a caller needs to build a localised label plus the one
 * figure the bar represents. Nothing else from EarningsMonth travels here,
 * because a chart that can reach six other numbers eventually draws one of
 * them by accident.
 */
export type SettledPoint = {
  key: string;
  year: number;
  month: number;
  agentShareMinor: number;
};

/* -------------------------------------------------------------- constants */

/**
 * Read ceilings.
 *
 * Higher than the bookings console's 300 because these are aggregates rather
 * than a work queue: a console shows what needs doing today and can stop, but a
 * total that quietly omits the oldest rows is a wrong total, and a wrong total
 * is the exact failure this file exists to avoid. Two thousand is generous
 * against any real agent on this platform today and still bounded, which is
 * Master Rule 54.
 */
const MAX_ROWS = 2000;

/** How far ahead the calendar pressure figure looks. */
export const CALENDAR_WINDOW_NIGHTS = 30;

/** Most bars the trend will ever draw, so a long history stays readable. */
export const MAX_TREND_MONTHS = 12;

/* ------------------------------------------------------------ pure helpers */

/**
 * The middle value of a set of hours, or null when the set is empty.
 *
 * The median rather than the mean, because response time is the shape of
 * distribution the mean is worst at: one request answered after a fortnight
 * away drags a host's average into a number that describes none of their
 * behaviour, while the median keeps saying what a guest can actually expect.
 *
 * With an even number of samples this takes the LOWER of the two middle values
 * rather than averaging them. That keeps every figure this page prints a real
 * observation that actually happened, instead of a synthesised half-hour that
 * no request ever waited. It is a smaller claim and a true one.
 */
export function medianHours(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? null;
}

/** Whole hours between an ISO timestamp and a moment, floored, never negative. */
function hoursBetween(fromIso: string, to: number): number {
  const started = Date.parse(fromIso);
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((to - started) / 3_600_000));
}

/** The shape summariseRequests needs from a booking, and nothing more. */
export type RequestInput = { status: BookingStatus; createdAt: string };

/**
 * Sort every request into exactly one of five buckets.
 *
 * Exported separately from the query so it can be proved against a fixed clock
 * in a unit test. The hold boundary is the single interesting edge here: a
 * request at exactly 48 hours has reached the end of its window, so it counts
 * as lapsed rather than as still waiting, which matches what
 * private.release_stale_booking_holds would do to it the moment it could run.
 *
 * `answerHours` is nullable and null is not the same as empty. Empty means the
 * host has answered nothing; null means the history could not be read and this
 * function must not report anything at all about their answering.
 */
export function summariseRequests(
  bookings: RequestInput[],
  answerHours: number[] | null,
  now: number,
): RequestOutcomes {
  let confirmed = 0;
  let cancelled = 0;
  let waiting = 0;
  let lapsed = 0;

  for (const booking of bookings) {
    if (booking.status === "CONFIRMED") {
      confirmed += 1;
    } else if (booking.status === "CANCELLED") {
      cancelled += 1;
    } else if (hoursBetween(booking.createdAt, now) >= HOLD_WINDOW_HOURS) {
      lapsed += 1;
    } else {
      waiting += 1;
    }
  }

  return {
    received: bookings.length,
    confirmed,
    cancelled,
    waiting,
    lapsed,
    answered: answerHours?.length ?? 0,
    medianAnswerHours: answerHours === null ? null : medianHours(answerHours),
    answerTimingReadable: answerHours !== null,
  };
}

/**
 * The settled months, laid out as a continuous run ending at the current month.
 *
 * Two decisions worth stating, because both look like conveniences and are
 * actually honesty rules.
 *
 * A month between two settled months with nothing in it IS drawn, at zero.
 * That is not an invented data point: the ledger is the complete record of
 * settled money, so a month with no ledger rows is a month in which nothing
 * settled, and saying zero is exactly right. Dropping it instead would compress
 * the axis and turn a quiet spring into a smooth climb, which is the more
 * flattering picture and the false one.
 *
 * The run never starts before the first settled month. Padding backwards to
 * fill twelve bars would draw zeroes for months in which this host had not yet
 * joined, which is a different claim entirely: not "you earned nothing" but
 * "you were here and earned nothing". The run does extend forwards to the
 * current month, because a host who settled nothing since March should see the
 * gap since March rather than a chart that stops there and reads as current.
 */
export function settledSeries(
  months: EarningsMonth[],
  nowKey: string,
  maxPoints: number = MAX_TREND_MONTHS,
): SettledPoint[] {
  if (months.length === 0) return [];

  const byKey = new Map(months.map((month) => [month.key, month]));
  const keys = [...byKey.keys()].sort();
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return [];

  const start = monthNumber(first);
  const lastSettled = monthNumber(last);
  const current = monthNumber(nowKey);
  if (start === null || lastSettled === null) return [];

  /* An unparseable "now" falls back to the last settled month rather than
     throwing the trend away: the bars are still true, they simply stop where
     the ledger stops. */
  const end = Math.max(lastSettled, current ?? lastSettled);
  if (end < start) return [];

  const points: SettledPoint[] = [];
  for (let index = start; index <= end; index += 1) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    points.push({
      key,
      year,
      month,
      agentShareMinor: byKey.get(key)?.agentShareMinor ?? 0,
    });
  }

  return points.slice(Math.max(0, points.length - maxPoints));
}

/** "YYYY-MM" as a count of months since year zero, or null if unparseable. */
function monthNumber(key: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return year * 12 + (month - 1);
}

/** "YYYY-MM" for right now, in Lagos, matching how earnings buckets its rows. */
function lagosMonthKey(): string {
  return lagosToday().slice(0, 7);
}

/** An ISO date, n days on. Plain date arithmetic in UTC, no timezone drift. */
function addDays(isoDate: string, days: number): string {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed)) return isoDate;
  return new Date(parsed + days * 86_400_000).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ reads */

type BookingAggregateRow = {
  id: string;
  listing_id: string;
  status: BookingStatus;
  nights: number;
  created_at: string;
};

/**
 * Every booking against this agent's listings, with only the five columns an
 * aggregate needs.
 *
 * This does not call readHostBookings, and the reason is not that it forgot.
 * That function exists to draw a work queue: it caps at the 300 most recent
 * rows because a console shows work rather than an archive, and it spends a
 * service-role round trip resolving guest display names for every one of them.
 * Both are right there and wrong here. A lifetime count that quietly stops at
 * 300 is a wrong count, and nothing on this page prints a guest's name.
 */
async function readBookings(supabase: Db, agentId: string): Promise<BookingAggregateRow[] | null> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, listing_id, status, nights, created_at, listings!inner(agent_id)")
      .eq("listings.agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) return null;
    return (data ?? []) as unknown as BookingAggregateRow[];
  } catch {
    return null;
  }
}

/**
 * How long the host took over each request they answered themselves.
 *
 * booking_state_events is append-only history and readable by the host under
 * the policy's private.is_booking_host branch, so the answer is already
 * recorded and nothing needs deriving. The filters are the whole of the
 * accuracy here:
 *
 *   from_status = PENDING keeps this to the moment a decision was made, not to
 *   a later cancellation of an already confirmed stay.
 *
 *   actor_id = the host's own user id is what makes the figure theirs. The same
 *   PENDING transition is written when a guest pays for an instant-book
 *   listing, with the guest as the actor, and counting those would report a
 *   host's speed as whatever the guest's card did.
 *
 * The join filter carries the ownership constraint, so no list of booking ids
 * has to be assembled and sent back: two thousand uuids in a query string is
 * roughly seventy kilobytes of URL, and PostgREST is perfectly able to filter
 * on the embedded row instead.
 *
 * Returns null only when the read fails. An empty array is a real answer: this
 * host has not personally answered a request yet.
 */
async function readAnswerHours(
  supabase: Db,
  agentId: string,
  userId: string,
): Promise<number[] | null> {
  try {
    const { data, error } = await supabase
      .from("booking_state_events")
      .select("created_at, bookings!inner(created_at, listings!inner(agent_id))")
      .eq("bookings.listings.agent_id", agentId)
      .eq("from_status", "PENDING")
      .eq("actor_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) return null;

    const rows = (data ?? []) as unknown as {
      created_at: string;
      bookings: { created_at: string } | null;
    }[];

    const hours: number[] = [];
    for (const row of rows) {
      const requested = row.bookings?.created_at;
      if (!requested) continue;
      const answeredAt = Date.parse(row.created_at);
      if (Number.isNaN(answeredAt)) continue;
      hours.push(hoursBetween(requested, answeredAt));
    }
    return hours;
  } catch {
    return null;
  }
}

type ListingRow = { id: string; title: string; status: ListingStatus };

async function readListings(supabase: Db, agentId: string): Promise<ListingRow[] | null> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, status")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) return null;
    return (data ?? []) as ListingRow[];
  } catch {
    return null;
  }
}

/**
 * Settled agent share, per listing.
 *
 * A second pass over ledger_entries, on purpose. earnings-queries.ts owns the
 * month rollup and this page reuses it rather than recomputing it, but that
 * read deliberately carries no join: the earnings screen has no use for a
 * listing id and paying for the join on every visit to it would be waste. This
 * question is the other axis of the same table, so it asks for the other shape
 * rather than teaching one query to serve both and making the earnings page
 * slower to answer a question it never asks.
 */
async function readSettledByListing(
  supabase: Db,
  agentId: string,
): Promise<Map<string, number> | null> {
  try {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select("agent_share_minor, bookings!inner(listing_id, listings!inner(agent_id))")
      .eq("bookings.listings.agent_id", agentId)
      .limit(MAX_ROWS);
    if (error) return null;

    const rows = (data ?? []) as unknown as {
      agent_share_minor: number;
      bookings: { listing_id: string } | null;
    }[];

    const byListing = new Map<string, number>();
    for (const row of rows) {
      const listingId = row.bookings?.listing_id;
      if (!listingId) continue;
      byListing.set(listingId, (byListing.get(listingId) ?? 0) + row.agent_share_minor);
    }
    return byListing;
  } catch {
    return null;
  }
}

type RatingTally = { count: number; total: number };

/**
 * Ratings, overall and per listing.
 *
 * Only the rating column is read. /agent/reviews already owns the console with
 * the bodies, the author labels and the host's replies in it, and pulling all
 * of that back to compute a mean would be a second, slower copy of a screen
 * that exists. reviews_select carries private.owns_listing since the review
 * responses migration, so a paused listing's ratings still count here, which
 * matters: a host who pauses a property has not stopped having its reviews.
 */
async function readRatings(
  supabase: Db,
  agentId: string,
): Promise<{ overall: RatingTally; byListing: Map<string, RatingTally> } | null> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("listing_id, rating, listings!inner(agent_id)")
      .eq("listings.agent_id", agentId)
      .limit(MAX_ROWS);
    if (error) return null;

    const rows = (data ?? []) as unknown as { listing_id: string; rating: number }[];
    const overall: RatingTally = { count: 0, total: 0 };
    const byListing = new Map<string, RatingTally>();

    for (const row of rows) {
      overall.count += 1;
      overall.total += row.rating;
      const tally = byListing.get(row.listing_id) ?? { count: 0, total: 0 };
      tally.count += 1;
      tally.total += row.rating;
      byListing.set(row.listing_id, tally);
    }

    return { overall, byListing };
  } catch {
    return null;
  }
}

/**
 * How many of the next thirty nights are already spoken for.
 *
 * The denominator is today's PUBLISHED listings and nothing else. A draft, a
 * listing waiting on review and an approved-but-unpublished one are all
 * unbookable, so counting their nights as capacity would invent a shortfall
 * out of work the host has not finished rather than out of demand they did not
 * get. listings_select_published draws the same line, so this figure agrees
 * with what a guest can actually see.
 *
 * booked and blocked are kept apart because they mean opposite things. A booked
 * night is money. A night the host closed by hand is a night they chose not to
 * sell, and folding it into an occupancy figure would flatter a host who
 * blocked their whole calendar into looking fully booked.
 */
async function readCalendarPressure(
  supabase: Db,
  listings: ListingRow[],
): Promise<CalendarPressure | null> {
  const publishedIds = listings.filter((row) => row.status === "PUBLISHED").map((row) => row.id);

  const empty: CalendarPressure = {
    windowNights: CALENDAR_WINDOW_NIGHTS,
    listings: publishedIds.length,
    offeredNights: publishedIds.length * CALENDAR_WINDOW_NIGHTS,
    bookedNights: 0,
    blockedNights: 0,
  };
  if (publishedIds.length === 0) return empty;

  try {
    const today = lagosToday();
    const { data, error } = await supabase
      .from("availability")
      .select("status")
      .in("listing_id", publishedIds)
      .gte("date", today)
      .lte("date", addDays(today, CALENDAR_WINDOW_NIGHTS - 1))
      .in("status", ["booked", "unavailable"])
      .limit(MAX_ROWS);
    if (error) return null;

    let bookedNights = 0;
    let blockedNights = 0;
    for (const row of (data ?? []) as { status: string }[]) {
      if (row.status === "booked") bookedNights += 1;
      else blockedNights += 1;
    }

    return { ...empty, bookedNights, blockedNights };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- the answer */

/**
 * Every figure the analytics screen needs, in one pass.
 *
 * Null means the question does not apply to this visitor: Supabase is not
 * configured, nobody is signed in, or the signed-in person holds no agents
 * row. The page keeps its own designed rendering for those three, exactly as
 * the listings, bookings and earnings workspaces do, rather than showing an
 * empty console that reads as a broken one.
 *
 * The reads run in parallel and fail independently. That is the point of the
 * per-section nulls: a ledger that will not answer costs the page its money
 * panel and nothing else, and a host still learns how many requests they left
 * unanswered. A single try/catch around the lot would have turned one slow
 * table into an empty screen.
 */
export async function readAgentAnalytics(context: AgentContext): Promise<AgentAnalytics | null> {
  if (context.state !== "agent") return null;

  const supabase = context.supabase as Db;
  const agentId = context.agent.id;

  const [earnings, bookings, answerHours, listings, settledByListing, ratings] = await Promise.all([
    readAgentEarnings(context).catch(() => null),
    readBookings(supabase, agentId),
    readAnswerHours(supabase, agentId, context.user.id),
    readListings(supabase, agentId),
    readSettledByListing(supabase, agentId),
    readRatings(supabase, agentId),
  ]);

  /* The calendar read needs the listing rows, so it is the one thing that
     cannot join the parallel batch above. It is a single indexed range scan
     over at most thirty nights per published listing, which is cheap enough
     that a second round trip is the right trade for not duplicating the
     listings query. */
  const calendar = listings === null ? null : await readCalendarPressure(supabase, listings);

  const requests =
    bookings === null
      ? null
      : summariseRequests(
          bookings.map((row) => ({ status: row.status, createdAt: row.created_at })),
          /* Passed through as null rather than defaulted to an empty array. An
             unreadable state-event history is not the same fact as a host who
             has answered nothing, and only the caller of this function still
             knows which of the two happened. */
          answerHours,
          Date.now(),
        );

  const performance =
    listings === null
      ? null
      : buildListingPerformance(listings, bookings, settledByListing, ratings?.byListing ?? null);

  const money = earnings ?? UNREADABLE_EARNINGS;

  return {
    earnings: money,
    trend: trendFor(money),
    requests,
    listings: performance,
    calendar,
    reviews: ratings
      ? {
          count: ratings.overall.count,
          average:
            ratings.overall.count === 0 ? null : ratings.overall.total / ratings.overall.count,
        }
      : null,
  };
}

/**
 * One row per listing, ordered by what the host most wants at the top.
 *
 * Settled money first, then confirmed stays, then requests received, then
 * title. Money leads because it is the only column that is unarguable, and the
 * tie-breakers walk backwards down the funnel so a brand new listing with
 * nothing on it lands at the bottom rather than in a random place.
 *
 * A source that failed to read contributes zero here rather than removing the
 * listing, and the screen states which panels are unavailable separately. A
 * listing missing from the table entirely would be the worse failure: a host
 * would conclude they had deleted it.
 */
function buildListingPerformance(
  listings: ListingRow[],
  bookings: BookingAggregateRow[] | null,
  settled: Map<string, number> | null,
  ratings: Map<string, RatingTally> | null,
): ListingPerformance[] {
  const requests = new Map<string, number>();
  const confirmed = new Map<string, number>();
  const nights = new Map<string, number>();

  for (const booking of bookings ?? []) {
    requests.set(booking.listing_id, (requests.get(booking.listing_id) ?? 0) + 1);
    if (booking.status === "CONFIRMED") {
      confirmed.set(booking.listing_id, (confirmed.get(booking.listing_id) ?? 0) + 1);
      nights.set(booking.listing_id, (nights.get(booking.listing_id) ?? 0) + booking.nights);
    }
  }

  return listings
    .map((listing) => {
      const tally = ratings?.get(listing.id) ?? null;
      return {
        listingId: listing.id,
        title: listing.title,
        status: listing.status,
        requests: requests.get(listing.id) ?? 0,
        confirmed: confirmed.get(listing.id) ?? 0,
        nightsSold: nights.get(listing.id) ?? 0,
        settledShareMinor: settled?.get(listing.id) ?? 0,
        reviews: tally?.count ?? 0,
        rating: tally && tally.count > 0 ? tally.total / tally.count : null,
      };
    })
    .sort(
      (a, b) =>
        b.settledShareMinor - a.settledShareMinor ||
        b.confirmed - a.confirmed ||
        b.requests - a.requests ||
        a.title.localeCompare(b.title),
    );
}

/**
 * What the money panel shows when the ledger itself could not be read.
 *
 * `readable: false` is the flag the earnings workspace already uses to say
 * "no figure rather than a wrong one", and the analytics screen honours the
 * same flag rather than inventing a second convention for the same fact.
 */
const UNREADABLE_EARNINGS: AgentEarnings = {
  months: [],
  totalGrossMinor: 0,
  totalAgentShareMinor: 0,
  totalNetMinor: 0,
  settledStays: 0,
  currentMonth: null,
  readable: false,
};

/**
 * The trend, ready to draw, for whatever the ledger actually holds.
 *
 * Kept beside the read rather than in the component so that the rule about
 * which months may appear lives with the rest of the honesty rules in this
 * file, where the next person changing it will see why.
 */
export function trendFor(earnings: AgentEarnings): SettledPoint[] {
  if (!earnings.readable) return [];
  return settledSeries(earnings.months, lagosMonthKey());
}
