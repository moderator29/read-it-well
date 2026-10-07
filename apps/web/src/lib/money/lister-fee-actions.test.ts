import { beforeEach, describe, expect, it, vi } from "vitest";
import { LISTER_FEE_TERMS_VERSION } from "./copy";
import { listerFeeFigures, type ListerFeePolicy } from "./lister-fee";

/*
 * D77: the listing wizard's fee acceptance reaches public.lister_fee_accept with
 * the figures the lister was shown, and its answers map to what the wizard says.
 */

vi.mock("server-only", () => ({}));
const rpc = vi.hoisted(() => ({
  calls: [] as { fn: string; args: Record<string, unknown> }[],
  answer: { data: { status: "recorded", recorded_at: "2026-10-07T10:00:00Z" } as unknown, error: null as unknown },
}));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "Sign in to continue.",
  resolveWriteSession: async () => ({
    state: "signed-in",
    supabase: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        rpc.calls.push({ fn, args });
        return rpc.answer;
      },
    },
  }),
}));
vi.mock("./lister-fee-read", () => ({ readListerFeePolicy: async () => null }));

const { recordListerFeeAcceptance } = await import("./lister-fee-actions");
const { FEE_ACCEPT_UNRECORDED, FEE_RATE_MOVED } = await import("./copy");

const POLICY: ListerFeePolicy = {
  rateVersion: "2026-10-06.1",
  valloBps: 200,
  escrowProtectionBps: 200,
  directProcessorFeeCapMinor: 200_000,
  capMinor: null,
};
const LISTING = "4f6c1b2e-8a7d-4c3b-9e1f-0a2b3c4d5e6f";

function acceptance() {
  const f = listerFeeFigures(100_000_000, POLICY)!;
  return {
    listingId: LISTING,
    termsVersion: LISTER_FEE_TERMS_VERSION,
    rateVersion: POLICY.rateVersion,
    valloBps: POLICY.valloBps,
    escrowProtectionBps: POLICY.escrowProtectionBps,
    directProcessorFeeCapMinor: POLICY.directProcessorFeeCapMinor,
    capMinor: POLICY.capMinor,
    priceMinor: f.priceMinor,
    valloMinor: f.valloMinor,
    escrowProtectionMinor: f.escrowProtectionMinor,
    processorUpToMinor: f.processorUpToMinor,
    receiveLowMinor: f.receiveLowMinor,
    receiveHighMinor: f.receiveHighMinor,
  };
}

beforeEach(() => {
  rpc.calls = [];
  rpc.answer = { data: { status: "recorded", recorded_at: "2026-10-07T10:00:00Z" }, error: null };
});

describe("recording the lister's fee acceptance (D77)", () => {
  it("sends the shown figures to lister_fee_accept, the same ones the database re-derives", async () => {
    const r = await recordListerFeeAcceptance(acceptance());
    expect(r).toEqual({ ok: true, data: { recordedAt: "2026-10-07T10:00:00Z" } });
    expect(rpc.calls).toHaveLength(1);
    expect(rpc.calls[0]!.fn).toBe("lister_fee_accept");
    /* The figures the SQL in d77 derives for a 1,000,000 naira price at 2 percent each. */
    expect(rpc.calls[0]!.args).toMatchObject({
      p_listing: LISTING,
      p_terms_version: LISTER_FEE_TERMS_VERSION,
      p_rate_version: "2026-10-06.1",
      p_price_minor: 100_000_000,
      p_vallo_minor: 2_000_000,
      p_escrow_protection_minor: 2_000_000,
      p_processor_up_to_minor: 200_000,
      p_receive_low_minor: 96_000_000,
      p_receive_high_minor: 97_800_000,
      p_cap_minor: null,
    });
    /* The record keeps the date form; the shown string must carry one. */
    expect(/([0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+)?)/.exec(LISTER_FEE_TERMS_VERSION)?.[1]).toMatch(/^\d{4}-\d{2}-\d{2}(\.\d+)?$/);
  });

  it("a moved rate or a figure the server does not reach asks the lister to look again", async () => {
    rpc.answer = { data: { status: "rate_moved" }, error: null };
    expect(await recordListerFeeAcceptance(acceptance())).toMatchObject({ ok: false, error: FEE_RATE_MOVED });
    rpc.answer = { data: { status: "mismatch" }, error: null };
    expect(await recordListerFeeAcceptance(acceptance())).toMatchObject({ ok: false, error: FEE_RATE_MOVED });
  });

  it("anything else is not recorded, and says so", async () => {
    rpc.answer = { data: { status: "not_found" }, error: null };
    expect(await recordListerFeeAcceptance(acceptance())).toMatchObject({ ok: false, error: FEE_ACCEPT_UNRECORDED });
    rpc.answer = { data: null, error: { message: "boom" } };
    expect(await recordListerFeeAcceptance(acceptance())).toMatchObject({ ok: false, error: FEE_ACCEPT_UNRECORDED });
  });

  it("refuses figures that do not add up before calling", async () => {
    const r = await recordListerFeeAcceptance({ ...acceptance(), receiveLowMinor: 99_000_000 });
    expect(r.ok).toBe(false);
    expect(rpc.calls).toHaveLength(0);
  });
});
