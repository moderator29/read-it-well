import { beforeEach, describe, expect, it, vi } from "vitest";

const ledger = vi.hoisted(() => ({ postEntry: vi.fn(async () => "posted" as "posted" | "duplicate") }));
vi.mock("./ledger", () => ledger);

const { creditReversedWithdrawal, reversalReference } = await import("./withdrawal-reversal");

function adminWith(row: { wallet_id: string; amount_minor: number; status: string } | null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return { from: () => chain } as never;
}

beforeEach(() => ledger.postEntry.mockReset().mockResolvedValue("posted"));

describe("MON-03: a withdrawal reversed after it was paid out", () => {
  it("credits the member back once, as a refund keyed on the reversal reference", async () => {
    const out = await creditReversedWithdrawal(
      adminWith({ wallet_id: "w1", amount_minor: 500_000, status: "COMPLETED" }),
      "rm-wd-1",
    );
    expect(out).toEqual({ state: "credited", walletId: "w1", amountMinor: 500_000 });
    expect(ledger.postEntry).toHaveBeenCalledWith(expect.anything(), {
      walletId: "w1",
      kind: "refund",
      direction: "credit",
      amountMinor: 500_000,
      reference: reversalReference("rm-wd-1"),
      status: "COMPLETED",
      metadata: expect.objectContaining({ reversal_of: "rm-wd-1" }),
    });
  });

  it("answers duplicate on a replay, because the reference is unique", async () => {
    ledger.postEntry.mockResolvedValue("duplicate");
    const out = await creditReversedWithdrawal(
      adminWith({ wallet_id: "w1", amount_minor: 500_000, status: "COMPLETED" }),
      "rm-wd-1",
    );
    expect(out.state).toBe("duplicate");
  });

  it.each(["FAILED", "REVERSED", "PENDING"])("never credits a %s hold, whose debit already stopped counting", async (status) => {
    const out = await creditReversedWithdrawal(
      adminWith({ wallet_id: "w1", amount_minor: 500_000, status }),
      "rm-wd-1",
    );
    expect(out).toEqual({ state: "not_completed", status });
    expect(ledger.postEntry).not.toHaveBeenCalled();
  });

  it("credits nothing for a reference that is not a withdrawal of ours", async () => {
    const out = await creditReversedWithdrawal(adminWith(null), "someone-else");
    expect(out).toEqual({ state: "not_completed", status: null });
    expect(ledger.postEntry).not.toHaveBeenCalled();
  });
});
