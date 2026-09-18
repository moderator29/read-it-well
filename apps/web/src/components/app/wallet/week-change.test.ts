import { describe, expect, it } from "vitest";
import { weekChange } from "./week-change";
import type { WalletEntry } from "@/lib/wallet/types";

const NOW = new Date("2026-09-18T12:00:00Z").getTime();

function entry(
  daysAgo: number,
  direction: "credit" | "debit",
  amountMinor: number,
  status: WalletEntry["status"] = "COMPLETED",
): WalletEntry {
  return {
    id: `e-${daysAgo}-${direction}-${amountMinor}`,
    kind: direction === "credit" ? "deposit" : "withdrawal",
    direction,
    amountMinor,
    reference: "rm-test",
    status,
    createdAt: new Date(NOW - daysAgo * 86_400_000).toISOString(),
  };
}

describe("weekChange", () => {
  it("is absent when nothing settled this week", () => {
    expect(weekChange([entry(10, "credit", 500_00)], 500_00, NOW)).toBeNull();
    expect(weekChange([], 0, NOW)).toBeNull();
  });

  it("ignores movements that have not settled", () => {
    expect(weekChange([entry(1, "credit", 500_00, "PENDING")], 500_00, NOW)).toBeNull();
  });

  it("nets the week and states it against the opening balance", () => {
    const entries = [entry(1, "credit", 30_000_00), entry(3, "debit", 5_000_00)];
    const change = weekChange(entries, 225_000_00, NOW);
    expect(change).toEqual({ netMinor: 25_000_00, percent: 12.5 });
  });

  it("has no percentage when the week began from nothing", () => {
    const change = weekChange([entry(2, "credit", 10_000_00)], 10_000_00, NOW);
    expect(change).toEqual({ netMinor: 10_000_00, percent: null });
  });

  it("carries a negative week as a negative figure", () => {
    const change = weekChange([entry(2, "debit", 20_000_00)], 80_000_00, NOW);
    expect(change).toEqual({ netMinor: -20_000_00, percent: -20 });
  });
});
