import { describe, expect, it } from "vitest";

import type { DrainResult } from "../../notify/outbox";
import { BACKLOG_SECONDS, outboxVerdict } from "./email-outbox";

/**
 * A STUCK OUTBOX HAS TO BE VISIBLE ON THE DESK RATHER THAN SILENT.
 *
 * Every branch of that promise, driven as a pure decision. The failures this
 * has to catch all LOOK like a healthy quiet hour from the outside: zero sent,
 * no exception, a 200 to the scheduler. That is precisely the shape of the
 * reconciliation that had been dead for three weeks while `cron.job_run_details`
 * reported success every hour, so each one is asserted separately rather than
 * trusted to a single "something is wrong" flag.
 */

function result(over: Partial<DrainResult["counts"] & DrainResult["health"]> & {
  unconfigured?: boolean;
} = {}): DrainResult {
  return {
    counts: {
      claimed: over.claimed ?? 0,
      sent: over.sent ?? 0,
      retried: over.retried ?? 0,
      failed: over.failed ?? 0,
      dropped: over.dropped ?? 0,
    },
    health: {
      pending: over.pending ?? 0,
      due: over.due ?? 0,
      inFlight: over.inFlight ?? 0,
      stuck: over.stuck ?? 0,
      failed: over.failed ?? 0,
      oldestDueSeconds: over.oldestDueSeconds ?? 0,
    },
    unconfigured: over.unconfigured ?? false,
  };
}

describe("a clean run says nothing", () => {
  it("raises nothing on an empty queue", () => {
    const verdict = outboxVerdict(result());
    expect(verdict.outcome).toBe("ok");
    expect(verdict.alert).toBeNull();
  });

  it("raises nothing on a busy run that sent everything", () => {
    const verdict = outboxVerdict(result({ claimed: 12, sent: 12 }));
    expect(verdict.outcome).toBe("ok");
    expect(verdict.alert).toBeNull();
    expect(verdict.counts["sent"]).toBe(12);
  });

  it("does not raise for a retry, because a retry is the design working", () => {
    const verdict = outboxVerdict(result({ claimed: 3, sent: 2, retried: 1, pending: 1 }));
    expect(verdict.outcome).toBe("ok");
    expect(verdict.alert).toBeNull();
  });
});

describe("the four things that put it on the desk", () => {
  it("shouts when there is no Resend key, because that is a platform that has stopped emailing", () => {
    const verdict = outboxVerdict(result({ unconfigured: true, pending: 40 }));
    expect(verdict.outcome).toBe("attention");
    expect(verdict.alert?.kind).toBe("email.outbox.unconfigured");
    expect(verdict.alert?.severity).toBe("critical");
    expect(verdict.alert?.detail["reason"]).toBe("resend_api_key_missing");
  });

  it("shouts about a row that has gone terminal", () => {
    const verdict = outboxVerdict(result({ failed: 2 }));
    expect(verdict.alert?.kind).toBe("email.outbox.dead_letters");
    expect(verdict.alert?.severity).toBe("critical");
  });

  it("warns about a row stuck in flight, which nothing retries by design", () => {
    const verdict = outboxVerdict(result({ stuck: 1 }));
    expect(verdict.alert?.kind).toBe("email.outbox.stuck_in_flight");
    expect(verdict.alert?.severity).toBe("warning");
    expect(String(verdict.alert?.detail["reason"])).toContain("decide by hand");
  });

  it("warns when the queue is backing up past the drain interval", () => {
    const fine = outboxVerdict(result({ pending: 5, oldestDueSeconds: BACKLOG_SECONDS - 1 }));
    expect(fine.outcome).toBe("ok");
    const late = outboxVerdict(result({ pending: 5, oldestDueSeconds: BACKLOG_SECONDS + 1 }));
    expect(late.alert?.kind).toBe("email.outbox.backlog");
  });

  it("puts the loudest one first when several are true at once", () => {
    const verdict = outboxVerdict(
      result({ unconfigured: true, failed: 3, stuck: 2, oldestDueSeconds: 99_999 }),
    );
    expect(verdict.alert?.kind).toBe("email.outbox.unconfigured");
  });
});

describe("the alert detail", () => {
  it("is flat scalars only, because the alerts writer cuts anything nested", () => {
    const verdict = outboxVerdict(result({ failed: 1, claimed: 4, sent: 3 }));
    for (const [key, value] of Object.entries(verdict.alert?.detail ?? {})) {
      expect(
        ["string", "number", "boolean"].includes(typeof value) || value === null,
        key,
      ).toBe(true);
    }
  });

  it("carries no personal datum at all: counts, and a reason code", () => {
    const verdict = outboxVerdict(result({ failed: 1 }));
    const printed = JSON.stringify(verdict.alert?.detail ?? {});
    expect(printed).not.toContain("@");
  });
});
