import { describe, expect, it } from "vitest";

import {
  WATCHED_JOBS,
  describeStaleJob,
  freshnessDetail,
  staleJobs,
  type LastRun,
} from "./freshness";

/**
 * A JOB THAT HAS STOPPED FIRING RAISES NOTHING, which is the whole reason this
 * decision exists, so the decision itself has to be proved at fixed instants
 * rather than trusted.
 *
 * Three rules, and the second one is the one that keeps the desk usable:
 *
 *   1. A job that used to report and has gone quiet past its allowance is
 *      named, with how many hours of silence.
 *   2. A job with NO history at all is counted and never alerted. Otherwise
 *      the first day of any new deployment puts four rows an hour on a desk
 *      that is supposed to mean "a person is needed".
 *   3. One skipped run is not an alarm. The allowance is comfortably wider
 *      than the gap between runs, so a slow deploy does not page anybody and
 *      two missed runs in a row does.
 */

const NOON = Date.parse("2026-09-19T12:00:00Z");
const hoursAgo = (hours: number) => new Date(NOON - hours * 3_600_000).toISOString();

/** Every watched job reporting a moment ago, which is the healthy shape. */
function allFresh(): LastRun[] {
  return WATCHED_JOBS.map((entry) => ({ job: entry.job, lastRunAt: hoursAgo(0.5) }));
}

describe("the watched list", () => {
  it("names each job once, with a schedule and an allowance wider than it", () => {
    const names = WATCHED_JOBS.map((entry) => entry.job);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("hold-sweep");
    expect(names).toContain("complete-stays");
    expect(names).toContain("inventory-drift");
    for (const entry of WATCHED_JOBS) {
      expect(entry.schedule.length).toBeGreaterThan(0);
      expect(entry.maxGapHours).toBeGreaterThanOrEqual(3);
      expect(entry.maxGapHours).toBeLessThanOrEqual(48);
    }
  });
});

describe("staleJobs", () => {
  it("says nothing when every job has just reported", () => {
    expect(staleJobs(allFresh(), NOON)).toEqual({ stale: [], neverRan: [] });
  });

  it("does not complain about one skipped hourly run", () => {
    const runs = allFresh().map((run) =>
      run.job === "hold-sweep" ? { ...run, lastRunAt: hoursAgo(2) } : run,
    );
    expect(staleJobs(runs, NOON).stale).toEqual([]);
  });

  it("names an hourly job that has been quiet for seven hours", () => {
    const runs = allFresh().map((run) =>
      run.job === "hold-sweep" ? { ...run, lastRunAt: hoursAgo(7) } : run,
    );
    const verdict = staleJobs(runs, NOON);
    expect(verdict.stale).toEqual([
      { job: "hold-sweep", schedule: "hourly at :05", hoursSilent: 7 },
    ]);
    expect(verdict.neverRan).toEqual([]);
  });

  it("lets a daily job sleep through the night and names it after a day and a bit", () => {
    const quiet = (hours: number) =>
      staleJobs(
        allFresh().map((run) =>
          run.job === "complete-stays" ? { ...run, lastRunAt: hoursAgo(hours) } : run,
        ),
        NOON,
      ).stale.map((row) => row.job);
    expect(quiet(25)).toEqual([]);
    expect(quiet(27)).toEqual(["complete-stays"]);
  });

  it("counts a job that has never run and never alerts about it", () => {
    const runs = allFresh().map((run) =>
      run.job === "inventory-drift" ? { ...run, lastRunAt: null } : run,
    );
    const verdict = staleJobs(runs, NOON);
    expect(verdict.stale).toEqual([]);
    expect(verdict.neverRan).toEqual(["inventory-drift"]);
  });

  it("treats a job missing from the read entirely as never run, not as silent", () => {
    const verdict = staleJobs([], NOON);
    expect(verdict.stale).toEqual([]);
    expect(verdict.neverRan.length).toBe(WATCHED_JOBS.length);
  });

  it("never turns an unreadable timestamp into an alarm", () => {
    const runs = allFresh().map((run) =>
      run.job === "hold-sweep" ? { ...run, lastRunAt: "not a date" } : run,
    );
    const verdict = staleJobs(runs, NOON);
    expect(verdict.stale).toEqual([]);
    expect(verdict.neverRan).toEqual(["hold-sweep"]);
  });

  it("names every silent job in one verdict, not just the first", () => {
    const runs = allFresh().map((run) => ({ ...run, lastRunAt: hoursAgo(72) }));
    expect(staleJobs(runs, NOON).stale.map((row) => row.job).sort()).toEqual(
      WATCHED_JOBS.map((entry) => entry.job).sort(),
    );
  });
});

describe("what the alert carries", () => {
  it("is one short flat line per job, so the alert scrubber keeps it whole", () => {
    const line = describeStaleJob({ job: "hold-sweep", schedule: "hourly at :05", hoursSilent: 7 });
    expect(line).toBe("hold-sweep (hourly at :05) has said nothing for 7 hours");
    expect(line.length).toBeLessThan(200);
  });

  it("flattens the verdict into counts and one key per stale job", () => {
    const detail = freshnessDetail({
      stale: [
        { job: "hold-sweep", schedule: "hourly at :05", hoursSilent: 7 },
        { job: "complete-stays", schedule: "daily at 02:30 UTC", hoursSilent: 50 },
      ],
      neverRan: ["inventory-drift"],
    });
    expect(detail.stale_jobs).toBe(2);
    expect(detail.never_ran).toBe(1);
    expect(detail.stale_1).toContain("hold-sweep");
    expect(detail.stale_2).toContain("complete-stays");
    for (const value of Object.values(detail)) {
      expect(["string", "number"]).toContain(typeof value);
    }
  });
});
