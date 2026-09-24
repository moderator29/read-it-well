import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { readPaidRow, type PaidRow } from "./paid-prices";

/**
 * V-39. What people actually paid in an area, through the caller's own
 * session: `area_paid_summary` is granted to signed-in members and returns
 * aggregates only, for one named area over a fixed year. Null means the read failed (or the function is not there
 * yet), which the panel says in words; an empty array means the crowd floor
 * was not met, which is today's honest answer everywhere.
 */
export async function areaPaid(stateCode: string, area: string): Promise<PaidRow[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const loose = session.supabase as unknown as SupabaseClient;
    const { data, error } = await loose.rpc("area_paid_summary", {
      p_state_code: stateCode,
      p_area: area,
    });
    if (error || !Array.isArray(data)) return null;
    return data.map(readPaidRow).filter((row): row is PaidRow => row !== null);
  } catch {
    return null;
  }
}
