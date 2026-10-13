import { describe, expect, it } from "vitest";
import {
  addDays,
  checkFollowup,
  dueNowIds,
  groupFollowups,
  isDay,
  lagosDay,
  messageForDbError,
  parseFollowups,
  type Followup,
} from "./followup";

const words = { errNotYours: "not yours", errNote: "note too long", errFar: "date out of range", errFailed: "failed" };

/* 23:30 UTC on 12 October is 00:30 on 13 October in Lagos. */
const LATE_UTC = new Date("2026-10-12T23:30:00Z");
const NOON = new Date("2026-10-13T11:00:00Z");

describe("lagosDay", () => {
  it("is the Lagos calendar day, which is ahead of UTC after 23:00", () => {
    expect(lagosDay(LATE_UTC)).toBe("2026-10-13");
    expect(lagosDay(new Date("2026-10-12T22:59:00Z"))).toBe("2026-10-12");
    expect(lagosDay(NOON)).toBe("2026-10-13");
  });
});

describe("isDay", () => {
  it("accepts a real day and refuses the rest", () => {
    expect(isDay("2026-10-13")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("13/10/2026")).toBe(false);
    expect(isDay("2026-10-13T00:00")).toBe(false);
    expect(isDay(null)).toBe(false);
    expect(isDay(20261013)).toBe(false);
  });
});

describe("checkFollowup: the date rules, in Lagos", () => {
  it("accepts today, counted in Lagos, even when UTC is still yesterday", () => {
    expect(checkFollowup({ dueOn: "2026-10-13", note: null }, LATE_UTC)).toEqual({ ok: true, dueOn: "2026-10-13", note: null });
  });

  it("refuses a day that has passed in Lagos though it is still today in UTC", () => {
    expect(checkFollowup({ dueOn: "2026-10-12" }, LATE_UTC)).toEqual({ ok: false, reason: "past" });
  });

  it("accepts up to a year ahead and refuses the day after", () => {
    const today = lagosDay(NOON);
    expect(checkFollowup({ dueOn: addDays(today, 365) }, NOON).ok).toBe(true);
    expect(checkFollowup({ dueOn: addDays(today, 366) }, NOON)).toEqual({ ok: false, reason: "far" });
  });

  it("refuses a malformed or impossible date", () => {
    expect(checkFollowup({ dueOn: "tomorrow" }, NOON)).toEqual({ ok: false, reason: "format" });
    expect(checkFollowup({ dueOn: "2026-02-30" }, NOON)).toEqual({ ok: false, reason: "format" });
  });

  it("clears with a null or empty date, and drops the note with it", () => {
    expect(checkFollowup({ dueOn: null, note: "ring him" }, NOON)).toEqual({ ok: true, dueOn: null, note: null });
    expect(checkFollowup({ dueOn: "  ", note: "ring him" }, NOON)).toEqual({ ok: true, dueOn: null, note: null });
    expect(checkFollowup({}, NOON)).toEqual({ ok: true, dueOn: null, note: null });
  });

  it("trims the note, keeps a blank one as none, and refuses over 200 characters", () => {
    expect(checkFollowup({ dueOn: "2026-10-20", note: "  Ring about the lease  " }, NOON)).toEqual({
      ok: true,
      dueOn: "2026-10-20",
      note: "Ring about the lease",
    });
    expect(checkFollowup({ dueOn: "2026-10-20", note: "   " }, NOON)).toEqual({ ok: true, dueOn: "2026-10-20", note: null });
    expect(checkFollowup({ dueOn: "2026-10-20", note: "a".repeat(200) }, NOON).ok).toBe(true);
    expect(checkFollowup({ dueOn: "2026-10-20", note: "a".repeat(201) }, NOON)).toEqual({ ok: false, reason: "note" });
  });
});

describe("parseFollowups", () => {
  it("keeps real rows and drops anything that is not one", () => {
    const rows = parseFollowups([
      { conversation_id: "c1", due_on: "2026-10-13", note: " call " },
      { conversation_id: "c2", due_on: "not a date", note: null },
      { conversation_id: 7, due_on: "2026-10-14", note: null },
      { conversation_id: "c3", due_on: "2026-10-14", note: "" },
      null,
      "x",
    ]);
    expect(rows).toEqual([
      { conversationId: "c1", dueOn: "2026-10-13", note: "call" },
      { conversationId: "c3", dueOn: "2026-10-14", note: null },
    ]);
  });

  it("is empty for anything that is not a list", () => {
    expect(parseFollowups(null)).toEqual([]);
    expect(parseFollowups({})).toEqual([]);
  });
});

describe("groupFollowups: due-today grouping", () => {
  const rows: Followup[] = [
    { conversationId: "late", dueOn: "2026-10-10", note: null },
    { conversationId: "now-b", dueOn: "2026-10-13", note: null },
    { conversationId: "now-a", dueOn: "2026-10-13", note: "x" },
    { conversationId: "soon", dueOn: "2026-10-15", note: null },
    { conversationId: "let", dueOn: "2026-10-13", note: null },
    { conversationId: "lost", dueOn: "2026-10-12", note: null },
  ];
  const stages = new Map([
    ["let", { stage: "let" }],
    ["lost", { stage: "lost" }],
    ["now-a", { stage: "replied" }],
  ]);

  it("groups by Lagos day and never includes a Let or Lost enquiry", () => {
    const groups = groupFollowups(rows, stages, NOON);
    expect(groups.overdue.map((r) => r.conversationId)).toEqual(["late"]);
    expect(groups.today.map((r) => r.conversationId)).toEqual(["now-a", "now-b"]);
    expect(groups.upcoming.map((r) => r.conversationId)).toEqual(["soon"]);
  });

  it("moves 'today' at Lagos midnight, not UTC midnight", () => {
    const groups = groupFollowups(rows, stages, LATE_UTC);
    expect(groups.today.map((r) => r.conversationId)).toEqual(["now-a", "now-b"]);
    const before = groupFollowups(rows, stages, new Date("2026-10-12T22:00:00Z"));
    expect(before.today).toEqual([]);
    expect(before.upcoming.map((r) => r.conversationId)).toContain("now-a");
  });

  it("claims nothing about stage when the desk could not be read", () => {
    const groups = groupFollowups(rows, null, NOON);
    expect(groups.today.map((r) => r.conversationId)).toContain("let");
  });

  it("the Due today filter is today plus overdue", () => {
    expect([...dueNowIds(groupFollowups(rows, stages, NOON))].sort()).toEqual(["late", "now-a", "now-b"]);
  });

  it("is empty for no rows", () => {
    expect(groupFollowups([], stages, NOON)).toEqual({ overdue: [], today: [], upcoming: [] });
    expect(dueNowIds(groupFollowups([], stages, NOON)).size).toBe(0);
  });
});

describe("messageForDbError", () => {
  it("says which rule the database refused", () => {
    expect(messageForDbError({ code: "42501" }, words)).toBe("not yours");
    expect(messageForDbError({ code: "22023", message: "a follow-up note is at most 200 characters" }, words)).toBe("note too long");
    expect(messageForDbError({ code: "22023", message: "a follow-up date is from today to a year ahead" }, words)).toBe("date out of range");
    expect(messageForDbError({ code: "08006" }, words)).toBe("failed");
    expect(messageForDbError({}, words)).toBe("failed");
  });
});
