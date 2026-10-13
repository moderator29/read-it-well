import { beforeEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({
  access: { state: "admin" } as Record<string, unknown>,
  calls: [] as Record<string, unknown>[],
  answer: { data: null as unknown, error: null as unknown },
  scope: undefined as string | undefined,
}));

vi.mock("../guard", () => ({
  requireAdmin: async (scope?: string) => {
    seam.scope = scope;
    return seam.access["state"] === "admin"
      ? {
          state: "admin",
          supabase: {
            rpc: async (_fn: string, args: Record<string, unknown>) => {
              seam.calls.push(args);
              return seam.answer;
            },
          },
        }
      : seam.access;
  },
}));

const { parseFeeAcceptance } = await import("./fee-acceptance");
const { readFeeAcceptance } = await import("./fee-acceptance-read");

const ROW = {
  id: "a1",
  accepted_at: "2026-10-07T09:00:00Z",
  terms_version: "2026-10-06",
  policy_version: "2026-10-06.1",
  rent_minor: 150000000,
  commission_bps: 200,
  protection_bps: 100,
  fee_low_minor: 3000000,
  fee_high_minor: 4500000,
  receive_low_minor: 145500000,
  receive_high_minor: 147000000,
};

beforeEach(() => {
  seam.access = { state: "admin" };
  seam.calls = [];
  seam.answer = { data: null, error: null };
});

describe("parseFeeAcceptance", () => {
  it("reads the acceptance the lister was shown", () => {
    expect(parseFeeAcceptance(ROW)).toMatchObject({ id: "a1", termsVersion: "2026-10-06", feeHighMinor: 4500000, commissionBps: 200 });
  });
  it("is null when there is no acceptance, including the all-null row a composite returns", () => {
    expect(parseFeeAcceptance(null)).toBeNull();
    expect(parseFeeAcceptance({ id: null, listing_id: null })).toBeNull();
  });
  it("is unreadable, never a half-filled acceptance, when a figure is missing", () => {
    expect(parseFeeAcceptance({ ...ROW, fee_low_minor: null })).toBe("unreadable");
    expect(parseFeeAcceptance([])).toBe("unreadable");
  });
});

describe("readFeeAcceptance", () => {
  it("asks for the listing under the listing-approval door", async () => {
    seam.answer = { data: ROW, error: null };
    const read = await readFeeAcceptance("L1");
    expect(seam.scope).toBe("listing_approval");
    expect(seam.calls).toEqual([{ p_listing: "L1" }]);
    expect(read.state === "ok" && read.acceptance?.id).toBe("a1");
  });
  it("says there is none, is forbidden outside the door, and unavailable on an error", async () => {
    expect(await readFeeAcceptance("L1")).toEqual({ state: "ok", acceptance: null });
    seam.access = { state: "not-admin" };
    expect(await readFeeAcceptance("L1")).toEqual({ state: "forbidden" });
    seam.access = { state: "admin" };
    seam.answer = { data: null, error: { code: "XX000" } };
    expect(await readFeeAcceptance("L1")).toEqual({ state: "unavailable" });
    seam.answer = { data: { ...ROW, rent_minor: "lots" }, error: null };
    expect(await readFeeAcceptance("L1")).toEqual({ state: "unavailable" });
  });
});
