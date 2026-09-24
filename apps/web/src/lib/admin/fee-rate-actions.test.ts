import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MON-P2-01 at the console. The database refuses a rate above 20 percent and
 * a rise by anybody but a super admin; the action refuses the first before
 * asking and names both when the database answers with them.
 */
const seam = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./guard", () => ({
  ADMIN_FORBIDDEN_MESSAGE: "forbidden",
  requireAdmin: async () => ({ state: "admin", user: { id: "admin-1" }, supabase: { rpc: seam.rpc } }),
}));

const { setFeeRate } = await import("./money-actions");

const INPUT = {
  kind: "commission" as const,
  basisPoints: 500,
  flatMinor: 0,
  effectiveFrom: "2026-10-01T00:00:00Z",
  note: "Commission for agency fees from October.",
};

beforeEach(() => seam.rpc.mockReset());

describe("setFeeRate (MON-P2-01)", () => {
  it("refuses a rate above 20 percent without asking the database", async () => {
    const result = await setFeeRate({ ...INPUT, basisPoints: 2001 });
    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("names a rise that needs a super admin", async () => {
    seam.rpc.mockResolvedValue({ data: { status: "raise_needs_super_admin" }, error: null });
    const result = await setFeeRate(INPUT);
    expect(result.ok ? "" : result.error).toMatch(/Only a super admin can raise/);
  });

  it("names the database's ceiling", async () => {
    seam.rpc.mockResolvedValue({ data: { status: "bad_rate" }, error: null });
    const result = await setFeeRate(INPUT);
    expect(result.ok ? "" : result.error).toMatch(/more than 20 percent/);
  });

  it("accepts a rate the database accepts", async () => {
    seam.rpc.mockResolvedValue({ data: { status: "ok", rate_id: "r" }, error: null });
    const result = await setFeeRate(INPUT);
    expect(result.ok).toBe(true);
  });
});
