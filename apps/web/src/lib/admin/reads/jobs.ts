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
 * The database's own pg_cron jobs are `PG_CRON_JOBS` below: their runs live
 * in `cron.job_run_details`, which nothing in the query layer can read yet
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
  /*
   * Added by Session A's email junction worker (R13): data only, kept by
   * Session B's ruling of 23 September, because the equality test with
   * `vercel.json` needs it and nothing else in the file moved.
   */
  { name: "email-outbox", cron: "*/15 * * * *", schedule: "Every 15 minutes", maxGapHours: 2, audit: { entityType: "cron_job", term: "email-outbox" } },
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
  { name: "new-match-alerts", cron: "0,5,10,15,20,25,30,35,45,50,55 * * * *", schedule: "Every 5 minutes except minute 40", maxGapHours: 2, audit: { entityType: "cron_job", term: "new-match-alerts" } },
  { name: "store-readiness", cron: "0 5 * * *", schedule: "Daily at 06:00", maxGapHours: 26, audit: { entityType: "cron_job", term: "store-readiness" } },
  /* V-31 and V-32, the landlord line. A no-op while `landlord_line` is off. */
  { name: "landlord-line", cron: "*/15 * * * *", schedule: "Every 15 minutes", maxGapHours: 2, audit: { entityType: "cron_job", term: "landlord-line" } },
];

/**
 * THE DATABASE'S OWN SCHEDULED JOBS (pg_cron), one list, so every count the
 * console, the handbook and the scope file state is derived and cannot
 * drift. `session-b-admin-jobs.test.ts` scans `supabase/migrations` for every
 * `cron.schedule('<name>', '<cron>', ...)` (applying the 22 September rename
 * of `rentme*` to `vallo*`) and fails the day a job is scheduled there and not
 * listed here, listed here and not scheduled there, or scheduled at a
 * different time. Schedules are UTC, as pg_cron runs them; `when` is Lagos.
 */
export type PgCronJob = { name: string; cron: string; when: string; what: string };

export const PG_CRON_JOBS: readonly PgCronJob[] = [
  { name: "vallo_push_drain", cron: "*/5 * * * *", when: "every 5 min", what: "asks the app to drain the push queue" },
  { name: "vallo_safety_share_sweep", cron: "*/10 * * * *", when: "every 10 min", what: "reminds a renter who has not checked in after an inspection they shared" },
  { name: "vallo_release_stale_holds", cron: "*/15 * * * *", when: "every 15 min", what: "database side of the hold release" },
  { name: "vallo_alert_overdue_refunds", cron: "12 * * * *", when: "hourly at :12", what: "alerts on refunds past their due-by date" },
  { name: "vallo_escrow_sweep_timeouts", cron: "17 * * * *", when: "hourly at :17", what: "escrow timeouts" },
  { name: "vallo_escrow_invariants", cron: "23 * * * *", when: "hourly at :23", what: "asserts the escrow float identity" },
  { name: "vallo_purge_rate_limits", cron: "30 * * * *", when: "hourly at :30", what: "clears old rate limit rows" },
  { name: "vallo_purge_view_marks", cron: "41 * * * *", when: "hourly at :41", what: "forgets the day's listing view marks and salt once the day ends (V-73)" },
  { name: "vallo_reconcile_payments", cron: "47 * * * *", when: "hourly at :47", what: "database side of reconciliation" },
  { name: "vallo_purge_idempotency", cron: "10 2 * * *", when: "daily 03:10", what: "clears old idempotency records" },
  { name: "vallo-nightly-badges", cron: "20 2 * * *", when: "daily 03:20", what: "awards earned badges" },
  { name: "vallo_purge_email_outbox", cron: "25 2 * * *", when: "daily 03:25", what: "forgets emails already delivered" },
  { name: "vallo_purge_web_vitals", cron: "35 2 * * *", when: "daily 03:35", what: "deletes field speed samples older than 30 days" },
  { name: "vallo_escrow_book_the_float", cron: "5 3 * * *", when: "daily 04:05", what: "books the day's escrow float as a liability" },
  { name: "vallo_sweep_price_check_events", cron: "40 3 * * *", when: "daily 04:40", what: "deletes price check events older than 24 months" },
  { name: "vallo_announce_completed_stays", cron: "20 5 * * *", when: "daily 06:20", what: "announces completed stays" },
  { name: "vallo_landlord_not_reconfirmed", cron: "35 4 * * *", when: "daily 05:35", what: "marks a listing Not reconfirmed after 21 days of owner silence" },
  { name: "vallo_owner_heartbeat", cron: "15 8 * * *", when: "daily 09:15", what: "asks an owner lister in the app whether the flat is still available" },
  { name: "vallo_sweep_price_check_watches", cron: "50 5 * * *", when: "daily 06:50", what: "tells a price check watcher once the area opens" },
  { name: "vallo-daily-note", cron: "0 6 * * *", when: "daily 07:00", what: "the daily note" },
  { name: "vallo_remind_caution_due", cron: "15 7 * * *", when: "daily 08:15", what: "reminds listers and tenants when a caution is due back" },
  { name: "vallo_remind_renewals", cron: "20 7 * * *", when: "daily 08:20", what: "tells tenants and listers a tenancy ends in 90, 60 or 30 days" },
  { name: "vallo_notify_void_shares", cron: "25 7 * * *", when: "daily 08:25", what: "tells a flatmate once when a move-in they paid a share of fell through" },
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
