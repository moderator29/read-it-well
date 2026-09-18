import { z } from "zod";
import { HOLD_WINDOW_HOURS } from "../agent/bookings-schema";

/**
 * The booking lifecycle, as decisions.
 *
 * Three moves end a booking's life without a guest or a host tapping
 * anything, and one move is a host's call that the platform must never
 * make for them:
 *
 *   - a PENDING request nobody confirmed within the hold window is released
 *     (CANCELLED, the calendar returned, the guest told);
 *   - a paid CONFIRMED stay whose check-out day has passed is COMPLETED;
 *   - inventory that disagrees with the bookings behind it is reported, never
 *     corrected;
 *   - NO_SHOW is recorded by the host (or an admin) and only from arrival day.
 *
 * The database does the moving, in the B4 functions
 * (supabase/migrations/*_b4_booking_lifecycle_sweeps.sql), because each move
 * touches two or three tables and must happen whole. This module is the same
 * rules written where a test can reach them: which rows qualify, what they
 * move to, what the sweep should say about what it found. The cron jobs
 * under lib/cron/jobs use the parsers and verdicts here; the no-show action
 * uses the decision here to answer a host in plain words before the database
 * is asked at all. scripts/probes/b4_lifecycle.sh runs the same cases against
 * the SQL, so the two halves are held to one set of answers.
 *
 * No server-only import, on purpose: everything here is pure and the zod
 * schema is shared with the control that submits it.
 */

/* ------------------------------------------------------------- the clock */

/**
 * The hold window, in hours. Not a number this file chose: it is the 48 the
 * host console shows (lib/agent/bookings-schema.ts) and the 48 the database
 * function defaults to, and all three must stay one number.
 */
export const HOLD_TTL_HOURS = HOLD_WINDOW_HOURS;

/** Rows one sweep run may move. The SQL refuses anything above 5000. */
export const HOLD_SWEEP_LIMIT = 500;
export const COMPLETION_SWEEP_LIMIT = 500;
/** Drift rows reported per kind; enough to act on, small enough for one alert. */
export const DRIFT_REPORT_LIMIT = 200;
/** How far back the pg_cron watch looks. An hour past a day so a daily job is never missed. */
export const CRON_WATCH_WINDOW = "25 hours";
export const CRON_WATCH_LIMIT = 100;

const HOUR_MS = 3_600_000;

/**
 * Today in Lagos as `YYYY-MM-DD`. The date columns this is compared against
 * are Lagos calendar days, and the server runs in UTC; an hour either side of
 * midnight is the difference between a stay having ended and not.
 */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";

/* ------------------------------------------------------------ hold expiry */

export type HoldRow = {
  id: string;
  status: BookingStatus;
  /** ISO timestamp the booking was created. */
  createdAt: string;
  /** True when a SUCCESSFUL transaction exists for the booking. */
  paid: boolean;
};

export type HoldDecision =
  /** Older than the window, unpaid: cancel it and give the nights back. */
  | "release"
  /** Older than the window but money has moved: never cancel, report it. */
  | "paid_pending"
  /** Not PENDING, or still inside the window. */
  | "keep";

/**
 * Whether a hold has expired. Only a PENDING booking is a hold; a paid one
 * is a settlement that died between its two keys (lib/bookings/settlement.ts)
 * and is a person's job, not a sweep's.
 */
export function holdDecision(
  row: HoldRow,
  now: number,
  ttlHours: number = HOLD_TTL_HOURS,
): HoldDecision {
  if (row.status !== "PENDING") return "keep";
  const created = Date.parse(row.createdAt);
  if (!Number.isFinite(created)) return "keep";
  if (now - created < ttlHours * HOUR_MS) return "keep";
  return row.paid ? "paid_pending" : "release";
}

/** The sweep over a set of rows: which ids move and which are only reported. */
export function sweepHolds(
  rows: HoldRow[],
  now: number,
  ttlHours: number = HOLD_TTL_HOURS,
): { release: string[]; paidPending: string[] } {
  const release: string[] = [];
  const paidPending: string[] = [];
  for (const row of rows) {
    const decision = holdDecision(row, now, ttlHours);
    if (decision === "release") release.push(row.id);
    else if (decision === "paid_pending") paidPending.push(row.id);
  }
  return { release, paidPending };
}

