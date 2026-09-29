import { describe, expect, it } from "vitest";
import {
  agreementTrack,
  applicationTrack,
  ticketTrack,
  trackPosition,
  trackStates,
  viewingTrack,
  type TrackStepModel,
} from "./tracks";

const states = (steps: TrackStepModel[]) => steps.map((s) => s.state);
const times = (steps: TrackStepModel[]) => steps.map((s) => s.at);

describe("trackStates", () => {
  it("marks before as done, the reached step current and after as upcoming", () => {
    expect(trackStates(4, 1)).toEqual(["done", "current", "upcoming", "upcoming"]);
  });

  it("finishes a complete track", () => {
    expect(trackStates(4, 3, "complete")).toEqual(["done", "done", "done", "done"]);
  });

  it("stops a failed track at the step it failed on", () => {
    expect(trackStates(4, 2, "failed")).toEqual(["done", "done", "failed", "upcoming"]);
  });

  it("leaves every step ahead when nothing has started", () => {
    expect(trackStates(3, -1)).toEqual(["upcoming", "upcoming", "upcoming"]);
  });

  it("clamps a reach past the end onto the last step", () => {
    expect(trackStates(3, 9)).toEqual(["done", "done", "current"]);
  });
});

describe("trackPosition", () => {
  it("names the current step", () => {
    expect(trackPosition(["done", "current", "upcoming"])).toEqual({ index: 2, total: 3 });
  });
  it("names the failed step", () => {
    expect(trackPosition(["done", "failed", "upcoming"])).toEqual({ index: 2, total: 3 });
  });
  it("names the last step of a finished track", () => {
    expect(trackPosition(["done", "done", "done"])).toEqual({ index: 3, total: 3 });
  });
});

describe("applicationTrack", () => {
  const base = { submittedAt: "2026-09-01T10:00:00Z", reviewedAt: "2026-09-03T12:00:00Z" };

  it("holds a submitted application at review", () => {
    const t = applicationTrack({ status: "SUBMITTED", ...base, reviewedAt: null });
    expect(states(t)).toEqual(["done", "current", "upcoming"]);
    expect(times(t)).toEqual([base.submittedAt, null, null]);
  });

  it("holds a request for more information at review", () => {
    expect(states(applicationTrack({ status: "MORE_INFO_REQUIRED", ...base }))).toEqual([
      "done",
      "current",
      "upcoming",
    ]);
  });

  it("finishes an approval with its review time", () => {
    const t = applicationTrack({ status: "APPROVED", ...base });
    expect(states(t)).toEqual(["done", "done", "done"]);
    expect(t[2]!.at).toBe(base.reviewedAt);
  });

  it("fails the decision on a refusal and a suspension", () => {
    expect(states(applicationTrack({ status: "REJECTED", ...base }))).toEqual(["done", "done", "failed"]);
    expect(states(applicationTrack({ status: "SUSPENDED", ...base }))).toEqual(["done", "done", "failed"]);
  });

  it("starts nothing for a draft and stamps no time", () => {
    const t = applicationTrack({ status: "DRAFT", ...base });
    expect(states(t)).toEqual(["upcoming", "upcoming", "upcoming"]);
    expect(times(t)).toEqual([null, null, null]);
  });
});

describe("agreementTrack", () => {
  const events = [
    { at: "2026-09-01T09:00:00Z", action: "opened" },
    { at: "2026-09-01T10:00:00Z", action: "confirmed" },
    { at: "2026-09-01T11:00:00Z", action: "submitted" },
    { at: "2026-09-02T09:00:00Z", action: "approved" },
    { at: "2026-09-02T15:00:00Z", action: "paid" },
  ];

  it("waits on the parties after it is drawn up", () => {
    const t = agreementTrack({ status: "awaiting_parties", events: events.slice(0, 1) });
    expect(states(t)).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(times(t)).toEqual(["2026-09-01T09:00:00Z", null, null, null]);
  });

  it("puts a reviewed agreement on the approval step", () => {
    expect(states(agreementTrack({ status: "in_review", events: events.slice(0, 3) }))).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
    ]);
  });

  it("opens payment once approved", () => {
    expect(states(agreementTrack({ status: "approved", events: events.slice(0, 4) }))).toEqual([
      "done",
      "done",
      "done",
      "current",
    ]);
  });

  it("finishes a paid agreement with every time", () => {
    const t = agreementTrack({ status: "paid", events });
    expect(states(t)).toEqual(["done", "done", "done", "done"]);
    expect(times(t)).toEqual([
      "2026-09-01T09:00:00Z",
      "2026-09-01T11:00:00Z",
      "2026-09-02T09:00:00Z",
      "2026-09-02T15:00:00Z",
    ]);
  });

  it("fails the approval step when Vallo sends it back", () => {
    const t = agreementTrack({
      status: "rejected",
      events: [...events.slice(0, 3), { at: "2026-09-02T09:00:00Z", action: "rejected" }],
    });
    expect(states(t)).toEqual(["done", "done", "failed", "upcoming"]);
    expect(t[2]!.at).toBeNull();
  });

  it("uses the latest pass after terms change", () => {
    const t = agreementTrack({
      status: "in_review",
      events: [
        ...events.slice(0, 3),
        { at: "2026-09-03T08:00:00Z", action: "amended" },
        { at: "2026-09-03T09:00:00Z", action: "submitted" },
      ],
    });
    expect(t[1]!.at).toBe("2026-09-03T09:00:00Z");
  });

  it("fails a cancellation where it stood", () => {
    expect(states(agreementTrack({ status: "cancelled", events: events.slice(0, 1) }))).toEqual([
      "done",
      "failed",
      "upcoming",
      "upcoming",
    ]);
    expect(states(agreementTrack({ status: "cancelled", events: events.slice(0, 4) }))).toEqual([
      "done",
      "done",
      "done",
      "failed",
    ]);
  });
});

