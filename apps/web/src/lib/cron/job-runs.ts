/**
 * Reading `public.job_runs` (C7), the counted run history that clean runs and
 * repeats of an open alert are written to instead of the audit trail.
 *
 * Every reader of run history (the freshness watch, the operations desk's
 * job health and its run chart) reads the audit trail AND this table and
 * takes the newer, so moving clean runs out of the trail can never make a
 * healthy job read as silent. Until the migration is applied the table does
 * not exist, every read here answers null or empty, and the readers behave
 * exactly as before.
 *
 * The table is not in the generated types yet, so the client is loosely
 * typed at this one boundary.
 */

export type JobRunRow = {
  job: string;
  day: string;
  outcome: "ok" | "attention" | "failed" | "repeat";
  runs: number;
  last_at: string;
  last_metadata: unknown;
};

/** The audit-shaped row a job-health reader already understands. */
export type AuditShapedRun = { action: string; created_at: string; metadata: unknown };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** A job_runs row as the audit row it replaces: a repeat reads as attention. */
export function asAuditRun(row: Pick<JobRunRow, "job" | "outcome" | "last_at" | "last_metadata">): AuditShapedRun {
  const outcome = row.outcome === "repeat" ? "attention" : row.outcome;
  return { action: `cron.${row.job}.${outcome}`, created_at: row.last_at, metadata: row.last_metadata };
}

/** Whichever of two runs is newer; null when both are. */
export function newerRun<T extends { created_at: string }>(a: T | null | undefined, b: T | null | undefined): T | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a;
}

/** The newest counted run of one job, or null (none, or the table is not there). */
export async function newestJobRun(db: unknown, job: string): Promise<AuditShapedRun | null> {
  try {
    const { data, error } = await (db as Loose)
      .from("job_runs")
      .select("job, outcome, last_at, last_metadata")
      .eq("job", job)
      .order("last_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return asAuditRun(data as JobRunRow);
  } catch {
    return null;
  }
}

/** Counted runs per Lagos day since `fromDay` (YYYY-MM-DD): runs and failed. */
export async function jobRunDayTotals(db: unknown, fromDay: string): Promise<Map<string, { runs: number; failed: number }>> {
  const out = new Map<string, { runs: number; failed: number }>();
  try {
    const { data, error } = await (db as Loose)
      .from("job_runs")
      .select("day, outcome, runs")
      .gte("day", fromDay)
      .limit(5000);
    if (error || !Array.isArray(data)) return out;
    for (const row of data as Pick<JobRunRow, "day" | "outcome" | "runs">[]) {
      const cur = out.get(row.day) ?? { runs: 0, failed: 0 };
      cur.runs += Number(row.runs) || 0;
      if (row.outcome === "failed") cur.failed += Number(row.runs) || 0;
      out.set(row.day, cur);
    }
    return out;
  } catch {
    return out;
  }
}
