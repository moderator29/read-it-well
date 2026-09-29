import { describe, expect, it } from "vitest";
import {
  dayLabel,
  earlierHref,
  groupByDay,
  lagosDay,
  lagosDayEnd,
  pageOf,
  parseBefore,
  parseDay,
  parseEarningsSummary,
  parseHistoryRow,
  parseHistoryRows,
  parsePaymentsSummary,
  parseAdminSummary,
  signFor,
  statusFor,
  toMinor,
  type HistoryEntry,
} from "./history-model";

const row = (over: Record<string, unknown> = {}) => ({
  entry_id: "7d7c1c1e-0000-4000-8000-000000000001",
  kind: "payment",
  occurred_at: "2026-09-28T09:15:00.123456+00:00",
  amount_minor: 45_000_050,
  status: "SUCCESSFUL",
  reference: "PSK_123",
  title: "Two bedroom flat, Yaba",
  booking_id: "7d7c1c1e-0000-4000-8000-0000000000b1",
  ...over,
});

describe("which way the money went", () => {
  it("draws a payment as money out and a refund as money back, for the payer", () => {
    const pay = parseHistoryRow(row());
    const back = parseHistoryRow(row({ kind: "refund", status: "processed" }));
    expect(pay?.direction).toBe("out");
    expect(back?.direction).toBe("in");
    expect(signFor(pay!.direction)).toBe("-");
    expect(signFor(back!.direction)).toBe("+");
  });

  it("draws an earning as money in and a reversal as money out, for the lister", () => {
    const earned = parseHistoryRow(row({ kind: "earning" }));
    const reversed = parseHistoryRow(row({ kind: "reversal", amount_minor: -1_200_000, status: "refunded" }));
    expect(signFor(earned!.direction)).toBe("+");
    expect(signFor(reversed!.direction)).toBe("-");
    /* The size is positive; the kind carries the sign, never the figure. */
    expect(reversed!.amountMinor).toBe(1_200_000);
  });
});

describe("reading rows", () => {
  it("keeps the kobo and the microseconds exactly", () => {
    const entry = parseHistoryRow(row());
    expect(entry?.amountMinor).toBe(45_000_050);
    expect(entry?.occurredAt).toBe("2026-09-28T09:15:00.123456+00:00");
  });

  it("drops a row with no amount rather than drawing it as nothing", () => {
    expect(parseHistoryRow(row({ amount_minor: null }))).toBeNull();
    expect(parseHistoryRow(row({ kind: "deposit" }))).toBeNull();
    expect(parseHistoryRow(row({ occurred_at: "yesterday" }))).toBeNull();
  });

  it("says a read that was not a list is not a list", () => {
    expect(parseHistoryRows(null)).toBeNull();
    expect(parseHistoryRows([])).toEqual([]);
  });

  it("accepts a bigint printed as digits, and nothing looser", () => {
    expect(toMinor("12345")).toBe(12345);
    expect(toMinor("-5")).toBe(-5);
    expect(toMinor("12.5")).toBeNull();
    expect(toMinor(1.5)).toBeNull();
  });
});

describe("summaries", () => {
  it("reads the payer's totals", () => {
    expect(parsePaymentsSummary({ status: "ok", paid_minor: 100, payments: 1, refunded_minor: 0 })).toEqual({
      status: "ok",
      summary: { paidMinor: 100, payments: 1, refundedMinor: 0 },
    });
  });

  it("refuses a summary missing a total instead of calling it zero", () => {
    expect(parsePaymentsSummary({ status: "ok", paid_minor: 100 }).status).toBe("unreadable");
    expect(parsePaymentsSummary(null).status).toBe("unreadable");
  });

  it("passes a signed-out or forbidden answer through", () => {
    expect(parseEarningsSummary({ status: "signed_out" }).status).toBe("signed_out");
    expect(parseAdminSummary({ status: "forbidden" }).status).toBe("forbidden");
  });

  it("keeps what reversals took off as a positive figure", () => {
    const read = parseEarningsSummary({
      status: "ok",
      earned_minor: 1000,
      gross_minor: 1100,
      payments: 1,
      reversed_minor: 200,
      net_minor: 800,
    });
    expect(read.status === "ok" && read.summary.reversedMinor).toBe(200);
    expect(read.status === "ok" && read.summary.netMinor).toBe(800);
  });
});

