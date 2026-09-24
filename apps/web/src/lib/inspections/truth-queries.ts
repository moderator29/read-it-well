import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";

/**
 * When the viewer answered the truth questions, per inspection (V-05). Read
 * under the viewer's own RLS, whose select policy returns only the viewer's
 * own answers: a lister reading this for their listings gets nothing, which
 * is the point. A failed read is an empty map, so the form is offered again
 * and the database refuses a second answer with a sentence.
 */
export async function readTruthAnsweredFor(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return out;
  const session = await resolveSession();
  if (session.state !== "signed-in") return out;
  try {
    const { data } = await (session.supabase as unknown as SupabaseClient)
      .from("inspection_truth")
      .select("inspection_id, answered_at")
      .in("inspection_id", wanted);
    for (const row of (data ?? []) as { inspection_id: string; answered_at: string }[]) {
      out.set(row.inspection_id, row.answered_at);
    }
  } catch {
    return new Map();
  }
  return out;
}
