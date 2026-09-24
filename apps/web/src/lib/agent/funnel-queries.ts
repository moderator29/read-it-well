import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { fixFor, funnelFrom, type Fix, type Funnel, type FunnelRpcRow } from "./funnel";

/**
 * The funnel for each of an agent's published listings (V-73), read through
 * `public.listing_funnel`, which answers only the listing's own lister or
 * staff and never returns a person.
 *
 * `unavailable` means the function is not there yet (the migration has not
 * been applied) or the read failed; the page then says views are not counted,
 * exactly as it did before, rather than printing zeros that would read as
 * "nobody looked". Ten listings at most, the ones touched most recently, so
 * the page stays one screen of reads.
 */
export type ListingFunnelView = {
  id: string;
  title: string;
  funnel: Funnel;
  fix: Fix | null;
};

export type FunnelBoard =
  | { state: "unavailable" }
  | { state: "ok"; listings: ListingFunnelView[] };

const MAX_LISTINGS = 10;

type Loose = SupabaseClient<Database>;

export async function readFunnelBoard(supabase: Loose, agentId: string): Promise<FunnelBoard> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, rent_period, total_move_in_cost_minor, listing_photos(id)")
      .eq("agent_id", agentId)
      .eq("status", "PUBLISHED")
      .order("updated_at", { ascending: false })
      .limit(MAX_LISTINGS);
    if (error || !data) return { state: "unavailable" };

    const rows = data as unknown as {
      id: string;
      title: string;
      rent_period: string | null;
      total_move_in_cost_minor: number | null;
      listing_photos: { id: string }[] | null;
    }[];

    const listings: ListingFunnelView[] = [];
    for (const row of rows) {
      const { data: raw, error: rpcError } = await (
        supabase as unknown as {
          rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }>;
        }
      ).rpc("listing_funnel", { p_listing: row.id, p_days: 7 });
      if (rpcError) return { state: "unavailable" };
      const funnel = funnelFrom(raw as FunnelRpcRow[]);
      if (!funnel) continue;
      listings.push({
        id: row.id,
        title: row.title,
        funnel,
        fix: fixFor(funnel, {
          photoCount: row.listing_photos?.length ?? 0,
          moveInStated: row.rent_period === null || (row.total_move_in_cost_minor ?? 0) > 0,
          published: true,
        }),
      });
    }
    return { state: "ok", listings };
  } catch {
    return { state: "unavailable" };
  }
}
