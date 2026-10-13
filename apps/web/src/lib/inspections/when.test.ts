import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { earliestLagosInput, farEnoughAhead, lagosWallClockToIso, LEAD_MS } from "./when";

vi.mock("server-only", () => ({}));

/**
 * UX-20: a request for a past time, or one the lister cannot answer before
 * it arrives, is refused by the server as well as the picker; the picked
 * time means Lagos time whatever zone the phone is in. UX-16: the line under
 * a request points at /inspections, where inspections are.
 */
describe("when an inspection may be asked for", () => {
  it("reads the picked wall clock as Lagos time", () => {
    expect(lagosWallClockToIso("2026-10-10T14:30")).toBe("2026-10-10T13:30:00.000Z");
    expect(lagosWallClockToIso("not a time")).toBeNull();
  });

  it("sets the picker's earliest time two hours ahead on the Lagos clock", () => {
    const now = Date.parse("2026-09-24T22:10:00Z"); // 23:10 in Lagos
    expect(earliestLagosInput(now)).toBe("2026-09-25T01:15");
    expect(earliestLagosInput(Date.parse("2026-09-24T22:00:00Z"))).toBe("2026-09-25T01:00");
    expect(earliestLagosInput(Date.parse("2026-09-24T12:37:10Z"))).toBe("2026-09-24T15:45");
  });

  it("refuses the past and the next two hours, accepts after", () => {
    const now = Date.now();
    expect(farEnoughAhead(new Date(now - 60_000).toISOString(), now)).toBe(false);
    expect(farEnoughAhead(new Date(now + 30 * 60_000).toISOString(), now)).toBe(false);
    expect(farEnoughAhead(new Date(now + LEAD_MS + 60_000).toISOString(), now)).toBe(true);
  });

  it("is the rule the server action and the visit flow use", () => {
    const actions = readFileSync(join(__dirname, "actions.ts"), "utf8");
    expect(actions).toContain("farEnoughAhead(value)");
    /* The request sheet became the door into Schedule a visit (13 October
       2026). The times it offers come from `askTimesOn`, which builds each
       one on Lagos wall-clock time and keeps only those the action accepts. */
    const visit = readFileSync(join(__dirname, "visit.ts"), "utf8");
    expect(visit).toMatch(/askTimesOn[\s\S]{0,400}farEnoughAhead\(time\.slotAt, now\)/);
    expect(visit).toContain("+01:00");
    const planner = readFileSync(join(__dirname, "..", "..", "components", "app", "inspections", "visit", "VisitPlanner.tsx"), "utf8");
    expect(planner).toContain("askTimesOn(");
    expect(planner).not.toContain("new Date(when).toISOString()");
    const door = readFileSync(join(__dirname, "..", "..", "components", "app", "inspections", "RequestInspection.tsx"), "utf8");
    expect(door).toContain("href={`/listing/${listingId}/visit`}");
    expect(door).not.toContain('type="datetime-local"');
    expect(door).not.toContain("Coming from Yaba");
  });

  it("is what every counter-offer picker uses too", () => {
    /* One picker now, shared by the card, the dashboard rows and the thread. */
    const picker = readFileSync(join(__dirname, "..", "..", "components/app/inspections/ViewingSheets.tsx"), "utf8");
    expect(picker).not.toContain("new Date(when).toISOString()");
    expect(picker).toContain("lagosWallClockToIso(when)");
    expect(picker).toContain("min={earliestLagosInput()}");
    for (const file of [
      "components/app/inspections/InspectionSheet.tsx",
      "components/app/inspections/InspectionRows.tsx",
      "components/app/threads/RentalFace.tsx",
    ]) {
      const text = readFileSync(join(__dirname, "..", "..", file), "utf8");
      expect(text, file).not.toContain("new Date(when).toISOString()");
      expect(text, file).not.toContain('type="datetime-local"');
      expect(text, file).toContain("<ViewingTimeSheet");
    }
  });
});
