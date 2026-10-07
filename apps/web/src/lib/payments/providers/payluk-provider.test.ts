import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * THE PAYLUK ADAPTER'S CONTRACT (Part B phases 4 and 5). It declares exactly
 * what Payluk has, answers `not_configured` without a key instead of
 * throwing, and (D77) makes the escrow rail live on the key and the switch alone.
 */
const flags = vi.hoisted(() => ({ on: true }));
vi.mock("../../flags/read", () => ({ flagIsOn: async () => flags.on }));

const { fiatProvider, escrowRailLive, memberWalletRailLive } = await import("./index");
const { can } = await import("../provider");
const { paylukCollectionStatus, PAYLUK_ESCROW_FLOWS_BUILT } = await import("./payluk");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the Payluk adapter", () => {
  it("is registered, and declares hold_in_escrow and member_wallet only", () => {
    const p = fiatProvider("payluk")!;
    expect(p).not.toBeNull();
    expect(can(p, "hold_in_escrow")).toBe(true);
    expect(can(p, "member_wallet")).toBe(true);
    // Payluk has no refund outside a dispute (findings, question 3), and one escrow pays one seller.
    expect(can(p, "refund_without_dispute")).toBe(false);
    expect(can(p, "split_at_charge")).toBe(false);
    expect([...p.capabilities].sort()).toEqual(["hold_in_escrow", "member_wallet"]);
  });

  it("without a key, every wallet call answers not_configured and nothing is fetched", async () => {
    vi.stubEnv("PAYLUK_SECRET_KEY", "");
    vi.stubEnv("PAYLUK_TEST_SECRET_KEY", "");
    const spy = vi.spyOn(globalThis, "fetch");
    const p = fiatProvider("payluk")!;
    expect(p.isConfigured()).toBe(false);
    if (!can(p, "member_wallet")) throw new Error("unreachable");
    expect(await p.readBalance("c")).toMatchObject({ ok: false, kind: "not_configured" });
    expect(await p.stageIntent("c", { type: "deposit", reference: "rm-pld-x", amountMinor: 10_000 })).toMatchObject({ kind: "not_configured" });
    expect(await p.verifyByReference("r", { customerId: "c" })).toMatchObject({ status: "unknown" });
    expect(p.verifyWebhook("{}", new Headers({ "x-payluk-signature": "a".repeat(128) }))).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("a read-back without the customer is unknown, never a guess", async () => {
    vi.stubEnv("PAYLUK_TEST_SECRET_KEY", "sk_test_x");
    expect(await fiatProvider("payluk")!.verifyByReference("r")).toMatchObject({ status: "unknown" });
  });

  it("maps the payment status words, and an unknown word is unknown", () => {
    expect(paylukCollectionStatus("success")).toBe("success");
    expect(paylukCollectionStatus("FAILED")).toBe("failed");
    expect(paylukCollectionStatus("reversed")).toBe("reversed");
    expect(paylukCollectionStatus("pending")).toBe("pending");
    expect(paylukCollectionStatus("settled-ish")).toBe("unknown");
  });
});

describe("what is live", () => {
  it("D77: the escrow rail is ready on the key and payments_payluk_on alone", async () => {
    expect(PAYLUK_ESCROW_FLOWS_BUILT).toBe(true);
    vi.stubEnv("PAYLUK_SECRET_KEY", "");
    vi.stubEnv("PAYLUK_TEST_SECRET_KEY", "");
    flags.on = true;
    expect(await escrowRailLive()).toBe(false);
    vi.stubEnv("PAYLUK_TEST_SECRET_KEY", "sk_test_x");
    expect(await escrowRailLive()).toBe(true);
    flags.on = false;
    expect(await escrowRailLive()).toBe(false);
    flags.on = true;
    vi.stubEnv("PAYMENTS_KILL_PAYLUK", "1");
    expect(await escrowRailLive()).toBe(false);
  });

  it("the member balance rail needs a key and the founder's switch", async () => {
    vi.stubEnv("PAYLUK_SECRET_KEY", "");
    vi.stubEnv("PAYLUK_TEST_SECRET_KEY", "");
    expect(await memberWalletRailLive()).toBe("not_configured");
    vi.stubEnv("PAYLUK_TEST_SECRET_KEY", "sk_test_x");
    flags.on = false;
    expect(await memberWalletRailLive()).toBe("switched_off");
  });
});
