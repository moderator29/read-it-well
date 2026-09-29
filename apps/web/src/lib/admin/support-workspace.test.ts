import { describe, expect, it } from "vitest";
import {
  compareTickets,
  ESCALATION_TARGETS,
  inTab,
  nextUnclaimed,
  shortcutFor,
  slaState,
  stepTicket,
  suggestedEscalation,
  tabCounts,
  ticketGrade,
  ticketLane,
  type SlaState,
  type SupportLane,
} from "./support-workspace";

const NOW = Date.parse("2026-09-29T14:00:00+01:00");
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

describe("the lane a ticket sits in", () => {
  const base = { status: "open", staffReplied: false, waitingSince: ago(1), escalations: [] };

  it("is new until somebody on the team has written", () => {
    expect(ticketLane(base)).toBe("new");
  });

  it("is waiting on us when the member wrote after our reply", () => {
    expect(ticketLane({ ...base, staffReplied: true })).toBe("waiting_on_us");
  });

  it("is waiting on the member when we wrote last, whatever the status says", () => {
    expect(ticketLane({ ...base, status: "pending", staffReplied: true, waitingSince: null })).toBe("waiting_on_member");
  });

  it("is escalated while another desk holds it, and not once it is handed back", () => {
    expect(ticketLane({ ...base, escalations: [{ toScope: "finance", returnedAt: null }] })).toBe("escalated");
    expect(ticketLane({ ...base, escalations: [{ toScope: "finance", returnedAt: ago(1) }] })).toBe("new");
  });

  it("is done when resolved or closed, even with a live escalation", () => {
    expect(ticketLane({ ...base, status: "resolved" })).toBe("done");
    expect(ticketLane({ ...base, status: "closed", escalations: [{ toScope: "moderation", returnedAt: null }] })).toBe("done");
  });
});

describe("the promise a ticket is under", () => {
  it("is four hours for the safety topic", () => {
    expect(ticketGrade("safety")).toBe("urgent");
  });

  it("is four hours once escalated to money or safety, and back to a day when handed back", () => {
    expect(ticketGrade("booking", [{ toScope: "finance", returnedAt: null }])).toBe("urgent");
    expect(ticketGrade("booking", [{ toScope: "moderation", returnedAt: null }])).toBe("urgent");
    expect(ticketGrade("booking", [{ toScope: "finance", returnedAt: ago(1) }])).toBe("standard");
  });

  it("does not speed up for a verification hand-off", () => {
    expect(ticketGrade("verification", [{ toScope: "kyc_review", returnedAt: null }])).toBe("routine");
  });

  it("is a day for the rest", () => {
    expect(ticketGrade("booking")).toBe("standard");
    expect(ticketGrade(null)).toBe("standard");
  });
});

describe("the clock", () => {
  it("is breached past the promise, in whole hours", () => {
    const s = slaState({ lane: "new", waitingSince: ago(6.5), grade: "urgent", now: NOW });
    expect(s.breached).toBe(true);
    expect(s.tone).toBe("danger");
    expect(s.label).toBe("Late by 3h");
    expect(s.promise).toBe("4h");
  });

  it("warns inside the last quarter of the window", () => {
    const s = slaState({ lane: "waiting_on_us", waitingSince: ago(19), grade: "standard", now: NOW });
    expect(s.breached).toBe(false);
    expect(s.tone).toBe("warning");
    expect(s.label).toBe("Due in 5h");
    expect(s.promise).toBe("1 day");
  });

  it("says due within the hour rather than counting minutes", () => {
    expect(slaState({ lane: "new", waitingSince: ago(3.5), grade: "urgent", now: NOW }).label).toBe("Due within the hour");
  });

  it("runs no clock when we answered last, or when the ticket is done", () => {
    expect(slaState({ lane: "waiting_on_member", waitingSince: null, grade: "urgent", now: NOW })).toMatchObject({
      dueAt: null,
      breached: false,
      label: "We answered last",
    });
    expect(slaState({ lane: "done", waitingSince: ago(90), grade: "urgent", now: NOW }).breached).toBe(false);
  });
});

