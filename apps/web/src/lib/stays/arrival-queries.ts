import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { readArrivalCharges, type ArrivalCharges } from "./arrival-charges";

/**
 * V-57. The declaration for a listing or an accommodation. Undefined when the
 * read failed; null when nothing is declared. Public for a published stay,
 * owner-only before.
 */
export async function readDeclaration(target: { listingId?: string; accommodationId?: string }): Promise<ArrivalCharges | null | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const column = target.listingId ? "listing_id" : "accommodation_id";
  const id = target.listingId ?? target.accommodationId;
  if (!id) return null;
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase.from("arrival_charge_declarations").select("charges").eq(column, id).maybeSingle();
    if (error) return undefined;
    return data ? readArrivalCharges((data as { charges: unknown }).charges) : null;
  } catch {
    return undefined;
  }
}
