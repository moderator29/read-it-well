import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE RULE THIS FILE EXISTS TO HOLD: a job that has stopped firing is
 * INVISIBLE unless its last clean run has a date on it.
 *
 * `lib/cron/report.ts` is where that date comes from. Two rows per run at
 * most, and the split between them is the whole convention:
 *
 *   audit_log    EVERY run, clean or not, `cron.<job>.<outcome>` against
 *                entity cron_job/<job>, with the counts and the duration. It
 *                is the run history, and it is the only way to see a job that
 *                has quietly died, because a job that does not run raises
 *                nothing.
 *   risk_alerts  ONLY a run that needs a person: a failure, or a clean run
 *                that found something. The desk's badge counts attention, not
 *                the clock.
 *
 * `run.test.ts` proves the wrapper around the job with the reporter faked, so
 * the reporter itself was the one piece of the chain nothing drove. It does
 * now, including the two shapes that matter most and are the easiest to break
 * without noticing: a CLEAN run still writes its row, and a reporter that
 * cannot write anything still refuses to throw, because a reporter that could
 * take a job down would be the one silent failure this module exists to end.
 */

type AuditRow = Record<string, unknown>;

const alerts = vi.hoisted(() => ({ recordAlert: vi.fn() }));
vi.mock("../alerts", () => alerts);

const { reportCronRun } = await import("./report");

let audited: AuditRow[] = [];
let insertError: { message: string } | null = null;
let insertThrows = false;

function fakeAdmin() {
  return {
    from(table: string) {
      return {
        async insert(row: AuditRow) {
          if (insertThrows) throw new Error("postgres is away");
          audited.push({ table, ...row });
          return { error: insertError };
        },
      };
    },
  } as never;
}

/** The one row this run wrote, or a loud failure rather than an index into nothing. */
function onlyAudit(): AuditRow {
  expect(audited).toHaveLength(1);
  return audited[0] as AuditRow;
}

/** The one alert this run raised, same contract. */
function onlyAlert(): Record<string, unknown> {
  expect(alerts.recordAlert).toHaveBeenCalledTimes(1);
  return alerts.recordAlert.mock.calls[0]?.[0] as Record<string, unknown>;
}

