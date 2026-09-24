import { describe, expect, it } from "vitest";
import { byDue, claimIsLive, clockFor, gradeFor, probablyNotAPerson, readItemKey, readViewFilters, reportWeight, viewHref } from "./queue-desk";

const NOW = new Date("2026-09-24T12:00:00Z");

describe("claims (V-89)", () => {
  it("stay live for thirty minutes after the last touch, then free", () => {
    expect(claimIsLive("2026-09-24T11:45:00Z", NOW.getTime())).toBe(true);
    expect(claimIsLive("2026-09-24T11:29:00Z", NOW.getTime())).toBe(false);
    expect(claimIsLive(null, NOW.getTime())).toBe(false);
  });
});

describe("clocks", () => {
  it("take the published promise for each kind", () => {
    expect(gradeFor("report", { category: "off_platform_payment" })).toBe("urgent");
    expect(gradeFor("flag", { reason: "account_number" })).toBe("urgent");
    expect(gradeFor("listing", {})).toBe("routine");
  });
  it("sort by due, not newest: an old routine row can come after a new urgent one", () => {
    const urgent = { openedAt: "2026-09-24T11:00:00Z", clock: clockFor("2026-09-24T11:00:00Z", "urgent", NOW) };
    const routine = { openedAt: "2026-09-23T12:00:00Z", clock: clockFor("2026-09-23T12:00:00Z", "routine", NOW) };
    expect([routine, urgent].sort(byDue)[0]).toBe(urgent);
    expect(clockFor("2026-09-23T12:00:00Z", "urgent", NOW)).toMatchObject({ overdue: true, hoursLeft: -20 });
  });
});

describe("report weight", () => {
  it("puts a reporter who attended, with a phone and an upheld record, above a first report, and says why", () => {
    const heavy = reportWeight({ phoneConfirmed: true, attendedAt: "2026-09-12T10:00:00Z", pastClosed: 2, pastUpheld: 2 });
    const first = reportWeight({ phoneConfirmed: false, attendedAt: null, pastClosed: 0, pastUpheld: 0 });
    expect(heavy.score).toBeGreaterThan(first.score);
    expect(heavy.reasons.map((r) => r.kind)).toEqual(["attended", "phone", "record"]);
    expect(first).toEqual({ score: 0, reasons: [] });
  });
  it("orders by weight only inside the same hour of due", () => {
    const opened = "2026-09-24T10:00:00Z";
    const clock = clockFor(opened, "urgent", NOW);
    const light = { openedAt: opened, clock, weight: 0 };
    const heavy = { openedAt: opened, clock, weight: 5 };
    expect([light, heavy].sort(byDue)[0]).toBe(heavy);
    const earlier = { openedAt: "2026-09-24T08:00:00Z", clock: clockFor("2026-09-24T08:00:00Z", "urgent", NOW), weight: 0 };
    expect([heavy, earlier].sort(byDue)[0]).toBe(earlier);
  });
});

describe("probably not a person", () => {
  it("catches a domain pitch with a link from somebody with no account", () => {
    expect(probablyNotAPerson({ hasAccount: false, body: "Premium domain vallo-homes.com for sale, great for SEO. https://buy.example" })).toBe(true);
    expect(probablyNotAPerson({ hasAccount: false, body: "www.cheap-backlinks.xyz" })).toBe(true);
  });
  it("never lanes a person with an account, or a plain question", () => {
    expect(probablyNotAPerson({ hasAccount: true, body: "domain for sale https://x.com" })).toBe(false);
    expect(probablyNotAPerson({ hasAccount: false, body: "I paid for an inspection in Yaba and nobody came. What do I do?" })).toBe(false);
  });
});

describe("saved views and bulk keys", () => {
  it("round-trip a view's filters into a link, dropping anything unexpected", () => {
    const filters = readViewFilters({ tab: "reports", q: "scam", lane: "late", evil: "<x>" });
    expect(filters).toEqual({ tab: "reports", q: "scam", lane: "late" });
    expect(viewHref(filters)).toBe("/admin/queue?tab=reports&q=scam&lane=late");
  });
  it("reads only a known kind and a uuid", () => {
    expect(readItemKey("report:3653d202-e498-4db0-ab71-882649f7f446")).toEqual({ kind: "report", id: "3653d202-e498-4db0-ab71-882649f7f446" });
    expect(readItemKey("wallet:3653d202-e498-4db0-ab71-882649f7f446")).toBeNull();
    expect(readItemKey("report:1 or 1=1")).toBeNull();
  });
});
