import { describe, expect, it } from "vitest";
import type { InspectionState } from "./types";
import {
  addDays,
  addMonths,
  askDays,
  askTimesOn,
  calendarState,
  dayPartOf,
  firstDayPart,
  groupByDayPart,
  lagosDayOf,
  lagosInstant,
  listerRoleWord,
  monthGrid,
  NO_REMINDERS,
  slotCounts,
  slotsOn,
  videoJoinState,
  visitModeOf,
  visitPhase,
  visitTimeline,
  visitView,
  type VisitRow,
} from "./visit";

/* 13 October 2026, 09:00 in Lagos (08:00Z). */
const NOW = Date.parse("2026-10-13T08:00:00Z");
const MIN = 60_000;

function slot(day: string, hour: number, minute = 0) {
  return { slotAt: lagosInstant(day, hour, minute), minutes: 30, windowId: "w1" };
}

function row(over: Partial<VisitRow> = {}): VisitRow {
  return {
    id: "ix-1",
    listingId: "l-1",
    state: "REQUESTED",
    requestedAt: lagosInstant("2026-10-15", 10),
    slotAt: null,
    note: null,
    listerNote: null,
    createdAt: "2026-10-13T07:00:00.000Z",
    respondedAt: null,
    confirmedAt: null,
    completedAt: null,
    outcome: null,
    visitMode: "in_person",
    conversationId: "c-1",
    slotMinutes: null,
    ...over,
  };
}

describe("visit mode", () => {
  it("reads the column's two values and defaults to in person", () => {
    expect(visitModeOf("video")).toBe("video");
    expect(visitModeOf("in_person")).toBe("in_person");
    expect(visitModeOf(null)).toBe("in_person");
    expect(visitModeOf("VIDEO")).toBe("in_person");
  });
});

