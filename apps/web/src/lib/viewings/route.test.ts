import { describe, expect, it } from "vitest";
import { lagosDay, nextStop, routeFor, slotsByDay, windowProblem } from "./route";

describe("the viewing day", () => {
  it("groups slots by Lagos day, in order", () => {
    const days = slotsByDay([
      { slotAt: "2026-09-26T09:20:00Z", minutes: 20, windowId: "w" },
      { slotAt: "2026-09-26T09:00:00Z", minutes: 20, windowId: "w" },
      { slotAt: "2026-09-26T23:30:00Z", minutes: 20, windowId: "w" },
    ]);
    expect(days.map((d) => d.day)).toEqual(["2026-09-26", "2026-09-27"]);
    expect(days[0]!.slots[0]!.slotAt).toBe("2026-09-26T09:00:00Z");
    expect(lagosDay("2026-09-26T23:30:00Z")).toBe("2026-09-27");
  });

  it("draws a route with the gap before each viewing and a new stop when the area changes", () => {
    const stop = (id: string, at: string, area: string) => ({
      inspectionId: id, listingId: id, listingTitle: null, area, slotAt: at, counterpartName: null, conversationId: null,
    });
    const route = routeFor([
      stop("c", "2026-09-26T10:20:00Z", "Akoka"),
      stop("a", "2026-09-26T09:00:00Z", "Yaba"),
      stop("b", "2026-09-26T09:20:00Z", "yaba "),
    ]);
    expect(route.map((l) => [l.inspectionId, l.gapMinutes, l.newArea])).toEqual([
      ["a", null, true],
      ["b", 20, false],
      ["c", 60, true],
    ]);
    expect(nextStop(route, Date.parse("2026-09-26T09:15:00Z"))?.inspectionId).toBe("b");
    expect(nextStop(route, Date.parse("2026-09-26T12:00:00Z"))).toBeNull();
  });

  it("checks a window before it is sent", () => {
    expect(windowProblem({ starts: "10:00", ends: "14:00", listingIds: ["x"] })).toBeNull();
    expect(windowProblem({ starts: "14:00", ends: "10:00", listingIds: ["x"] })).toBe("order");
    expect(windowProblem({ starts: "06:00", ends: "18:00", listingIds: ["x"] })).toBe("length");
    expect(windowProblem({ starts: "10:00", ends: "11:00", listingIds: [] })).toBe("listings");
  });
});
