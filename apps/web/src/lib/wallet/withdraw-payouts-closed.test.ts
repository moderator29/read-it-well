import { beforeEach, describe, expect, it, vi } from "vitest";
import { BANK_PAYOUTS_OPEN, PAYOUTS_CLOSED_MESSAGE } from "./bank-payouts";

/**
 * Bank payouts are closed, and `withdraw` enforces it rather than only saying
 * so: to a typed-in account or a saved one, signed in with money in the
 * wallet, the answer is the closed-payouts sentence, and no hold is placed and
 * the bank is never called. Everything the action would touch is a spy, so a
 * refusal that came too late shows up as a call.
 */
const seen = vi.hoisted(() => ({ rpc: [] as string[], fetches: [] as string[], sessions: 0 }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../email/client", () => ({ bestEffortEmail: vi.fn(), sendMessage: vi.fn() }));
vi.mock("../payments/yellowcard", () => ({
  createCollection: vi.fn(),
  isYellowCardConfigured: () => false,
  YellowCardError: class extends Error {},
}));
vi.mock("../payments/charge-saved-card", () => ({ chargeSavedCard: vi.fn() }));
vi.mock("./repository", () => ({ readStatement: vi.fn() }));
vi.mock("./audit", () => ({ recordMoneyAudit: async () => undefined }));
vi.mock("../security/service-rpc", () => ({
  callSecurityRpc: async (fn: string) => {
    seen.rpc.push(fn);
    return { data: null, error: null };
  },
  hasServiceRole: () => true,
}));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => {
    seen.sessions += 1;
    return {
      state: "signed-in",
      user: { id: "user-1", email: "ada@example.invalid", user_metadata: {} },
      supabase: { from: () => ({}) },
    };
  },
}));
const admin = {
  rpc: async (fn: string) => {
    seen.rpc.push(fn);
    return { data: { status: "ok", available_minor: 900_000, wallet_id: "w1" }, error: null };
  },
  from: () => ({}),
};
vi.mock("./ledger", () => ({
  availableBalanceMinor: async () => 1_000_000,
  displayNameFor: async () => "Ada",
  ensureWalletId: async () => "w1",
  findUserByEmail: async () => null,
  getAdminClient: () => admin,
  postEntry: vi.fn(),
  recordFunding: vi.fn(),
  setEntryStatus: vi.fn(async () => true),
  annotateEntry: vi.fn(),
  labelTransferLegs: vi.fn(),
}));

beforeEach(() => {
  seen.rpc.length = 0;
  seen.fetches.length = 0;
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_vallo");
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seen.fetches.push(String(input));
    throw new Error("the bank must not be called while payouts are closed");
  }) as typeof fetch;
});

async function withdrawWith(fields: Record<string, string>) {
  const { withdraw } = await import("./actions");
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return withdraw({ ok: false, error: "" }, data);
}

describe("withdraw while bank payouts are closed", () => {
  it("is closed today", () => {
    expect(BANK_PAYOUTS_OPEN).toBe(false);
  });

  it.each([
    ["a typed-in account", { amount: "5000", bankCode: "058", accountNumber: "0123456789", accountName: "Ada" }],
    ["a saved account", { amount: "5000", bankAccountId: "6f1c2b8e-4a55-4d7e-9a3b-2c1d0e9f8a7b" }],
    ["a retried request", { amount: "5000", bankCode: "058", accountNumber: "0123456789", idempotencyKey: "k-1" }],
  ])("refuses %s before any hold or transfer", async (_label, fields) => {
    const result = await withdrawWith(fields);
    expect(result).toEqual({ ok: false, error: PAYOUTS_CLOSED_MESSAGE });
    expect(seen.rpc).toEqual([]);
    expect(seen.fetches).toEqual([]);
  });

  it("says what the person can still do with the money", () => {
    expect(PAYOUTS_CLOSED_MESSAGE).toMatch(/not available yet/);
    expect(PAYOUTS_CLOSED_MESSAGE).toMatch(/spend it on Vallo or send it to another Vallo member/);
  });
});
