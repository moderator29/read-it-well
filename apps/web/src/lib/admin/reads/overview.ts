import "server-only";

import type {
  CollectedRange,
  CollectedSeries,
  ConsolePulse,
  ListingsByRole,
  SupplyByType,
  SupplyKind,
} from "./shapes";
import {
  DAY_MS,
  UNAVAILABLE,
  adminReader,
  allCounts,
  bucketSum,
  exactCount,
  lagosDay,
  lagosDayEndIso,
  lagosDayStartIso,
  lagosMonth,
  lagosMonthStartIso,
  lastDays,
  lastMonths,
  lastWeeks,
  readAll,
  QA_NOT_IN,
  type AdminReader,
  type Read,
} from "./shared";

/**
 * THE OVERVIEW'S READS (5EAA44CB): the pulse strip and cards, money over
 * time, supply by type and new listings by lister role.
 *
 * EXAMPLES ARE NEVER SUPPLY. Every listing read here filters
 * `is_demo = false`: the 64 example listings that show the product before
 * real supply arrives are counted on the Examples desk and nowhere on the
 * overview, so an operator never reads seeded stock as a market.
 *
 * "NAIRA TRANSACTED" IS MONEY COLLECTED, defined once here: successful
 * charges (`transactions.status = 'SUCCESSFUL'`) plus completed wallet
 * top-ups (`wallet_entries.kind = 'deposit'`, `status = 'COMPLETED'`). Money
 * moving inside the platform (a wallet paying an escrow, a release, a
 * transfer) is not counted again, so a naira is counted once on its way in.
 */

