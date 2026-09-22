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
  /**
   * WHERE THIS JOB'S HISTORY IS ACTUALLY WRITTEN, when it is not the shape
   * `lib/cron/report.ts` writes.
   *
   * Every job in this folder reports as `entity_type = 'cron_job'` with the
   * job name as `entity_id`, and for those this is absent and the default
   * applies. The reconciliation is older than this folder and reports through
   * `recordMoneyAudit` instead, as an ACTION on a `wallet_entry` with no
   * entity id at all, so it is matched by action rather than by entity.
   *
   * This field exists because the alternative was leaving the only
   * money-recovering job on the platform unwatched until somebody unified two
   * writers, and the cost of that wait is written out in the list below.
   */
  audit?: { entityType: string; action: string };
};

/**
 * The jobs in `apps/web/vercel.json` that are watched here. Their schedules
 * are the ones in that file and the two must stay equal; `freshness.test.ts`
 * holds the shape, and the cron entries are the truth.
 *
 * `/api/paystack/reconcile` USED TO BE DELIBERATELY ABSENT from this list,
 * because it writes its run history through `recordMoneyAudit` as
 * `wallet.reconciliation.run` against `wallet_entry` rather than as a
 * `cron_job` row, and this watch could not see that shape. The note said
 * whoever unified the two writers would add the line.
 *
 * NOBODY DID, AND HERE IS WHAT IT COST, MEASURED ON 22 SEPTEMBER 2026 AGAINST
 * THE LIVE DATABASE. `public.audit_log` holds 474 `wallet.reconciliation.run`
 * rows and the most recent is dated 29 AUGUST. `cron.job_run_details` for the
 * hourly database job reports `succeeded, 1 row` every hour, including at
 * 12:47 today. `net._http_response` holds six responses from today, 07:47
 * through 12:47, and every one of them is a 404 reading
 * `The deployment could not be found on Vercel. DEPLOYMENT_NOT_FOUND`: the
 * origin in Vault points at a per-deployment URL that no longer exists rather
 * than at the stable production alias.
 *
 * So the ONLY job on this platform that recovers a charge whose webhook never
 * arrived has been dead for over three weeks, the scheduler has reported
 * success every hour of it, a platform survey recorded that the job succeeds,
 * and nothing anywhere raised, because the one thing that could have raised
 * was this list and it had been told to look at the wrong table.
 *
 * It is watched now, by the shape it actually writes. The origin itself is the
 * founder's to fix in Vault; what this closes is the silence.
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
  /* The account purge, and it is the job where silence costs most.
     A deletion request carries a thirty day clock that a person was told
     about in writing, and the only thing that honours it is this job firing.
     A purge that quietly stops is a promise quietly broken, and unlike every
     other job here nobody outside will notice, because the people waiting on
     it have already left. It was scheduled in vercel.json and reported
     through the same audit door as its siblings and was NOT on this list;
     O2 found the gap and left the line to the owner rather than writing it. */
  { job: "account-purge", schedule: "daily at 03:15 UTC", maxGapHours: 26 },
  /* The reconciliation, matched by the action it writes rather than by an
     entity id it does not write. Three hours of silence on an hourly job that
     recovers money is already too long; see the note above for what three
     WEEKS of it looked like from the outside, which was nothing at all. */
  {
    job: "paystack-reconcile",
    schedule: "hourly at :10",
    maxGapHours: 3,
    audit: { entityType: "wallet_entry", action: "wallet.reconciliation.run" },
  },
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
        /* Two shapes, one read. A job that reports through `lib/cron/report.ts`
           is found by its entity; a job that reports through
           `recordMoneyAudit` is found by its action, because that writer does
           not set an entity id at all. Matching the second one by entity id
           would return nothing forever and read as silence, which is the
           failure this whole module exists to make impossible. */
        const query = admin.from("audit_log").select("created_at");
        const scoped = entry.audit
          ? query.eq("entity_type", entry.audit.entityType).eq("action", entry.audit.action)
          : query.eq("entity_type", "cron_job").eq("entity_id", entry.job);
        const { data, error } = await scoped
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
