import { describe, expect, it } from "vitest";
import { addMonths, cautionState, keptUntil, moveOutOpensOn, reportStatus, tenancyEnd } from "./model";

describe("tenancy dates", () => {
  it("ends one rent period after move-in", () => {
    expect(tenancyEnd("2026-10-01", "year")).toBe("2027-10-01");
    expect(tenancyEnd("2026-10-01", "quarter")).toBe("2027-01-01");
    expect(tenancyEnd("2026-10-01", "month")).toBe("2026-11-01");
  });

  it("clamps to the month's last day as Postgres does", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(tenancyEnd("2028-02-29", "year")).toBe("2029-02-28");
  });

  it("opens move-out 30 days before the end and keeps evidence six years after it", () => {
    expect(moveOutOpensOn("2026-10-01", "year")).toBe("2027-09-01");
    expect(keptUntil("2026-10-01", "year")).toBe("2033-10-01");
  });
});

describe("cautionState", () => {
  const base = { amountMinor: 30_000_000, deductions: [], returns: [] };
  it("is open with nothing beside it", () => {
    expect(cautionState(base)).toMatchObject({ state: "open", outstandingMinor: 30_000_000 });
  });
  it("reads an unanswered line as proposed", () => {
    expect(cautionState({ ...base, deductions: [{ amountMinor: 5_000_000, answer: null }] }).state).toBe("deductions_proposed");
  });
  it("lets a dispute outrank everything short of settled", () => {
    const facts = { ...base, deductions: [{ amountMinor: 5_000_000, answer: "accepted" as const }, { amountMinor: 1, answer: "disputed" as const }] };
    expect(cautionState(facts).state).toBe("disputed");
  });
  it("is agreed when every line is accepted and money is still owed", () => {
    expect(cautionState({ ...base, deductions: [{ amountMinor: 5_000_000, answer: "accepted" }] })).toMatchObject({ state: "agreed", outstandingMinor: 25_000_000 });
  });
  it("is settled when returns plus accepted lines cover it, and never owes below zero", () => {
    const facts = { amountMinor: 30_000_000, deductions: [{ amountMinor: 5_000_000, answer: "accepted" as const }], returns: [{ amountMinor: 26_000_000 }] };
    expect(cautionState(facts)).toMatchObject({ state: "returned", outstandingMinor: 0, returnedMinor: 26_000_000, deductedMinor: 5_000_000 });
  });
  it("does not count a disputed line as deducted", () => {
    const facts = { amountMinor: 30_000_000, deductions: [{ amountMinor: 5_000_000, answer: "disputed" as const }], returns: [{ amountMinor: 25_000_000 }] };
    expect(cautionState(facts)).toMatchObject({ state: "disputed", outstandingMinor: 5_000_000 });
  });
});

describe("reportStatus", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  it("is not open before its day, and open on it", () => {
    expect(reportStatus({ opensOn: "2026-10-25", today: "2026-10-20", report: null })).toEqual({ kind: "not_open", opensOn: "2026-10-25" });
    expect(reportStatus({ opensOn: "2026-10-20", today: "2026-10-20", report: null }).kind).toBe("open");
  });
  it("is a draft until submitted", () => {
    expect(reportStatus({ opensOn: "2026-10-01", today: "2026-10-20", report: { submittedAt: null, countersignedAt: null } }).kind).toBe("draft");
  });
  it("is not answered once seven days pass without a countersignature", () => {
    expect(reportStatus({ opensOn: "2026-10-01", today: "2026-10-20", report: { submittedAt: "2026-10-15T12:00:00Z", countersignedAt: null }, now }).kind).toBe("submitted");
    expect(reportStatus({ opensOn: "2026-10-01", today: "2026-10-20", report: { submittedAt: "2026-10-12T12:00:00Z", countersignedAt: null }, now })).toEqual({ kind: "not_answered", since: "2026-10-19T12:00:00.000Z" });
  });
  it("is countersigned once the other side signs", () => {
    expect(reportStatus({ opensOn: "2026-10-01", today: "2026-10-20", report: { submittedAt: "2026-10-12T12:00:00Z", countersignedAt: "2026-10-13T09:00:00Z" }, now }).kind).toBe("countersigned");
  });
});
