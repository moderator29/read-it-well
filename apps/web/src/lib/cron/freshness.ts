import "server-only";

import type { Json } from "../supabase/database.types";
import type { AdminClient } from "./rpc";

/**
 * THE ONE FAILURE NOTHING IN THIS FOLDER COULD SEE: a job that has STOPPED.
 *
 * Everything else here is watched. A job that throws is a 500, an audit row
 * and a critical alert; a job that finds something raises the alert its
 * verdict asked for; a job that runs clean leaves a dated row so the history
 * is readable. All of that depends on the job RUNNING. A schedule that was
 * never deployed, a cron entry deleted in a config edit, a secret rotated on
 * one side only, a project paused: in every one of those the job simply never
 * fires, and a job that never fires raises nothing at all. It is the quietest
 * failure a platform has, and the only trace of it is an absence, which is
 * exactly the thing nobody notices.
 *
 * `lib/cron/report.ts` already writes the fact that would show it: one
 * `audit_log` row per run under `entity_type = 'cron_job'`. Until now
 * somebody had to go and look. This reads those rows on a schedule and says
 * the absence out loud.
 *
 * IT ONLY EVER COMPLAINS ABOUT A JOB THAT USED TO RUN. A job with no history
 * at all is a deploy that has not happened yet, a preview environment, or the
 * first hour of a new job's life, and alerting on those would put four rows on
 * the desk every hour of the first day, which is how a desk gets ignored. The
 * envelope still counts them, so a job that has NEVER run is visible to
 * anybody reading the run's output without being pushed at a person at 3am.
 *
 * Pure decision, injected clock, no query: `staleJobs` is the whole rule and a
 * test drives every branch of it. `readLastRuns` is the one read.
 */

/** A job this deployment expects to hear from, and how long silence is normal. */
export type WatchedJob = {
  /** The name `runCronJob` was called with, which is the audit row's entity_id. */
  job: string;
  /** How it is scheduled, in words, for the alert an operator reads. */
  schedule: string;
  /**
   * Hours of silence before somebody should look. Comfortably more than the
   * gap between runs, so one skipped run on a slow deploy is not an alarm and
   * two in a row is.
   */
  maxGapHours: number;
};

/**
 * The jobs in `apps/web/vercel.json` that are watched here. Their schedules
 * are the ones in that file and the two must stay equal; `freshness.test.ts`
 * holds the shape, and the cron entries are the truth.
 *
 * `/api/paystack/reconcile` is deliberately NOT here. It is on the same
 * schedule from this build, but it writes its run history through
 * `recordMoneyAudit` as `wallet.reconciliation.run` against `wallet_entry`
 * rather than as a `cron_job` row, so this watch cannot see it and saying it
 * could would be worse than leaving it out. Whoever unifies those two writers
 * adds one line here.
 *
 * `/api/cron/account-purge` reports through `lib/cron/report.ts` exactly as
 * the rows below do and is NOT watched. That is a gap rather than a decision:
 * it was scheduled after this list was written and nobody added the line. It
 * belongs to whoever owns that job, and it is recorded here so the absence is
 * a known one rather than an invisible one.
 *
 * This list is not a count of the cron entries and must not be read as one.
 */
export const WATCHED_JOBS: readonly WatchedJob[] = [
  { job: "hold-sweep", schedule: "hourly at :05", maxGapHours: 3 },
  { job: "pg-cron-watch", schedule: "hourly at :20", maxGapHours: 3 },
  { job: "complete-stays", schedule: "daily at 02:30 UTC", maxGapHours: 26 },
  { job: "inventory-drift", schedule: "daily at 02:45 UTC", maxGapHours: 26 },
  /* The saved-search alert. Daily, and a quiet day is a normal day for it:
     silence from this job means nobody was told, which is exactly what has to
     be visible when the catalogue is quiet rather than when the job is. */
  { job: "saved-search-alerts", schedule: "daily at 07:40 UTC", maxGapHours: 26 },
];

export type LastRun = {
  job: string;
  /** ISO timestamp of the newest audit row for this job, or null when it has never run. */
  lastRunAt: string | null;
};

export type StaleJob = { job: string; schedule: string; hoursSilent: number };

export type FreshnessVerdict = {
  /** Jobs that used to report and have gone quiet past their allowance. */
  stale: StaleJob[];
  /** Jobs with no run history at all. Counted, never alerted: see the header. */
  neverRan: string[];
};

const HOUR_MS = 3_600_000;

/**
 * Which watched jobs have gone quiet. `now` is injected so every branch is
 * provable at a fixed instant rather than at whatever o'clock the suite runs.
 */
export function staleJobs(
  runs: readonly LastRun[],
  now: number,
  watched: readonly WatchedJob[] = WATCHED_JOBS,
): FreshnessVerdict {
  const byJob = new Map(runs.map((run) => [run.job, run.lastRunAt]));
  const stale: StaleJob[] = [];
  const neverRan: string[] = [];

  for (const entry of watched) {
    const last = byJob.get(entry.job) ?? null;
    if (last === null) {
      neverRan.push(entry.job);
      continue;
    }
    const at = Date.parse(last);
    if (!Number.isFinite(at)) {
      // A timestamp we cannot read is not evidence of silence. Treat it as a
      // job with no readable history rather than raising on our own parsing.
      neverRan.push(entry.job);
      continue;
    }
    const silentMs = now - at;
    if (silentMs > entry.maxGapHours * HOUR_MS) {
      stale.push({
        job: entry.job,
        schedule: entry.schedule,
        hoursSilent: Math.floor(silentMs / HOUR_MS),
      });
    }
  }

  return { stale, neverRan };
}

/** `{ job: "hold-sweep", schedule: "hourly at :05", hoursSilent: 7 }` as one line. */
export function describeStaleJob(row: StaleJob): string {
  return `${row.job} (${row.schedule}) has said nothing for ${row.hoursSilent} hours`;
}

/**
 * The newest `audit_log` row per watched job.
 *
 * One tiny indexed read per job rather than one page over the whole table:
 * four jobs at one row each, and a job that is quiet is precisely the job
 * whose row would fall off the end of a shared page. A read that fails is
 * `null` for that job, which the decision above treats as "no readable
 * history" and never as silence, because a broken read must not become a false
 * alarm about a healthy job.
 */
export async function readLastRuns(
  admin: AdminClient,
  watched: readonly WatchedJob[] = WATCHED_JOBS,
): Promise<LastRun[]> {
  const rows = await Promise.all(
    watched.map(async (entry): Promise<LastRun> => {
      try {
        const { data, error } = await admin
          .from("audit_log")
          .select("created_at")
          .eq("entity_type", "cron_job")
          .eq("entity_id", entry.job)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return { job: entry.job, lastRunAt: null };
        return { job: entry.job, lastRunAt: data?.created_at ?? null };
      } catch {
        return { job: entry.job, lastRunAt: null };
      }
    }),
  );
  return rows;
}

/** The counts and the flat detail a verdict carries, ids and scalars only. */
export function freshnessDetail(verdict: FreshnessVerdict): Record<string, Json> {
  const detail: Record<string, Json> = {
    stale_jobs: verdict.stale.length,
    never_ran: verdict.neverRan.length,
  };
  verdict.stale.forEach((row, index) => {
    detail[`stale_${index + 1}`] = describeStaleJob(row);
  });
  return detail;
}
