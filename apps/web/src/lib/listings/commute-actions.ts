"use server";

import { resolveSession } from "../actions/session";
import { COMMUTE_RESULTS, type CommuteResult } from "./commute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


/**
 * A member's one-tap "How long did it take you?" (V-43). The window, the
 * membership, the 14 days and the one-a-day rule are the database's
 * (`report_commute`); this checks the shape and says back its word.
 */
export async function reportCommute(areaId: string, anchorId: string, minutes: number): Promise<CommuteResult> {
  if (!UUID.test(areaId) || !UUID.test(anchorId)) return "bad-anchor";
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 300) return "bad-minutes";
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return "signed-out";
    const { data, error } = await (
      session.supabase as unknown as { rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }> }
    ).rpc("report_commute", { p_area: areaId, p_anchor: anchorId, p_minutes: minutes });
    if (error) return "failed";
    return typeof data === "string" && (COMMUTE_RESULTS as readonly string[]).includes(data) ? (data as CommuteResult) : "failed";
  } catch {
    return "failed";
  }
}