beforeEach(() => {
  audited = [];
  insertError = null;
  insertThrows = false;
  alerts.recordAlert.mockReset();
  alerts.recordAlert.mockResolvedValue({ ok: true, id: "alert", deduplicated: false });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("every run leaves a dated row", () => {
  it("writes the audit row for a CLEAN run and raises nothing", async () => {
    await reportCronRun(fakeAdmin(), {
      job: "hold-sweep",
      outcome: "ok",
      durationMs: 1234.7,
      counts: { released: 3, paid_pending: 0 },
    });

    const row = onlyAudit();
    expect(row).toMatchObject({
      table: "audit_log",
      actor_id: null,
      action: "cron.hold-sweep.ok",
      entity_type: "cron_job",
      entity_id: "hold-sweep",
    });
    expect(row.metadata).toEqual({
      outcome: "ok",
      duration_ms: 1234,
      released: 3,
      paid_pending: 0,
    });
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });

  it("writes the audit row for an ATTENTION run and raises exactly the verdict's alert", async () => {
    await reportCronRun(fakeAdmin(), {
      job: "inventory-drift",
      outcome: "attention",
      durationMs: 10,
      counts: { room_nights: 2 },
      alert: {
        kind: "cron.inventory_drift.found",
        severity: "critical",
        detail: { room_nights: 2, today: "2026-09-19" },
      },
    });

    expect(onlyAudit()).toMatchObject({ action: "cron.inventory-drift.attention" });
    expect(onlyAlert()).toMatchObject({
      kind: "cron.inventory_drift.found",
      severity: "critical",
      subjectId: "inventory-drift",
      subjectKind: "cron_job",
    });
  });

  it("raises nothing for an attention run that carried no alert, and still writes the row", async () => {
    await reportCronRun(fakeAdmin(), {
      job: "pg-cron-watch",
      outcome: "attention",
      durationMs: 5,
      alert: null,
    });
    expect(onlyAudit()).toMatchObject({ action: "cron.pg-cron-watch.attention" });
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });

  it("writes the audit row for a FAILED run and raises one critical alert carrying the reason", async () => {
    await reportCronRun(fakeAdmin(), {
      job: "complete-stays",
      outcome: "failed",
      durationMs: 42,
      reason: "complete_ended_stays: connection reset",
    });

    const row = onlyAudit();
    expect(row).toMatchObject({ action: "cron.complete-stays.failed" });
    expect(row.metadata).toMatchObject({ reason: "complete_ended_stays: connection reset" });
    expect(onlyAlert()).toMatchObject({
      kind: "cron.complete_stays.failed",
      severity: "critical",
    });
  });

  /* The hyphen in a job name becomes an underscore for the alert token,
     because the desk searches the token and `cron.hold-sweep.failed` does not
     read as one. */
  it("turns the job name into an alert token with underscores", async () => {
    await reportCronRun(fakeAdmin(), { job: "hold-sweep", outcome: "failed", durationMs: 0 });
    expect(onlyAlert().kind).toBe("cron.hold_sweep.failed");
  });
});

describe("the reporter never becomes the failure", () => {
  it("does not throw when the audit insert answers with an error, and says the history is gone", async () => {
    insertError = { message: "permission denied" };
    await expect(
      reportCronRun(fakeAdmin(), { job: "hold-sweep", outcome: "ok", durationMs: 1 }),
    ).resolves.toBeUndefined();
    /* A CLEAN run whose row did not land. Nothing else in the platform would
       ever have said so: the envelope is a 200, the scheduler is green, and
       the freshness watch reads the absence as a job that was never deployed.
       This alert is the only thing standing between that and three weeks. */
    expect(onlyAlert()).toMatchObject({
      kind: "cron.hold_sweep.unrecorded",
      severity: "critical",
      subjectId: "hold-sweep",
      subjectKind: "cron_job",
    });
    expect((onlyAlert().detail as Record<string, unknown>).reason).toBe("permission denied");
  });

  it("does not throw when the audit insert throws, and raises BOTH the lost history and the failure", async () => {
    insertThrows = true;
    await expect(
      reportCronRun(fakeAdmin(), {
        job: "hold-sweep",
        outcome: "failed",
        durationMs: 1,
        reason: "postgres is away",
      }),
    ).resolves.toBeUndefined();
    expect(alerts.recordAlert).toHaveBeenCalledTimes(2);
    const kinds = alerts.recordAlert.mock.calls.map((call) => (call[0] as { kind: string }).kind);
    expect(kinds).toEqual(["cron.hold_sweep.unrecorded", "cron.hold_sweep.failed"]);
  });

  it("says so loudly when there is no service client at all", async () => {
    await reportCronRun(null, {
      job: "hold-sweep",
      outcome: "failed",
      durationMs: 0,
      reason: "service_role_key_missing",
    });
    expect(audited).toEqual([]);
    expect(onlyAlert()).toMatchObject({
      kind: "cron.hold_sweep.unconfigured",
      severity: "critical",
    });
  });

  it("never lets a negative or fractional duration into the row", async () => {
    await reportCronRun(fakeAdmin(), { job: "hold-sweep", outcome: "ok", durationMs: -7.9 });
    expect((onlyAudit().metadata as Record<string, unknown>).duration_ms).toBe(0);
  });
});

describe("clean runs and repeats leave the trail once job_runs exists (C7)", () => {
  function adminWithJobRuns(rpcError: unknown = null) {
    const calls: { fn: string; args: Record<string, unknown> }[] = [];
    const admin = {
      from(table: string) {
        return {
          async insert(row: AuditRow) {
            audited.push({ table, ...row });
            return { error: null };
          },
        };
      },
      async rpc(fn: string, args: Record<string, unknown>) {
        calls.push({ fn, args });
        return { error: rpcError };
      },
    } as never;
    return { admin, calls };
  }

  it("counts a clean run in job_runs and writes no audit row", async () => {
    const { admin, calls } = adminWithJobRuns();
    await reportCronRun(admin, { job: "canary", outcome: "ok", durationMs: 12 });
    expect(audited).toEqual([]);
    expect(calls).toEqual([{ fn: "record_job_run", args: expect.objectContaining({ p_job: "canary", p_outcome: "ok" }) }]);
  });

  it("falls back to the audit row when job_runs is not installed", async () => {
    const { admin } = adminWithJobRuns({ code: "PGRST202", message: "not found" });
    await reportCronRun(admin, { job: "canary", outcome: "ok", durationMs: 12 });
    expect(onlyAudit()).toMatchObject({ action: "cron.canary.ok" });
  });

  it("writes the first attention run for a cause to the trail, and counts a repeat", async () => {
    const first = adminWithJobRuns();
    await reportCronRun(first.admin, {
      job: "sanctions-screen",
      outcome: "attention",
      durationMs: 5,
      alert: { kind: "sanctions.screen_failed", severity: "warning", detail: { failed: 1 } },
    });
    expect(onlyAudit()).toMatchObject({ action: "cron.sanctions-screen.attention" });
    expect(alerts.recordAlert).toHaveBeenCalledTimes(1);

    audited = [];
    alerts.recordAlert.mockReset();
    alerts.recordAlert.mockResolvedValue({ ok: true, id: "alert", deduplicated: true });
    const again = adminWithJobRuns();
    await reportCronRun(again.admin, {
      job: "sanctions-screen",
      outcome: "attention",
      durationMs: 5,
      alert: { kind: "sanctions.screen_failed", severity: "warning", detail: { failed: 1 } },
    });
    expect(audited).toEqual([]);
    expect(again.calls[0]).toMatchObject({ fn: "record_job_run", args: { p_outcome: "repeat" } });
    expect(alerts.recordAlert).toHaveBeenCalledTimes(1);
  });

  it("never moves a failed run out of the trail", async () => {
    const { admin, calls } = adminWithJobRuns();
    await reportCronRun(admin, { job: "canary", outcome: "failed", durationMs: 1, reason: "boom" });
    expect(onlyAudit()).toMatchObject({ action: "cron.canary.failed" });
    expect(calls).toEqual([]);
  });
});

/**
 * C13: A SKIPPED RUN (the job's feature flag was off) is counted and NEVER
 * alerted. It prefers its own `skipped` outcome in job_runs, falls back to a
 * counted clean run marked `skipped: true` while the pending migration has
 * not widened record_job_run, and only writes the trail when the counter is
 * missing altogether.
 */
describe("a skipped run stays off the desk", () => {
  function rpcAdmin(accepts: (outcome: string) => boolean) {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const base = fakeAdmin() as unknown as Record<string, unknown>;
    return {
      calls,
      admin: {
        ...base,
        from: (base as { from: unknown }).from,
        async rpc(fn: string, args: Record<string, unknown>) {
          calls.push({ fn, args });
          return { error: accepts(String(args.p_outcome)) ? null : { message: "unknown outcome" } };
        },
      } as never,
    };
  }

  const skipped = { job: "landlord-line", outcome: "skipped" as const, durationMs: 3, reason: "flag_off", flag: "landlord_line" };

  it("counts it under its own outcome once the migration is applied", async () => {
    const { admin, calls } = rpcAdmin(() => true);
    await reportCronRun(admin, skipped);
    expect(calls).toEqual([
      {
        fn: "record_job_run",
        args: {
          p_job: "landlord-line",
          p_outcome: "skipped",
          p_metadata: { outcome: "skipped", duration_ms: 3, reason: "flag_off", flag: "landlord_line" },
        },
      },
    ]);
    expect(audited).toEqual([]);
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });

  it("counts it as a clean run marked skipped before the migration", async () => {
    const { admin, calls } = rpcAdmin((outcome) => outcome !== "skipped");
    await reportCronRun(admin, skipped);
    expect(calls.map((c) => c.args.p_outcome)).toEqual(["skipped", "ok"]);
    expect(calls[1]!.args.p_metadata).toMatchObject({ outcome: "skipped", skipped: true, reason: "flag_off" });
    expect(audited).toEqual([]);
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });

  it("writes one trail row, and still no alert, when there is no counter at all", async () => {
    await reportCronRun(fakeAdmin(), skipped);
    expect(onlyAudit()).toMatchObject({ action: "cron.landlord-line.skipped", entity_id: "landlord-line" });
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });
});
