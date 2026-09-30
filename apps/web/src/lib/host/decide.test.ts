import { describe, expect, it } from "vitest";
import { clockFor, leftLabel, roomDeadline, sortByDeadline } from "./decide";

const H = 3_600_000;

describe("the decide-by clock", () => {
  const opened = "2026-09-30T08:00:00.000Z";
  const deadline = roomDeadline(opened);
  const at = (hours: number) => Date.parse(opened) + hours * H;

  it("gives a room request the 48-hour hold", () => {
    expect(deadline).toBe("2026-10-02T08:00:00.000Z");
  });

  it("is blue with time to spare, cyan in the last quarter, red in the last hour", () => {
    expect(clockFor(opened, deadline, at(10)).urgency).toBe("spare");
    expect(clockFor(opened, deadline, at(36.5)).urgency).toBe("soon");
    expect(clockFor(opened, deadline, at(47.5)).urgency).toBe("late");
    expect(clockFor(opened, deadline, at(48)).urgency).toBe("lapsed");
  });

  it("says the time left in words", () => {
    expect(clockFor(opened, deadline, at(29.75)).label).toBe("18 h 15 min left");
    expect(leftLabel(45 * 60_000)).toBe("45 min left");
    expect(leftLabel(30 * H)).toBe("1 d 6 h left");
    expect(leftLabel(0)).toBe("Lapsed");
  });

  it("the bar is the share of the window left", () => {
    expect(clockFor(opened, deadline, at(12)).left).toBeCloseTo(0.75);
  });
});

describe("the order", () => {
  it("puts the soonest first and the lapsed last", () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    const items = [
      { kind: "room" as const, id: "a", openedAt: "", deadline: "2026-10-01T12:00:00Z" },
      { kind: "table" as const, id: "b", openedAt: "", deadline: "2026-09-30T13:00:00Z" },
      { kind: "room" as const, id: "c", openedAt: "", deadline: "2026-09-30T11:00:00Z" },
    ];
    expect(sortByDeadline(items, now).map((i) => i.id)).toEqual(["b", "a", "c"]);
  });
});
