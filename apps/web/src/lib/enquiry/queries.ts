import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import { resolveSession } from "../actions/session";
import { deskStage, type DeskStage, type LostReason, type StageFacts } from "./stage";

/**
 * V-72: READING THE DESK, UNDER THE LISTER'S OWN CLIENT.
 *
 * `enquiry_stage_facts` answers only for the caller's own listing threads
 * (it filters on `agent_id = auth.uid()` itself), so a renter or a stranger
 * gets nothing. The functions are not in the generated types yet, for the
 * reason `lib/price-check/rpc.ts` gives; the casts are local and narrow.
 *
 * A failed read is `null`, which the inbox shows as no stage rather than a
 * guessed one: an enquiry drawn as New because the read blinked would be a
 * claim about somebody's pipeline that nobody checked.
 */

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export async function readDeskStages(): Promise<Map<string, DeskStage> | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    const { data, error } = await rpc("enquiry_stage_facts");
    await reportReadError("read.enquiry.readDeskStages", error);
    if (error || !Array.isArray(data)) return null;
    const out = new Map<string, DeskStage>();
    for (const row of data as StageFacts[]) {
      if (typeof row?.conversation_id === "string") out.set(row.conversation_id, deskStage(row));
    }
    return out;
  } catch {
    return null;
  }
}

/** One thread's stage, for its header. Null when it is not the reader's to see. */
export async function readDeskStage(conversationId: string): Promise<DeskStage | null> {
  const all = await readDeskStages();
  return all?.get(conversationId) ?? null;
}

export type LostByArea = {
  stateCode: string | null;
  area: string;
  total: number;
  reasons: { reason: LostReason | "other"; count: number }[];
};

/** Lost reasons by area, k = 5 applied by the database. Null on a failed read. */
export async function readLostReasonsByArea(weeks = 12): Promise<LostByArea[] | null | "approved_only"> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    const { data, error } = await rpc("lost_reasons_by_area", { p_weeks: weeks });
    if ((error as { code?: string } | null)?.code === "42501") return "approved_only";
    await reportReadError("read.enquiry.readLostReasonsByArea", error);
    if (error || !Array.isArray(data)) return null;
    const areas = new Map<string, LostByArea>();
    for (const row of data as { state_code: string | null; area: string; reason: LostReason | "other"; lost: number; area_lost: number }[]) {
      const key = `${row.state_code ?? ""}|${row.area}`;
      const entry = areas.get(key) ?? { stateCode: row.state_code, area: row.area, total: Number(row.area_lost), reasons: [] };
      entry.reasons.push({ reason: row.reason, count: Number(row.lost) });
      areas.set(key, entry);
    }
    return [...areas.values()];
  } catch {
    return null;
  }
}
