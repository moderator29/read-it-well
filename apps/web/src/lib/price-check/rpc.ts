import "server-only";

import type { createAdminClient } from "../supabase/admin";
import type { createClient } from "../supabase/server";

/**
 * ONE TYPED DOOR TO THE PRICE CHECK RPCs, AND WHY IT IS NOT A REGENERATION.
 *
 * `lib/supabase/database.types.ts` is generated from the live schema and lists
 * every function by name, so `supabase.rpc("estimate_value", ...)` does not
 * typecheck until that file is regenerated. Regenerating it is the obvious
 * move and it is the wrong one this week.
 *
 * THE FILE IS A SHARED ARTEFACT AND SIX WRITERS ARE IN THIS TREE. Regenerating
 * it pulls in every table, column, enum and function that every other worker
 * has applied to the live project today - the supply role axis, the mandates,
 * the escrow states - into a commit whose subject is Price Check. That is a
 * merge conflict on a generated file, which is the worst kind, and it is a
 * diff no reviewer can read. Worse, it would make this commit LOOK like it
 * changed the shape of tables it never touched.
 *
 * So the cast is local, it is narrow, and it is here rather than sprinkled
 * through `queries.ts`: eight function names, their argument shapes written
 * out, and one `as unknown as` in one place with this note beside it. When the
 * generated file is next refreshed by whoever owns it, this module's bodies
 * can be deleted and `queries.ts` need not change, because it already calls
 * these names with these arguments.
 *
 * THE ARGUMENT SHAPES BELOW ARE THE MIGRATION'S, checked against
 * `supabase/migrations/20260922222221_price_check_reports_what_places_are_asking.sql`.
 * They are the only thing this file asserts that a compiler cannot, which is
 * why they are written out in full rather than left as `Record<string, unknown>`:
 * a mistyped parameter name is a silent null default in PostgREST, and a null
 * default in this engine is a wider radius or a missing bedroom filter.
 */

/*
 * Both clients, because the reads go through the caller's own RLS-bound client
 * and the two writes go through the service-role one. The writers are BORN
 * LOCKED per rule 21 - `record_price_check_event` and
 * `create_price_check_share` revoke EXECUTE from anon and authenticated in
 * their own migrations - so a browser cannot reach them and the server action
 * holding the service-role client is the only door.
 */
type Db =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

export type PriceCheckRpcArgs = {
  estimate_value: {
    p_lat: number;
    p_lng: number;
    p_property_type: string;
    p_intent: string;
    p_bedrooms: number | null;
    p_size_sqm: number | null;
    p_exclude_id: string | null;
  };
  comparable_listings: {
    p_lat: number;
    p_lng: number;
    p_property_type: string;
    p_intent: string;
    p_bedrooms: number | null;
    p_radius_m: number;
    p_max_age_days: number;
    p_exclude_id: string | null;
    p_limit: number;
  };
  comparable_supply_near: {
    p_lat: number;
    p_lng: number;
    p_property_type: string;
    p_intent: string;
    p_bedrooms: number | null;
    p_radius_m: number;
  };
  area_asking_summary: {
    p_state_code: string;
    p_city: string | null;
    p_area: string | null;
    p_property_type: string | null;
    p_intent: string;
    p_bedrooms: number | null;
    p_max_age_days: number;
  };
  area_supply_census: {
    p_state_code: string;
    p_city: string | null;
    p_area: string | null;
    p_intent: string;
  };
  area_utility_facts: {
    p_state_code: string;
    p_city: string | null;
    p_area: string | null;
  };
  area_suggestions: {
    p_state_code: string;
    p_query: string | null;
    p_limit: number;
  };
  record_price_check_event: {
    p_check_id: string;
    p_stage: string;
    p_user_id: string | null;
    p_entry_point: string | null;
    p_state_code: string | null;
    p_lga_code: string | null;
    p_geohash5: string | null;
    p_property_type: string | null;
    p_listing_intent: string | null;
    p_bedrooms: number | null;
    p_size_stated: boolean | null;
    p_outcome: string | null;
    p_refusal_code: string | null;
    p_comparable_count: number | null;
    p_radius_m: number | null;
    p_dispersion: number | null;
    p_confidence: string | null;
    p_intent_chosen: string | null;
    p_listing_id: string | null;
  };
  create_price_check_share: {
    p_scope: string;
    p_state_code: string;
    p_lga_code: string | null;
    p_area: string | null;
    p_property_type: string | null;
    p_listing_intent: string;
    p_bedrooms: number | null;
    p_low_minor: number;
    p_mid_minor: number;
    p_high_minor: number;
    p_listing_count: number;
    p_oldest_at: string | null;
    p_newest_at: string | null;
    p_created_by: string | null;
  };
};

