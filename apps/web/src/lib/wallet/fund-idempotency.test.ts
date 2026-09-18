import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Both funding doors, guarded against a double submit.
 *
 * The lead's B0 audit of 73e284e: `fundWallet` and `fundWalletWithSavedCard`
 * had no idempotency wrapper, so a double submit charged twice under two
 * references. These prove the seam: a form carrying `idempotencyKey` claims
 * the guard under the caller and a per-door scope, an in-flight claim is
 * refused before any charge is opened, a form without a key runs unguarded
 * as every existing form does, and only an ok answer is recorded.
 */
const seam = vi.hoisted(() => ({
  withIdempotency: vi.fn(),
  initialize: vi.fn(),
  chargeSavedCard: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("../security/idempotency", () => ({
  IN_FLIGHT_MESSAGE: "in flight",
  withIdempotency: seam.withIdempotency,
}));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../email/client", () => ({ bestEffortEmail: vi.fn(), sendMessage: vi.fn() }));
vi.mock("../payments/paystack", () => ({
  PaystackError: class extends Error {},
  initializeTransaction: seam.initialize,
  isPaystackConfigured: () => true,
  verifyTransaction: vi.fn(),
  createTransferRecipient: vi.fn(),
  initiateTransfer: vi.fn(),
  resolveAccount: vi.fn(),
  listBanks: vi.fn(),
}));
vi.mock("../payments/yellowcard", () => ({
  createCollection: vi.fn(),
  isYellowCardConfigured: () => false,
  YellowCardError: class extends Error {},
}));
vi.mock("../payments/charge-saved-card", () => ({ chargeSavedCard: seam.chargeSavedCard }));
vi.mock("./audit", () => ({ recordMoneyAudit: vi.fn() }));
vi.mock("./ledger", () => ({
  availableBalanceMinor: async () => 0,
  displayNameFor: async () => "",
  ensureWalletId: async () => "w",
  findUserByEmail: async () => null,
  getAdminClient: () => ({ from: vi.fn() }),
  postEntry: vi.fn(),
  recordFunding: vi.fn(),
  setEntryStatus: vi.fn(),
}));
vi.mock("./rpc", () => ({ callMoneyRpc: vi.fn(), readMoneyStatus: vi.fn() }));
vi.mock("./repository", () => ({ readStatement: vi.fn() }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "user-1", email: "u@example.invalid", user_metadata: {} },
    supabase: {},
  }),
}));

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

beforeEach(() => {
  seam.withIdempotency.mockReset();
  seam.initialize.mockReset().mockResolvedValue({ authorizationUrl: "https://pay.example.invalid", reference: "r" });
  seam.chargeSavedCard.mockReset().mockResolvedValue({ ok: true, data: { kind: "charged" } });
});

describe("funding is idempotent per submit", () => {
  it("refuses an in-flight key on both doors without opening a charge", async () => {
    seam.withIdempotency.mockResolvedValue({ status: "in-flight" });
    const { fundWallet, fundWalletWithSavedCard } = await import("./actions");

    const hosted = await fundWallet({ ok: true, data: null }, form({ amount: "5000", idempotencyKey: "k1" }));
    const saved = await fundWalletWithSavedCard(
      { ok: true, data: null },
      form({ amount: "5000", methodId: "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4", idempotencyKey: "k2" }),
    );

    expect(hosted).toEqual({ ok: false, error: "in flight" });
    expect(saved).toEqual({ ok: false, error: "in flight" });
    expect(seam.initialize).not.toHaveBeenCalled();
    expect(seam.chargeSavedCard).not.toHaveBeenCalled();

    const requests = seam.withIdempotency.mock.calls.map(([req]) => req);
    expect(requests.map((r) => r.scope)).toEqual(["wallet.fund", "wallet.fund_saved_card"]);
    expect(requests.every((r) => r.subject === "user:user-1")).toBe(true);
    expect(requests[0].shouldRecord({ ok: true, data: null })).toBe(true);
    expect(requests[0].shouldRecord({ ok: false, error: "no" })).toBe(false);
  });

  it("runs the work through the guard and hands its answer back", async () => {
    seam.withIdempotency.mockImplementation(async (_req, work) => ({
      status: "done",
      result: await work(),
      replayed: false,
      degraded: false,
    }));
    const { fundWallet } = await import("./actions");
    const result = await fundWallet({ ok: true, data: null }, form({ amount: "5000", idempotencyKey: "k1" }));
    expect(result.ok).toBe(true);
    expect(seam.initialize).toHaveBeenCalledTimes(1);
  });

  it("leaves a form with no key unguarded, as every existing form is", async () => {
    const { fundWallet } = await import("./actions");
    const result = await fundWallet({ ok: true, data: null }, form({ amount: "5000" }));
    expect(result.ok).toBe(true);
    expect(seam.withIdempotency).not.toHaveBeenCalled();
    expect(seam.initialize).toHaveBeenCalledTimes(1);
  });
});
