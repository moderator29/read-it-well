"use server";

/**
 * The four held-payment doors, with a guard in front of each.
 *
 * WHY THIS FILE EXISTS. `escrow_fund_from_wallet`, `escrow_confirm`,
 * `escrow_request_release` and `escrow_raise_dispute` were SECURITY DEFINER
 * and executable by the `authenticated` role, which meant any signed-in person
 * could call them straight over `/rest/v1/rpc/` with arguments of their own
 * choosing and move their own balance into a held state that no surface in
 * this product opens and no surface releases. The migration
 * `20260922120000_the_escrow_doors_are_locked_and_trust_stops_answering_strangers`
 * revoked those grants and moved each body into an `_as` sibling that takes
 * the actor explicitly and is callable by `service_role` alone. This module is
 * the only way in.
 *
 * WHAT THE GUARD IS. The session is resolved on the server, the input is
 * parsed by a schema, the money path is rate limited per account like every
 * other money path in `lib/security/money-limits.ts`, and only then is the
 * database function called, with the id of the person who is ACTUALLY signed
 * in. The caller cannot name a different actor, because the actor is never an
 * argument to anything exported here.
 *
 * WHAT THIS DOES NOT DO. It does not promise anybody a held-payment feature.
 * Rule 11 stands: this is machinery with a lock on it, not a product, and no
 * copy in this file says the word to a user. Nothing renders it today; when a
 * surface is designed and the founder has the solicitor's answer on custody,
 * it calls these and inherits the guard rather than growing a second path.
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { ESCROW_PREFIX } from "../payments/references";
import { guardMoney } from "../security/money-limits";
import { getAdminClient } from "../wallet/ledger";
import { callMoneyRpc, readMoneyStatus } from "../wallet/rpc";

const SERVICE_DOWN =
  "That could not be done just now and nothing was moved. Please try again shortly.";

/** What one of these calls did, in the caller's vocabulary rather than SQL's. */
export type HeldPaymentOutcome = {
  /** The agreement this touched. */
  id: string;
  /** The state the database reported afterwards, when it reported one. */
  state: string | null;
  /** Integer kobo, when the call moved an amount. */
  amountMinor: number | null;
};

const idSchema = z.object({ id: z.uuid("That is not something we can act on.") });

const openSchema = z.object({
  payeeId: z.uuid("Choose who is being paid."),
  listingId: z.uuid().nullable().optional(),
  purpose: z.enum(["rent_deposit", "first_rent", "purchase_deposit", "purchase_balance"], {
    message: "Say what this payment is for.",
  }),
  /** Integer kobo. The boundary that turned naira into kobo is the caller's. */
  amountMinor: z
    .number()
    .int("Amounts are whole kobo.")
    .positive("That amount is not one we can move."),
});

const disputeSchema = idSchema.extend({
  reason: z
    .string()
    .trim()
    .min(4, "Say what is wrong, in a sentence somebody can act on.")
    .max(400, "Keep it under 400 characters."),
});

/**
 * The refusals the four functions can answer with, in English.
 *
 * Every one of them is a refusal the database decided under a row lock, so
 * the sentence says what did not happen and that nothing moved.
 */
const REFUSALS: Record<string, string> = {
  signed_out: SIGNED_OUT_MESSAGE,
  bad_request: "Something about that request was incomplete, so nothing was moved.",
  bad_amount: "That amount is not one we can move.",
  same_party: "You cannot hold a payment for yourself.",
  no_wallet: "There is no wallet on this account yet, so nothing was moved.",
  insufficient: "There is not enough in your balance for that, so nothing was moved.",
  not_found: "That is no longer there. Refresh and look again.",
  not_a_party: "That is not yours to act on.",
  not_confirmable: "That cannot be confirmed from where it stands.",
  not_requestable: "That cannot be paid out from where it stands.",
  not_disputable: "That cannot be disputed from where it stands.",
  needs_a_reason: "Say what is wrong, in a sentence somebody can act on.",
};

function refusalFor(status: string): string {
  return REFUSALS[status] ?? SERVICE_DOWN;
}

/**
 * The one shape all four share: session, schema, limit, service client, call.
 *
 * Kept private so no export can reach a database function without walking all
 * five steps. `guardMoney` is applied to the funding door only, because that
 * is the one that moves an amount; the other three change a state a party is
 * already a party to, and they are reached through the same session check.
 */
async function callGuarded(
  fn: "escrow_fund_from_wallet_as" | "escrow_confirm_as" | "escrow_request_release_as" | "escrow_raise_dispute_as",
  args: (actorId: string) => Record<string, unknown>,
  options: { limited: boolean; reference?: string; amountMinor?: number },
): Promise<ActionResult<HeldPaymentOutcome>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (options.limited) {
    const limit = await guardMoney("openHeldPayment", session.user.id);
    if (!limit.allowed) return fail(limit.message);
  }

  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  const call = await callMoneyRpc(admin, "escrow", fn, args(session.user.id), {
    reference: options.reference ?? null,
    amountMinor: options.amountMinor ?? null,
    userId: session.user.id,
  });
  if (call.outcome !== "ok") return fail(SERVICE_DOWN);

  const status = readMoneyStatus(call.data);
  if (status.status !== "ok") return fail(refusalFor(status.status));

  const row = (call.data ?? {}) as Record<string, unknown>;
  const id = typeof row["escrow_id"] === "string" ? (row["escrow_id"] as string) : "";
  return ok({ id, state: status.state, amountMinor: status.amountMinor });
}

/**
 * Move an amount out of the caller's spendable balance and hold it.
 *
 * The reference is generated here and never accepted from a caller: it is the
 * ledger's uniqueness key, and a caller who could choose it could collide with
 * somebody else's movement or replay their own.
 */
export async function openHeldPayment(input: {
  payeeId: string;
  listingId?: string | null;
  purpose: "rent_deposit" | "first_rent" | "purchase_deposit" | "purchase_balance";
  amountMinor: number;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(openSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const reference = `${ESCROW_PREFIX}${randomUUID()}-hold`;
  return callGuarded(
    "escrow_fund_from_wallet_as",
    (actorId) => ({
      p_actor: actorId,
      p_payee: parsed.data.payeeId,
      p_listing: parsed.data.listingId ?? null,
      p_purpose: parsed.data.purpose,
      p_amount_minor: parsed.data.amountMinor,
      p_reference: reference,
      p_hold_days: 21,
    }),
    { limited: true, reference, amountMinor: parsed.data.amountMinor },
  );
}

/** Say, as one of the two parties, that this is settled. */
export async function confirmHeldPayment(input: {
  id: string;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(idSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return callGuarded(
    "escrow_confirm_as",
    (actorId) => ({ p_actor: actorId, p_escrow: parsed.data.id }),
    { limited: false },
  );
}

/** Ask, as one of the two parties, for the held money to be paid out. */
export async function requestHeldPaymentRelease(input: {
  id: string;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(idSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return callGuarded(
    "escrow_request_release_as",
    (actorId) => ({ p_actor: actorId, p_escrow: parsed.data.id }),
    { limited: false },
  );
}

/** Say something is wrong, which stops the clock and calls a human in. */
export async function disputeHeldPayment(input: {
  id: string;
  reason: string;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(disputeSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return callGuarded(
    "escrow_raise_dispute_as",
    (actorId) => ({ p_actor: actorId, p_escrow: parsed.data.id, p_reason: parsed.data.reason }),
    { limited: false },
  );
}
