import "server-only";

import { logMoney } from "../payments/observability";
import { escrowReference, type EscrowLeg } from "../payments/references";
import { recordMoneyAudit, type MoneyActor } from "./audit";
import type { AdminClient } from "./ledger";
import { callMoneyRpc, readMoneyStatus } from "./rpc";

/**
 * Escrow, in the one ledger.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE. Escrow money is wallet money. Every
 * movement is a row in `public.wallet_entries`, under the three kinds added for
 * it: `escrow_hold` (a debit that has left the payer's spendable balance and
 * not yet reached anybody), `escrow_release` (the credit landing on the other
 * side) and `escrow_refund` (the credit going back). There is no second table
 * of escrow balances, there is no shadow ledger, and there is no arithmetic
 * anywhere that has to be reconciled against public.wallet_balances. A person's
 * money is one number and it is derived in one place.
 *
 * WHAT AGENT B OWNS AND WHAT THIS OWNS. The escrow tables, the state machine
 * and the database functions are Agent B's. This is the TypeScript that moves
 * money through them, and it does three things and no more: build the
 * reference, call the locking function, and say what happened. It never reads a
 * balance and then writes. It never decides a state transition. It never posts
 * a wallet entry directly, which is why nothing here imports postEntry.
 *
 * IDEMPOTENCY IS THE REFERENCE. Each leg's reference is derived from the ESCROW
 * ROW'S id, so a retried release computes the identical key, collides with the
 * unique index on wallet_entries.reference, and moves nothing. The shapes are
 * documented in lib/payments/references.ts, which is the contract:
 *   rm-esc-<escrow uuid>-hold
 *   rm-esc-<escrow uuid>-release
 *   rm-esc-<escrow uuid>-refund
 *
 * WHAT HAPPENS BEFORE THE FUNCTIONS LAND. `unavailable` comes back, with an
 * unconfigured line on the money channel naming the missing function. There is
 * deliberately no TypeScript fallback here, unlike the transfer and withdrawal
 * paths: those had a shipped implementation to fall back to, escrow has none,
 * and inventing an unlocked one to tide us over is how a second ledger gets
 * born. Nothing is better than nearly.
 */

/**
 * What an escrow movement did.
 *
 *  - moved        the leg posted. Money is where it should be.
 *  - duplicate    the reference already existed, so this exact leg had already
 *                 posted. Correct, and the normal answer to a retry.
 *  - insufficient the payer does not have it. Decided under the row lock.
 *  - wrong_state  the escrow is not in a state this leg is legal from, for
 *                 example releasing one that was already refunded.
 *  - not_found    no escrow row with that id.
 *  - unavailable  the database function is not applied here yet.
 *  - failed       something threw. Money may be in an unknown state.
 */
export type EscrowOutcome =
  | "moved"
  | "duplicate"
  | "insufficient"
  | "wrong_state"
  | "not_found"
  | "unavailable"
  | "failed";

export type EscrowMovement = {
  outcome: EscrowOutcome;
  /** The leg this was. */
  leg: EscrowLeg;
  /** The reference it is keyed on, which is also the audit join key. */
  reference: string;
  /** Integer kobo the database says moved, when it said. */
  amountMinor: number | null;
  /** The escrow's state after the call, when the function reported one. */
  state: string | null;
  reason: string;
};

/** The database function behind each leg. Specified in lib/wallet/rpc.ts. */
const FUNCTION_FOR: Record<EscrowLeg, string> = {
  hold: "escrow_hold",
  release: "escrow_release",
  refund: "escrow_refund",
};

/** The audit action each leg writes. */
const ACTION_FOR: Record<EscrowLeg, string> = {
  hold: "wallet.escrow.held",
  release: "wallet.escrow.released",
  refund: "wallet.escrow.refunded",
};

function outcomeFor(status: string): EscrowOutcome {
  if (status === "ok") return "moved";
  if (status === "duplicate") return "duplicate";
  if (status === "insufficient") return "insufficient";
  if (status === "wrong_state") return "wrong_state";
  if (status === "not_found") return "not_found";
  return "failed";
}

/**
 * The one shape all three legs share: reference, call, log, audit.
 *
 * Kept private so no caller can reach a leg without its reference being derived
 * here from the escrow id. Passing a reference in from outside would be the one
 * way to break the idempotency this whole design rests on.
 */
