import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * V-57. The publish gate's question: are this stay's arrival charges declared?
 * Asked by the review desk before publishing a nightly listing or a property.
 * A listing that is not a nightly stay needs no declaration and answers true.
 * A failed read answers false: an unproven declaration is not a declaration.
 */
export const ARRIVAL_DECLARATION_NEEDED =
  "The host has not declared the charges at the door (all five, an amount or none), so this stay cannot be published yet.";

export async function arrivalChargesDeclared(
  client: unknown,
  target: { listingId?: string; accommodationId?: string },
): Promise<boolean> {
  const db = client as SupabaseClient;
  try {
    if (target.listingId) {
      const { data: listing, error } = await db.from("listings").select("rate_period").eq("id", target.listingId).maybeSingle();
      if (error) return false;
      if (!listing || (listing as { rate_period: string | null }).rate_period !== "night") return true;
    }
    const column = target.listingId ? "listing_id" : "accommodation_id";
    const id = target.listingId ?? target.accommodationId;
    if (!id) return false;
    const { data, error } = await db.from("arrival_charge_declarations").select("id").eq(column, id).limit(1);
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
