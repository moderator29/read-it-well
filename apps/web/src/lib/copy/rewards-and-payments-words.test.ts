import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REWARDS_WITHDRAW_MINIMUM } from "@/lib/money/copy";

/**
 * Two retired words A9 found left behind.
 *
 * - REWARDS_WITHDRAW_MINIMUM said "your available balance": "available" is the
 *   money centre's word for a provider-held balance (D50), and a Rewards
 *   Balance is a debt Vallo owes, never a balance held (D51). It names the
 *   Rewards Balance.
 * - /payments' own docstring still said the split sent "the Guarantee
 *   contribution to its reserve", after D51 retired it. The next person to
 *   read the page takes its docstring as the truth.
 */
describe("the words around a payment and a reward", () => {
  it("names the Rewards Balance, not an available balance", () => {
    expect(REWARDS_WITHDRAW_MINIMUM).toBe("You can withdraw once your Rewards Balance reaches {minimum}.");
    expect(REWARDS_WITHDRAW_MINIMUM).not.toMatch(/available balance/i);
  });

  it("does not describe the retired Guarantee reserve on /payments", () => {
    const source = readFileSync(join(process.cwd(), "src/app/(app)/payments/page.tsx"), "utf8");
    expect(source).not.toMatch(/Guarantee|reserve/);
  });
});
