import { describe, expect, it } from "vitest";
import { mergeUpcoming, shareComingUp, type UpcomingItem } from "./upcoming-model";

const item = (kind: UpcomingItem["kind"], on: string, amountMinor = 100, id = kind): UpcomingItem => ({
  kind,
  on,
  amountMinor,
  href: "/x",
  id,
});

describe("mergeUpcoming", () => {
  it("drops the past and zero amounts, and sorts soonest first", () => {
    const out = mergeUpcoming(
      [item("stay", "2026-10-02"), item("renewal", "2026-09-01"), item("held", "2026-09-30", 0), item("caution_owed_to_you", "2026-09-28")],
      "2026-09-24",
    );
    expect(out.map((row) => row.kind)).toEqual(["caution_owed_to_you", "stay"]);
  });
  it("breaks a same-day tie by what the reader owes first", () => {
    const out = mergeUpcoming([item("stay", "2026-10-01"), item("caution_you_owe", "2026-10-01"), item("renewal", "2026-10-01")], "2026-09-24");
    expect(out.map((row) => row.kind)).toEqual(["caution_you_owe", "renewal", "stay"]);
  });
  it("keeps today and refuses a malformed day", () => {
    expect(mergeUpcoming([item("held", "2026-09-24"), item("stay", "24/09/2026")], "2026-09-24")).toHaveLength(1);
  });
});

describe("shareComingUp", () => {
  const open = { answer: "accepted", paid_at: null, void: false, payable: true };
  it("shows an accepted, unpaid, payable share", () => {
    expect(shareComingUp(open, 100, "2026-10-01")).toBe(true);
  });
  it("hides a share not yet answered, or declined", () => {
    expect(shareComingUp({ ...open, answer: null }, 100, "2026-10-01")).toBe(false);
    expect(shareComingUp({ ...open, answer: "declined" }, 100, "2026-10-01")).toBe(false);
  });
  it("hides a paid, void or closed share, and one with no amount or day", () => {
    expect(shareComingUp({ ...open, paid_at: "2026-09-01" }, 100, "2026-10-01")).toBe(false);
    expect(shareComingUp({ ...open, void: true }, 100, "2026-10-01")).toBe(false);
    expect(shareComingUp({ ...open, payable: false }, 100, "2026-10-01")).toBe(false);
    expect(shareComingUp(open, null, "2026-10-01")).toBe(false);
    expect(shareComingUp(open, 100, null)).toBe(false);
  });
});
