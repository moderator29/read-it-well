import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "./history-model";
import { parseVaultKind, parseVaultQuery, payoutFigures, refundEntries, vaultEntries } from "./vault";

function entry(over: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: "e",
    kind: "payment",
    occurredAt: "2026-10-01T10:00:00Z",
    amountMinor: 100_00,
    direction: "out",
    status: "successful",
    reference: "rm-book-1",
    title: "Space one",
    bookingId: "b1",
    grossMinor: null,
    guaranteeMinor: null,
    commissionMinor: null,
    listerShareMinor: null,
    payerName: null,
    payeeName: null,
    ...over,
  };
}

describe("the receipt vault", () => {
  const rows = [
    entry({ id: "p1" }),
    entry({ id: "p2", status: "pending" }),
    entry({ id: "r1", kind: "refund", status: "processed", title: "Space two", reference: "rf-9" }),
    entry({ id: "r2", kind: "refund", status: "submitted" }),
  ];

  it("holds only money that moved: a confirmed payment, a completed refund", () => {
    expect(vaultEntries(rows, "all", "").map((e) => e.id)).toEqual(["p1", "r1"]);
  });

  it("filters by kind and searches title and reference", () => {
    expect(vaultEntries(rows, "refund", "").map((e) => e.id)).toEqual(["r1"]);
    expect(vaultEntries(rows, "all", "space TWO").map((e) => e.id)).toEqual(["r1"]);
    expect(vaultEntries(rows, "all", "rm-book").map((e) => e.id)).toEqual(["p1"]);
  });

  it("parses its search params defensively", () => {
    expect(parseVaultKind("refund")).toBe("refund");
    expect(parseVaultKind("chain")).toBe("all");
    expect(parseVaultQuery(["  a  ", "b"])).toBe("a");
    expect(parseVaultQuery("x".repeat(200))).toHaveLength(80);
  });

  it("lists refunds in every state on the refunds screen", () => {
    expect(refundEntries(rows).map((e) => e.id)).toEqual(["r1", "r2"]);
  });
});

describe("a payout's figures add up, from the record only", () => {
  it("paid, fee, processing and received add up exactly", () => {
    const f = payoutFigures(entry({ kind: "earning", grossMinor: 1_800_000_00, commissionMinor: 36_000_00, guaranteeMinor: 0, amountMinor: 1_763_000_00 }));
    expect(f).toEqual({ paidMinor: 1_800_000_00, feeMinor: 36_000_00, processingMinor: 1_000_00, receivedMinor: 1_763_000_00 });
    expect((f.feeMinor ?? 0) + (f.processingMinor ?? 0) + f.receivedMinor).toBe(f.paidMinor);
  });

  it("says nothing about a fee the record does not carry", () => {
    expect(payoutFigures(entry({ kind: "earning", grossMinor: 100_00 })).feeMinor).toBeNull();
    expect(payoutFigures(entry({ kind: "earning", grossMinor: 100_00 })).processingMinor).toBeNull();
  });
});
