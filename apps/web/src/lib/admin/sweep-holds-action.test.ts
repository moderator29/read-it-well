import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MON-02: the admin "release the stuck holds" button used to call an
 * age-only SQL function that failed every PENDING withdrawal past the window,
 * so a transfer that had paid out was released too and the member was paid
 * twice. It now runs the verifying sweep, with the admin as the actor, and
 * never calls the age-only function.
 */
const seam = vi.hoisted(() => ({
  rpc: vi.fn(),
  sweep: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./guard", () => ({
  ADMIN_FORBIDDEN_MESSAGE: "forbidden",
  adminRefusal: vi.fn(),
  requireAdmin: async () => ({ state: "admin", user: { id: "admin-1" }, supabase: { rpc: seam.rpc } }),
}));
vi.mock("./audit", () => ({ writeAudit: vi.fn() }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("../wallet/ledger", () => ({ getAdminClient: () => ({ admin: true }) }));
vi.mock("../wallet/reconciliation", () => ({ sweepStaleWithdrawalHolds: seam.sweep }));

const { expireStaleWithdrawalHolds } = await import("./payments-actions");

beforeEach(() => {
  seam.rpc.mockReset();
  seam.sweep.mockReset().mockResolvedValue({
    examined: 3,
    releasedMinor: 500_000,
    unavailable: false,
    reason: "",
    resolutions: [
      { reference: "a", amountMinor: 500_000, ageMinutes: 90, action: "released", reason: "transfer_failed" },
      { reference: "b", amountMinor: 700_000, ageMinutes: 90, action: "completed", reason: "transfer_succeeded" },
      { reference: "c", amountMinor: 100_000, ageMinutes: 90, action: "left_pending", reason: "transfer_pending" },
    ],
  });
});

describe("expireStaleWithdrawalHolds (MON-02)", () => {
  it("verifies every hold through the sweep, as the admin, and never calls the age-only function", async () => {
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: 60 });
    expect(seam.sweep).toHaveBeenCalledWith(
      { admin: true },
      { olderThanMinutes: 60, apply: true, actor: { kind: "user", userId: "admin-1" } },
    );
    expect(seam.rpc).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { expired: 1, completed: 1, leftPending: 1 } });
  });

  it("changes nothing and says so when Paystack cannot be asked", async () => {
    seam.sweep.mockResolvedValue({ examined: 2, resolutions: [], releasedMinor: 0, unavailable: true, reason: "paystack_key_missing" });
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: 60 });
    expect(result.ok).toBe(false);
  });
});
