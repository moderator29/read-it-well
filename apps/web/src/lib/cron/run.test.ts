import { describe, expect, it, vi } from "vitest";
import { bearerMatches, cronAuthVerdict, fromPlatformScheduler } from "./auth";
import { executeCronJob, refusalAlert, type CronDeps } from "./run";
import type { CronRunRecord } from "./report";
import type { AdminClient } from "./rpc";

/**
 * The wrapper every job runs through, driven branch by branch with its
 * dependencies handed in. What is pinned: a wrong secret never reaches the
 * job; a missing service client is a 503 and a reported failure, never a
 * green 200; a job that throws is a 500 with the reason, reported; a clean
 * run and an attention run are both 200 with the verdict, reported once each;
 * and the report always carries the job name so the audit line and the alert
 * can be found again.
 */

const NOW = Date.parse("2026-09-18T12:00:00Z");

/** The client is never touched by these tests; the job receives it and that is all. */
const FAKE_ADMIN = {} as AdminClient;

function deps(overrides: Partial<CronDeps> = {}): CronDeps & { reports: CronRunRecord[] } {
  const reports: CronRunRecord[] = [];
  let tick = 0;
  return {
    refused: null,
    admin: FAKE_ADMIN,
    report: async (_admin, record) => {
      reports.push(record);
    },
    now: () => NOW + 25 * tick++,
    reports,
    ...overrides,
  };
}

describe("the bearer guard", () => {
  it("matches the bearer, in constant time, and refuses an unset secret", () => {
    expect(bearerMatches("Bearer s3cret", "s3cret")).toBe(true);
    expect(bearerMatches("Bearer s3cre", "s3cret")).toBe(false);
    expect(bearerMatches("s3cret", "s3cret")).toBe(false);
    expect(bearerMatches("Basic s3cret", "s3cret")).toBe(false);
    expect(bearerMatches(null, "s3cret")).toBe(false);
    expect(bearerMatches("Bearer ", "s3cret")).toBe(false);
    expect(bearerMatches("Bearer anything", "")).toBe(false);
  });

  /*
   * A DELIBERATE REVERSAL, AND THE ASSERTION IT REPLACES IS NAMED SO NOBODY
   * RESTORES IT BY ACCIDENT.
   *
   * This file used to assert `bearerMatches("Bearer s3cret ", "s3cret")` was
   * FALSE, on the reading that only an exact bearer may pass. That reading
   * cost this platform four days: a secret reaches a deployment by somebody
   * pasting it into a dashboard field, a paste carries a trailing newline
   * more often than not, and with neither side trimmed the lengths differed,
   * the length guard refused before any comparison happened, and every
   * scheduled job was answered 401 by its own platform. Nothing in the
   * refusal could say why, because a wrong secret and a right secret with a
   * newline on the end are the same event from inside the door.
   *
   * IT COSTS NOTHING IN SECURITY, which is the part worth being sure about.
   * Whitespace at either end of a bearer token carries no meaning, and
   * anybody presenting the right secret with a newline attached ALREADY HAS
   * THE SECRET. Trimming widens what is accepted by exactly the set of values
   * that differ from the real one by whitespace, and every member of that set
   * is already in possession of it. The comparison over what remains is still
   * constant time.
   */
  it("accepts a pasted secret, whichever side carries the whitespace", () => {
    expect(bearerMatches("Bearer s3cret ", "s3cret")).toBe(true);
    expect(bearerMatches("Bearer s3cret\n", "s3cret")).toBe(true);
    expect(bearerMatches("Bearer s3cret", "s3cret\n")).toBe(true);
    expect(bearerMatches("Bearer s3cret\r\n", "s3cret\n")).toBe(true);
    expect(bearerMatches("Bearer \ts3cret\t", "s3cret")).toBe(true);
  });

  it("still refuses a secret that is whitespace and nothing else", () => {
    expect(bearerMatches("Bearer   ", "   ")).toBe(false);
    expect(bearerMatches("Bearer \n", "s3cret")).toBe(false);
  });

  /*
   * THE THREE FAULTS THAT USED TO LOOK IDENTICAL.
   *
   * A 401 from this door was one undifferentiated event, and on 22 September
   * three separate wrong diagnoses were offered before anybody read the
   * variable list: the secret was rotated on one side, then a pasted newline
   * made the values differ, and only the third reading was right, that the
   * project held `CRONS_SECRET` while Vercel reads `CRON_SECRET`, so every
   * request arrived carrying no bearer at all. The information was always
   * there. Nothing was carrying it.
   */
  it("names WHICH refusal it was, because all three used to read the same", () => {
    const withHeader = (value?: string) =>
      new Request("https://vallo.test/api/cron/hold-sweep", {
        headers: value === undefined ? {} : { authorization: value },
      });

    vi.stubEnv("RECONCILE_CRON_SECRET", "s3cret");
    // The real fault: Vercel injected nothing, because its variable is misnamed.
    expect(cronAuthVerdict(withHeader())).toBe("no-bearer");
    expect(cronAuthVerdict(withHeader("Bearer   "))).toBe("no-bearer");
    // The one everybody assumes first, and which was NOT what happened.
    expect(cronAuthVerdict(withHeader("Bearer wrong"))).toBe("secret-mismatch");
    expect(cronAuthVerdict(withHeader("Bearer s3cret"))).toBe("ok");

    // And a door with no secret refuses everyone, including a correct caller.
    vi.stubEnv("RECONCILE_CRON_SECRET", "");
    expect(cronAuthVerdict(withHeader("Bearer s3cret"))).toBe("no-secret-configured");
  });

  it("tells the desk the fix for the fault it actually had", () => {
    const bare = refusalAlert("hold-sweep", true, "no-bearer");
    expect(String(bare.detail?.fix)).toContain("CRON_SECRET");
    expect(String(bare.detail?.fix)).toContain("name");
    expect(bare.detail?.reason).toBe("no-bearer");

    const mismatch = refusalAlert("hold-sweep", true, "secret-mismatch");
    expect(String(mismatch.detail?.fix)).toContain("must equal");
    expect(mismatch.detail?.reason).toBe("secret-mismatch");

    // The two say different things, which is the whole point.
    expect(String(bare.detail?.fix)).not.toBe(String(mismatch.detail?.fix));
  });

  it("still refuses a secret that differs by more than whitespace", () => {
    expect(bearerMatches("Bearer s3cret x", "s3cret")).toBe(false);
    expect(bearerMatches("Bearer s3 cret", "s3cret")).toBe(false);
  });
});

