import { describe, expect, it } from "vitest";
import {
  ALERT_ID_LIMIT,
  HOLD_TTL_HOURS,
  completionDecision,
  completionSweepVerdict,
  cronWatchVerdict,
  describeDriftRow,
  driftSeverity,
  driftVerdict,
  holdDecision,
  holdSweepVerdict,
  lagosToday,
  NO_SHOW_MESSAGES,
  noShowDecision,
  noShowInputSchema,
  noShowOpensAt,
  parseCompletionSweepResult,
  parseCronFailures,
  parseDriftReport,
  parseHoldSweepResult,
  parseNoShowOutcome,
  spreadIds,
  sweepCompletions,
  sweepHolds,
  type DriftRow,
  type HoldRow,
  type StayRow,
} from "./lifecycle";
import { HOLD_WINDOW_HOURS } from "../agent/bookings-model";

/**
 * The lifecycle rules, proved against a fixed clock.
 *
 * The database moves the rows (the B4 functions, probed by
 * scripts/probes/b4_lifecycle.sh with the same cases). What is pinned here
 * is the rule each move follows and what the sweep then says about it: which
 * rows qualify, what they move to, what is reported and never touched, and
 * that the report shape the SQL returns is read strictly. Every case asks
 * whether the function invents anything: a hold released a minute early, a
 * paid booking cancelled, a stay completed on its own check-out morning, a
 * no show guessed.
 */

const HOUR = 3_600_000;
const NOW = Date.parse("2026-09-18T12:00:00Z");
const TODAY = "2026-09-18";

const ID_A = "00000000-0000-4000-8000-0000000000d1";
const ID_B = "00000000-0000-4000-8000-0000000000d2";
const ID_C = "00000000-0000-4000-8000-0000000000d3";

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * HOUR).toISOString();
}

function hold(overrides: Partial<HoldRow> = {}): HoldRow {
  return { id: ID_A, status: "PENDING", createdAt: hoursAgo(50), paid: false, ...overrides };
}

function stay(overrides: Partial<StayRow> = {}): StayRow {
  return {
    id: ID_A,
    status: "CONFIRMED",
    checkIn: "2026-09-14",
    checkOut: "2026-09-17",
    paid: true,
    ...overrides,
  };
}

describe("the clock", () => {
  it("shares the hold window with the host console", () => {
    expect(HOLD_TTL_HOURS).toBe(HOLD_WINDOW_HOURS);
    expect(HOLD_TTL_HOURS).toBe(48);
  });

  it("reads today in Lagos, not in UTC", () => {
    // 23:30 UTC is 00:30 the next day in Lagos (UTC+1, no daylight saving).
    expect(lagosToday(new Date("2026-09-18T23:30:00Z"))).toBe("2026-09-19");
    expect(lagosToday(new Date("2026-09-18T22:30:00Z"))).toBe("2026-09-18");
  });
});

describe("hold expiry", () => {
  it("releases an unpaid PENDING hold once the window has passed", () => {
    expect(holdDecision(hold({ createdAt: hoursAgo(48) }), NOW)).toBe("release");
    expect(holdDecision(hold({ createdAt: hoursAgo(200) }), NOW)).toBe("release");
  });

  it("keeps a hold that is a second inside the window", () => {
    const justInside = new Date(NOW - 48 * HOUR + 1_000).toISOString();
    expect(holdDecision(hold({ createdAt: justInside }), NOW)).toBe("keep");
  });

  it("never cancels a paid booking: it is reported, not moved", () => {
    expect(holdDecision(hold({ paid: true }), NOW)).toBe("paid_pending");
  });

  it("only a PENDING booking is a hold", () => {
    for (const status of ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const) {
      expect(holdDecision(hold({ status }), NOW)).toBe("keep");
    }
  });

  it("keeps a row whose timestamp cannot be read rather than guessing", () => {
    expect(holdDecision(hold({ createdAt: "not a date" }), NOW)).toBe("keep");
  });

  it("honours a different window when given one", () => {
    expect(holdDecision(hold({ createdAt: hoursAgo(3) }), NOW, 2)).toBe("release");
    expect(holdDecision(hold({ createdAt: hoursAgo(3) }), NOW, 4)).toBe("keep");
  });

  it("sweeps a set into the ids to release and the ids to report", () => {
    const result = sweepHolds(
      [
        hold({ id: ID_A }),
        hold({ id: ID_B, paid: true }),
        hold({ id: ID_C, createdAt: hoursAgo(1) }),
      ],
      NOW,
    );
    expect(result).toEqual({ release: [ID_A], paidPending: [ID_B] });
  });
});

