import "server-only";

import { recordAlert } from "../alerts";
import type { Json } from "../supabase/database.types";
import type { AlertSeverity } from "../bookings/lifecycle";
import type { AdminClient } from "./rpc";

/**
 * Where a scheduled job's outcome goes, so that no job fails silently.
 *
 * Two rows per run at most. EVERY run, clean or not, appends one line to
 * audit_log (`cron.<job>.<outcome>`, entity cron_job/<job>, the counts and
 * the duration in the metadata), which is the run history A2-121 asked for,
 * the admin audit viewer already reads, and the only way a job that has
 * quietly STOPPED firing is visible: its last row has a date on it. A run
 * that failed, or one that found something a person must look at, ALSO
 * raises an alert through `lib/alerts` (BC's writer, the contract in
 * BUILD_06_LEDGER 2.1) so it lands on the admin alerts desk with the ids
 * beside it. A clean run raises nothing: the desk is for things that need a
 * person, and the history is in the audit log.
 *
 * Never throws. A reporter that could take a job down would be the one
 * silent failure this file exists to end. When there is no service client
 * the same facts go to console.error, because the failure that started all
 * of this was a job that could not reach the database and said nothing.
 * Scalars and ids only in the detail: nothing here ever carries a name, a
 * phone or an address, and the alerts writer scrubs again on the way in.
 */

export type CronRunRecord = {
  job: string;
  outcome: "ok" | "attention" | "failed";
  durationMs: number;
  counts?: Record<string, number>;
  /** Why a failed run failed. An error message, never a payload. */
  reason?: string;
  alert?: { kind: string; severity: AlertSeverity; detail: Record<string, string | number | boolean | null> } | null;
};

const ENTITY_TYPE = "cron_job";

/** One line of run history, plus the alert the outcome deserves. */
export async function reportCronRun(admin: AdminClient | null, record: CronRunRecord): Promise<void> {
  const durationMs = Math.max(0, Math.trunc(record.durationMs));
  const metadata: Record<string, Json> = {
    outcome: record.outcome,
    duration_ms: durationMs,
    ...(record.counts ?? {}),
    ...(record.reason ? { reason: record.reason } : {}),
  };

  if (!admin) {
    console.error(`[cron] ${record.job} ${record.outcome} (no service client) ${JSON.stringify(metadata)}`);
    // The alerts writer makes its own client and says so itself when it cannot.
    await recordAlert({
      kind: `cron.${record.job.replace(/-/g, "_")}.unconfigured`,
      severity: "critical",
      detail: { reason: record.reason ?? "service_role_key_missing" },
      subjectId: record.job,
      subjectKind: ENTITY_TYPE,
    });
    return;
  }

  try {
    const { error } = await admin.from("audit_log").insert({
      actor_id: null,
      action: `cron.${record.job}.${record.outcome}`,
      entity_type: ENTITY_TYPE,
      entity_id: record.job,
      metadata: metadata as Json,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error(`[cron] ${record.job} ${record.outcome} could not be audited (${reason}) ${JSON.stringify(metadata)}`);
    /*
     * AND IT GOES TO THE DESK, BECAUSE THIS LINE USED TO END AT THE CONSOLE.
     *
     * The row above IS the run history. `lib/cron/freshness.ts` reads it to
     * decide whether a job is still alive, and a job whose row never lands is
     * a job that will be read as silent for ever afterwards, or, worse, never
     * read at all: the freshness rule excuses a job with NO history as one
     * that has not been deployed yet. So a failed insert is not a cosmetic
     * loss. It is the single fact the watch depends on, disappearing into a
     * log nobody reads, while the run answers 200 and the scheduler's
     * dashboard stays green. That is the reconciliation incident's exact
     * shape one layer down, and it is why this now raises.
     *
     * The alert writer makes its own client, so it can still land when this
     * one insert is what failed; when the whole database is away it fails too
     * and says so in its own line, which is the honest floor.
     */
    await recordAlert({
      kind: `cron.${record.job.replace(/-/g, "_")}.unrecorded`,
      severity: "critical",
      detail: { reason: reason.slice(0, 160), outcome: record.outcome, duration_ms: durationMs },
      subjectId: record.job,
      subjectKind: ENTITY_TYPE,
    });
  }

  if (record.outcome === "failed") {
    await recordAlert({
      kind: `cron.${record.job.replace(/-/g, "_")}.failed`,
      severity: "critical",
      detail: { reason: record.reason ?? "unknown", duration_ms: durationMs },
      subjectId: record.job,
      subjectKind: ENTITY_TYPE,
    });
    return;
  }

  if (record.outcome === "attention" && record.alert) {
    await recordAlert({
      kind: record.alert.kind,
      severity: record.alert.severity,
      detail: record.alert.detail,
      subjectId: record.job,
      subjectKind: ENTITY_TYPE,
    });
  }
}
