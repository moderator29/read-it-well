import { describe, expect, it } from "vitest";
import type { MovementKind } from "./funds";
import { cleanNaira, counterpartyLine, didNotMove, filterMovements, groupNaira, isWalletFilter, movementDirection, sumMovements, WALLET_FILTERS } from "./wallet-view";
import { isFocusedRoute } from "@/components/app/focused-route";

const rows: { kind: MovementKind; amountMinor: number }[] = [
  { kind: "deposit", amountMinor: 500_00 },
  { kind: "transfer_in", amountMinor: 300_00 },
  { kind: "transfer_out", amountMinor: 100_00 },
  { kind: "withdrawal", amountMinor: 50_00 },
  { kind: "other", amountMinor: 9_99 },
];

describe("the Wallet's view model (D81)", () => {
  it("sums money in and out over the rows it is given, and counts no other kind", () => {
    expect(sumMovements(rows)).toEqual({ inMinor: 800_00, outMinor: 150_00, count: 5 });
    expect(sumMovements([])).toEqual({ inMinor: 0, outMinor: 0, count: 0 });
  });

  it("filters by the ledger's own kinds, with no invented category", () => {
    expect(WALLET_FILTERS).toEqual(["all", "received", "added", "sent", "withdrawals"]);
    expect(filterMovements(rows, "all")).toHaveLength(5);
    expect(filterMovements(rows, "received").map((r) => r.kind)).toEqual(["transfer_in"]);
    expect(filterMovements(rows, "added").map((r) => r.kind)).toEqual(["deposit"]);
    expect(filterMovements(rows, "sent").map((r) => r.kind)).toEqual(["transfer_out"]);
    expect(filterMovements(rows, "withdrawals").map((r) => r.kind)).toEqual(["withdrawal"]);
    expect(isWalletFilter("bills")).toBe(false);
    expect(isWalletFilter("sent")).toBe(true);
  });

  it("gives each movement its direction, and a failed one is not money that moved", () => {
    expect(movementDirection("deposit")).toBe("in");
    expect(movementDirection("withdrawal")).toBe("out");
    expect(movementDirection("other")).toBeNull();
    expect(didNotMove("failed")).toBe(true);
    expect(didNotMove("completed")).toBe(false);
    expect(didNotMove("processing")).toBe(false);
  });

  it("names only what the record holds", () => {
    expect(counterpartyLine("withdrawal", { bank: "Test Bank", last4: "4821" })).toBe("To: Test Bank •••• 4821");
    expect(counterpartyLine("transfer_out", { name: "Ada E." })).toBe("To: Ada E.");
    expect(counterpartyLine("transfer_out", {})).toBe("To: a Vallo member");
    expect(counterpartyLine("transfer_in", { name: "Should not show" })).toBe("From: a Vallo member");
  });

  it("keeps a typed amount to whole naira digits", () => {
    expect(cleanNaira("₦0025,000.50")).toBe("2500050");
    expect(groupNaira("2450000")).toBe("2,450,000");
    expect(groupNaira("")).toBe("");
  });
});

describe("the Wallet is a focused route", () => {
  it("takes /wallet and every screen under it out of the dock and the app header", () => {
    for (const path of ["/wallet", "/wallet/transactions", "/wallet/send", "/wallet/settings"]) expect(isFocusedRoute(path)).toBe(true);
    for (const path of ["/walletx", "/home", "/settings", "/payments"]) expect(isFocusedRoute(path)).toBe(false);
  });
});
