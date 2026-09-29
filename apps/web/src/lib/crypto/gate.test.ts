import { afterEach, describe, expect, it, vi } from "vitest";

import { cryptoGate, type CryptoGateInput } from "./gate";

/**
 * The flag and KYC gate. Crypto appears only with all five in place, and a
 * missing piece of the platform hides it from everybody.
 */

const OPEN: CryptoGateInput = {
  flagOn: true,
  providerConfigured: true,
  directSettlementConfirmed: true,
  enabledAssetCount: 2,
  payerKycVerified: true,
};

describe("cryptoGate", () => {
  it("opens only when everything is in place", () => {
    expect(cryptoGate(OPEN)).toEqual({ open: true });
  });

  it("stays shut for everybody while the flag is off, whatever else is set", () => {
    expect(cryptoGate({ ...OPEN, flagOn: false })).toEqual({ open: false, reason: "flag_off", platform: true });
  });

  it("stays shut without keys, without the direct-settlement confirmation, or with no assets", () => {
    expect(cryptoGate({ ...OPEN, providerConfigured: false })).toMatchObject({ reason: "provider_unconfigured", platform: true });
    expect(cryptoGate({ ...OPEN, directSettlementConfirmed: false })).toMatchObject({ reason: "settlement_unconfirmed", platform: true });
    expect(cryptoGate({ ...OPEN, enabledAssetCount: 0 })).toMatchObject({ reason: "no_assets", platform: true });
  });

  it("names the payer's missing KYC as the person's, not the platform's", () => {
    expect(cryptoGate({ ...OPEN, payerKycVerified: false })).toEqual({ open: false, reason: "kyc_required", platform: false });
  });
});

/* ---------------------------------------------- the server-side read of it */

let flag = false;
vi.mock("@/lib/flags/read", () => ({ flagIsOn: async () => flag }));

const { cryptoAvailability, payerKyc } = await import("./availability");

function client(row: { id: string; legal_name: string | null } | null, fail = false) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => (fail ? { data: null, error: { message: "down" } } : { data: row, error: null }),
  };
  return { from: vi.fn(() => chain) } as never;
}

function configure() {
  vi.stubEnv("YELLOWCARD_API_KEY", "k");
  vi.stubEnv("YELLOWCARD_API_SECRET", "s");
  vi.stubEnv("YELLOWCARD_API_BASE", "https://sandbox.example");
  vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", "w");
  vi.stubEnv("YELLOWCARD_DIRECT_SETTLEMENT", "confirmed");
  vi.stubEnv("YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS", "confirmed");
  vi.stubEnv("YELLOWCARD_VALLO_SETTLEMENT_ACCOUNT_ID", "acct-vallo");
  vi.stubEnv("YELLOWCARD_RESERVE_BANK_CODE", "058");
  vi.stubEnv("YELLOWCARD_RESERVE_ACCOUNT_NUMBER", "0987654321");
  vi.stubEnv("YELLOWCARD_RESERVE_ACCOUNT_NAME", "VALLO GUARANTEE RESERVE");
  vi.stubEnv("CRYPTO_ENABLED_ASSETS", "USDT:TRON,BTC:BITCOIN,NOPE:NOWHERE");
}

afterEach(() => {
  vi.unstubAllEnvs();
  flag = false;
});

describe("payerKyc", () => {
  it("is verified only with a matched identity check, and carries its legal name", async () => {
    expect(await payerKyc(client({ id: "v1", legal_name: "Ada Obi" }), "u1")).toEqual({ verified: true, legalName: "Ada Obi", verificationId: "v1" });
    expect(await payerKyc(client(null), "u1")).toMatchObject({ verified: false });
  });

  it("treats a failed read as not verified", async () => {
    expect(await payerKyc(client({ id: "v1", legal_name: "x" }, true), "u1")).toMatchObject({ verified: false });
  });
});

describe("cryptoAvailability", () => {
  it("is shut with the flag off even when fully configured, and never asks about the person", async () => {
    configure();
    const c = client({ id: "v1", legal_name: "Ada" });
    const answer = await cryptoAvailability(c, "u1");
    expect(answer.gate).toMatchObject({ open: false, reason: "flag_off" });
    expect(answer.pairs).toEqual([]);
    expect((c as unknown as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });

  it("is shut without either literal 'confirmed', or without the reserve's bank account", async () => {
    configure();
    flag = true;
    vi.stubEnv("YELLOWCARD_DIRECT_SETTLEMENT", "yes");
    expect((await cryptoAvailability(client({ id: "v", legal_name: null }), "u1")).gate).toMatchObject({ reason: "settlement_unconfirmed" });
    configure();
    vi.stubEnv("YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS", "");
    expect((await cryptoAvailability(client({ id: "v", legal_name: null }), "u1")).gate).toMatchObject({ reason: "settlement_unconfirmed" });
    configure();
    vi.stubEnv("YELLOWCARD_RESERVE_ACCOUNT_NUMBER", "");
    expect((await cryptoAvailability(client({ id: "v", legal_name: null }), "u1")).gate).toMatchObject({ reason: "settlement_unconfirmed" });
  });

  it("asks for KYC when the platform is open and the payer is unverified", async () => {
    configure();
    flag = true;
    expect((await cryptoAvailability(client(null), "u1")).gate).toEqual({ open: false, reason: "kyc_required", platform: false });
  });

  it("opens for a verified payer with only the known pairs", async () => {
    configure();
    flag = true;
    const answer = await cryptoAvailability(client({ id: "v", legal_name: "Ada" }), "u1");
    expect(answer.gate).toEqual({ open: true });
    expect(answer.pairs.map((p) => `${p.asset}:${p.network}`)).toEqual(["USDT:TRON", "BTC:BITCOIN"]);
    expect(answer.providerName).toBe("Yellow Card");
  });
});
