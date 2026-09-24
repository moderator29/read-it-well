import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ESC-07 at the console. The database decides who may rule and when two
 * people are needed; these prove the action never reports a proposal as a
 * settled ruling, names each refusal, and calls the reversal door.
 */
const seam = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./guard", () => ({
  ADMIN_FORBIDDEN_MESSAGE: "forbidden",
  requireAdmin: async () => ({ state: "admin", user: { id: "sa-1" }, supabase: { rpc: seam.rpc } }),
}));

const { resolveEscrow, reverseEscrowRuling } = await import("./money-actions");

const ESCROW = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const RULING = "4f2504e0-4f89-41d3-9a0c-0305e82c3302";
const NOTE = "The work was delivered as agreed by both of them.";

beforeEach(() => seam.rpc.mockReset());

describe("resolveEscrow (ESC-07)", () => {
  it("reports a proposal at the threshold as waiting, not as applied", async () => {
    seam.rpc.mockResolvedValue({ data: { status: "awaiting_second_approval" }, error: null });
    const result = await resolveEscrow({ escrowId: ESCROW, direction: "release", note: NOTE });
    expect(result).toMatchObject({ ok: true, data: { outcome: "awaiting_second_approval" } });
  });

  it("reports an applied ruling as applied", async () => {
    seam.rpc.mockResolvedValue({ data: { status: "ok" }, error: null });
    const result = await resolveEscrow({ escrowId: ESCROW, direction: "refund", note: NOTE });
    expect(result).toMatchObject({ ok: true, data: { outcome: "applied" } });
  });

  it.each([
    ["forbidden", /Only a super admin/],
    ["conflicted", /one of the two people/],
    ["conflicting_proposal", /opposite ruling/],
  ])("names the %s refusal", async (status, sentence) => {
    seam.rpc.mockResolvedValue({ data: { status }, error: null });
    const result = await resolveEscrow({ escrowId: ESCROW, direction: "release", note: NOTE });
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toMatch(sentence);
  });
});

describe("reverseEscrowRuling (ESC-07)", () => {
  it("calls the reversal door with the ruling and the reason", async () => {
    seam.rpc.mockResolvedValue({ data: { status: "ok" }, error: null });
    const result = await reverseEscrowRuling({ rulingId: RULING, note: NOTE });
    expect(result.ok).toBe(true);
    expect(seam.rpc).toHaveBeenCalledWith("escrow_reverse_ruling", { p_ruling: RULING, p_note: NOTE });
  });

  it.each([
    ["needs_a_different_super_admin", /neither proposed nor approved/],
    ["shortfall", /cannot be reversed yet/],
  ])("names the %s refusal", async (status, sentence) => {
    seam.rpc.mockResolvedValue({ data: { status }, error: null });
    const result = await reverseEscrowRuling({ rulingId: RULING, note: NOTE });
    expect(result.ok ? "" : result.error).toMatch(sentence);
  });

  it("refuses a reason too short to send to two people, without calling the database", async () => {
    const result = await reverseEscrowRuling({ rulingId: RULING, note: "mistake" });
    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });
});

describe("no ruling door runs as the service role (ESC-16)", () => {
  it("never calls escrow_admin_resolve through the admin client, where auth.uid() is null", () => {
    const dir = join(__dirname);
    const offenders = readdirSync(dir)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .filter((name) => {
        const source = readFileSync(join(dir, name), "utf8");
        return source.includes("escrow_admin_resolve") && /getAdminClient|createAdminClient/.test(source);
      });
    expect(offenders).toEqual([]);
  });
});
