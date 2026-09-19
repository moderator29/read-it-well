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
  it("does not throw when the audit insert answers with an error", async () => {
    insertError = { message: "permission denied" };
    await expect(
      reportCronRun(fakeAdmin(), { job: "hold-sweep", outcome: "ok", durationMs: 1 }),
    ).resolves.toBeUndefined();
  });

  it("does not throw when the audit insert throws, and the failure alert still goes", async () => {
    insertThrows = true;
    await expect(
      reportCronRun(fakeAdmin(), {
        job: "hold-sweep",
        outcome: "failed",
        durationMs: 1,
        reason: "postgres is away",
      }),
    ).resolves.toBeUndefined();
    expect(onlyAlert().kind).toBe("cron.hold_sweep.failed");
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
