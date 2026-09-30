import { describe, expect, it } from "vitest";
import { lastConfirmedVersion, termsDiff } from "./terms-diff";

const V1 = {
  terms: { move_in: "2026-11-01", rent_minor: 250_000_000, caution_minor: 25_000_000, agency_minor: 25_000_000, notes: "Painted before move in" },
  amountMinor: 300_000_000,
};

describe("termsDiff (B9)", () => {
  it("finds nothing when nothing moved", () => {
    expect(termsDiff(V1, structuredClone(V1))).toEqual([]);
  });

  it("names the one line that moved, and the total", () => {
    const v2 = { terms: { ...V1.terms, caution_minor: 50_000_000 }, amountMinor: 325_000_000 };
    expect(termsDiff(V1, v2)).toEqual([
      { key: "caution_minor", label: "Caution deposit", kind: "money", before: 25_000_000, after: 50_000_000 },
      { key: "total", label: "Total", kind: "money", before: 300_000_000, after: 325_000_000 },
    ]);
  });

  it("treats a line that appears or goes as a change, never as zero", () => {
    const v2 = { terms: { ...V1.terms, legal_minor: 10_000_000, notes: "" }, amountMinor: 300_000_000 };
    const changes = termsDiff(V1, v2);
    expect(changes.map((c) => c.key)).toEqual(["legal_minor", "notes"]);
    expect(changes[0]).toMatchObject({ before: null, after: 10_000_000 });
    expect(changes[1]).toMatchObject({ before: "Painted before move in", after: null });
  });

  it("keeps the page's order: dates, money, then notes", () => {
    const v2 = { terms: { ...V1.terms, notes: "x", move_in: "2026-12-01", rent_minor: 1 }, amountMinor: V1.amountMinor };
    expect(termsDiff(V1, v2).map((c) => c.key)).toEqual(["move_in", "rent_minor", "notes"]);
  });
});

describe("lastConfirmedVersion (B9)", () => {
  const events = [
    { action: "opened", actorId: "o", termsVersion: 1 },
    { action: "confirmed", actorId: "me", termsVersion: 1 },
    { action: "confirmed", actorId: "o", termsVersion: 1 },
    { action: "amended", actorId: "o", termsVersion: 2 },
  ];

  it("reads my last confirmed version from the events", () => {
    expect(lastConfirmedVersion(events, "me", 2)).toBe(1);
  });

  it("is null when I confirmed the current version, or never confirmed", () => {
    expect(lastConfirmedVersion([...events, { action: "confirmed", actorId: "me", termsVersion: 2 }], "me", 2)).toBeNull();
    expect(lastConfirmedVersion(events, "someone-else", 2)).toBeNull();
  });
});
