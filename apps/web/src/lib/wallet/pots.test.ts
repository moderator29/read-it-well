import { describe, expect, it, vi } from "vitest";

/**
 * MON-08: a pot's balance on screen is the ledger's, read from the
 * security-invoker view public.wallet_pot_balances, never the stored column
 * on wallet_pots that nothing reconciled.
 */
const seam = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("../actions/session", () => ({
  resolveSession: async () => ({ state: "signed-in", user: { id: "me" }, supabase: { from: seam.from } }),
}));

const { readPots, POT_BALANCES_VIEW } = await import("./pots");

describe("readPots (MON-08)", () => {
  it("reads the derived balance from the view, not the table", async () => {
    const chain = {
      select: vi.fn(() => chain),
      is: vi.fn(() => chain),
      order: vi.fn(async () => ({
        data: [{ id: "p1", name: "Rent", balance_minor: 50000, target_minor: null, created_at: "2026-09-01" }],
        error: null,
      })),
    };
    seam.from.mockReturnValue(chain);
    const read = await readPots();
    expect(seam.from).toHaveBeenCalledWith(POT_BALANCES_VIEW);
    expect(POT_BALANCES_VIEW).toBe("wallet_pot_balances");
    expect(read).toEqual({
      state: "ok",
      pots: [{ id: "p1", name: "Rent", balanceMinor: 50000, targetMinor: null, createdAt: "2026-09-01" }],
    });
  });
});
