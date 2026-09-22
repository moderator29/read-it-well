import type { JobHealthRow, JobOutcome } from "./shapes";

/** The audit row fields a job run is read from. */
export type RunRow = {
  action: string;
  createdAt: string;
  metadata: unknown;
};

/**
 * The scheduled jobs the platform runs from Vercel Cron, and how to read
 * each one's latest run out of the audit log.
 *
 * WHERE THE SCHEDULE COMES FROM. `apps/web/vercel.json` is the scheduler's
 * own list; the cron strings here are copied from it and a test
 * (`session-b-admin-jobs.test.ts`) fails the day the two disagree. The
 * allowance is `WATCHED_JOBS` in `lib/cron/freshness.ts`, the same number the
 * platform's own watch job alarms on.
 *
 * WHERE THE LAST RUN COMES FROM. Every job reports through
 * `lib/cron/report.ts`, which writes one `audit_log` row per run with
 * `entity_type = 'cron_job'`, `entity_id = <job>`, `action =
 * cron.<job>.<ok|attention|failed>` and `metadata.duration_ms`. The money
 * reconcile job reports through the money audit instead, as
 * `wallet.reconciliation.run` with `metadata.outcome`. `operations.ts` reads
 * the newest such row per job (one read per job, newest first, so it is
 * exactly the last run however long ago it was).
 *
 * The database's own pg_cron jobs are not in this list: their runs live in
 * `cron.job_run_details`, which nothing in the query layer reads yet
 * (Request A5).
 */
export type VercelJob = {
  name: string;
  cron: string;
  schedule: string;
  maxGapHours: number;
  audit: { entityType: "cron_job" | "wallet_entry"; term: string };
};

export const VERCEL_JOBS: readonly VercelJob[] = [
  { name: "hold-sweep", cron: "5 * * * *", schedule: "Hourly at :05", maxGapHours: 3, audit: { entityType: "cron_job", term: "hold-sweep" } },
  {
    name: "paystack-reconcile",
    cron: "10 * * * *",
    schedule: "Hourly at :10",
    maxGapHours: 3,
    audit: { entityType: "wallet_entry", term: "wallet.reconciliation.run" },
  },
  { name: "pg-cron-watch", cron: "20 * * * *", schedule: "Hourly at :20", maxGapHours: 3, audit: { entityType: "cron_job", term: "pg-cron-watch" } },
  { name: "complete-stays", cron: "30 2 * * *", schedule: "Daily at 03:30", maxGapHours: 26, audit: { entityType: "cron_job", term: "complete-stays" } },
  { name: "inventory-drift", cron: "45 2 * * *", schedule: "Daily at 03:45", maxGapHours: 26, audit: { entityType: "cron_job", term: "inventory-drift" } },
  { name: "account-purge", cron: "15 3 * * *", schedule: "Daily at 04:15", maxGapHours: 26, audit: { entityType: "cron_job", term: "account-purge" } },
  {
    name: "saved-search-alerts",
    cron: "40 7 * * *",
    schedule: "Daily at 08:40",
    maxGapHours: 26,
    audit: { entityType: "cron_job", term: "saved-search-alerts" },
  },
];

/** A readable name for a job: "hold-sweep" becomes "Hold sweep". */
export function jobTitle(name: string): string {
  const spaced = name.replace(/[-_]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function meta(row: RunRow): Record<string, unknown> {
  const m = row.metadata as unknown;
  return m !== null && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

/** The outcome a run row records. */
export function outcomeOf(row: RunRow): JobOutcome | null {
  if (row.action.startsWith("cron.")) {
    const tail = row.action.split(".").pop();
    return tail === "ok" || tail === "attention" || tail === "failed" ? tail : null;
  }
  if (row.action === "wallet.reconciliation.run") {
    const outcome = meta(row)["outcome"];
    if (outcome === "clean") return "ok";
    if (outcome === "failed" || outcome === "error") return "failed";
    return typeof outcome === "string" ? "attention" : null;
  }
  return null;
}

export function durationOf(row: RunRow): number | null {
  const ms = meta(row)["duration_ms"];
  return typeof ms === "number" && Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/**
 * One job's row, from its newest audit row (or none). Stale when the last
 * run is older than the job's allowance, or when it has never reported.
 */
export function jobRow(job: VercelJob, latest: RunRow | null, now: number): JobHealthRow {
  const lastRunAt = latest?.createdAt ?? null;
  const at = lastRunAt ? Date.parse(lastRunAt) : Number.NaN;
  const stale = !Number.isFinite(at) || now - at > job.maxGapHours * 3_600_000;
  return {
    name: job.name,
    scheduler: "vercel",
    cron: job.cron,
    schedule: job.schedule,
    lastRunAt,
    lastDurationMs: latest ? durationOf(latest) : null,
    lastOutcome: latest ? outcomeOf(latest) : null,
    stale,
    active: true,
  };
}

export type JobStatus = { tone: "success" | "pending" | "error" | "info"; word: string };

/** The badge a job row wears. */
export function jobStatus(row: JobHealthRow): JobStatus {
  if (row.lastRunAt === null) return { tone: "pending", word: "No run yet" };
  if (row.lastOutcome === "failed") return { tone: "error", word: "Failed" };
  if (row.stale) return { tone: "error", word: "Overdue" };
  if (row.lastOutcome === "attention") return { tone: "info", word: "Attention" };
  return { tone: "success", word: "Healthy" };
}

/** "8m 14s", "2m 03s", "474ms". */
export function durationLabel(ms: number | null): string {
  if (ms === null) return "Not recorded";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/**
 * The pg_cron summary the platform's own watch job records on every run
 * (`metadata.failures`, `never_ran`, `stale_jobs`, `recovered`), so the
 * database jobs are at least counted until Request A5 lists them one by one.
 */
export type DatabaseJobsSummary = {
  checkedAt: string;
  failures: number;
  recovered: number;
  neverRan: number;
  stale: number;
};

export function databaseJobsSummary(watch: RunRow | null): DatabaseJobsSummary | null {
  if (!watch) return null;
  const m = meta(watch);
  const num = (key: string) => (typeof m[key] === "number" ? (m[key] as number) : 0);
  return {
    checkedAt: watch.createdAt,
    failures: num("failures"),
    recovered: num("recovered"),
    neverRan: num("never_ran"),
    stale: num("stale_jobs"),
  };
}