describe("ticketTrack", () => {
  const createdAt = "2026-09-01T09:00:00Z";

  it("waits for a person on a fresh ticket", () => {
    const t = ticketTrack({ status: "open", createdAt, firstStaffReplyAt: null, resolvedAt: null });
    expect(states(t)).toEqual(["done", "current", "upcoming"]);
    expect(times(t)).toEqual([createdAt, null, null]);
  });

  it("dates the pick up from the team's first reply", () => {
    const t = ticketTrack({
      status: "open",
      createdAt,
      firstStaffReplyAt: "2026-09-01T10:00:00Z",
      resolvedAt: null,
    });
    expect(states(t)).toEqual(["done", "done", "current"]);
    expect(t[1]!.at).toBe("2026-09-01T10:00:00Z");
  });

  it("treats pending as picked up even before a reply, with no invented time", () => {
    const t = ticketTrack({ status: "pending", createdAt, firstStaffReplyAt: null, resolvedAt: null });
    expect(states(t)).toEqual(["done", "done", "current"]);
    expect(t[1]!.at).toBeNull();
  });

  it("finishes on resolved and on closed", () => {
    const resolved = ticketTrack({
      status: "resolved",
      createdAt,
      firstStaffReplyAt: null,
      resolvedAt: "2026-09-02T09:00:00Z",
    });
    expect(states(resolved)).toEqual(["done", "done", "done"]);
    expect(resolved[2]!.at).toBe("2026-09-02T09:00:00Z");
    expect(states(ticketTrack({ status: "closed", createdAt, firstStaffReplyAt: null, resolvedAt: null }))).toEqual([
      "done",
      "done",
      "done",
    ]);
  });
});

describe("viewingTrack", () => {
  const base = {
    outcome: null,
    createdAt: "2026-09-01T09:00:00Z",
    respondedAt: "2026-09-01T12:00:00Z",
    slotAt: "2026-09-04T10:00:00Z",
  };

  it("waits for a time on a request or a proposal", () => {
    expect(states(viewingTrack({ ...base, state: "REQUESTED", respondedAt: null }))).toEqual([
      "done",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(states(viewingTrack({ ...base, state: "PROPOSED" }))).toEqual(["done", "current", "upcoming", "upcoming"]);
  });

  it("puts a confirmed viewing on the day with the agreeing reply's time", () => {
    const t = viewingTrack({ ...base, state: "CONFIRMED" });
    expect(states(t)).toEqual(["done", "done", "current", "upcoming"]);
    expect(times(t)).toEqual([base.createdAt, base.respondedAt, null, null]);
  });

  it("waits for the record after the visit, then finishes", () => {
    expect(states(viewingTrack({ ...base, state: "COMPLETED" }))).toEqual(["done", "done", "done", "current"]);
    const done = viewingTrack({ ...base, state: "COMPLETED", outcome: "inspected" });
    expect(states(done)).toEqual(["done", "done", "done", "done"]);
    expect(done[2]!.at).toBe(base.slotAt);
    expect(done[3]!.at).toBeNull();
  });

  it("fails the agreeing step on a decline, dated by the reply", () => {
    const t = viewingTrack({ ...base, state: "DECLINED" });
    expect(states(t)).toEqual(["done", "failed", "upcoming", "upcoming"]);
    expect(t[1]!.at).toBe(base.respondedAt);
  });

  it("fails the next step on a withdrawal", () => {
    expect(states(viewingTrack({ ...base, state: "WITHDRAWN", respondedAt: null, slotAt: null }))).toEqual([
      "done",
      "failed",
      "upcoming",
      "upcoming",
    ]);
    expect(states(viewingTrack({ ...base, state: "WITHDRAWN" }))).toEqual(["done", "done", "failed", "upcoming"]);
  });
});
