import "server-only";

import { requireAdmin } from "../admin/guard";
import { readThresholdLaneAnswer, type ThresholdRow } from "./threshold-model";

/**
 * SCUML item 7. The threshold reports lane, read through
 * `public.threshold_lane`, a definer function that answers staff only. A
 * failed read is "unavailable", never an empty lane: an empty lane says
 * nothing is due, and a read that did not run cannot say that.
 */
export type ThresholdLaneRead =
  | { state: "ready"; rows: ThresholdRow[]; truncated: boolean; monitorFaults: number; viewerId: string }
  | { state: "unavailable" };

export async function readThresholdLane(): Promise<ThresholdLaneRead> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };
  try {
    const { data, error } = await (access.supabase as unknown as {
      rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
    }).rpc("threshold_lane", { p_open: 300, p_closed: 100 });
    const answer = error ? null : readThresholdLaneAnswer(data);
    if (!answer) return { state: "unavailable" };
    return { state: "ready", ...answer, viewerId: access.user.id };
  } catch {
    return { state: "unavailable" };
  }
}