/* ------------------------------------------------------------- completion */

export type StayRow = {
  id: string;
  status: BookingStatus;
  /** `YYYY-MM-DD`. */
  checkIn: string;
  checkOut: string;
  paid: boolean;
};

export type CompletionDecision =
  /** Paid, confirmed, and the check-out day is behind us. */
  | "complete"
  /** Confirmed and ended, but nobody paid: a person decides what happened. */
  | "unpaid_ended"
  | "keep";

/**
 * Whether a stay is over. Strictly before today, so the check-out day itself
 * stays with the host: it is the last day they can record a no show, and a
 * sweep that completed the stay that morning would have taken that away.
 */
export function completionDecision(row: StayRow, today: string): CompletionDecision {
  if (row.status !== "CONFIRMED") return "keep";
  if (!(row.checkOut < today)) return "keep";
  return row.paid ? "complete" : "unpaid_ended";
}

export function sweepCompletions(
  rows: StayRow[],
  today: string,
): { complete: string[]; unpaidEnded: string[] } {
  const complete: string[] = [];
  const unpaidEnded: string[] = [];
  for (const row of rows) {
    const decision = completionDecision(row, today);
    if (decision === "complete") complete.push(row.id);
    else if (decision === "unpaid_ended") unpaidEnded.push(row.id);
  }
  return { complete, unpaidEnded };
}

/* ---------------------------------------------------------------- no show */

export type NoShowDecision = "record" | "already" | "not_confirmed" | "not_arrived";

/**
 * Whether a host may record a no show right now. From arrival day, because
 * that is the day you learn it; CONFIRMED only, because a request nobody
 * accepted was never a stay; and never twice.
 */
export function noShowDecision(
  row: { status: BookingStatus; checkIn: string },
  today: string,
): NoShowDecision {
  if (row.status === "NO_SHOW") return "already";
  if (row.status !== "CONFIRMED") return "not_confirmed";
  if (row.checkIn > today) return "not_arrived";
  return "record";
}

/** What a host reads when the answer is not "recorded". */
export const NO_SHOW_MESSAGES: Record<Exclude<NoShowDecision, "record"> | "missing", string> = {
  already: "This stay is already recorded as a no show.",
  not_confirmed:
    "Only a confirmed stay can be recorded as a no show. Reload the page to see where this one stands.",
  not_arrived:
    "Arrival day has not come yet, so there is nothing to record. Come back on the day.",
  missing: "We could not find that booking. Reload the page to see your current stays.",
};

export const MAX_NO_SHOW_NOTE_LENGTH = 500;

export const noShowInputSchema = z.object({
  bookingId: z.string().trim().uuid("We could not identify that booking."),
  note: z
    .string()
    .trim()
    .max(MAX_NO_SHOW_NOTE_LENGTH, `Keep the note to ${MAX_NO_SHOW_NOTE_LENGTH} characters or fewer.`)
    .optional(),
});

export type NoShowInput = z.infer<typeof noShowInputSchema>;

/* ------------------------------------------------ the database's answers */

/**
 * The jsonb the B4 functions return, checked field by field. A sweep that
 * trusted an unknown shape would report counts it never had; a parse failure
 * is a thrown error and therefore a failed, alerted run.
 */

const uuidList = z.array(z.string().uuid());

const holdSweepResultSchema = z.object({
  released: uuidList,
  paid_pending: uuidList,
  ttl_hours: z.number().int().nonnegative(),
});

export type HoldSweepResult = { released: string[]; paidPending: string[]; ttlHours: number };

export function parseHoldSweepResult(data: unknown): HoldSweepResult {
  const parsed = holdSweepResultSchema.parse(data);
  return {
    released: parsed.released,
    paidPending: parsed.paid_pending,
    ttlHours: parsed.ttl_hours,
  };
}

const completionSweepResultSchema = z.object({
  completed: uuidList,
  unpaid_ended: uuidList,
  today: z.string(),
});

export type CompletionSweepResult = { completed: string[]; unpaidEnded: string[]; today: string };

export function parseCompletionSweepResult(data: unknown): CompletionSweepResult {
  const parsed = completionSweepResultSchema.parse(data);
  return {
    completed: parsed.completed,
    unpaidEnded: parsed.unpaid_ended,
    today: parsed.today,
  };
}

const noShowOutcomeSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("recorded"), booking_id: z.string().uuid() }),
  z.object({ outcome: z.literal("already") }),
  z.object({ outcome: z.literal("not_confirmed"), status: z.string() }),
  z.object({ outcome: z.literal("not_arrived") }),
  z.object({ outcome: z.literal("missing") }),
]);

export type NoShowOutcome = z.infer<typeof noShowOutcomeSchema>;

export function parseNoShowOutcome(data: unknown): NoShowOutcome {
  return noShowOutcomeSchema.parse(data);
}

const driftRowSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("room_night"),
    room_type_id: z.string().uuid(),
    date: z.string(),
    units_booked: z.number().int(),
    live_rooms: z.number().int(),
  }),
  z.object({
    kind: z.literal("orphan_night"),
    listing_id: z.string().uuid(),
    date: z.string(),
  }),
  z.object({
    kind: z.literal("missing_night"),
    booking_id: z.string().uuid(),
    listing_id: z.string().uuid(),
    date: z.string(),
  }),
]);

const driftReportSchema = z.object({
  today: z.string(),
  room_spine: z.boolean(),
  room_nights: z.array(driftRowSchema),
  orphan_nights: z.array(driftRowSchema),
  missing_nights: z.array(driftRowSchema),
});

export type DriftRow = z.infer<typeof driftRowSchema>;

export type DriftReport = {
  today: string;
  /** True once bookings carry room_type_id (M6); false means every sold unit is drift. */
  roomSpine: boolean;
  rows: DriftRow[];
};

export function parseDriftReport(data: unknown): DriftReport {
  const parsed = driftReportSchema.parse(data);
  return {
    today: parsed.today,
    roomSpine: parsed.room_spine,
    rows: [...parsed.room_nights, ...parsed.orphan_nights, ...parsed.missing_nights],
  };
}

const cronFailureSchema = z.object({
  jobid: z.number().int(),
  jobname: z.string().nullable(),
  runid: z.number().int(),
  status: z.string(),
  start_time: z.string(),
  return_message: z.string().nullable(),
});

const cronFailuresSchema = z.object({
  available: z.boolean(),
  failures: z.array(cronFailureSchema),
});

export type CronFailure = {
  jobId: number;
  jobName: string | null;
  runId: number;
  status: string;
  startTime: string;
  returnMessage: string | null;
};

export type CronFailures = { available: boolean; failures: CronFailure[] };

export function parseCronFailures(data: unknown): CronFailures {
  const parsed = cronFailuresSchema.parse(data);
  return {
    available: parsed.available,
    failures: parsed.failures.map((row) => ({
      jobId: row.jobid,
      jobName: row.jobname,
      runId: row.runid,
      status: row.status,
      startTime: row.start_time,
      returnMessage: row.return_message,
    })),
  };
}

/* ---------------------------------------------------------- the verdicts */

/** The `lib/alerts` vocabulary, so a verdict's alert is written unchanged. */
export type AlertSeverity = "info" | "warning" | "critical";

/**
 * What a job says about its run. `ok` is a clean run, whatever it moved;
 * `attention` is a clean run that found something a person must look at,
 * carried as the alert the reporter raises. The alert's kind is the dotted
 * token `lib/alerts` turns into the desk's title; its detail is FLAT, one
 * scalar per key, because the alerts writer stringifies and cuts anything
 * nested at 200 characters and a list of forty ids would lose thirty-five of
 * them. Scalars and ids only: it lands in risk_alerts and audit_log, never a
 * name or a phone.
 */
export type JobVerdict = {
  outcome: "ok" | "attention";
  counts: Record<string, number>;
  detail: Record<string, unknown>;
  alert: { kind: string; severity: AlertSeverity; detail: Record<string, string | number | boolean | null> } | null;
};

/**
 * How many ids one alert carries in the open. The alerts writer keeps 24
 * keys; the count and the context take a few, the rest name rows.
 */
export const ALERT_ID_LIMIT = 20;

/**
 * `{ prefix_count: n, prefix_1: id, prefix_2: id, ... }`, at most `max` named,
 * so every id the desk needs survives the scrubber as its own key.
 */
export function spreadIds(
  prefix: string,
  ids: string[],
  max: number = ALERT_ID_LIMIT,
): Record<string, string | number> {
  const out: Record<string, string | number> = { [`${prefix}_count`]: ids.length };
  ids.slice(0, max).forEach((id, index) => {
    out[`${prefix}_${index + 1}`] = id;
  });
  return out;
}

