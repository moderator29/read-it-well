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
    expect(earliestLagosInput(now)).toBe("2026-09-25T01:10");
  });

  it("refuses the past and the next two hours, accepts after", () => {
    const now = Date.now();
    expect(farEnoughAhead(new Date(now - 60_000).toISOString(), now)).toBe(false);
    expect(farEnoughAhead(new Date(now + 30 * 60_000).toISOString(), now)).toBe(false);
    expect(farEnoughAhead(new Date(now + LEAD_MS + 60_000).toISOString(), now)).toBe(true);
  });

  it("is the rule the server action and the sheet use", () => {
    const actions = readFileSync(join(__dirname, "actions.ts"), "utf8");
    expect(actions).toContain("farEnoughAhead(value)");
    const sheet = readFileSync(join(__dirname, "..", "..", "components", "app", "inspections", "RequestInspection.tsx"), "utf8");
    expect(sheet).toContain("min={earliestLagosInput()}");
    expect(sheet).toContain("lagosWallClockToIso(when)");
    expect(sheet).not.toContain("new Date(when).toISOString()");
    expect(sheet).toContain('<Link href="/inspections"');
    expect(sheet).not.toContain("Coming from Yaba");
  });
});
