import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The shared saved-card door, at its guard.
 *
 * Two things a person cannot see from the outside: a tripped limit never
 * reaches the processor, and it leaves one info line on the desk so a loop
 * on somebody's card is noticed before their bank notices it. The refusal
 * a person reads is the table's own sentence, unchanged.
 */
const seam = vi.hoisted(() => ({
  guardMoney: vi.fn(),
  recordAlert: vi.fn(),
  chargeAuthorization: vi.fn(),
  initializeTransaction: vi.fn(),
  recordMoneyAudit: vi.fn(),
}));

vi.mock("../security/money-limits", () => ({ guardMoney: seam.guardMoney }));
vi.mock("../alerts", () => ({ recordAlert: seam.recordAlert }));
vi.mock("../wallet/audit", () => ({ recordMoneyAudit: seam.recordMoneyAudit }));
vi.mock("../wallet/ledger", () => ({ getAdminClient: () => ({ from: vi.fn() }) }));
vi.mock("./paystack", () => ({
  PaystackError: class extends Error {},
  chargeAuthorization: seam.chargeAuthorization,
  initializeTransaction: seam.initializeTransaction,
  isPaystackConfigured: () => true,
}));

const METHOD_ID = "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4";

function methodTable() {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is"]) chain[m] = () => chain;
  chain.maybeSingle = async () => ({
    data: {
      id: METHOD_ID,
      user_id: "user-1",
      authorization_code: "AUTH_x",
      email_used: "u@example.invalid",
      reusable: true,
      last4: "4081",
    },
    error: null,
  });
  return chain;
}

vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "user-1", email: "u@example.invalid", user_metadata: {} },
    supabase: { from: () => methodTable() },
  }),
}));

const PARAMS = {
  methodId: METHOD_ID,
  amountMinor: 250_000,
  reference: "rm-fund-test",
  purpose: "wallet_funding",
};

beforeEach(() => {
  seam.guardMoney.mockReset();
  seam.recordAlert.mockReset().mockResolvedValue({ ok: true, id: "a1", deduplicated: false });
  seam.chargeAuthorization.mockReset().mockResolvedValue({ status: "success" });
  seam.initializeTransaction.mockReset();
  seam.recordMoneyAudit.mockReset();
});

describe("chargeSavedCard at the card_charge limit", () => {
  it("refuses with the table's sentence, charges nothing and tells the desk once", async () => {
    seam.guardMoney.mockResolvedValue({
      allowed: false,
      message: "That is a lot of card charges at once. Try again in about 4 minutes.",
      retryAfterSeconds: 240,
    });
    const { chargeSavedCard } = await import("./charge-saved-card");

    const result = await chargeSavedCard(PARAMS);

    expect(result).toEqual({
      ok: false,
      error: "That is a lot of card charges at once. Try again in about 4 minutes.",
    });
    expect(seam.guardMoney).toHaveBeenCalledWith("chargeSavedCard", "user-1");
    expect(seam.chargeAuthorization).not.toHaveBeenCalled();
    expect(seam.initializeTransaction).not.toHaveBeenCalled();
    expect(seam.recordAlert).toHaveBeenCalledTimes(1);
    expect(seam.recordAlert).toHaveBeenCalledWith({
      kind: "money.card_charge.limited",
      severity: "info",
      detail: { purpose: "wallet_funding", amount_minor: 250_000, retry_after_seconds: 240 },
      subjectId: "user-1",
      subjectKind: "user",
    });
  });

  it("opens no alert on an allowed charge", async () => {
    seam.guardMoney.mockResolvedValue({ allowed: true, degraded: false });
    const { chargeSavedCard } = await import("./charge-saved-card");

    const result = await chargeSavedCard(PARAMS);

    expect(result).toEqual({ ok: true, data: { kind: "charged" } });
    expect(seam.chargeAuthorization).toHaveBeenCalledTimes(1);
    expect(seam.recordAlert).not.toHaveBeenCalled();
  });

  it("never puts the card, the token or the address in the alert", async () => {
    seam.guardMoney.mockResolvedValue({ allowed: false, message: "no", retryAfterSeconds: 1 });
    const { chargeSavedCard } = await import("./charge-saved-card");
    await chargeSavedCard(PARAMS);
    const written = JSON.stringify(seam.recordAlert.mock.calls[0]?.[0] ?? {});
    expect(written).not.toContain("4081");
    expect(written).not.toContain("AUTH_x");
    expect(written).not.toContain("example.invalid");
  });
});
