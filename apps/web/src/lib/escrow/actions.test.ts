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
  /* The kill switch. It fails CLOSED, so a test that forgot to open it would
     find every funding call refused, which is the correct default. */
  flagOpen: true,
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
vi.mock("./flag", () => ({
  heldPaymentsAreOpen: async () => seam.flagOpen,
  HELD_PAYMENTS_CLOSED_MESSAGE: "held payments are off",
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
  seam.flagOpen = true;
  answer({ status: "ok", escrow_id: ESCROW, state: "HELD", amount_minor: 250000 });
});

describe("the guarded held-payment doors", () => {
  it("passes the SESSION's user id as the actor, never the caller's", async () => {
    const { openHeldPayment } = await import("./actions");
    const result = await openHeldPayment({
      payeeId: PAYEE,
      purpose: "agency_fee",
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
      purpose: "agency_fee",
      amountMinor: 250000,
    });

    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("refuses a bad amount before any call, because kobo are whole", async () => {
    const { openHeldPayment } = await import("./actions");
    const result = await openHeldPayment({
      payeeId: PAYEE,
      purpose: "agency_fee",
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

describe("the kill switch, which fails closed", () => {
  it("refuses to open a held payment when the switch is off, and calls nothing", async () => {
    seam.flagOpen = false;
    const { openHeldPayment } = await import("./actions");
    const result = await openHeldPayment({
      payeeId: PAYEE,
      purpose: "agency_fee",
      amountMinor: 250000,
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe("held payments are off");
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("does not trap somebody inside a proposal they want out of", async () => {
    /*
     * Withdrawing a proposal moves no money by definition, so the switch does
     * not gate it. A kill switch that left people unable to back out of a
     * request would be a kill switch that made the incident worse.
     */
    seam.flagOpen = false;
    answer({ status: "ok", escrow_id: ESCROW, state: "CANCELLED", amount_minor: 250000 });
    const { cancelHeldPayment } = await import("./actions");
    const result = await cancelHeldPayment({ id: ESCROW });

    expect(result.ok).toBe(true);
    expect(seam.rpc).toHaveBeenCalled();
  });
});

describe("withdrawing a proposal", () => {
  it("tells somebody to ask for it back when the money has already moved", async () => {
    answer({ status: "already_funded", state: "HELD" });
    const { cancelHeldPayment } = await import("./actions");
    const result = await cancelHeldPayment({ id: ESCROW });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/ask for it back/i);
  });

  it("passes a reason when there is one and null when there is not", async () => {
    answer({ status: "ok", escrow_id: ESCROW, state: "CANCELLED", amount_minor: 250000 });
    const { cancelHeldPayment } = await import("./actions");

    await cancelHeldPayment({ id: ESCROW, reason: "We found somewhere else." });
    let args = seam.rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args["p_reason"]).toBe("We found somewhere else.");

    seam.rpc.mockClear();
    await cancelHeldPayment({ id: ESCROW });
    args = seam.rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args["p_reason"]).toBeNull();
  });
});

describe("filing evidence", () => {
  beforeEach(() => {
    answer({ status: "ok", escrow_id: ESCROW, state: "DISPUTED", amount_minor: 250000 });
  });

  it("refuses a dated fact with no date, by field, before any call", async () => {
    const { fileHeldPaymentFact } = await import("./actions");
    const result = await fileHeldPaymentFact({ id: ESCROW, fact: "viewing_missed" });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.fieldErrors?.["happenedOn"]).toBeTruthy();
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("refuses a money fact with no amount, by field, before any call", async () => {
    const { fileHeldPaymentFact } = await import("./actions");
    const result = await fileHeldPaymentFact({
      id: ESCROW,
      fact: "amount_agreed",
      happenedOn: "2026-09-01",
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.fieldErrors?.["amountMinor"]).toBeTruthy();
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("sends the date only where the fact takes one, and the amount only where it does", async () => {
    const { fileHeldPaymentFact } = await import("./actions");

    await fileHeldPaymentFact({ id: ESCROW, fact: "viewing_missed", happenedOn: "2026-09-01" });
    let args = seam.rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args["p_happened_on"]).toBe("2026-09-01");
    expect(args["p_amount_minor"]).toBeNull();

    seam.rpc.mockClear();
    /* A bare fact carries neither, even when a caller passes both, so a bare
       assertion cannot smuggle a number in beside it. */
    await fileHeldPaymentFact({
      id: ESCROW,
      fact: "keys_not_received",
      happenedOn: "2026-09-01",
      amountMinor: 999,
    });
    args = seam.rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args["p_happened_on"]).toBeNull();
    expect(args["p_amount_minor"]).toBeNull();

    seam.rpc.mockClear();
    await fileHeldPaymentFact({ id: ESCROW, fact: "amount_agreed", amountMinor: 250000 });
    args = seam.rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args["p_amount_minor"]).toBe(250000);
    expect(args["p_happened_on"]).toBeNull();
  });

  it("refuses a caption over 200 characters, which is where an opinion would go", async () => {
    const { fileHeldPaymentDocument } = await import("./actions");
    const result = await fileHeldPaymentDocument({
      id: ESCROW,
      storagePath: "escrow-evidence/x.pdf",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      caption: "a".repeat(201),
    });

    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("refuses a file type the bucket does not accept, and a file over 10MB", async () => {
    const { fileHeldPaymentDocument } = await import("./actions");

    const wrongType = await fileHeldPaymentDocument({
      id: ESCROW,
      storagePath: "escrow-evidence/x.exe",
      fileName: "x.exe",
      mimeType: "application/x-msdownload" as "application/pdf",
      sizeBytes: 1024,
    });
    expect(wrongType.ok).toBe(false);

    const tooBig = await fileHeldPaymentDocument({
      id: ESCROW,
      storagePath: "escrow-evidence/x.pdf",
      fileName: "x.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10_485_761,
    });
    expect(tooBig.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("answers a repeat filing in words rather than with a SQL status", async () => {
    answer({ status: "duplicate" });
    const { fileHeldPaymentFact } = await import("./actions");
    const result = await fileHeldPaymentFact({ id: ESCROW, fact: "keys_not_received" });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/already filed/i);
    expect(result.ok === false && result.error).not.toMatch(/duplicate/i);
  });
});

describe("the hold window", () => {
  it("clamps to the same floor and ceiling the database clamps to", async () => {
    const { openHeldPayment } = await import("./actions");

    await openHeldPayment({ payeeId: PAYEE, purpose: "agency_fee", amountMinor: 1000, holdDays: 0 });
    expect((seam.rpc.mock.calls[0]?.[1] as Record<string, unknown>)["p_hold_days"]).toBe(1);

    seam.rpc.mockClear();
    await openHeldPayment({
      payeeId: PAYEE,
      purpose: "agency_fee",
      amountMinor: 1000,
      holdDays: 5000,
    });
    expect((seam.rpc.mock.calls[0]?.[1] as Record<string, unknown>)["p_hold_days"]).toBe(180);

    seam.rpc.mockClear();
    await openHeldPayment({ payeeId: PAYEE, purpose: "agency_fee", amountMinor: 1000 });
    expect((seam.rpc.mock.calls[0]?.[1] as Record<string, unknown>)["p_hold_days"]).toBe(21);
  });
});
