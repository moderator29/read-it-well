import "server-only";

import { VERCEL_JOBS, databaseJobsSummary, jobRow, type DatabaseJobsSummary, type RunRow } from "./jobs";
import type { AlertTrend, JobHealth } from "./shapes";
import {
  DAY_MS,
  UNAVAILABLE,
  adminReader,
  bucketSum,
  exactCount,
  lagosDay,
  lagosDayStartIso,
  lastDays,
  readAll,
  type Read,
} from "./shared";

/**
 * THE OPERATIONS DESK'S READS (01F7DFC7 panel two): scheduled job health,
 * the database jobs' summary, the alert trend and the daily run record.
 *
 * All from rows the platform already writes honestly: `lib/cron/report.ts`
 * writes one `audit_log` row per scheduled run, the money reconcile writes
 * `wallet.reconciliation.run`, and `risk_alerts` carries `created_at` and
 * `resolved_at` for every alert ever raised. Read through the operator's own
 * session under the admin SELECT policies on both tables.
 */

type AuditRunRow = { action: string; created_at: string; metadata: unknown };

function toRun(row: AuditRunRow | null | undefined): RunRow | null {
  return row ? { action: row.action, createdAt: row.created_at, metadata: row.metadata } : null;
}

/**
 * Every Vercel Cron job's last run: one read per job, newest first, so the
 * row returned is exactly the last run however long ago it was. The
 * database's pg_cron jobs are summarised from the newest watch run
 * (`pg-cron-watch` records failures, recoveries, never-run and overdue
 * counts); listing them one by one needs Request A5.
 */
export async function getJobHealth(
  now: number,
): Promise<Read<{ health: JobHealth; database: DatabaseJobsSummary | null }>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const reads = await Promise.all(
      VERCEL_JOBS.map((job) => {
        const query = db.from("audit_log").select("action, created_at, metadata");
        const scoped =
          job.audit.entityType === "cron_job"
            ? query.eq("entity_type", "cron_job").eq("entity_id", job.name)
            : query.eq("entity_type", "wallet_entry").eq("action", job.audit.term);
        return scoped.order("created_at", { ascending: false }).limit(1).maybeSingle();
      }),
    );
    if (reads.some((r) => r.error)) return UNAVAILABLE;
    const jobs = VERCEL_JOBS.map((job, i) => jobRow(job, toRun(reads[i]!.data as AuditRunRow | null), now));
    const watchIndex = VERCEL_JOBS.findIndex((j) => j.name === "pg-cron-watch");
    const watch = toRun(reads[watchIndex]?.data as AuditRunRow | null);
    return {
      state: "ok",
      data: {
        health: { jobs, checkedAt: new Date(now).toISOString() },
        database: databaseJobsSummary(watch),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** Runs per Lagos day and how many of them failed, for the jobs sparkline. */
export function assembleRunDays(
  days: readonly string[],
  runs: readonly { action: string; created_at: string }[],
): { day: string; runs: number; failed: number }[] {
  const all = bucketSum(
    runs.map((r) => ({ key: lagosDay(r.created_at), amount: 1 })),
    days,
  );
  const failed = bucketSum(
    runs.filter((r) => r.action.endsWith(".failed")).map((r) => ({ key: lagosDay(r.created_at), amount: 1 })),
    days,
  );
  return days.map((day, i) => ({ day, runs: all[i] ?? 0, failed: failed[i] ?? 0 }));
}

/** Fourteen days of scheduled runs (every row, not a page), for the jobs card. */
export async function getRunDays(now: number): Promise<Read<{ day: string; runs: number; failed: number }[]>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const days = lastDays(14, now);
    const rows = await readAll<{ action: string; created_at: string }>((from, to) =>
      db
        .from("audit_log")
        .select("action, created_at")
        .eq("entity_type", "cron_job")
        .gte("created_at", lagosDayStartIso(days[0]!))
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (!rows) return UNAVAILABLE;
    return { state: "ok", data: assembleRunDays(days, rows) };
  } catch {
    return UNAVAILABLE;
  }
}

/**
 * Open alerts now and as they stood seven days ago, from the alert rows'
 * own dates: an alert was open a week ago if it had been raised by then and
 * was not yet resolved. Exact counts, both.
 */
export async function getAlertTrend(now: number): Promise<Read<AlertTrend>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const weekAgo = new Date(now - 7 * DAY_MS).toISOString();
    const days = lastDays(14, now);
    const [openNow, openWeekAgo, raised] = await Promise.all([
      exactCount(db.from("risk_alerts").select("id", { count: "exact", head: true }).eq("status", "open")),
      exactCount(
        db
          .from("risk_alerts")
          .select("id", { count: "exact", head: true })
          .lte("created_at", weekAgo)
          .or(`resolved_at.is.null,resolved_at.gt.${weekAgo}`),
      ),
      readAll<{ created_at: string }>((from, to) =>
        db
          .from("risk_alerts")
          .select("created_at")
          .gte("created_at", lagosDayStartIso(days[0]!))
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);
    if (openNow === null || openWeekAgo === null || !raised) return UNAVAILABLE;
    const opened = bucketSum(
      raised.map((r) => ({ key: lagosDay(r.created_at), amount: 1 })),
      days,
    );
    return {
      state: "ok",
      data: { openNow, openWeekAgo, daily: days.map((day, i) => ({ day, opened: opened[i] ?? 0 })) },
    };
  } catch {
    return UNAVAILABLE;
  }
}
