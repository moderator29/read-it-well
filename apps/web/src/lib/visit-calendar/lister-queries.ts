import "server-only";

import { resolveSession } from "../actions/session";
import { visitModeFrom, type VisitMode } from "./model";

/**
 * THE VISIT MODE OF EACH OF THE LISTER'S VISITS (13 October 2026).
 *
 * `inspection_requests.visit_mode` is newer than the read that draws the
 * lister's inspections (`readInspectionsForLister`, which another track is
 * rebuilding), so the calendar asks for the one column it needs, for the ids
 * that read already returned, under the lister's own RLS
 * (`inspection_requests_select_party`). One query per page.
 *
 * A failed read is not "every visit is in person": it comes back as null and
 * the rows draw no mode icon at all rather than a wrong one.
 */
export async function readVisitModes(ids: readonly string[]): Promise<Map<string, VisitMode> | null> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return new Map();
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await session.supabase
      .from("inspection_requests")
      .select("id, visit_mode")
      .in("id", wanted);
    if (error) return null;
    const out = new Map<string, VisitMode>();
    for (const row of (data ?? []) as { id: string; visit_mode: string | null }[]) {
      out.set(row.id, visitModeFrom(row.visit_mode));
    }
    return out;
  } catch {
    return null;
  }
}
