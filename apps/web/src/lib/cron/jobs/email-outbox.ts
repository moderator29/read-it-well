import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import {
  DRAIN_BATCH,
  drainEmailOutbox,
  type DrainOptions,
  type DrainResult,
} from "../../notify/outbox";
import type { AdminClient } from "../rpc";

/**
 * THE JOB THAT ACTUALLY SENDS THE MAIL.
 *
 * `public.email_outbox` is written by triggers, inside the transaction that
 * makes each event true. This is the other end: it claims what is due, sends
 * it and settles each row. `lib/notify/outbox.ts` holds the mechanism; this
 * holds the JUDGEMENT, which is a separate thing and is the reason a job file
 * exists at all on this platform.
 *
 * ---------------------------------------------------------------------------
 * WHAT A CLEAN RUN LOOKS LIKE, AND WHY A QUIET ONE IS ALSO CLEAN.
 *
 * Zero claimed on an empty queue is a perfectly good run and raises nothing.
 * A queue with nothing in it means nothing happened this hour, and a desk that
 * is told about that every hour is a desk nobody opens.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR THINGS THAT PUT THIS ON THE DESK, IN THE ORDER THAT MATTERS.
 *
 * 1. NO RESEND KEY IN PRODUCTION. Nothing was attempted and nothing will be,
 *    by anybody, on any path: this is a platform that has silently stopped
 *    emailing. It is the loudest one here and it is the one that would
 *    otherwise look exactly like a quiet hour, because both report zero sent.
 *
 * 2. A ROW HAS GONE TERMINAL. Five attempts, spread over two hours, all
 *    refused. Somebody is not getting an email they were promised and no
 *    further attempt will change that.
 *
 * 3. A ROW IS STUCK IN FLIGHT. Claimed and never settled, which means a worker
 *    died between the send and the settle. NOTHING RETRIES IT, deliberately:
 *    see `lib/notify/outbox.ts` on why a lease that requeues a SENDING row is
 *    the one mechanism that can put a second copy of an email in an inbox. So
 *    a person decides, and this is how they are told there is something to
 *    decide.
 *
 * 4. THE QUEUE IS BACKING UP. Due rows older than the threshold mean the drain
 *    is not keeping pace, or was not running. This is the one that catches the
 *    failure with no other symptom: every run green, every row still waiting.
 *
 * ---------------------------------------------------------------------------
 * AND THE JOB ITSELF IS WATCHED, because everything above depends on it
 * running. It is registered in `lib/cron/freshness.ts` beside its siblings, so
 * a drain that STOPS is visible as an absence rather than as silence. That was
 * the exact shape of the reconciliation that was dead for three weeks while
 * its scheduler reported success every hour.
 */

/**
 * How long a due row may wait before the queue counts as backing up.
 *
 * Twenty minutes, against a schedule of four runs an hour. A row that arrived
 * one second after a run started waits fifteen minutes in perfect health, so
 * anything under that would alarm on a working system. Anything much over it
 * and a person learns about a stalled password-change email an hour late.
 */
export const BACKLOG_SECONDS = 20 * 60;

/** Counts and health flattened into the one-scalar-per-key shape alerts want. */
function flatDetail(result: DrainResult): Record<string, string | number | boolean | null> {
  return {
    claimed: result.counts.claimed,
    sent: result.counts.sent,
    retried: result.counts.retried,
    failed: result.counts.failed,
    dropped: result.counts.dropped,
    pending: result.health.pending,
    due: result.health.due,
    in_flight: result.health.inFlight,
    stuck: result.health.stuck,
    dead: result.health.failed,
    oldest_due_seconds: result.health.oldestDueSeconds,
  };
}

/**
 * The verdict, as a pure decision over a drain's result.
 *
 * Separated from the drain so every branch above is provable without a
 * database, a key or a socket, which is the same split `lib/cron/run.ts` makes
 * for the wrapper and the job.
 */
export function outboxVerdict(result: DrainResult): JobVerdict {
  const counts = {
    claimed: result.counts.claimed,
    sent: result.counts.sent,
    retried: result.counts.retried,
    failed: result.counts.failed,
    dropped: result.counts.dropped,
    pending: result.health.pending,
    stuck: result.health.stuck,
    dead: result.health.failed,
  };
  const detail = flatDetail(result);

  if (result.unconfigured) {
    /*
     * The queue keeps filling and nothing leaves. Critical rather than
     * warning: on a production deployment this is every transactional email
     * the platform owes anybody, not going out, with a green dashboard.
     */
    return {
      outcome: "attention",
      counts,
      detail: { ...detail, note: "RESEND_API_KEY is not set, so nothing was attempted" },
      alert: {
        kind: "email.outbox.unconfigured",
        severity: "critical",
        detail: { ...detail, reason: "resend_api_key_missing" },
      },
    };
  }

  if (result.health.failed > 0) {
    return {
      outcome: "attention",
      counts,
      detail,
      alert: {
        kind: "email.outbox.dead_letters",
        severity: "critical",
        detail: { ...detail, reason: "rows exhausted every attempt" },
      },
    };
  }

  if (result.health.stuck > 0) {
    return {
      outcome: "attention",
      counts,
      detail,
      alert: {
        kind: "email.outbox.stuck_in_flight",
        severity: "warning",
        detail: {
          ...detail,
          reason: "claimed and never settled; not retried automatically, decide by hand",
        },
      },
    };
  }

  if (result.health.oldestDueSeconds > BACKLOG_SECONDS) {
    return {
      outcome: "attention",
      counts,
      detail,
      alert: {
        kind: "email.outbox.backlog",
        severity: "warning",
        detail: { ...detail, reason: "due rows are older than the drain interval allows" },
      },
    };
  }

  return { outcome: "ok", counts, detail, alert: null };
}

/** Drain the outbox and judge what it found. */
export async function emailOutbox(
  admin: AdminClient,
  options: DrainOptions = {},
): Promise<JobVerdict> {
  const result = await drainEmailOutbox(admin, { limit: DRAIN_BATCH, ...options });
  return outboxVerdict(result);
}