async function moveEscrow(
  admin: AdminClient,
  leg: EscrowLeg,
  params: {
    escrowId: string;
    /** Whose wallet this leg touches. Payer for hold and refund, beneficiary for release. */
    counterpartyUserId: string;
    /** Integer kobo. Only the hold sets an amount; the others read it from the escrow row. */
    amountMinor?: number;
    note?: string;
    actor: MoneyActor;
  },
): Promise<EscrowMovement> {
  const reference = escrowReference(params.escrowId, leg);
  const fn = FUNCTION_FOR[leg];

  const args: Record<string, unknown> = {
    escrow_id: params.escrowId,
    note: params.note ?? null,
  };
  if (leg === "hold") {
    args["payer_user"] = params.counterpartyUserId;
    args["amount"] = params.amountMinor ?? 0;
    args["hold_reference"] = reference;
  } else if (leg === "release") {
    args["beneficiary_user"] = params.counterpartyUserId;
    args["release_reference"] = reference;
  } else {
    args["payer_user"] = params.counterpartyUserId;
    args["refund_reference"] = reference;
  }

  const call = await callMoneyRpc(admin, "escrow", fn, args, {
    reference,
    amountMinor: params.amountMinor ?? null,
    userId: params.counterpartyUserId,
  });

  if (call.outcome === "missing") {
    return {
      outcome: "unavailable",
      leg,
      reference,
      amountMinor: params.amountMinor ?? null,
      state: null,
      reason: `${fn}_not_applied`,
    };
  }
  if (call.outcome === "failed") {
    return {
      outcome: "failed",
      leg,
      reference,
      amountMinor: params.amountMinor ?? null,
      state: null,
      reason: call.reason,
    };
  }

  const status = readMoneyStatus(call.data);
  const outcome = outcomeFor(status.status);
  const amountMinor = status.amountMinor ?? params.amountMinor ?? null;

  logMoney({
    surface: "escrow",
    outcome:
      outcome === "moved"
        ? "posted"
        : outcome === "duplicate"
          ? "duplicate"
          : outcome === "failed"
            ? "failed"
            : "rejected",
    reason: `${leg}:${status.status}`,
    reference,
    amountMinor,
    userId: params.counterpartyUserId,
  });

  // Every movement leaves a record, including the refusals. An escrow that
  // could not be released is exactly the thing somebody will ask about later.
  await recordMoneyAudit(admin, {
    actor: params.actor,
    action: ACTION_FOR[leg],
    reference,
    amountMinor,
    subjectUserId: params.counterpartyUserId,
    outcome: status.status,
    detail: {
      escrow_id: params.escrowId,
      leg,
      ...(status.state ? { escrow_state: status.state } : {}),
    },
  });

  return { outcome, leg, reference, amountMinor, state: status.state, reason: status.status };
}

/**
 * Take money out of the payer's spendable balance and into escrow.
 *
 * A debit of kind `escrow_hold`, COMPLETED, posted inside the same transaction
 * as the escrow row's state change and under a lock on the payer's wallet. The
 * balance check that authorises it happens in there too, never here.
 */
export async function holdEscrow(
  admin: AdminClient,
  params: {
    escrowId: string;
    payerUserId: string;
    /** Integer kobo. */
    amountMinor: number;
    note?: string;
    actor: MoneyActor;
  },
): Promise<EscrowMovement> {
  if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0) {
    const reference = escrowReference(params.escrowId, "hold");
    logMoney({
      surface: "escrow",
      outcome: "rejected",
      reason: "hold:amount_not_positive_integer",
      reference,
      userId: params.payerUserId,
    });
    return {
      outcome: "failed",
      leg: "hold",
      reference,
      amountMinor: null,
      state: null,
      reason: "bad_amount",
    };
  }
  return moveEscrow(admin, "hold", {
    escrowId: params.escrowId,
    counterpartyUserId: params.payerUserId,
    amountMinor: params.amountMinor,
    ...(params.note === undefined ? {} : { note: params.note }),
    actor: params.actor,
  });
}

/**
 * Send held money on to whoever earned it.
 *
 * A credit of kind `escrow_release`. The AMOUNT IS NOT PASSED IN: the database
 * function reads it from the escrow row, so no caller can release more than is
 * held, however wrong the caller's arithmetic is.
 */
export async function releaseEscrow(
  admin: AdminClient,
  params: {
    escrowId: string;
    beneficiaryUserId: string;
    note?: string;
    actor: MoneyActor;
  },
): Promise<EscrowMovement> {
  return moveEscrow(admin, "release", {
    escrowId: params.escrowId,
    counterpartyUserId: params.beneficiaryUserId,
    ...(params.note === undefined ? {} : { note: params.note }),
    actor: params.actor,
  });
}

/**
 * Send held money back to the payer.
 *
 * A credit of kind `escrow_refund`, and the same rule as release: the amount
 * comes from the escrow row, not from the caller.
 */
export async function refundEscrow(
  admin: AdminClient,
  params: {
    escrowId: string;
    payerUserId: string;
    note?: string;
    actor: MoneyActor;
  },
): Promise<EscrowMovement> {
  return moveEscrow(admin, "refund", {
    escrowId: params.escrowId,
    counterpartyUserId: params.payerUserId,
    ...(params.note === undefined ? {} : { note: params.note }),
    actor: params.actor,
  });
}
