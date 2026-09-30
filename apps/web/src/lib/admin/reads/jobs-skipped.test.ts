import { describe, expect, it } from "vitest";
import { jobStatus, outcomeOf } from "./jobs";
import type { JobHealthRow } from "./shapes";

/**
 * C13: a run skipped because its feature flag is off reads as SKIPPED on the
 * operations desk, never as a clean run and never as a failure, in both the
 * shapes it can be stored in (its own job_runs outcome once the pending
 * migration lands, a clean run marked `skipped: true` before).
 */
describe("a skipped run on the jobs desk", () => {
  it("reads the skipped outcome in both stored shapes", () => {
    expect(outcomeOf({ action: "cron.landlord-line.skipped", createdAt: "2026-09-30T10:00:00Z", metadata: {} })).toBe("skipped");
    expect(
      outcomeOf({ action: "cron.landlord-line.ok", createdAt: "2026-09-30T10:00:00Z", metadata: { skipped: true } }),
    ).toBe("skipped");
    expect(outcomeOf({ action: "cron.hold-sweep.ok", createdAt: "2026-09-30T10:00:00Z", metadata: {} })).toBe("ok");
  });

  it("wears a quiet info badge that names the reason", () => {
    const row: JobHealthRow = {
      name: "landlord-line",
      scheduler: "vercel",
      cron: "*/15 * * * *",
      schedule: "Every 15 minutes",
      lastRunAt: "2026-09-30T10:00:00Z",
      lastDurationMs: 4,
      lastOutcome: "skipped",
      stale: false,
      active: true,
    };
    expect(jobStatus(row)).toEqual({ tone: "info", word: "Skipped (flag off)" });
  });
});
