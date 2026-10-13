import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../supabase/admin";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";
import { shapeWeightRows, type WeightRegisterRow, type WeightRow } from "./weight-withheld-shape";

/**
 * V-58: THE WITHHELD-WEIGHT REGISTER, READ FOR THE CONSOLE.
 *
 * `public.weight_withheld_reasons()` is the staff read of the register: the
 * table itself is closed to every browser-reachable role, so a public list of
 * withheld review ids can never exist. The function decides on `auth.uid()`
 * (admin or super admin), so it is asked as the operator, on their own client.
 *
 * The register carries ids and reasons only. To make a row readable (which
 * listing, what rating) the reviews and listings are read on the service role
 * AFTER the same admin check has passed, and only the fields a row needs are
 * taken: never the body of a review, never the author.
 */
export type WeightRead =
  | { state: "ok"; rows: WeightRow[]; total: number }
  | { state: "forbidden" }
  | { state: "unavailable" };

type Rpc = { rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }> };

export async function readWeightWithheld(): Promise<WeightRead> {
  const access = await requireAdmin();
  if (access.state !== "admin" || access.isStaff) return { state: "forbidden" };

  let register: WeightRegisterRow[];
  try {
    const { data, error } = await (access.userClient as unknown as Rpc).rpc("weight_withheld_reasons");
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    register = data as WeightRegisterRow[];
  } catch {
    return { state: "unavailable" };
  }

  const reviewIds = register.filter((r) => r.kind === "review").map((r) => r.subject_id);
  const reportIds = register.filter((r) => r.kind === "report").map((r) => r.subject_id);
  const reviews = new Map<string, { listingId: string | null; rating: number | null }>();
  const reports = new Map<string, { target: string | null }>();
  const listings = new Map<string, string>();

  if (reviewIds.length > 0 || reportIds.length > 0) {
    try {
      const db: SupabaseClient<Database> = createAdminClient();
      if (reviewIds.length > 0) {
        const { data } = await db.from("reviews").select("id, listing_id, rating").in("id", reviewIds);
        for (const r of data ?? []) reviews.set(r.id, { listingId: r.listing_id, rating: r.rating });
        const listingIds = [...new Set([...reviews.values()].map((r) => r.listingId).filter((id): id is string => !!id))];
        if (listingIds.length > 0) {
          const { data: ls } = await db.from("listings").select("id, title").in("id", listingIds);
          for (const l of ls ?? []) listings.set(l.id, l.title);
        }
      }
      if (reportIds.length > 0) {
        const { data } = await db.from("reports").select("id, target_type").in("id", reportIds);
        for (const r of data ?? []) reports.set(r.id, { target: r.target_type });
      }
    } catch {
      /* The register still reads without its enrichment: a row then says the
         record is no longer readable rather than inventing a listing. */
    }
  }

  return { state: "ok", rows: shapeWeightRows(register, { reviews, reports, listings }), total: register.length };
}
