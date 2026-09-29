import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { reportStorageLive } from "./report-flag";
import { EMPTY_REPORT, isRoomItem, type InspectionReport } from "./report";

/** The agreement drawn up from an inspection, as its card links to it. */
export type AgreementLink = { id: string; status: string };

/**
 * What a rental inspection's report leads to: the number of photos a report
 * must carry before it is submitted (`money_policy.min_inspection_photos`,
 * readable by any signed-in person), and the agreement already drawn up from
 * each inspection, read under the caller's own RLS (a party sees theirs).
 *
 * A failed read of the policy falls back to the value the database held when
 * this was written, so the screen never offers a Submit the database refuses
 * for want of photos. A failed read of the agreements is an empty map, which
 * draws the "Draw up the agreement" form; the door answers an existing one by
 * taking the person to it.
 */
export async function readRentGateFor(
  ids: string[],
): Promise<{ needPhotos: number; agreements: Map<string, AgreementLink> }> {
  const agreements = new Map<string, AgreementLink>();
  const fallback = { needPhotos: 3, agreements };
  const wanted = [...new Set(ids)];
  const session = await resolveSession();
  if (session.state !== "signed-in") return fallback;
  try {
    const [policy, rows] = await Promise.all([
      session.supabase.from("money_policy").select("min_inspection_photos").maybeSingle(),
      wanted.length
        ? session.supabase.from("deal_agreements").select("id, status, inspection_id").in("inspection_id", wanted)
        : Promise.resolve({ data: [] as { id: string; status: string; inspection_id: string | null }[] }),
    ]);
    for (const row of rows.data ?? []) {
      if (row.inspection_id) agreements.set(row.inspection_id, { id: row.id, status: row.status });
    }
    const need = policy.data?.min_inspection_photos;
    return { needPhotos: typeof need === "number" && need >= 0 ? need : fallback.needPhotos, agreements };
  } catch {
    return fallback;
  }
}

/**
 * The report for each inspection on the page, read under the caller's own
 * RLS (I1: either party). Off the flag it reads nothing and returns an empty
 * map, so no screen shows a saved tick that does not exist. A failed read is
 * an empty map too: the rows then draw unticked, which is the safe failure.
 */
export async function readReportsFor(ids: string[]): Promise<Map<string, InspectionReport>> {
  const out = new Map<string, InspectionReport>();
  const wanted = [...new Set(ids)];
  if (wanted.length === 0 || !reportStorageLive()) return out;
  const session = await resolveSession();
  if (session.state !== "signed-in") return out;
  const db = session.supabase as unknown as SupabaseClient;
  try {
    const [reports, items, photos] = await Promise.all([
      db.from("inspection_reports").select("inspection_id, notes, submitted_at").in("inspection_id", wanted),
      db.from("inspection_report_items").select("inspection_id, item, checked").in("inspection_id", wanted),
      db.from("inspection_report_photos").select("inspection_id").in("inspection_id", wanted),
    ]);
    for (const row of (reports.data ?? []) as { inspection_id: string; notes: string | null; submitted_at: string | null }[]) {
      out.set(row.inspection_id, { ...EMPTY_REPORT, items: {}, notes: row.notes, submittedAt: row.submitted_at });
    }
    for (const row of (items.data ?? []) as { inspection_id: string; item: unknown; checked: boolean }[]) {
      if (!isRoomItem(row.item)) continue;
      const report = out.get(row.inspection_id) ?? { ...EMPTY_REPORT, items: {} };
      report.items[row.item] = row.checked === true;
      out.set(row.inspection_id, report);
    }
    for (const row of (photos.data ?? []) as { inspection_id: string }[]) {
      const report = out.get(row.inspection_id) ?? { ...EMPTY_REPORT, items: {} };
      report.photoCount += 1;
      out.set(row.inspection_id, report);
    }
  } catch {
    return new Map();
  }
  return out;
}