describe("executeCronJob", () => {
  it("refuses a bad secret before the job runs and reports nothing", async () => {
    const job = vi.fn(async () => ({ outcome: "ok" as const, counts: {}, detail: {}, alert: null }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps({ refused: { retryAfterSeconds: 0 } });
    const outcome = await executeCronJob("hold-sweep", job, d);
    warn.mockRestore();
    expect(outcome.status).toBe(401);
    expect(outcome.body).toMatchObject({ ok: false, job: "hold-sweep", reason: "unauthorised" });
    expect(job).not.toHaveBeenCalled();
    expect(d.reports).toEqual([]);
  });

  it("answers a sprayer with 429 and a retry-after", async () => {
    const job = vi.fn(async () => ({ outcome: "ok" as const, counts: {}, detail: {}, alert: null }));
    const outcome = await executeCronJob("hold-sweep", job, deps({ refused: { retryAfterSeconds: 90 } }));
    expect(outcome.status).toBe(429);
    expect(outcome.retryAfterSeconds).toBe(90);
    expect(outcome.body).toMatchObject({ ok: false, reason: "too_many_failures" });
    expect(job).not.toHaveBeenCalled();
  });

  it("is a 503 and a reported failure when there is no service client", async () => {
    const job = vi.fn(async () => ({ outcome: "ok" as const, counts: {}, detail: {}, alert: null }));
    const d = deps({ admin: null });
    const outcome = await executeCronJob("complete-stays", job, d);
    expect(outcome.status).toBe(503);
    expect(outcome.body).toMatchObject({ ok: false, reason: "service_role_key_missing" });
    expect(job).not.toHaveBeenCalled();
    expect(d.reports).toEqual([
      { job: "complete-stays", outcome: "failed", durationMs: 0, reason: "service_role_key_missing" },
    ]);
  });

  it("turns a thrown job into a 500 with the reason, reported once", async () => {
    const job = async () => {
      throw new Error("expire_booking_holds: function does not exist");
    };
    const d = deps();
    const outcome = await executeCronJob("hold-sweep", job, d);
    expect(outcome.status).toBe(500);
    expect(outcome.body).toMatchObject({
      ok: false,
      job: "hold-sweep",
      reason: "expire_booking_holds: function does not exist",
    });
    expect(d.reports).toHaveLength(1);
    expect(d.reports[0]).toMatchObject({ job: "hold-sweep", outcome: "failed", durationMs: 25 });
  });

  it("answers a clean run with the verdict and reports it with the counts", async () => {
    const job = async (admin: AdminClient) => {
      expect(admin).toBe(FAKE_ADMIN);
      return { outcome: "ok" as const, counts: { released: 2 }, detail: { released: ["a", "b"] }, alert: null };
    };
    const d = deps();
    const outcome = await executeCronJob("hold-sweep", job, d);
    expect(outcome.status).toBe(200);
    expect(outcome.body).toEqual({
      ok: true,
      job: "hold-sweep",
      outcome: "ok",
      startedAt: "2026-09-18T12:00:00.000Z",
      durationMs: 25,
      counts: { released: 2 },
      detail: { released: ["a", "b"] },
    });
    expect(d.reports).toEqual([
      { job: "hold-sweep", outcome: "ok", durationMs: 25, counts: { released: 2 }, alert: null },
    ]);
  });

  it("passes an attention verdict's alert through to the reporter", async () => {
    const alert = { kind: "cron.inventory_drift.found", severity: "critical" as const, detail: { row_count: 1 } };
    const job = async () => ({ outcome: "attention" as const, counts: { room_nights: 1 }, detail: {}, alert });
    const d = deps();
    const outcome = await executeCronJob("inventory-drift", job, d);
    expect(outcome.status).toBe(200);
    expect(outcome.body).toMatchObject({ ok: true, outcome: "attention" });
    expect(d.reports[0]).toMatchObject({ job: "inventory-drift", outcome: "attention", alert });
  });
});

/**
 * WHO WAS REFUSED. Measured on this project on 22 September 2026: 256 open
 * rows on the alerts desk reading "Cron: ... unauthorised" at MEDIUM, one per
 * scheduled run of all seven jobs since 19 September, every one of them
 * meaning the job did not run and not one of them saying it. These pin the
 * difference so it cannot be flattened back into one colour.
 */
describe("a refused scheduler is not a refused stranger", () => {
  const withAgent = (agent: string | null) =>
    new Request("https://vallospaces.com/api/cron/hold-sweep", {
      headers: agent === null ? {} : { "user-agent": agent },
    });

  it("recognises the platform scheduler by its own user agent and nothing else", () => {
    expect(fromPlatformScheduler(withAgent("vercel-cron/1.0"))).toBe(true);
    expect(fromPlatformScheduler(withAgent("Vercel-Cron/1.0"))).toBe(true);
    expect(fromPlatformScheduler(withAgent("Mozilla/5.0"))).toBe(false);
    expect(fromPlatformScheduler(withAgent("curl/8.4.0"))).toBe(false);
    expect(fromPlatformScheduler(withAgent(null))).toBe(false);
  });

  it("calls a locked out scheduler critical, and says the job did not run", () => {
    const alert = refusalAlert("hold-sweep", true);
    expect(alert.kind).toBe("cron.hold_sweep.locked_out");
    expect(alert.severity).toBe("critical");
    expect(alert.detail).toMatchObject({ http_status: 401, scheduler: "vercel-cron", ran: false });
    expect(alert.subjectId).toBe("hold-sweep");
    expect(alert.subjectKind).toBe("cron_job");
  });

  it("leaves a stranger at the level a stranger deserves", () => {
    const alert = refusalAlert("hold-sweep", false);
    expect(alert.kind).toBe("cron.hold_sweep.unauthorised");
    expect(alert.severity).toBe("warning");
    expect(alert.detail).toMatchObject({ ran: false });
  });
});