describe("completion at check-out", () => {
  it("completes a paid confirmed stay the day after check-out", () => {
    expect(completionDecision(stay({ checkOut: "2026-09-17" }), TODAY)).toBe("complete");
  });

  it("leaves the check-out day itself to the host", () => {
    expect(completionDecision(stay({ checkOut: TODAY }), TODAY)).toBe("keep");
    expect(completionDecision(stay({ checkOut: "2026-09-19" }), TODAY)).toBe("keep");
  });

  it("reports an ended stay nobody paid for instead of guessing it happened", () => {
    expect(completionDecision(stay({ paid: false }), TODAY)).toBe("unpaid_ended");
  });

  it("only a CONFIRMED stay can end", () => {
    for (const status of ["PENDING", "COMPLETED", "NO_SHOW", "CANCELLED"] as const) {
      expect(completionDecision(stay({ status }), TODAY)).toBe("keep");
    }
  });

  it("sweeps a set into the ids to complete and the ids to report", () => {
    const result = sweepCompletions(
      [
        stay({ id: ID_A }),
        stay({ id: ID_B, paid: false }),
        stay({ id: ID_C, checkOut: TODAY }),
      ],
      TODAY,
    );
    expect(result).toEqual({ complete: [ID_A], unpaidEnded: [ID_B] });
  });
});

describe("no show", () => {
  it("may be recorded from 12:00 WAT the day after check-in on a confirmed stay (ESC-04)", () => {
    const now = new Date(NOW);
    expect(noShowDecision({ status: "CONFIRMED", checkIn: "2026-09-17" }, TODAY, now)).toBe("record");
    expect(noShowDecision({ status: "CONFIRMED", checkIn: "2026-09-10" }, TODAY, now)).toBe("record");
    expect(noShowOpensAt("2026-09-17").toISOString()).toBe("2026-09-18T11:00:00.000Z");
  });

  it("is refused on arrival day and until 12:00 WAT the next day (ESC-04)", () => {
    expect(
      noShowDecision({ status: "CONFIRMED", checkIn: TODAY }, TODAY, new Date("2026-09-18T23:59:00Z")),
    ).toBe("too_early");
    expect(
      noShowDecision({ status: "CONFIRMED", checkIn: "2026-09-17" }, TODAY, new Date("2026-09-18T10:59:00Z")),
    ).toBe("too_early");
    expect(
      noShowDecision({ status: "CONFIRMED", checkIn: "2026-09-17" }, TODAY, new Date("2026-09-18T11:00:00Z")),
    ).toBe("record");
    expect(NO_SHOW_MESSAGES.too_early).toMatch(/12:00 the day after check-in/);
  });

  it("is refused before arrival day", () => {
    expect(noShowDecision({ status: "CONFIRMED", checkIn: "2026-09-19" }, TODAY)).toBe("not_arrived");
    expect(NO_SHOW_MESSAGES.not_arrived).not.toMatch(/come back on the day/i);
  });

  it("is never recorded twice and never on a stay that is not confirmed", () => {
    expect(noShowDecision({ status: "NO_SHOW", checkIn: TODAY }, TODAY)).toBe("already");
    expect(noShowDecision({ status: "PENDING", checkIn: TODAY }, TODAY)).toBe("not_confirmed");
    expect(noShowDecision({ status: "COMPLETED", checkIn: TODAY }, TODAY)).toBe("not_confirmed");
    expect(noShowDecision({ status: "CANCELLED", checkIn: TODAY }, TODAY)).toBe("not_confirmed");
  });

  it("accepts a booking id and an optional bounded note", () => {
    expect(noShowInputSchema.safeParse({ bookingId: ID_A }).success).toBe(true);
    expect(noShowInputSchema.safeParse({ bookingId: ID_A, note: "  Called twice.  " }).data?.note).toBe(
      "Called twice.",
    );
    expect(noShowInputSchema.safeParse({ bookingId: "nope" }).success).toBe(false);
    expect(noShowInputSchema.safeParse({ bookingId: ID_A, note: "x".repeat(501) }).success).toBe(false);
  });
});

