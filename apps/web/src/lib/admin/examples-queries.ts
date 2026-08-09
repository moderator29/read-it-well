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
  /** True once it is off the catalogue. */
  retired: boolean;
};

export type ExamplesConsole = {
  live: ExampleListingView[];
  retired: ExampleListingView[];
  totals: { total: number; liveCount: number; retiredCount: number; cities: number };
};

const EXAMPLE_COLUMNS =
  "id, title, status, city, rent_amount_minor, sale_price_minor, created_at, agents ( display_name )";

type ExampleRow = {
  id: string;
  title: string | null;
  status: string;
  city: string | null;
  rent_amount_minor: number | null;
  sale_price_minor: number | null;
  created_at: string;
  agents: { display_name: string | null } | { display_name: string | null }[] | null;
};

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
      /* SUSPENDED is what retiring writes, and it is the only status that takes
         a listing off the catalogue without deleting the row. */
      retired: row.status === "SUSPENDED",
    }));

    const live = views.filter((view) => !view.retired);
    const retired = views.filter((view) => view.retired);
    const cities = new Set(views.map((view) => view.city).filter((city): city is string => !!city));

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
        },
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