describe("the order of the queue", () => {
  const row = (lane: SupportLane, sla: Partial<SlaState>, created = ago(1), last = ago(1)) => ({
    lane,
    sla: { dueAt: null, breached: false, hours: 0, label: "", tone: "info", promise: "1 day", grade: "standard", ...sla } as SlaState,
    createdAt: created,
    lastActivityAt: last,
  });

  it("puts the latest breach first, then the soonest due, then no clock, then done", () => {
    const late2 = row("new", { breached: true, hours: 2, dueAt: ago(2) });
    const late9 = row("waiting_on_us", { breached: true, hours: 9, dueAt: ago(9) });
    const soon = row("new", { dueAt: new Date(NOW + 3_600_000).toISOString() });
    const later = row("new", { dueAt: new Date(NOW + 20 * 3_600_000).toISOString() });
    const member = row("waiting_on_member", {});
    const done = row("done", {});
    const sorted = [done, member, later, late2, soon, late9].sort(compareTickets);
    expect(sorted).toEqual([late9, late2, soon, later, member, done]);
  });
});

describe("tabs", () => {
  it("counts each lane, what is mine, and all open", () => {
    const rows = [
      { lane: "new" as const, claimedByMe: true },
      { lane: "waiting_on_member" as const, claimedByMe: false },
      { lane: "done" as const, claimedByMe: true },
    ];
    const c = tabCounts(rows);
    expect(c.open).toBe(2);
    expect(c.mine).toBe(1);
    expect(c.done).toBe(1);
    expect(inTab(rows[2]!, "mine")).toBe(false);
  });
});

describe("escalation", () => {
  it("hands only to money, safety and verification: never to compliance", () => {
    expect([...ESCALATION_TARGETS].sort()).toEqual(["finance", "kyc_review", "moderation"]);
    expect(ESCALATION_TARGETS as readonly string[]).not.toContain("compliance");
  });

  it("suggests the desk from the topic, and nothing for the rest", () => {
    expect(suggestedEscalation("safety")).toBe("moderation");
    expect(suggestedEscalation("payment")).toBe("finance");
    expect(suggestedEscalation("verification")).toBe("kyc_review");
    expect(suggestedEscalation("booking")).toBeNull();
  });
});

describe("the keys", () => {
  it("answers the desk's letters", () => {
    expect(shortcutFor({ key: "j" })).toBe("next");
    expect(shortcutFor({ key: "K" })).toBe("prev");
    expect(shortcutFor({ key: "c" })).toBe("claim");
    expect(shortcutFor({ key: "r" })).toBe("reply");
    expect(shortcutFor({ key: "n" })).toBe("next_unclaimed");
    expect(shortcutFor({ key: "?" })).toBe("help");
  });

  it("never fires while typing or with a modifier, but Escape always closes", () => {
    expect(shortcutFor({ key: "r", targetTag: "TEXTAREA" })).toBeNull();
    expect(shortcutFor({ key: "c", targetTag: "input" })).toBeNull();
    expect(shortcutFor({ key: "j", targetEditable: true })).toBeNull();
    expect(shortcutFor({ key: "r", metaKey: true })).toBeNull();
    expect(shortcutFor({ key: "c", ctrlKey: true })).toBeNull();
    expect(shortcutFor({ key: "Escape", targetTag: "TEXTAREA" })).toBe("close");
    expect(shortcutFor({ key: "x" })).toBeNull();
  });

  it("steps through the tickets on screen and stops at the ends", () => {
    const ids = ["a", "b", "c"];
    expect(stepTicket(ids, null, 1)).toBe("a");
    expect(stepTicket(ids, "a", 1)).toBe("b");
    expect(stepTicket(ids, "c", 1)).toBe("c");
    expect(stepTicket(ids, "a", -1)).toBe("a");
    expect(stepTicket([], null, 1)).toBeNull();
  });

  it("jumps to the next open ticket nobody holds, skipping ones waiting on the member", () => {
    const rows = [
      { id: "a", claimed: false, lane: "new" as const },
      { id: "b", claimed: true, lane: "new" as const },
      { id: "c", claimed: false, lane: "waiting_on_member" as const },
      { id: "d", claimed: false, lane: "waiting_on_us" as const },
    ];
    expect(nextUnclaimed(rows, "a")).toBe("d");
    expect(nextUnclaimed(rows, "d")).toBe("a");
    expect(nextUnclaimed([{ id: "x", claimed: true, lane: "new" }], null)).toBeNull();
  });
});
