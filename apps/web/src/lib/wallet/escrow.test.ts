import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Escrow money moving through the one ledger.
 *
 * Three properties matter here and they are all about not inventing a second
 * system for money that already has one.
 *
 *  - Every leg is keyed on a reference DERIVED FROM THE ESCROW ID, so a retried
 *    release computes the same key and the unique index refuses it. A random
 *    reference per attempt would make every retry a second payment.
 *  - Release and refund never pass an amount. The database reads it from the
 *    escrow row, so no caller can release more than is held.
 *  - When the database function is not there, the answer is `unavailable` and
 *    nothing is attempted. There is deliberately no TypeScript fallback that
 *    reads a balance and writes an entry, because that is how a shadow ledger
 *    gets born.
 */

const audit = vi.hoisted(() => ({ recordMoneyAudit: vi.fn(async () => {}) }));
vi.mock("./audit", () => audit);

const { holdEscrow, refundEscrow, releaseEscrow } = await import("./escrow");
const { escrowReference } = await import("../payments/references");

import type { AdminClient } from "./ledger";

const ESCROW_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const AMOUNT_MINOR = 7_500_000;
const ACTOR = { kind: "user", userId: "admin-1" } as const;

type RpcCall = { fn: string; args: Record<string, unknown> };

function client(
  answer: { data: unknown; error: unknown },
  seen?: RpcCall[],
): AdminClient {
  return {
    rpc: (fn: string, args: Record<string, unknown>) => {
      seen?.push({ fn, args });
      return Promise.resolve(answer);
    },
  } as unknown as AdminClient;
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("holdEscrow", () => {
  it("calls the locking function with the derived reference", async () => {
    const seen: RpcCall[] = [];
    const result = await holdEscrow(
      client({ data: { status: "ok", amount_minor: AMOUNT_MINOR, state: "held" }, error: null }, seen),
      { escrowId: ESCROW_ID, payerUserId: "payer-1", amountMinor: AMOUNT_MINOR, actor: ACTOR },
    );

    expect(result.outcome).toBe("moved");
    expect(result.reference).toBe(escrowReference(ESCROW_ID, "hold"));
    expect(result.amountMinor).toBe(AMOUNT_MINOR);
    expect(seen[0]?.fn).toBe("escrow_hold");
    expect(seen[0]?.args).toMatchObject({
      escrow_id: ESCROW_ID,
      payer_user: "payer-1",
      amount: AMOUNT_MINOR,
      hold_reference: escrowReference(ESCROW_ID, "hold"),
    });
  });

  it("refuses a non-integer or non-positive amount before it reaches the database", async () => {
    const seen: RpcCall[] = [];
    const c = client({ data: { status: "ok" }, error: null }, seen);

    for (const amountMinor of [0, -1, 1234.56, Number.NaN]) {
      const result = await holdEscrow(c, {
        escrowId: ESCROW_ID,
        payerUserId: "payer-1",
        amountMinor,
        actor: ACTOR,
      });
      expect(result.outcome).toBe("failed");
      expect(result.reason).toBe("bad_amount");
    }
    expect(seen).toHaveLength(0);
  });

  it("reports insufficient as a refusal, not as a failure", async () => {
    const result = await holdEscrow(
      client({ data: { status: "insufficient" }, error: null }),
      { escrowId: ESCROW_ID, payerUserId: "payer-1", amountMinor: AMOUNT_MINOR, actor: ACTOR },
    );
    expect(result.outcome).toBe("insufficient");
  });
});

describe("releaseEscrow and refundEscrow", () => {
  it("never send an amount, so no caller can release more than is held", async () => {
    const seen: RpcCall[] = [];
    const c = client({ data: { status: "ok", amount_minor: AMOUNT_MINOR }, error: null }, seen);

    await releaseEscrow(c, { escrowId: ESCROW_ID, beneficiaryUserId: "host-1", actor: ACTOR });
    await refundEscrow(c, { escrowId: ESCROW_ID, payerUserId: "payer-1", actor: ACTOR });

    for (const call of seen) {
      expect(call.args).not.toHaveProperty("amount");
    }
    expect(seen[0]?.args).toMatchObject({
      beneficiary_user: "host-1",
      release_reference: escrowReference(ESCROW_ID, "release"),
    });
    expect(seen[1]?.args).toMatchObject({
      payer_user: "payer-1",
      refund_reference: escrowReference(ESCROW_ID, "refund"),
    });
  });

  it("computes the same reference every time, which is what makes a retry safe", async () => {
    const seen: RpcCall[] = [];
    const c = client({ data: { status: "duplicate" }, error: null }, seen);

    const first = await releaseEscrow(c, {
      escrowId: ESCROW_ID,
      beneficiaryUserId: "host-1",
      actor: ACTOR,
    });
    const second = await releaseEscrow(c, {
      escrowId: ESCROW_ID,
      beneficiaryUserId: "host-1",
      actor: ACTOR,
    });

    expect(first.reference).toBe(second.reference);
    expect(second.outcome).toBe("duplicate");
  });

  it("reports wrong_state for a leg the escrow is not eligible for", async () => {
    const result = await releaseEscrow(
      client({ data: { status: "wrong_state", state: "refunded" }, error: null }),
      { escrowId: ESCROW_ID, beneficiaryUserId: "host-1", actor: ACTOR },
    );
    expect(result.outcome).toBe("wrong_state");
    expect(result.state).toBe("refunded");
  });
});

describe("before the database functions land", () => {
  it("answers unavailable and attempts no fallback of its own", async () => {
    const result = await holdEscrow(
      client({ data: null, error: { code: "PGRST202", message: "Could not find the function" } }),
      { escrowId: ESCROW_ID, payerUserId: "payer-1", amountMinor: AMOUNT_MINOR, actor: ACTOR },
    );

    expect(result.outcome).toBe("unavailable");
    expect(result.reason).toBe("escrow_hold_not_applied");
    // Nothing was written and nothing was claimed. Nothing is better than
    // nearly, where a second ledger is the alternative.
    expect(audit.recordMoneyAudit).not.toHaveBeenCalled();
  });
});

describe("the audit trail", () => {
  it("records every movement, including the ones that refused", async () => {
    await releaseEscrow(client({ data: { status: "ok", amount_minor: AMOUNT_MINOR }, error: null }), {
      escrowId: ESCROW_ID,
      beneficiaryUserId: "host-1",
      actor: ACTOR,
    });
    expect(audit.recordMoneyAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "wallet.escrow.released",
        reference: escrowReference(ESCROW_ID, "release"),
        amountMinor: AMOUNT_MINOR,
        outcome: "ok",
      }),
    );

    audit.recordMoneyAudit.mockClear();

    await refundEscrow(client({ data: { status: "wrong_state" }, error: null }), {
      escrowId: ESCROW_ID,
      payerUserId: "payer-1",
      actor: ACTOR,
    });
    expect(audit.recordMoneyAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "wallet.escrow.refunded", outcome: "wrong_state" }),
    );
  });
});
