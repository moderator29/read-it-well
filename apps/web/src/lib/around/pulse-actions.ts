"use server";

import { resolveSession } from "../actions/session";
import { PULSE_KINDS, isPulseAnswer, readPulseResult, type PulseKind, type PulseResult } from "./pulse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One tap from a member of an Around area (V-41). Every rule (membership, the
 * 14 days, the lister exclusion, the gaps between answers) is enforced by
 * `public.record_area_pulse`; this only checks the shape of the request and
 * hands back the word the database chose, which the card says in full.
 */
export async function recordPulse(areaId: string, kind: string, answer: string): Promise<PulseResult> {
  if (typeof areaId !== "string" || !UUID.test(areaId)) return "failed";
  if (!(PULSE_KINDS as readonly string[]).includes(kind)) return "bad-answer";
  if (typeof answer !== "string" || !isPulseAnswer(kind as PulseKind, answer)) return "bad-answer";
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return "signed-out";
    const { data, error } = await (
      session.supabase as unknown as {
        rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("record_area_pulse", { p_area: areaId, p_kind: kind, p_answer: answer });
    if (error) return "failed";
    return readPulseResult(data);
  } catch {
    return "failed";
  }
}