export function holdSweepVerdict(result: HoldSweepResult): JobVerdict {
  const counts = { released: result.released.length, paid_pending: result.paidPending.length };
  const detail = { released: result.released, paid_pending: result.paidPending, ttl_hours: result.ttlHours };
  if (result.paidPending.length === 0) return { outcome: "ok", counts, detail, alert: null };
  return {
    outcome: "attention",
    counts,
    detail,
    alert: {
      // Money moved and the booking never followed. Somebody is waiting.
      kind: "cron.hold_sweep.paid_still_pending",
      severity: "critical",
      detail: { ttl_hours: result.ttlHours, ...spreadIds("booking", result.paidPending) },
    },
  };
}

export function completionSweepVerdict(result: CompletionSweepResult): JobVerdict {
  const counts = { completed: result.completed.length, unpaid_ended: result.unpaidEnded.length };
  const detail = { completed: result.completed, unpaid_ended: result.unpaidEnded, today: result.today };
  if (result.unpaidEnded.length === 0) return { outcome: "ok", counts, detail, alert: null };
  return {
    outcome: "attention",
    counts,
    detail,
    alert: {
      kind: "cron.complete_stays.ended_unpaid",
      severity: "warning",
      detail: { today: result.today, ...spreadIds("booking", result.unpaidEnded) },
    },
  };
}

/**
 * How loud drift is. A room night whose sold count has nothing behind it, or
 * a booking no inventory counts, is oversell in the making; an orphan
 * calendar night is a bed nobody can book; a missing calendar night is a
 * display bug the exclusion constraint still covers.
 */
export function driftSeverity(rows: DriftRow[]): AlertSeverity | null {
  if (rows.length === 0) return null;
  if (rows.some((row) => row.kind === "room_night")) return "critical";
  if (rows.some((row) => row.kind === "orphan_night")) return "warning";
  return "info";
}

/** One drift row as one short line, so it survives the alert scrubber whole. */
export function describeDriftRow(row: DriftRow): string {
  switch (row.kind) {
    case "room_night":
      return `room_night ${row.room_type_id} ${row.date} sold=${row.units_booked} live=${row.live_rooms}`;
    case "orphan_night":
      return `orphan_night ${row.listing_id} ${row.date}`;
    case "missing_night":
      return `missing_night ${row.listing_id} ${row.date} booking=${row.booking_id}`;
  }
}

export function driftVerdict(report: DriftReport): JobVerdict {
  const counts = {
    room_nights: report.rows.filter((row) => row.kind === "room_night").length,
    orphan_nights: report.rows.filter((row) => row.kind === "orphan_night").length,
    missing_nights: report.rows.filter((row) => row.kind === "missing_night").length,
  };
  const detail = { today: report.today, room_spine: report.roomSpine, rows: report.rows };
  const severity = driftSeverity(report.rows);
  if (severity === null) return { outcome: "ok", counts, detail, alert: null };
  return {
    outcome: "attention",
    counts,
    detail,
    alert: {
      kind: "cron.inventory_drift.found",
      severity,
      detail: {
        ...counts,
        today: report.today,
        room_spine: report.roomSpine,
        ...spreadIds("row", report.rows.map(describeDriftRow)),
      },
    },
  };
}

export function cronWatchVerdict(result: CronFailures): JobVerdict {
  const counts = { failures: result.failures.length };
  const detail = { available: result.available };
  if (!result.available) {
    // Not an alert: a database without the run table is a configuration the
    // deploy notes own, and the envelope says so on every run.
    return { outcome: "ok", counts, detail: { ...detail, note: "cron.job_run_details is not readable here" }, alert: null };
  }
  if (result.failures.length === 0) return { outcome: "ok", counts, detail, alert: null };
  return {
    outcome: "attention",
    counts,
    detail,
    alert: {
      kind: "cron.pg_cron.job_failed",
      severity: "critical",
      detail: spreadIds(
        "failure",
        result.failures.map(
          (row) =>
            `${row.jobName ?? `job ${row.jobId}`} run ${row.runId} at ${row.startTime}: ${row.returnMessage ?? "no message"}`,
        ),
      ),
    },
  };
}
