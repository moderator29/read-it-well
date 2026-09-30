import { describe, expect, it } from "vitest";
import { asAuditRun, jobRunDayTotals, newerRun, newestJobRun } from "./job-runs";

describe("job_runs read as run history (C7)", () => {
  it("reads a repeat as an attention run", () => {
    expect(asAuditRun({ job: "canary", outcome: "repeat", last_at: "2026-09-30T08:00:00Z", last_metadata: {} })).toMatchObject({
      action: "cron.canary.attention",
      created_at: "2026-09-30T08:00:00Z",
    });
  });

  it("takes the newer of two runs", () => {
    const a = { created_at: "2026-09-30T08:00:00Z" };
    const b = { created_at: "2026-09-30T09:00:00Z" };
    expect(newerRun(a, b)).toBe(b);
    expect(newerRun(b, a)).toBe(b);
    expect(newerRun(null, a)).toBe(a);
    expect(newerRun(null, null)).toBeNull();
  });

  it("answers null and empty when the table is not there", async () => {
    const missing = {
      from() {
        const chain = {
          select: () => chain,
          eq: () => chain,
          gte: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => ({ data: null, error: { code: "42P01" } }),
          then: (resolve: (v: unknown) => void) => resolve({ data: null, error: { code: "42P01" } }),
        };
        return chain;
      },
    };
    expect(await newestJobRun(missing, "canary")).toBeNull();
    expect((await jobRunDayTotals(missing, "2026-09-17")).size).toBe(0);
  });
});
