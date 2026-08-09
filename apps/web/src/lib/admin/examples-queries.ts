import "server-only";

import type { AdminRead } from "./money-queries";
import { requireAdmin } from "./guard";

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
  "id, title, status, city, rent_amount_minor, sale_price_minor, created_at, demo_retire_after, agents ( display_name )";

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

export async function getExamplesConsole(): Promise<AdminRead<ExamplesConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  try {
    const { data, error } = await access.supabase
      .from("listings")
      .select(EXAMPLE_COLUMNS)
      .eq("is_demo", true)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) return UNAVAILABLE;

    const views: ExampleListingView[] = ((data ?? []) as unknown as ExampleRow[]).map((row) => ({
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
    const cities = new Set(live.map((view) => view.city).filter((city): city is string => !!city));

    const today = lagosToday();
    const dueDates = live
      .map((view) => view.retireAfter)
      .filter((date): date is string => !!date)
      .sort();

    return {
      state: "ok",
      data: {
        live,
        retired,
        totals: {
          total: views.length,
          liveCount: live.length,
          retiredCount: retired.length,
          cities: cities.size,
          overdueCount: live.filter((view) => isOverdue(view.retireAfter, today)).length,
          nextDueOn: dueDates[0] ?? null,
        },
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
