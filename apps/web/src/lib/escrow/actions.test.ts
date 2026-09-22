import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The four held-payment doors, and the guard the revoke put in front of them.
 *
 * `escrow_fund_from_wallet`, `escrow_confirm`, `escrow_request_release` and
 * `escrow_raise_dispute` were executable by the `authenticated` role, so a
 * signed-in person could call them over `/rest/v1/rpc/` with any arguments
 * they liked. `EXECUTE` is revoked and each body now lives in an `_as` sibling
 * that takes the actor explicitly. These prove the seam that replaced the
 * grant: the actor is ALWAYS the session's own user id and never an argument
 * the caller supplies, a signed-out caller reaches no database function at
 * all, the funding door counts against a money rate limit, and a refusal the
 * database decided is handed back as a sentence rather than as a SQL status.
 */
const seam = vi.hoisted(() => ({
  rpc: vi.fn(),
  signedIn: true,
  allowed: true,
  answer: null as unknown,
}));

vi.mock("../security/money-limits", () => ({
  guardMoney: async () =>
    seam.allowed ? { allowed: true, degraded: false } : { allowed: false, message: "too many", retryAfterSeconds: 60 },
}));
vi.mock("../wallet/ledger", () => ({ getAdminClient: () => ({ rpc: seam.rpc }) }));
vi.mock("../wallet/rpc", () => ({
  callMoneyRpc: async (_admin: unknown, _surface: string, fn: string, args: Record<string, unknown>) => {
    seam.rpc(fn, args);
    return { outcome: "ok", data: seam.answer } as const;
  },
  readMoneyStatus: (data: unknown) => {
    const row = (data ?? {}) as Record<string, unknown>;
    return {
      status: typeof row["status"] === "string" ? row["status"] : "unreadable",
      amountMinor: typeof row["amount_minor"] === "number" ? row["amount_minor"] : null,
      availableMinor: null,
      walletId: null,
      state: typeof row["state"] === "string" ? row["state"] : null,
    };
  },
}));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () =>
    seam.signedIn
      ? { state: "signed-in", user: { id: "11111111-1111-4111-8111-111111111111" }, supabase: {} }
      : { state: "signed-out" },
}));

const PAYEE = "22222222-2222-4222-8222-222222222222";
const ESCROW = "33333333-3333-4333-8333-333333333333";

function answer(value: unknown): void {
  seam.answer = value;
}

beforeEach(() => {
  seam.rpc.mockClear();
  seam.signedIn = true;
  seam.allowed = true;
  answer({ status: "ok", escrow_id: ESCROW, state: "HELD", amount_minor: 250000 });
});

describe("the guarded held-payment doors", () => {
  it("passes the SESSION's user id as the actor, never the caller's", async () => {
    const { openHeldPayment } = await import("./actions");
    const result = await openHeldPayment({
      payeeId: PAYEE,
      purpose: "rent_deposit",
      amountMinor: 250000,
    });

    expect(result.ok).toBe(true);
    const [fn, args] = seam.rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(fn).toBe("escrow_fund_from_wallet_as");
    expect(args["p_actor"]).toBe("11111111-1111-4111-8111-111111111111");
    // The reference is ours, generated per call, and never taken from input.
    expect(String(args["p_reference"])).toMatch(/^rm-esc-.+-hold$/);
  });

  it("reaches no database function at all when nobody is signed in", async () => {
    seam.signedIn = false;
    const { confirmHeldPayment } = await import("./actions");
    const result = await confirmHeldPayment({ id: ESCROW });

    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("counts the funding door against a money limit and charges nothing when refused", async () => {
    seam.allowed = false;
    const { openHeldPayment } = await import("./actions");
    const result = await openHeldPayment({
      payeeId: PAYEE,
      purpose: "rent_deposit",
      amountMinor: 250000,
    });

    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("refuses a bad amount before any call, because kobo are whole", async () => {
    const { openHeldPayment } = await import("./actions");
    const result = await openHeldPayment({
      payeeId: PAYEE,
      purpose: "rent_deposit",
      amountMinor: 1250.5,
    });

    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("turns the database's refusal into a sentence rather than a status", async () => {
    answer({ status: "not_a_party" });
    const { requestHeldPaymentRelease } = await import("./actions");
    const result = await requestHeldPaymentRelease({ id: ESCROW });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("That is not yours to act on.");
      expect(result.error).not.toContain("not_a_party");
    }
  });

  it("makes the dispute reason the caller's words and the actor the session's", async () => {
    answer({ status: "ok", escrow_id: ESCROW, state: "DISPUTED" });
    const { disputeHeldPayment } = await import("./actions");
    const result = await disputeHeldPayment({ id: ESCROW, reason: "The flat was not as described." });

    expect(result.ok).toBe(true);
    const [fn, args] = seam.rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(fn).toBe("escrow_raise_dispute_as");
    expect(args["p_actor"]).toBe("11111111-1111-4111-8111-111111111111");
    expect(args["p_reason"]).toBe("The flat was not as described.");
  });

  it("refuses a dispute with nothing in it", async () => {
    const { disputeHeldPayment } = await import("./actions");
    const result = await disputeHeldPayment({ id: ESCROW, reason: "no" });

    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });
});
