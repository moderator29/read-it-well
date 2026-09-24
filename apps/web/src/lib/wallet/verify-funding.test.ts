/**
 * DOC-06: `verifyFunding` credits a wallet on the return from Paystack's
 * checkout, and had no test. It is called with nothing but a reference, from
 * a URL anyone can visit, so the facts that decide a credit must come from
 * Paystack's own verification and never from the caller. Pinned here: the
 * amount and the owner are Paystack's; a payment that did not succeed, was
 * not in naira, or cannot be matched to an owner credits nothing; and the
 * money limit and a bad reference stop it before Paystack is even asked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  allowed: true,
  tx: null as unknown,
  verifyCalls: 0,
  recordFunding: vi.fn(async (_admin: unknown, _input: unknown): Promise<"posted" | "duplicate"> => "posted"),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("../security/money-limits", () => ({
  guardMoney: async () => (state.allowed ? { allowed: true } : { allowed: false, message: "limit reached" }),
}));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../email/client", () => ({ bestEffortEmail: async () => undefined, sendMessage: vi.fn() }));
vi.mock("../email/recipients", () => ({ contactForSelf: async () => null, contactForUser: async () => null }));
vi.mock("../payments/yellowcard", () => ({
  createCollection: vi.fn(),
  isYellowCardConfigured: () => false,
  YellowCardError: class extends Error {},
}));
vi.mock("../payments/charge-saved-card", () => ({ chargeSavedCard: vi.fn() }));
vi.mock("../payments/observability", () => ({ logMoney: () => undefined, failureReason: () => "x" }));
vi.mock("./repository", () => ({ readStatement: vi.fn() }));
vi.mock("./audit", () => ({ recordMoneyAudit: async () => undefined }));
vi.mock("../payments/paystack", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../payments/paystack")>()),
  isPaystackConfigured: () => true,
  verifyTransaction: async () => {
    state.verifyCalls += 1;
    return state.tx;
  },
}));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "user-1", email: "ada@example.invalid", user_metadata: {} },
    supabase: {},
  }),
}));
vi.mock("./ledger", () => ({
  availableBalanceMinor: async () => 0,
  displayNameFor: async () => "Ada",
  ensureWalletId: async () => "w1",
  findUserByEmail: async () => null,
  getAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }),
  postEntry: vi.fn(),
  recordFunding: (a: unknown, i: unknown) => state.recordFunding(a, i),
  setEntryStatus: vi.fn(),
  labelTransferLegs: vi.fn(),
}));

const { verifyFunding } = await import("./actions");

const REFERENCE = "rm-fund-3f2a9c1e-7b4d-4e5f-9a8b-1c2d3e4f5a6b";
const PAID = {
  status: "success",
  currency: "NGN",
  amountMinor: 2_500_000,
  metadata: { user_id: "user-1" },
  customerEmail: "ada@example.invalid",
  channel: "card",
  paidAt: "2026-09-24T00:00:00Z",
};

beforeEach(() => {
  state.allowed = true;
  state.tx = { ...PAID };
  state.verifyCalls = 0;
  state.recordFunding.mockClear();
  state.recordFunding.mockImplementation(async () => "posted");
});

describe("verifyFunding", () => {
  it("credits the amount Paystack verified, to the owner Paystack's metadata names", async () => {
    expect(await verifyFunding(REFERENCE)).toMatchObject({ ok: true, data: { credited: true, amountMinor: 2_500_000 } });
    expect(state.recordFunding).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "user-1", amountMinor: 2_500_000, reference: REFERENCE }),
    );
  });

  it.each([["abandoned"], ["failed"], ["reversed"], ["ongoing"]])("credits nothing for a %s payment", async (status) => {
    state.tx = { ...PAID, status };
    expect((await verifyFunding(REFERENCE)).ok).toBe(false);
    expect(state.recordFunding).not.toHaveBeenCalled();
  });

  it("credits nothing for a payment that was not in naira", async () => {
    state.tx = { ...PAID, currency: "USD" };
    expect((await verifyFunding(REFERENCE)).ok).toBe(false);
    expect(state.recordFunding).not.toHaveBeenCalled();
  });

  it("credits nothing when the payment names no owner and its email is not the caller's", async () => {
    state.tx = { ...PAID, metadata: {}, customerEmail: "somebody@else.invalid" };
    expect((await verifyFunding(REFERENCE)).ok).toBe(false);
    expect(state.recordFunding).not.toHaveBeenCalled();
  });

  it("never asks Paystack for a reference that is not a funding reference, or past the money limit", async () => {
    expect((await verifyFunding("rm-bk-3f2a9c1e-7b4d-4e5f-9a8b-1c2d3e4f5a6b")).ok).toBe(false);
    state.allowed = false;
    expect((await verifyFunding(REFERENCE)).ok).toBe(false);
    expect(state.verifyCalls).toBe(0);
    expect(state.recordFunding).not.toHaveBeenCalled();
  });

  it("does not claim a credit when the ledger write fails", async () => {
    state.recordFunding.mockImplementation(async () => {
      throw new Error("db down");
    });
    expect((await verifyFunding(REFERENCE)).ok).toBe(false);
  });
});
