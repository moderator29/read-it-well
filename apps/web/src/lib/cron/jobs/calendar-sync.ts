import "server-only";

import { lookup } from "node:dns/promises";

import type { JobVerdict } from "../../bookings/lifecycle";
import type { AdminClient } from "../rpc";
import {
  SYNC_BATCH,
  calendarSyncEnabled,
  syncAll,
  syncIntervalMinutes,
  syncOne,
  type DueImport,
  type Fetcher,
  type Resolver,
} from "../../host/calendar-sync";

/**
 * THE CALENDAR SYNC JOB (C2, 30 September 2026): every linked Airbnb,
 * Booking.com or other calendar that is older than the interval is pulled and
 * its nights handed to `apply_calendar_import`, which closes the new ones and
 * reopens the dropped ones in one transaction and tells the host after two
 * failed pulls in a row. The pulling is `lib/host/calendar-sync.ts`.
 *
 * OFF BY DEFAULT: `CALENDAR_SYNC_ENABLED` must be "1" or "true". Until then,
 * and until the pending migration is applied, a run is a quiet "ok" that
 * says why it did nothing, so the scheduler's dashboard stays green and the
 * reason is in the run's detail.
 */

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string | null; message?: string | null } | null }>;
};

const quiet = (reason: string): JobVerdict => ({ outcome: "ok", counts: { pulled: 0 }, detail: { reason }, alert: null });

export async function calendarSync(admin: AdminClient): Promise<JobVerdict> {
  if (!calendarSyncEnabled()) return quiet("CALENDAR_SYNC_ENABLED is off");
  const db = admin as unknown as Rpc;
  const minutes = syncIntervalMinutes();
  const due = await db.rpc("calendar_imports_due", { p_interval: `${minutes} minutes`, p_limit: SYNC_BATCH });
  if (due.error) {
    if (due.error.code === "PGRST202" || due.error.code === "42883") return quiet("calendar sync migration not applied");
    throw new Error(`calendar_imports_due: ${due.error.message ?? due.error.code ?? "rpc error"}`);
  }
  const rows = (Array.isArray(due.data) ? due.data : []) as DueImport[];
  let applyFailures = 0;
  const apply = async (id: string, nights: string[] | null, error: string | null) => {
    const res = await db.rpc("apply_calendar_import", { p_import: id, p_nights: nights, p_error: error });
    if (res.error) applyFailures += 1;
  };
  const fetcher = ((url, init) => fetch(url, init)) as Fetcher;
  const resolve: Resolver = async (host) => (await lookup(host, { all: true })).map((r) => r.address);
  const { outcomes, skipped } = await syncAll(rows, (row) => syncOne(fetcher, apply, row, resolve));
  const failed = outcomes.filter((o) => !o.ok).length;
  const counts = { due: rows.length, pulled: outcomes.length - failed, failed, skipped, applyFailures, intervalMinutes: minutes };
  return {
    outcome: applyFailures > 0 ? "attention" : "ok",
    counts,
    detail: { failedIds: outcomes.filter((o) => !o.ok).map((o) => o.id).slice(0, 20) },
    alert:
      applyFailures > 0
        ? { kind: "calendar_sync_apply_failed", severity: "warning", detail: { applyFailures, due: rows.length } }
        : null,
  };
}
