import "server-only";

import { Constants } from "../supabase/database.types";
import { SUMMARY_LIMIT, type AdminRead } from "./money-queries";
import { requireAdmin } from "./guard";
import {
  lagosDayEnd,
  lagosDayStart,
  orSafe,
  pageRange,
  pickStatus,
  takePage,
  type AdminQueueFilter,
} from "./queue-filter";

/**
 * The example listings, as a set.
 *
 * WHY THIS EXISTS. Forty-two seeded properties across four cities carry
 * `is_demo`, so the catalogue is not empty while the product fills up. Nothing
 * in the console knew they were there: `/admin/listings` is a review queue keyed
 * on status, so the examples sit inside it indistinguishable from real supply,
 * and the word "demo" appeared nowhere in the admin tree. The day real listings
 * arrive, somebody has to be able to see the seeded set as a set and take it
 * off the catalogue in one action. That is this screen's whole job.
 *
 * AUTHORISATION ON THE READ. This goes through the operator's own RLS-bound
 * client. `listings_admin_all` publishes every listing to
 * `private.has_role(auth.uid(), 'admin' | 'super_admin')` and nothing else here
 * repeats that policy; `listings_select_published` would show a signed-out
 * reader only the PUBLISHED ones, which is why a retired example disappears
 * from the catalogue the moment its status changes.
 *
 * Money is integer kobo. Nothing here divides by a hundred.
 */

const UNAVAILABLE = { state: "unavailable" } as const;

export type ExampleListingView = {
  id: string;
  title: string;
  status: string;
  city: string | null;
  listerName: string | null;
  /** Rent or sale price, whichever this listing carries, in kobo. */
  amountMinor: number | null;
  createdAt: string;
  /**
   * The day this example is due off the catalogue.
   *
   * A date rather than a timestamp, and NOT NULL on every example row: a CHECK
   * constraint ties it to `is_demo` in both directions, so an example without a
   * date cannot exist. Nothing in the read path enforces it, deliberately, or
   * the catalogue would empty itself overnight with the cause invisible.
   */
  retireAfter: string | null;
  /** True once it is off the catalogue. */
  retired: boolean;
};

export type ExamplesConsole = {
  live: ExampleListingView[];
  retired: ExampleListingView[];
  /** True when the narrowed read came back with a whole page, so there is more. */
  full: boolean;
  /** Over every seeded listing, never over the filtered page. */
  totals: {
    total: number;
    liveCount: number;
    retiredCount: number;
    cities: number;
    /** Live examples whose retirement date is already behind us. */
    overdueCount: number;
    /** The earliest date any live example is due to come down. */
    nextDueOn: string | null;
  };
};

const EXAMPLE_COLUMNS =
  "id, title, status, city, rent_amount_minor, sale_price_minor, created_at, demo_retire_after, agents!listings_agent_id_fkey( display_name )";

type ExampleRow = {
  id: string;
  title: string | null;
  status: string;
  city: string | null;
  rent_amount_minor: number | null;
  sale_price_minor: number | null;
  created_at: string;
  demo_retire_after: string | null;
  agents: { display_name: string | null } | { display_name: string | null }[] | null;
};

/**
 * Is this example past the day it was supposed to come down.
 *
 * Compared as calendar dates in Lagos rather than as instants. The column is a
 * DATE, and parsing a bare date gives UTC midnight, which is an hour behind
 * Lagos: an example due on the 7th would read as overdue from 11pm on the 6th
 * for anybody sitting in Nigeria. Comparing the ISO day strings avoids the
 * question entirely and is exactly as precise as the column is.
 */
export function isOverdue(retireAfter: string | null, today: string): boolean {
  if (!retireAfter) return false;
  return retireAfter < today;
}

/** Today in Lagos, as YYYY-MM-DD, for comparison against a DATE column. */
export function lagosToday(now: Date = new Date()): string {
  // en-CA renders as YYYY-MM-DD, which is the format the column already uses.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(now);
}

/** PostgREST hands an embedded one-to-one back as an object or a one-row array. */
function listerName(agents: ExampleRow["agents"]): string | null {
  if (!agents) return null;
  const row = Array.isArray(agents) ? agents[0] : agents;
  return row?.display_name ?? null;
}