type LooseRpc = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Calls one of the Price Check functions with its own argument type.
 *
 * `data` comes back as `unknown` deliberately. The generated types would give
 * a row shape and this cast cannot, so pretending otherwise would be a
 * confident-looking lie: `queries.ts` narrows every field by hand, and every
 * numeric field goes through `asNumber` because PostgREST sends bigint as a
 * string and a kobo figure read as a string is a kobo figure printed as NaN.
 */
export async function priceCheckRpc<Name extends keyof PriceCheckRpcArgs>(
  supabase: Db,
  name: Name,
  args: PriceCheckRpcArgs[Name],
): Promise<{ data: unknown; error: unknown }> {
  return (supabase as unknown as LooseRpc).rpc(name, args as Record<string, unknown>);
}

/**
 * The one table this feature writes through the CALLER's own client, and the
 * same narrow cast for the same reason as the RPC door above.
 *
 * `price_check_watches` carries `price_check_watches_own`: a person may insert,
 * read and delete their own rows and nobody else's, decided by RLS rather than
 * by this function. The point has already been coarsened by the action; the
 * column type is `numeric(9,3)`, so a caller that sends full precision by
 * another route is stored coarse rather than reviewed by a person.
 *
 * NOTE WHAT THE ROW TYPE HAS NO FIELD FOR: an address, a free text hint, or a
 * point at full precision. The absence is the enforcement.
 */
export type PriceCheckWatchRow = {
  user_id: string;
  lat: number;
  lng: number;
  state_code: string;
  lga_code: string | null;
  area: string | null;
  property_type: string;
  listing_intent: string;
  bedrooms: number | null;
};

type LooseInsert = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { code?: string } | null }>;
  };
};

export async function insertPriceCheckWatch(
  supabase: Db,
  row: PriceCheckWatchRow,
): Promise<{ error: { code?: string } | null }> {
  return (supabase as unknown as LooseInsert)
    .from("price_check_watches")
    .insert(row as unknown as Record<string, unknown>);
}

/**
 * THE COLUMNS A SHARE CARD IS ALLOWED TO ASK FOR, WRITTEN OUT.
 *
 * `created_by` is not in this list and that is the whole point of the list.
 * `anon` and `authenticated` hold no grant on that column
 * (`20260923094710`), so asking for it would come back as an error rather than
 * as a leak - but a select that names its columns says what a card is in the
 * one place a reviewer will look, and it fails LOUDLY the day somebody widens
 * the grant again. A `select("*")` here would start returning the uuid of
 * whoever minted the card the moment the grant changed, and nothing would
 * report it.
 *
 * NOTE WHAT CANNOT BE IN THIS LIST: there is no address, latitude, longitude
 * or listing id column on `price_check_shares` to name.
 */
export const SHARE_SELECT =
  "id, scope, state_code, lga_code, area, property_type, listing_intent, bedrooms, low_minor, mid_minor, high_minor, listing_count, oldest_at, newest_at, created_at";

type LooseSelect = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
};

/**
 * One share card by id, through the CALLER's own client.
 *
 * The same narrow cast as the RPC door above and for the same reason:
 * `price_check_shares` is not in `lib/supabase/database.types.ts`, and
 * regenerating that file would pull every other worker's schema change into a
 * commit whose subject is a share button.
 *
 * Through the caller's own client rather than the service-role one, and
 * deliberately, even though the row is public. The service-role client
 * bypasses RLS and the column grants both, so a read through it would return
 * `created_by` and would keep working if the policy were ever tightened. A
 * read through the caller's client is exactly what a stranger following a link
 * gets, which is the thing being built.
 */
export async function selectPriceCheckShare(
  supabase: Db,
  id: string,
): Promise<{ data: unknown; error: unknown }> {
  return (supabase as unknown as LooseSelect)
    .from("price_check_shares")
    .select(SHARE_SELECT)
    .eq("id", id)
    .maybeSingle();
}
