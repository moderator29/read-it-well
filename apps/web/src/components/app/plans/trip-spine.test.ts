import { describe, expect, it } from "vitest";
import { buildTripSpine, lagosToday, type TripEntry } from "./trip-spine";

const TODAY = "2026-09-18";

function stay(id: string, on: string, cancelled = false): TripEntry {
  return { id, kind: "stay", on, cancelled };
}
function table(id: string, on: string, at: string, cancelled = false): TripEntry {
  return { id, kind: "table", on, at, cancelled };
}

describe("the trip spine", () => {
  it("interleaves stays and tables by date rather than keeping two lists", () => {
    const spine = buildTripSpine(
      [
        stay("stay-oct", "2026-10-02"),
        table("table-sep", "2026-09-26", "2026-09-26T19:00:00.000Z"),
        stay("stay-sep", "2026-09-20"),
      ],
      TODAY,
    );
    expect(spine.upcoming.map((e) => e.id)).toEqual(["stay-sep", "table-sep", "stay-oct"]);
  });

  it("orders two things on one day by the hour where there is one", () => {
    const spine = buildTripSpine(
      [
        table("dinner", "2026-09-20", "2026-09-20T19:30:00.000Z"),
        table("lunch", "2026-09-20", "2026-09-20T12:00:00.000Z"),
      ],
      TODAY,
    );
    expect(spine.upcoming.map((e) => e.id)).toEqual(["lunch", "dinner"]);
  });

  it("accents everything happening today, and there can be more than one", () => {
    const spine = buildTripSpine(
      [stay("checkin", TODAY), table("table", TODAY, `${TODAY}T20:00:00.000Z`), stay("later", "2026-09-30")],
      TODAY,
    );
    expect(spine.tonight).toEqual(["checkin", "table"]);
  });

  it("puts yesterday behind the disclosure, most recent first", () => {
    const spine = buildTripSpine(
      [stay("old", "2026-08-01"), stay("recent", "2026-09-17"), stay("ahead", "2026-09-25")],
      TODAY,
    );
    expect(spine.upcoming.map((e) => e.id)).toEqual(["ahead"]);
    expect(spine.past.map((e) => e.id)).toEqual(["recent", "old"]);
  });

  it("treats a cancelled trip as past even when its date is ahead", () => {
    const spine = buildTripSpine([stay("scrapped", "2026-12-01", true), stay("real", "2026-12-02")], TODAY);
    expect(spine.upcoming.map((e) => e.id)).toEqual(["real"]);
    expect(spine.past.map((e) => e.id)).toEqual(["scrapped"]);
    expect(spine.tonight).toEqual([]);
  });

  it("reads today on the Lagos calendar, not the device's", () => {
    expect(lagosToday(new Date("2026-09-25T23:30:00.000Z"))).toBe("2026-09-26");
  });
});