describe("Lagos days and times", () => {
  it("puts an instant on its Lagos day, not its UTC day", () => {
    expect(lagosDayOf("2026-10-13T23:30:00Z")).toBe("2026-10-14");
    expect(lagosDayOf("2026-10-13T22:59:00Z")).toBe("2026-10-13");
  });

  it("builds a Lagos wall-clock instant", () => {
    expect(lagosInstant("2026-10-15", 9, 30)).toBe("2026-10-15T08:30:00.000Z");
  });

  it("moves days and months across their ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});

describe("slot grouping", () => {
  it("splits a day into morning, afternoon and evening on Lagos time", () => {
    expect(dayPartOf(lagosInstant("2026-10-15", 11, 59))).toBe("morning");
    expect(dayPartOf(lagosInstant("2026-10-15", 12, 0))).toBe("afternoon");
    expect(dayPartOf(lagosInstant("2026-10-15", 16, 59))).toBe("afternoon");
    expect(dayPartOf(lagosInstant("2026-10-15", 17, 0))).toBe("evening");
    /* 23:30 UTC is 00:30 the next morning in Lagos. */
    expect(dayPartOf("2026-10-15T23:30:00Z")).toBe("morning");
  });

  it("groups each tab in time order", () => {
    const groups = groupByDayPart([slot("2026-10-15", 14), slot("2026-10-15", 9), slot("2026-10-15", 18), slot("2026-10-15", 10)]);
    expect(groups.morning.map((s) => s.slotAt)).toEqual([lagosInstant("2026-10-15", 9), lagosInstant("2026-10-15", 10)]);
    expect(groups.afternoon).toHaveLength(1);
    expect(groups.evening).toHaveLength(1);
  });

  it("opens on the first tab that has a time", () => {
    expect(firstDayPart(groupByDayPart([slot("2026-10-15", 15)]))).toBe("afternoon");
    expect(firstDayPart(groupByDayPart([]))).toBe("morning");
  });

  it("counts and picks slots by Lagos day", () => {
    const slots = [slot("2026-10-15", 9), slot("2026-10-15", 10), slot("2026-10-16", 9)];
    expect(slotCounts(slots).get("2026-10-15")).toBe(2);
    expect(slotCounts(slots).get("2026-10-17")).toBeUndefined();
    expect(slotsOn(slots, "2026-10-16")).toHaveLength(1);
  });
});

describe("suggesting a time when the lister opened none", () => {
  it("offers only times at least two hours ahead", () => {
    /* 09:00 in Lagos now, so 11:00 is the first hour the action accepts. */
    const today = askTimesOn("2026-10-13", NOW);
    expect(today[0]?.slotAt).toBe(lagosInstant("2026-10-13", 11));
    expect(askTimesOn("2026-10-14", NOW)).toHaveLength(11);
  });

  it("skips today once nothing is left on it", () => {
    const late = Date.parse("2026-10-13T17:30:00Z"); // 18:30 in Lagos
    expect(askDays(late)[0]).toBe("2026-10-14");
    expect(askDays(NOW)[0]).toBe("2026-10-13");
    expect(askDays(NOW)).toHaveLength(14);
  });
});

describe("the month calendar", () => {
  it("starts weeks on Monday and pads the month", () => {
    const weeks = monthGrid("2026-10");
    /* 1 October 2026 is a Thursday. */
    expect(weeks[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe("status mapping, for every state", () => {
  const cases: [InspectionState, Partial<VisitRow>, string, boolean][] = [
    ["REQUESTED", {}, "sent", true],
    ["PROPOSED", { slotAt: lagosInstant("2026-10-16", 11) }, "proposed", false],
    ["CONFIRMED", { slotAt: lagosInstant("2026-10-15", 10), confirmedAt: "2026-10-13T07:30:00Z" }, "confirmed", true],
    ["DECLINED", { respondedAt: "2026-10-13T07:40:00Z" }, "declined", false],
    ["DECLINED", { confirmedAt: "2026-10-13T07:30:00Z", slotAt: lagosInstant("2026-10-15", 10) }, "cancelledByLister", false],
    ["WITHDRAWN", {}, "withdrawn", false],
    ["WITHDRAWN", { confirmedAt: "2026-10-13T07:30:00Z", slotAt: lagosInstant("2026-10-15", 10) }, "withdrawnConfirmed", false],
    ["COMPLETED", { slotAt: lagosInstant("2026-10-12", 10), confirmedAt: "2026-10-11T07:30:00Z" }, "completed", false],
    ["NO_SHOW", { slotAt: lagosInstant("2026-10-12", 10), confirmedAt: "2026-10-11T07:30:00Z" }, "noShow", false],
  ];

  it.each(cases)("%s reads as its own phase", (state, over, phase, check) => {
    const view = visitView(row({ state, ...over }), NOW);
    expect(view.phase).toBe(phase);
    /* The big tick only for a request that went or a confirmed visit. */
    expect(view.check).toBe(check);
  });

  it("never calls a request confirmed", () => {
    expect(visitPhase({ state: "REQUESTED", confirmedAt: null })).toBe("sent");
    expect(visitPhase({ state: "PROPOSED", confirmedAt: "2026-10-13T07:30:00Z" })).toBe("proposed");
  });

  it("shows the asked time on a request and the offered time on a proposal", () => {
    const asked = lagosInstant("2026-10-15", 10);
    const offered = lagosInstant("2026-10-16", 11);
    expect(visitView(row({ requestedAt: asked }), NOW).shownAt).toBe(asked);
    const proposed = visitView(row({ state: "PROPOSED", requestedAt: asked, slotAt: offered }), NOW);
    expect(proposed.shownAt).toBe(offered);
    expect(proposed.askedAt).toBe(asked);
    expect(proposed.canAccept).toBe(true);
  });

  it("offers accept only while the offered time is ahead", () => {
    const gone = visitView(row({ state: "PROPOSED", slotAt: "2026-10-12T09:00:00Z" }), NOW);
    expect(gone.canAccept).toBe(false);
  });

  it("offers the moves the actions allow, and nothing on a closed request", () => {
    expect(visitView(row(), NOW).cancel).toBe("request");
    expect(visitView(row({ state: "CONFIRMED", slotAt: lagosInstant("2026-10-15", 10) }), NOW).cancel).toBe("visit");
    expect(visitView(row({ state: "CONFIRMED", slotAt: "2026-10-12T09:00:00Z" }), NOW).cancel).toBeNull();
    for (const state of ["DECLINED", "WITHDRAWN", "COMPLETED", "NO_SHOW"] as const) {
      const view = visitView(row({ state }), NOW);
      expect(view.cancel, state).toBeNull();
      expect(view.canChangeTime, state).toBe(false);
    }
    expect(visitView(row({ state: "DECLINED" }), NOW).canAskAgain).toBe(true);
    expect(visitView(row({ state: "COMPLETED" }), NOW).canAskAgain).toBe(false);
  });
});

describe("Add to calendar, only when confirmed", () => {
  const ahead = lagosInstant("2026-10-15", 10);
  it("is available for a confirmed slot that is still ahead", () => {
    expect(calendarState(row({ state: "CONFIRMED", slotAt: ahead }), NOW)).toBe("available");
  });
  it("is disabled with a reason before the lister confirms", () => {
    expect(calendarState(row({ state: "REQUESTED" }), NOW)).toBe("notConfirmed");
    expect(calendarState(row({ state: "PROPOSED", slotAt: ahead }), NOW)).toBe("notConfirmed");
  });
  it("is passed once the slot is over, and hidden on a closed request", () => {
    expect(calendarState(row({ state: "CONFIRMED", slotAt: "2026-10-12T09:00:00Z" }), NOW)).toBe("passed");
    for (const state of ["DECLINED", "WITHDRAWN", "COMPLETED", "NO_SHOW"] as const) {
      expect(calendarState(row({ state, slotAt: ahead }), NOW), state).toBe("hidden");
    }
  });
});

describe("Join video visit window", () => {
  const at = lagosInstant("2026-10-13", 15); // 14:00Z
  const video = row({ state: "CONFIRMED", slotAt: at, visitMode: "video", slotMinutes: 30 });
  const start = Date.parse(at);

  it("opens ten minutes before and closes when the slot ends", () => {
    expect(videoJoinState(video, start - 11 * MIN)).toBe("early");
    expect(videoJoinState(video, start - 10 * MIN)).toBe("open");
    expect(videoJoinState(video, start + 30 * MIN)).toBe("open");
    expect(videoJoinState(video, start + 31 * MIN)).toBe("over");
  });

  it("is never offered for an in-person or unconfirmed visit", () => {
    expect(videoJoinState({ ...video, visitMode: "in_person" }, start)).toBe("hidden");
    expect(videoJoinState({ ...video, state: "REQUESTED" }, start)).toBe("hidden");
    expect(videoJoinState({ ...video, state: "PROPOSED" }, start)).toBe("hidden");
  });

  it("uses the hour default when the slot has no window", () => {
    const requested = { ...video, slotMinutes: null };
    expect(videoJoinState(requested, start + 59 * MIN)).toBe("open");
    expect(videoJoinState(requested, start + 61 * MIN)).toBe("over");
  });
});

describe("What happens next", () => {
  it("marks only the request done while the lister has not answered", () => {
    const steps = visitTimeline(row(), NO_REMINDERS, NOW);
    expect(steps.map((s) => [s.key, s.status])).toEqual([
      ["sent", "done"],
      ["confirm", "current"],
      ["eve", "upcoming"],
      ["day", "upcoming"],
      ["visit", "upcoming"],
      ["decision", "upcoming"],
    ]);
    expect(steps[0]?.at).toBe("2026-10-13T07:00:00.000Z");
  });

  it("says the renter holds a proposed time", () => {
    const steps = visitTimeline(row({ state: "PROPOSED", slotAt: lagosInstant("2026-10-16", 11) }), NO_REMINDERS, NOW);
    expect(steps[1]).toMatchObject({ key: "confirm", status: "current", detail: "offered" });
  });

  it("says a booked open time was confirmed straight away", () => {
    const booked = row({ state: "CONFIRMED", slotAt: lagosInstant("2026-10-15", 10), confirmedAt: "2026-10-13T07:00:01.000Z" });
    expect(visitTimeline(booked, NO_REMINDERS, NOW)[1]).toMatchObject({ status: "done", detail: "booked" });
    const answered = { ...booked, confirmedAt: "2026-10-13T07:45:00.000Z" };
    expect(visitTimeline(answered, NO_REMINDERS, NOW)[1]).toMatchObject({ status: "done", detail: "done" });
  });

  it("marks reminders done from the ledger's sent time", () => {
    const confirmed = row({ state: "CONFIRMED", slotAt: lagosInstant("2026-10-14", 10), confirmedAt: "2026-10-13T07:30:00Z" });
    const steps = visitTimeline(confirmed, { eve: "2026-10-13T18:00:00Z", day: null }, NOW);
    expect(steps.find((s) => s.key === "eve")).toMatchObject({ status: "done", at: "2026-10-13T18:00:00Z" });
    expect(steps.find((s) => s.key === "day")?.status).toBe("upcoming");
  });

  it("does not promise an evening-before reminder on the visit's own day", () => {
    const today = row({ state: "CONFIRMED", slotAt: lagosInstant("2026-10-13", 15), confirmedAt: "2026-10-13T07:30:00Z" });
    const keys = visitTimeline(today, NO_REMINDERS, NOW).map((s) => s.key);
    expect(keys).not.toContain("eve");
    expect(keys).toContain("day");
  });

  it("stops a declined request at the lister's answer and draws nothing after", () => {
    const steps = visitTimeline(row({ state: "DECLINED", respondedAt: "2026-10-13T07:40:00Z" }), NO_REMINDERS, NOW);
    expect(steps.map((s) => [s.key, s.status])).toEqual([
      ["sent", "done"],
      ["confirm", "stopped"],
    ]);
  });

  it("stops a withdrawn confirmed visit at the step it never reached", () => {
    const steps = visitTimeline(
      row({ state: "WITHDRAWN", slotAt: lagosInstant("2026-10-15", 10), confirmedAt: "2026-10-13T07:30:00Z" }),
      NO_REMINDERS,
      NOW,
    );
    expect(steps.at(-1)).toMatchObject({ key: "eve", status: "stopped" });
  });

  it("leaves out reminders that never went once the visit is done, and marks the decision", () => {
    const done = row({
      state: "COMPLETED",
      slotAt: "2026-10-12T09:00:00Z",
      confirmedAt: "2026-10-11T07:30:00Z",
      completedAt: "2026-10-12T11:00:00Z",
      outcome: "deal_done",
    });
    const steps = visitTimeline(done, NO_REMINDERS, NOW);
    expect(steps.map((s) => s.key)).toEqual(["sent", "confirm", "visit", "decision"]);
    expect(steps.every((s) => s.status === "done")).toBe(true);
  });

  it("keeps the decision open after a visit with no outcome", () => {
    const done = row({ state: "COMPLETED", slotAt: "2026-10-12T09:00:00Z", confirmedAt: "2026-10-11T07:30:00Z", completedAt: "2026-10-12T11:00:00Z" });
    expect(visitTimeline(done, NO_REMINDERS, NOW).at(-1)).toMatchObject({ key: "decision", status: "current" });
  });

  it("stops a no-show at the visit", () => {
    const steps = visitTimeline(row({ state: "NO_SHOW", slotAt: "2026-10-12T09:00:00Z", confirmedAt: "2026-10-11T07:30:00Z" }), NO_REMINDERS, NOW);
    expect(steps.at(-1)).toMatchObject({ key: "visit", status: "stopped" });
  });
});

describe("the lister's role word", () => {
  it("reads the published supply side first, then the listing's role", () => {
    expect(listerRoleWord("owner", "agent")).toBe("landlord");
    expect(listerRoleWord("agent", "owner")).toBe("agent");
    expect(listerRoleWord(null, "owner")).toBe("landlord");
    expect(listerRoleWord(null, "firm")).toBe("agency");
    expect(listerRoleWord(null, null)).toBeNull();
  });
});