describe("the database's answers are read strictly", () => {
  it("parses a hold sweep result and refuses a malformed one", () => {
    expect(parseHoldSweepResult({ released: [ID_A], paid_pending: [], ttl_hours: 48 })).toEqual({
      released: [ID_A],
      paidPending: [],
      ttlHours: 48,
    });
    expect(() => parseHoldSweepResult({ released: ["nope"], paid_pending: [], ttl_hours: 48 })).toThrow();
    expect(() => parseHoldSweepResult(null)).toThrow();
  });

  it("parses a completion sweep result", () => {
    expect(
      parseCompletionSweepResult({ completed: [], unpaid_ended: [ID_B], today: TODAY }),
    ).toEqual({ completed: [], unpaidEnded: [ID_B], today: TODAY });
    expect(() => parseCompletionSweepResult({ completed: [] })).toThrow();
  });

  it("parses every no show outcome", () => {
    expect(parseNoShowOutcome({ outcome: "recorded", booking_id: ID_A })).toEqual({
      outcome: "recorded",
      booking_id: ID_A,
    });
    expect(parseNoShowOutcome({ outcome: "not_confirmed", status: "PENDING" }).outcome).toBe("not_confirmed");
    expect(parseNoShowOutcome({ outcome: "missing" }).outcome).toBe("missing");
    expect(parseNoShowOutcome({ outcome: "too_early", opens_at: "2026-09-19T11:00:00+00:00" }).outcome).toBe(
      "too_early",
    );
    expect(parseNoShowOutcome({ outcome: "rent_charge" }).outcome).toBe("rent_charge");
    expect(NO_SHOW_MESSAGES.rent_charge).toMatch(/contact support/);
    expect(() => parseNoShowOutcome({ outcome: "guessed" })).toThrow();
  });

  it("parses a drift report into one flat list of rows", () => {
    const report = parseDriftReport({
      today: TODAY,
      room_spine: false,
      room_nights: [
        { kind: "room_night", room_type_id: ID_A, date: "2026-09-23", units_booked: 1, live_rooms: 0 },
      ],
      orphan_nights: [{ kind: "orphan_night", listing_id: ID_B, date: "2026-10-28" }],
      missing_nights: [{ kind: "missing_night", booking_id: ID_C, listing_id: ID_B, date: "2026-09-19" }],
    });
    expect(report.roomSpine).toBe(false);
    expect(report.rows.map((row) => row.kind)).toEqual(["room_night", "orphan_night", "missing_night"]);
    expect(() => parseDriftReport({ today: TODAY, room_spine: true })).toThrow();
  });

  it("parses the pg_cron failures, including the unavailable answer", () => {
    expect(parseCronFailures({ available: false, failures: [] })).toEqual({ available: false, failures: [] });
    const parsed = parseCronFailures({
      available: true,
      failures: [
        {
          jobid: 3,
          jobname: "vallo_release_stale_holds",
          runid: 900,
          status: "failed",
          start_time: "2026-09-18T02:15:00+00:00",
          return_message: "ERROR: something",
        },
      ],
    });
    expect(parsed.failures[0]).toEqual({
      jobId: 3,
      jobName: "vallo_release_stale_holds",
      runId: 900,
      status: "failed",
      startTime: "2026-09-18T02:15:00+00:00",
      returnMessage: "ERROR: something",
      recoveredAt: null,
    });
  });
});

