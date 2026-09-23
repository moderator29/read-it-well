import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { reportStorageLive } from "./report-flag";
import { EMPTY_REPORT, isRoomItem, type InspectionReport } from "./report";

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