function amountOf(row: ExampleRow): number | null {
  const rent = row.rent_amount_minor;
  if (typeof rent === "number" && Number.isSafeInteger(rent) && rent > 0) return rent;
  const sale = row.sale_price_minor;
  if (typeof sale === "number" && Number.isSafeInteger(sale) && sale > 0) return sale;
  return null;
}

/**
 * The seeded catalogue, narrowed by the console's shared queue frame.
 *
 * ---------------------------------------------------------------------------
 * THE TILES ARE READ SEPARATELY FROM THE LIST, for the same reason they are on
 * the escrow desk. "On the catalogue" and "past their date" are statements
 * about the whole seeded set and they are the numbers this screen exists to
 * drive down. Computing them from the filtered page would redraw them as
 * "…among the ones you are looking at" the moment somebody typed a city, with
 * nothing saying the number had changed meaning, and an operator would read a
 * cleared queue that was not cleared.
 *
 * The second read is three columns over `is_demo` rows and nothing else, so it
 * costs a round trip and no meaningful bytes. It also lifts a quieter fault: the
 * single read was capped at 300, so every figure on this screen was already
 * silently wrong above 300 examples. It is a higher ceiling and not an absent
 * one - `SUMMARY_LIMIT` rows - and above that the tiles are a floor. A seeded
 * catalogue of two thousand would be its own problem.
 */
export async function getExamplesConsole(
  filter?: AdminQueueFilter,
): Promise<AdminRead<ExamplesConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  const term = (filter?.q ?? "").replace(/[,()*"\\]/g, "").trim();
  const status = pickStatus(Constants.public.Enums.listing_status, filter?.status);
  const page = pageRange(filter);

  try {
    let select = access.supabase.from("listings").select(EXAMPLE_COLUMNS).eq("is_demo", true);
    if (term.length > 0) select = select.or(`title.ilike.${orSafe(`%${term}%`)},city.ilike.${orSafe(`%${term}%`)}`);
    if (status) select = select.eq("status", status);
    if (filter?.from) select = select.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) select = select.lte("created_at", lagosDayEnd(filter.to));

    const [listed, everything] = await Promise.all([
      select.order("created_at", { ascending: false }).range(page.from, page.to),
      access.supabase
        .from("listings")
        .select("status, city, demo_retire_after")
        .eq("is_demo", true)
        .limit(SUMMARY_LIMIT),
    ]);
    const { data: paged, error } = listed;
    if (error || everything.error) return UNAVAILABLE;
    const { rows: data, full } = takePage(paged ?? []);

    const views: ExampleListingView[] = (data as unknown as ExampleRow[]).map((row) => ({
      id: row.id,
      title: row.title ?? "Untitled example",
      status: row.status,
      city: row.city,
      listerName: listerName(row.agents),
      amountMinor: amountOf(row),
      createdAt: row.created_at,
      retireAfter: row.demo_retire_after,
      /* SUSPENDED is what retiring writes, and it is the only status that takes
         a listing off the catalogue without deleting the row. */
      retired: row.status === "SUSPENDED",
    }));

    const live = views.filter((view) => !view.retired);
    const retired = views.filter((view) => view.retired);

    /* The tiles, over every seeded listing rather than over the page. */
    const today = lagosToday();
    const all = everything.data ?? [];
    const allLive = all.filter((row) => row.status !== "SUSPENDED");
    const cities = new Set(allLive.map((row) => row.city).filter((city): city is string => !!city));
    const dueDates = allLive
      .map((row) => row.demo_retire_after)
      .filter((date): date is string => !!date)
      .sort();

    return {
      state: "ok",
      data: {
        live,
        retired,
        full,
        totals: {
          total: all.length,
          liveCount: allLive.length,
          retiredCount: all.length - allLive.length,
          cities: cities.size,
          overdueCount: allLive.filter((row) => isOverdue(row.demo_retire_after, today)).length,
          nextDueOn: dueDates[0] ?? null,
        },
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