describe("what a sweep says about its run", () => {
  it("spreads ids into their own keys so the alert scrubber keeps them", () => {
    const many = Array.from({ length: 25 }, (_, i) => `id-${i + 1}`);
    const spread = spreadIds("booking", many);
    expect(spread.booking_count).toBe(25);
    expect(spread.booking_1).toBe("id-1");
    expect(spread[`booking_${ALERT_ID_LIMIT}`]).toBe(`id-${ALERT_ID_LIMIT}`);
    expect(spread[`booking_${ALERT_ID_LIMIT + 1}`]).toBeUndefined();
    expect(spreadIds("x", [])).toEqual({ x_count: 0 });
  });

  it("a hold sweep is clean however many holds it released", () => {
    const verdict = holdSweepVerdict({ released: [ID_A, ID_B], paidPending: [], ttlHours: 48 });
    expect(verdict.outcome).toBe("ok");
    expect(verdict.counts).toEqual({ released: 2, paid_pending: 0 });
    expect(verdict.alert).toBeNull();
  });

  it("a paid booking left PENDING is critical and names the booking", () => {
    const verdict = holdSweepVerdict({ released: [], paidPending: [ID_B], ttlHours: 48 });
    expect(verdict.outcome).toBe("attention");
    expect(verdict.alert?.severity).toBe("critical");
    expect(verdict.alert?.kind).toBe("cron.hold_sweep.paid_still_pending");
    expect(verdict.alert?.detail).toEqual({ ttl_hours: 48, booking_count: 1, booking_1: ID_B });
  });

  it("an ended stay without a payment is a warning, a clean completion is not", () => {
    expect(completionSweepVerdict({ completed: [ID_A], unpaidEnded: [], today: TODAY }).outcome).toBe("ok");
    const verdict = completionSweepVerdict({ completed: [], unpaidEnded: [ID_C], today: TODAY });
    expect(verdict.outcome).toBe("attention");
    expect(verdict.alert?.severity).toBe("warning");
    expect(verdict.alert?.detail.booking_1).toBe(ID_C);
  });

  it("drift is as loud as its worst row", () => {
    const room: DriftRow = { kind: "room_night", room_type_id: ID_A, date: "2026-09-23", units_booked: 1, live_rooms: 0 };
    const orphan: DriftRow = { kind: "orphan_night", listing_id: ID_B, date: "2026-10-28" };
    const missing: DriftRow = { kind: "missing_night", booking_id: ID_C, listing_id: ID_B, date: "2026-09-19" };
    expect(driftSeverity([])).toBeNull();
    expect(driftSeverity([missing])).toBe("info");
    expect(driftSeverity([missing, orphan])).toBe("warning");
    expect(driftSeverity([missing, orphan, room])).toBe("critical");
  });

  it("a drift row is one short line with its ids in it", () => {
    expect(
      describeDriftRow({ kind: "room_night", room_type_id: ID_A, date: "2026-09-23", units_booked: 1, live_rooms: 0 }),
    ).toBe(`room_night ${ID_A} 2026-09-23 sold=1 live=0`);
    expect(describeDriftRow({ kind: "orphan_night", listing_id: ID_B, date: "2026-10-28" })).toBe(
      `orphan_night ${ID_B} 2026-10-28`,
    );
  });

  it("a clean drift report raises nothing and a dirty one carries every row", () => {
    expect(driftVerdict({ today: TODAY, roomSpine: false, rows: [] }).alert).toBeNull();
    const verdict = driftVerdict({
      today: TODAY,
      roomSpine: false,
      rows: [{ kind: "orphan_night", listing_id: ID_B, date: "2026-10-28" }],
    });
    expect(verdict.outcome).toBe("attention");
    expect(verdict.counts).toEqual({ room_nights: 0, orphan_nights: 1, missing_nights: 0 });
    expect(verdict.alert?.kind).toBe("cron.inventory_drift.found");
    expect(verdict.alert?.detail.row_count).toBe(1);
    expect(verdict.alert?.detail.row_1).toBe(`orphan_night ${ID_B} 2026-10-28`);
  });

  it("the pg_cron watch is quiet when the table is absent and loud on a failed job", () => {
    const absent = cronWatchVerdict({ available: false, failures: [] });
    expect(absent.outcome).toBe("ok");
    expect(absent.alert).toBeNull();
    expect(absent.detail.note).toMatch(/not readable/);

    expect(cronWatchVerdict({ available: true, failures: [] }).outcome).toBe("ok");

    const failed = cronWatchVerdict({
      available: true,
      failures: [
        {
          jobId: 3,
          jobName: "vallo_release_stale_holds",
          runId: 900,
          status: "failed",
          startTime: "2026-09-18T02:15:00+00:00",
          returnMessage: "ERROR: something",
          recoveredAt: null,
        },
      ],
    });
    expect(failed.outcome).toBe("attention");
    expect(failed.alert?.severity).toBe("critical");
    expect(failed.alert?.detail.failure_1).toBe(
      "vallo_release_stale_holds run 900 at 2026-09-18T02:15:00+00:00: ERROR: something",
    );
    expect(failed.counts).toMatchObject({ failures: 1, standing: 1, recovered: 0 });
  });

  /*
   * THE REAL CASE, WITH THE REAL NUMBERS OFF THIS PROJECT.
   *
   * `vallo_reconcile_payments` run 8187 failed at 15:47 on 22 September on a
   * pasted newline in the site URL. It was fixed at 17:37 and succeeded on its
   * own schedule at 18:47. The watch raised it as a fresh CRITICAL at 18:20
   * and, on a 25 hour window, would have raised it hourly until the following
   * afternoon: twenty-two critical alerts about one fault that was already
   * fixed.
   */
  it("does not shout about a job that failed and has succeeded since", () => {
    const recovered = cronWatchVerdict({
      available: true,
      failures: [
        {
          jobId: 7,
          jobName: "vallo_reconcile_payments",
          runId: 8187,
          status: "failed",
          startTime: "2026-09-22T15:47:00+00:00",
          returnMessage: "ERROR: invalid URL",
          recoveredAt: "2026-09-22T18:47:00+00:00",
        },
      ],
    });
    expect(recovered.alert).toBeNull();
    expect(recovered.outcome).toBe("ok");

    // Counted and named, never discarded: a flapping job must still be visible.
    expect(recovered.counts).toMatchObject({ failures: 1, standing: 0, recovered: 1 });
    expect(recovered.detail.recovered_1).toBe(
      "vallo_reconcile_payments run 8187 failed at 2026-09-22T15:47:00+00:00, succeeded again at 2026-09-22T18:47:00+00:00",
    );
  });

  it("still shouts when one job recovered and another has not", () => {
    const mixed = cronWatchVerdict({
      available: true,
      failures: [
        {
          jobId: 7,
          jobName: "vallo_reconcile_payments",
          runId: 8187,
          status: "failed",
          startTime: "2026-09-22T15:47:00+00:00",
          returnMessage: "ERROR: invalid URL",
          recoveredAt: "2026-09-22T18:47:00+00:00",
        },
        {
          jobId: 3,
          jobName: "vallo_release_stale_holds",
          runId: 901,
          status: "failed",
          startTime: "2026-09-22T18:15:00+00:00",
          returnMessage: "ERROR: still broken",
          recoveredAt: null,
        },
      ],
    });
    expect(mixed.outcome).toBe("attention");
    expect(mixed.alert?.severity).toBe("critical");
    // ONLY the standing one is named, and it is named first rather than second.
    expect(mixed.alert?.detail.failure_count).toBe(1);
    expect(mixed.alert?.detail.failure_1).toBe(
      "vallo_release_stale_holds run 901 at 2026-09-22T18:15:00+00:00: ERROR: still broken",
    );
    // And the desk is told what was left out, so a one-job alert cannot be
    // mistaken for the whole picture.
    expect(mixed.alert?.detail.recovered_and_not_alerted).toBe(1);
  });

  /*
   * A DEPLOY CAN REACH A DATABASE WHERE THE MIGRATION HAS NOT RUN, and the
   * field is then simply absent. The silent default would be to read an
   * unknown recovery as a recovery, which is a way for a real outage to go
   * unreported because a migration was late. It reads as STANDING instead.
   */
  it("treats a missing recovered_at as still broken, not as recovered", () => {
    const parsed = parseCronFailures({
      available: true,
      failures: [
        {
          jobid: 3,
          jobname: "vallo_release_stale_holds",
          runid: 900,
          status: "failed",
          start_time: "2026-09-18T02:15:00+00:00",
          return_message: "ERROR: something",
        },
      ],
    });
    expect(parsed.failures[0]?.recoveredAt).toBeNull();
    expect(cronWatchVerdict(parsed).alert).not.toBeNull();
  });
});
