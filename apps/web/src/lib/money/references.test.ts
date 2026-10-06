import { describe, expect, it } from "vitest";
import { referenceLabel, referenceRows, type MoneyReference } from "./references";

const all: MoneyReference[] = [
  { kind: "chain", value: "0xabc" },
  { kind: "provider", value: "rm-book-123", provider: "Paystack" },
  { kind: "space", value: "space-1" },
  { kind: "agreement", value: "agr-1" },
  { kind: "receipt", value: "R-2026-0001" },
  { kind: "transaction", value: "tx-1" },
];

describe("the reference system: six things, labelled apart", () => {
  it("draws them in one fixed order, each under its own label", () => {
    const rows = referenceRows(all, "chain");
    expect(rows.map((r) => r.kind)).toEqual(["transaction", "receipt", "agreement", "space", "provider", "chain"]);
    expect(rows.map(referenceLabel)).toEqual([
      "Transaction",
      "Receipt number",
      "Agreement",
      "Space",
      "Paystack reference",
      "Chain transaction hash",
    ]);
  });

  it("never draws a chain hash on a fiat payment", () => {
    expect(referenceRows(all, "fiat").some((r) => r.kind === "chain")).toBe(false);
  });

  it("never relabels a provider reference as a chain hash", () => {
    const relabelled: MoneyReference[] = [
      { kind: "provider", value: "rm-book-123", provider: "Paystack" },
      { kind: "chain", value: "RM-BOOK-123" },
    ];
    expect(referenceRows(relabelled, "chain").map((r) => r.kind)).toEqual(["provider"]);
  });

  it("names the partner on its own reference, or says partner, never hash", () => {
    expect(referenceLabel({ kind: "provider", value: "x" })).toBe("Payment partner reference");
    expect(referenceLabel({ kind: "provider", value: "x", provider: "Paystack" })).not.toMatch(/hash/i);
  });

  it("prints a value exactly, drops an empty one and keeps the first of a kind", () => {
    const rows = referenceRows(
      [
        { kind: "transaction", value: "  tx-1  " },
        { kind: "transaction", value: "tx-2" },
        { kind: "receipt", value: "   " },
      ],
      "fiat",
    );
    expect(rows).toEqual([{ kind: "transaction", value: "tx-1" }]);
  });
});