/** Money collected, as dated amounts, from both doors, for a window. */
async function collectedRows(
  db: AdminReader,
  fromIso: string,
): Promise<{ key: string; amount: number; at: string }[] | null> {
  const [charges] = await Promise.all([
    readAll<{ created_at: string; amount_minor: number }>((from, to) =>
      db
        .from("transactions")
        .select("created_at, amount_minor")
        .eq("status", "SUCCESSFUL")
        .gte("created_at", fromIso)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);
  if (!charges) return null;
  return [...charges].map((row) => ({
    key: lagosDay(row.created_at),
    amount: row.amount_minor,
    at: row.created_at,
  }));
}

/** The pure half of the pulse: fourteen days of rows into the strip and cards. */
export function assemblePulse(input: {
  days: readonly string[];
  liveNow: number;
  liveWeekAgo: number;
  publishedAt: readonly string[];
  signups: readonly string[];
  submitted: readonly string[];
  collected: readonly { key: string; amount: number }[];
  /** Every account, the QA accounts left out; absent in older callers. */
  people?: number;
}): ConsolePulse {
  const { days } = input;
  const count = (stamps: readonly string[]) =>
    bucketSum(
      stamps.map((at) => ({ key: lagosDay(at), amount: 1 })),
      days,
    );
  const signups = count(input.signups);
  const submitted = count(input.submitted);
  const collected = bucketSum(input.collected, days);
  const publishedDays = input.publishedAt.map((at) => lagosDay(at)).sort();
  const liveAtClose = days.map((day) => publishedDays.filter((d) => d <= day).length);
  const sum = (values: number[], from: number, to: number) => values.slice(from, to).reduce((a, b) => a + b, 0);
  const last = days.length - 1;
  return {
    listingsLive: input.liveNow,
    listingsLiveWeekAgo: input.liveWeekAgo,
    peopleTotal: input.people ?? null,
    signupsToday: signups[last] ?? 0,
    signupsYesterday: signups[last - 1] ?? 0,
    collectedTodayMinor: collected[last] ?? 0,
    collectedYesterdayMinor: collected[last - 1] ?? 0,
    collectedWeekMinor: sum(collected, days.length - 7, days.length),
    collectedPrevWeekMinor: sum(collected, days.length - 14, days.length - 7),
    newSupplyWeek: sum(submitted, days.length - 7, days.length),
    newSupplyPrevWeek: sum(submitted, days.length - 14, days.length - 7),
    daily: days.map((day, i) => ({
      day,
      signups: signups[i] ?? 0,
      collectedMinor: collected[i] ?? 0,
      submitted: submitted[i] ?? 0,
      liveAtClose: liveAtClose[i] ?? 0,
    })),
  };
}

/**
 * The strip and the four cards, over fourteen Lagos days.
 *
 * "Live a week ago" is the listings live now that went live on or before
 * that day (`published_at`). A listing withdrawn since is not in it, because
 * nothing records when a listing stopped being live; that is the one
 * approximation on this screen and the card's caption says what it compares.
 */
export async function getConsolePulse(now: number): Promise<Read<ConsolePulse>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  const days = lastDays(14, now);
  const fromIso = lagosDayStartIso(days[0]!);
  const weekAgoIso = new Date(Date.parse(lagosDayEndIso(days[days.length - 1]!)) - 7 * DAY_MS).toISOString();
  try {
    const live = () =>
      db.from("listings").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED").eq("is_demo", false);
    const [liveNow, liveWeekAgo, published, signups, submitted, collected, people] = await Promise.all([
      exactCount(live()),
      exactCount(live().lte("published_at", weekAgoIso)),
      readAll<{ published_at: string | null }>((from, to) =>
        db
          .from("listings")
          .select("published_at")
          .eq("status", "PUBLISHED")
          .eq("is_demo", false)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      readAll<{ created_at: string }>((from, to) =>
        db
          .from("profiles")
          .select("created_at")
          .not("id", "in", QA_NOT_IN)
          .gte("created_at", fromIso)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
      ),
      readAll<{ submitted_at: string | null }>((from, to) =>
        db
          .from("listings")
          .select("submitted_at")
          .eq("is_demo", false)
          .gte("submitted_at", fromIso)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      collectedRows(db, fromIso),
      // Every account there is, the QA accounts left out (founder, 23 September).
      exactCount(db.from("profiles").select("id", { count: "exact", head: true }).not("id", "in", QA_NOT_IN)),
    ]);
    if (liveNow === null || liveWeekAgo === null || !published || !signups || !submitted || !collected || people === null) {
      return UNAVAILABLE;
    }
    return {
      state: "ok",
      data: assemblePulse({
        days,
        liveNow,
        liveWeekAgo,
        publishedAt: published.map((r) => r.published_at).filter((v): v is string => Boolean(v)),
        signups: signups.map((r) => r.created_at),
        submitted: submitted.map((r) => r.submitted_at).filter((v): v is string => Boolean(v)),
        collected,
        people,
      }),
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** The buckets a range is drawn in: days, weeks or months, oldest first. */
export function rangeBuckets(range: CollectedRange, now: number): { keys: string[]; fromIso: string; monthly: boolean } {
  if (range === "12m") {
    const months = lastMonths(12, now);
    return { keys: months.map((m) => `${m}-01`), fromIso: lagosMonthStartIso(months[0]!), monthly: true };
  }
  const keys = range === "90d" ? lastWeeks(13, now) : lastDays(30, now);
  return { keys, fromIso: lagosDayStartIso(keys[0]!), monthly: false };
}

/** "Naira transacted over time": money collected per day, week or month. */
export async function getCollectedSeries(range: CollectedRange, now: number): Promise<Read<CollectedSeries>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const { keys, fromIso, monthly } = rangeBuckets(range, now);
    const rows = await collectedRows(db, fromIso);
    if (!rows) return UNAVAILABLE;
    const amounts = bucketSum(rows, keys);
    const counts = bucketSum(
      rows.map((r) => ({ key: r.key, amount: 1 })),
      keys,
    );
    return {
      state: "ok",
      data: {
        range,
        buckets: keys.map((key, i) => ({
          start: monthly ? key.slice(0, 7) : key,
          amountMinor: amounts[i] ?? 0,
          count: counts[i] ?? 0,
        })),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** The kinds a listing is sorted into, in the order a lister would name them. */
const TYPED: readonly { kind: SupplyKind; type: Database_PropertyType }[] = [
  { kind: "land", type: "land" },
  { kind: "hotels", type: "hotel" },
  { kind: "shortlets", type: "shortlet" },
  { kind: "restaurants", type: "restaurant" },
];
type Database_PropertyType = "land" | "hotel" | "shortlet" | "restaurant";
const TYPED_LIST = `(${TYPED.map((t) => t.type).join(",")})`;

/**
 * Supply by type: live listings (examples excluded) in six kinds that do not
 * overlap. Land, hotels, shortlets and restaurants by property type; every
 * other listing is Buy when it is for sale and Rent otherwise. Each is an
 * exact count; the total is its own count, and a test holds that the six add
 * up to it.
 */
export async function getSupplyByType(): Promise<Read<SupplyByType>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  const base = () =>
    db.from("listings").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED").eq("is_demo", false);
  try {
    const counts = await allCounts({
      total: base(),
      land: base().eq("property_type", "land"),
      hotels: base().eq("property_type", "hotel"),
      shortlets: base().eq("property_type", "shortlet"),
      restaurants: base().eq("property_type", "restaurant"),
      buy: base().eq("listing_intent", "sale").not("property_type", "in", TYPED_LIST),
      rent: base().or("listing_intent.is.null,listing_intent.neq.sale").not("property_type", "in", TYPED_LIST),
    });
    if (!counts) return UNAVAILABLE;
    const kinds: SupplyKind[] = ["rent", "buy", "land", "hotels", "shortlets", "restaurants"];
    return {
      state: "ok",
      data: { total: counts.total, rows: kinds.map((kind) => ({ kind, count: counts[kind] })) },
    };
  } catch {
    return UNAVAILABLE;
  }
}

export type ListerRole = "owner" | "agent" | "firm";

/**
 * Who listed a listing. The application's `supply_role` when the lister came
 * through the owner, agent or firm door; before those doors existed, an
 * agent of type `business` is a firm and any other is an agent.
 */
export function listerRole(supplyRole: string | null | undefined, agentType: string | null | undefined): ListerRole {
  if (supplyRole === "owner" || supplyRole === "agent" || supplyRole === "firm") return supplyRole;
  return agentType === "business" ? "firm" : "agent";
}

export function assembleByRole(
  months: readonly string[],
  listings: readonly { created_at: string; agent_id: string | null }[],
  roleOfAgent: ReadonlyMap<string, ListerRole>,
): ListingsByRole {
  const rows = months.map((month) => ({ month, owner: 0, agent: 0, firm: 0 }));
  const index = new Map(months.map((m, i) => [m, i]));
  for (const listing of listings) {
    const slot = index.get(lagosMonth(listing.created_at));
    if (slot === undefined) continue;
    const role = (listing.agent_id && roleOfAgent.get(listing.agent_id)) || "agent";
    rows[slot]![role] += 1;
  }
  return { months: rows };
}

/** New listings per month for the last `months` months, by lister role, examples excluded. */
export async function getNewListingsByRole(now: number, months = 12): Promise<Read<ListingsByRole>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const keys = lastMonths(months, now);
    const fromIso = lagosMonthStartIso(keys[0]!);
    const listings = await readAll<{ created_at: string; agent_id: string | null }>((from, to) =>
      db
        .from("listings")
        .select("created_at, agent_id")
        .eq("is_demo", false)
        .gte("created_at", fromIso)
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (!listings) return UNAVAILABLE;
    const agentIds = [...new Set(listings.map((l) => l.agent_id).filter((id): id is string => Boolean(id)))];
    const roles = new Map<string, ListerRole>();
    for (let i = 0; i < agentIds.length; i += 200) {
      const chunk = agentIds.slice(i, i + 200);
      const { data, error } = await db
        .from("agents")
        .select("id, type, agent_applications ( supply_role )")
        .in("id", chunk);
      if (error || !data) return UNAVAILABLE;
      for (const agent of data) {
        const application = Array.isArray(agent.agent_applications)
          ? agent.agent_applications[0]
          : agent.agent_applications;
        const supplyRole = (application as { supply_role?: string | null } | null)?.supply_role ?? null;
        roles.set(agent.id, listerRole(supplyRole, agent.type));
      }
    }
    return { state: "ok", data: assembleByRole(keys, listings, roles) };
  } catch {
    return UNAVAILABLE;
  }
}