describe("states in words", () => {
  it("never calls a refund still with the processor settled", () => {
    expect(statusFor("refund", "submitted")).toEqual({ label: "Processing", tone: "info" });
    expect(statusFor("refund", "pending").tone).toBe("warning");
    expect(statusFor("refund", "processed")).toEqual({ label: "Refunded", tone: "success" });
    expect(statusFor("refund", "failed").tone).toBe("danger");
  });

  it("does not paint a refunded payment as a failure: the payment happened", () => {
    expect(statusFor("payment", "REFUNDED")).toEqual({ label: "Refunded", tone: "neutral" });
    expect(statusFor("payment", "SUCCESSFUL").label).toBe("Paid");
    expect(statusFor("earning", "SUCCESSFUL").label).toBe("Settled");
  });
});

describe("days, in Lagos", () => {
  const now = new Date("2026-09-29T10:00:00+01:00");

  it("puts 23:30 UTC on the next Lagos day", () => {
    expect(lagosDay("2026-09-28T23:30:00Z")).toBe("2026-09-29");
  });

  it("names today and yesterday, and dates the rest", () => {
    expect(dayLabel("2026-09-29", now)).toBe("Today");
    expect(dayLabel("2026-09-28", now)).toBe("Yesterday");
    expect(dayLabel("2026-09-20", now)).toBe("Sun 20 Sep");
  });

  it("groups newest first without reordering", () => {
    const entries = parseHistoryRows([
      row({ entry_id: "a", occurred_at: "2026-09-29T08:00:00Z" }),
      row({ entry_id: "b", occurred_at: "2026-09-29T07:00:00Z" }),
      row({ entry_id: "c", occurred_at: "2026-09-27T07:00:00Z" }),
    ])!;
    const days = groupByDay(entries, now);
    expect(days.map((d) => [d.label, d.entries.map((e) => e.id)])).toEqual([
      ["Today", ["a", "b"]],
      ["Sun 27 Sep", ["c"]],
    ]);
  });
});

describe("paging", () => {
  it("accepts the database's own instant, microseconds and zone intact", () => {
    expect(parseBefore("2026-09-28T09:15:00.123456+00:00")).toBe("2026-09-28T09:15:00.123456+00:00");
    expect(parseBefore("2026-09-28T09:15:00Z")).toBe("2026-09-28T09:15:00Z");
  });

  it("repairs a plus sign a query string turned into a space", () => {
    expect(parseBefore("2026-09-28T09:15:00.1 00:00")).toBe("2026-09-28T09:15:00.1+00:00");
  });

  it("refuses anything that is not a full instant", () => {
    for (const bad of ["", "2026-09-28", "yesterday", "2026-13-40T99:00:00Z", "1' or 1=1", undefined, null]) {
      expect(parseBefore(bad as string)).toBeNull();
    }
    expect(parseBefore(["2026-09-28T09:15:00Z", "x"])).toBe("2026-09-28T09:15:00Z");
  });

  it("offers an earlier page only when the read found an extra row", () => {
    const entries = Array.from({ length: 3 }, (_, i) =>
      parseHistoryRow(row({ entry_id: `e${i}`, occurred_at: `2026-09-2${8 - i}T09:00:00.5+00:00` })),
    ) as HistoryEntry[];
    expect(pageOf(entries, 3)).toEqual({ entries, nextBefore: null });
    const page = pageOf(entries, 2);
    expect(page.entries).toHaveLength(2);
    expect(page.nextBefore).toBe("2026-09-27T09:00:00.5+00:00");
    expect(earlierHref("/payments", page.nextBefore)).toBe("/payments?before=2026-09-27T09%3A00%3A00.5%2B00%3A00");
    expect(earlierHref("/payments", null)).toBeNull();
  });
});

describe("date ranges", () => {
  it("accepts only real calendar days", () => {
    expect(parseDay("2026-09-01")).toBe("2026-09-01");
    expect(parseDay("2026-02-30")).toBeNull();
    expect(parseDay("2026-9-1")).toBeNull();
    expect(parseDay(null)).toBeNull();
  });

  it("ends a day at the next Lagos midnight, across a month", () => {
    expect(lagosDayEnd("2026-09-30")).toBe("2026-10-01T00:00:00+01:00");
  });
});
