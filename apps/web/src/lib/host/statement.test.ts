import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "../money/history-model";
import {
  lagosMonthOf,
  monthStartInstant,
  monthsWithLines,
  nairaPlain,
  nextMonth,
  statementCsv,
  statementLines,
  statementTotals,
} from "./statement";

function entry(partial: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: "e",
    kind: "earning",
    occurredAt: "2026-09-10T10:00:00Z",
    amountMinor: 0,
    direction: "in",
    status: "SUCCESSFUL",
    reference: null,
    title: "Deluxe at Eko",
    bookingId: "b1",
    grossMinor: null,
    guaranteeMinor: null,
    commissionMinor: null,
    listerShareMinor: null,
    payerName: null,
    payeeName: null,
    ...partial,
  };
}

const entries: HistoryEntry[] = [
  entry({ id: "p1", amountMinor: 8_500_000, grossMinor: 10_000_000, commissionMinor: 1_000_000, guaranteeMinor: 500_000, reference: "VAL-1" }),
  entry({ id: "p2", occurredAt: "2026-09-30T23:30:00Z", amountMinor: 1_700_000, grossMinor: 2_000_000, commissionMinor: 200_000, guaranteeMinor: 100_000 }),
  entry({ id: "r1", kind: "reversal", direction: "out", occurredAt: "2026-09-20T09:00:00Z", amountMinor: 850_000, grossMinor: -1_000_000, commissionMinor: -100_000, guaranteeMinor: -50_000, status: "refunded" }),
  entry({ id: "old", occurredAt: "2026-08-31T12:00:00Z", amountMinor: 100 }),
  entry({ id: "pay", kind: "payment", direction: "out", amountMinor: 999 }),
];

describe("a month's statement", () => {
  it("keeps the Lagos month: 23:30 UTC on 30 September is already October in Lagos", () => {
    expect(lagosMonthOf("2026-09-30T23:30:00Z")).toBe("2026-10");
    expect(monthStartInstant("2026-10")).toBe("2026-09-30T23:00:00.000Z");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("lists the payments and reversals of the month, oldest first, reversals negative", () => {
    const lines = statementLines(entries, "2026-09");
    expect(lines.map((l) => l.id)).toEqual(["p1", "r1"]);
    expect(lines[1]).toMatchObject({ grossMinor: -1_000_000, commissionMinor: -100_000, guaranteeMinor: -50_000, shareMinor: -850_000 });
  });

  it("adds the four figures up without computing any split", () => {
    const t = statementTotals(statementLines(entries, "2026-09"));
    expect(t).toEqual({
      payments: 1,
      reversals: 1,
      grossMinor: 9_000_000,
      commissionMinor: 900_000,
      guaranteeMinor: 450_000,
      shareMinor: 7_650_000,
    });
  });

  it("names the months that have lines", () => {
    expect(monthsWithLines(entries)).toEqual(["2026-10", "2026-09", "2026-08"]);
  });
});

describe("the CSV", () => {
  it("prints kobo exactly and adds a totals row", () => {
    expect(nairaPlain(8_500_005)).toBe("85000.05");
    expect(nairaPlain(-850_000)).toBe("-8500.00");
    const csv = statementCsv(statementLines(entries, "2026-09"));
    const rows = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(rows).toHaveLength(4);
    expect(rows[1]).toBe('"2026-09-10","Payment","Deluxe at Eko","100000.00","10000.00","5000.00","85000.00","VAL-1","b1"');
    expect(rows[3]).toContain('"76500.00"');
  });

  it("never lets a title become a spreadsheet formula", () => {
    const csv = statementCsv(statementLines([entry({ id: "x", title: "=HYPERLINK(\"http://x\")", amountMinor: 1 })], "2026-09"));
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
  });
});
