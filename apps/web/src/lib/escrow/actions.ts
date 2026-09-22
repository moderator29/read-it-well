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
import { OPEN_PURPOSES, PURPOSE_REFUSAL } from "./copy";
import { HELD_PAYMENTS_CLOSED_MESSAGE, heldPaymentsAreOpen } from "./flag";

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
  /*
   * ONLY THE AGENCY FEE, AND THE DATABASE AGREES.
   *
   * `private.escrow_purpose_is_open` refuses everything else inside the
   * funding function, so this is the second of two locks rather than the only
   * one. It is here as well because a schema refusal names a field and a
   * database refusal names a status, and the person filling in a form should
   * get the first.
   */
  purpose: z.enum(["agency_fee"], {
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
  not_cancellable: "That has gone too far to be withdrawn. Ask for it back instead.",
  already_funded:
    "The money has already been set aside, so this cannot simply be withdrawn. Ask for it back instead.",
  purpose_not_open: "That is not something we can set aside.",
  not_open: "That is settled, so nothing more can be filed against it.",
  duplicate: "You have already filed that, so nothing was added twice.",
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
  fn:
    | "escrow_fund_from_wallet_as"
    | "escrow_confirm_as"
    | "escrow_request_release_as"
    | "escrow_raise_dispute_as"
    | "escrow_cancel_as"
    | "escrow_file_evidence_as",
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
  purpose: "agency_fee";
  amountMinor: number;
  /** Whole days the money stays set aside. Clamped again in the database. */
  holdDays?: number;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(openSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  /*
   * THE KILL SWITCH, BEFORE ANYTHING ELSE AND FAILING CLOSED. A held payment
   * that opens because the flags table was briefly unreachable is a held
   * payment nobody chose to allow. See ./flag.ts for why this is not the
   * estate's ordinary flag helper.
   */
  if (!(await heldPaymentsAreOpen())) return fail(HELD_PAYMENTS_CLOSED_MESSAGE);

  if (!OPEN_PURPOSES.includes(parsed.data.purpose)) {
    return fail(
      PURPOSE_REFUSAL[parsed.data.purpose as keyof typeof PURPOSE_REFUSAL] ??
        "That is not something we can set aside.",
    );
  }

  /*
   * THE REFERENCE IS GENERATED HERE AND NEVER ACCEPTED FROM A CALLER, because
   * it is the ledger's uniqueness key and a caller who could choose it could
   * collide with somebody else's movement or replay their own.
   *
   * It is a fresh uuid rather than the escrow row's id, and that is not the
   * asymmetry `references.ts` warns about. The escrow ROW DOES NOT EXIST YET:
   * this one call opens it and holds against it inside one transaction, so
   * there is no id to derive from. What makes the retry safe is that the
   * database answers `duplicate` on the unique index rather than raising, and
   * a client that retries with the same reference moves nothing. The two later
   * legs, release and refund, do derive from the row id, because by then there
   * is one.
   */
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
      p_hold_days: clampHoldDays(input.holdDays),
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

/**
 * The hold window, clamped here and clamped again in the database.
 *
 * Twenty one days is the default the funding function already used. The floor
 * of one day and the ceiling of 180 match `escrow_fund_from_wallet_as`
 * exactly, so a value this function accepts is never silently changed by the
 * database and a value it refuses never gets there.
 */
function clampHoldDays(days?: number): number {
  if (typeof days !== "number" || !Number.isFinite(days)) return 21;
  return Math.min(180, Math.max(1, Math.trunc(days)));
}

const cancelSchema = idSchema.extend({
  reason: z.string().trim().max(400, "Keep it under 400 characters.").optional(),
});

/**
 * Withdraw or decline a proposal, before any money has moved.
 *
 * The database refuses this the moment a hold has posted, and it tests the
 * LEDGER rather than the state to decide, because a row can sit in FUNDED
 * after a crash without a hold ever having been written. A caller who gets
 * `already_funded` here wants a refund, not a cancellation, and the sentence
 * says so.
 *
 * NOT BEHIND THE KILL SWITCH. Switching held payments off must never trap
 * somebody inside a proposal they want out of, and withdrawing one moves no
 * money by definition.
 */
export async function cancelHeldPayment(input: {
  id: string;
  reason?: string;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(cancelSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return callGuarded(
    "escrow_cancel_as",
    (actorId) => ({
      p_actor: actorId,
      p_escrow: parsed.data.id,
      p_reason: parsed.data.reason ?? null,
    }),
    { limited: false },
  );
}

const FACTS = [
  "viewing_attended",
  "viewing_missed",
  "keys_received",
  "keys_not_received",
  "agreement_signed",
  "agreement_not_signed",
  "service_delivered",
  "service_not_delivered",
  "property_matched_listing",
  "property_differed_from_listing",
  "contacted_on",
  "no_reply_since",
  "amount_agreed",
] as const;

/** The facts that mean nothing without the day they happened. */
const DATED_FACTS = new Set(["viewing_attended", "viewing_missed", "contacted_on", "no_reply_since"]);

const factSchema = idSchema.extend({
  fact: z.enum(FACTS, { message: "Choose what you are saying happened." }),
  happenedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Give the date as a day on the calendar.")
    .optional()
    .nullable(),
  amountMinor: z
    .number()
    .int("Amounts are whole kobo.")
    .positive("That amount is not one we can record.")
    .optional()
    .nullable(),
});

/**
 * File one fact. Files and facts are evidence; opinions are not.
 *
 * A fact is one of thirteen things that either happened or did not. The
 * database holds the same list as an enum and the same shape rules as check
 * constraints, so this schema is the sentence a person reads and those are the
 * lock. A dated fact without its date is refused HERE, naming the field, which
 * is better than a status code from Postgres.
 */
export async function fileHeldPaymentFact(input: {
  id: string;
  fact: (typeof FACTS)[number];
  happenedOn?: string | null;
  amountMinor?: number | null;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(factSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  if (DATED_FACTS.has(parsed.data.fact) && !parsed.data.happenedOn) {
    return fail("Say which day that was.", { happenedOn: "Say which day that was." });
  }
  if (parsed.data.fact === "amount_agreed" && !parsed.data.amountMinor) {
    return fail("Say how much was agreed.", { amountMinor: "Say how much was agreed." });
  }

  return callGuarded(
    "escrow_file_evidence_as",
    (actorId) => ({
      p_actor: actorId,
      p_escrow: parsed.data.id,
      p_kind: "fact",
      p_fact: parsed.data.fact,
      p_happened_on: DATED_FACTS.has(parsed.data.fact) ? parsed.data.happenedOn : null,
      p_amount_minor: parsed.data.fact === "amount_agreed" ? parsed.data.amountMinor : null,
    }),
    { limited: false },
  );
}

const fileSchema = idSchema.extend({
  storagePath: z.string().trim().min(1, "That file did not finish uploading."),
  fileName: z.string().trim().min(1, "That file has no name.").max(200, "That name is too long."),
  mimeType: z.enum(
    ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
    { message: "Attach a photograph or a PDF." },
  ),
  sizeBytes: z
    .number()
    .int()
    .positive("That file is empty.")
    .max(10_485_760, "Keep it under 10MB."),
  /*
   * WHAT THE FILE SHOWS. Two hundred characters, and the label in the product
   * asks what it SHOWS rather than what the person thinks. That cap is where
   * an opinion would otherwise go, and the database carries the same one.
   */
  caption: z.string().trim().max(200, "Keep it under 200 characters.").optional(),
});

/** File one document or photograph against a held payment. */
export async function fileHeldPaymentDocument(input: {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf";
  sizeBytes: number;
  caption?: string;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(fileSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  return callGuarded(
    "escrow_file_evidence_as",
    (actorId) => ({
      p_actor: actorId,
      p_escrow: parsed.data.id,
      p_kind: "file",
      p_storage_path: parsed.data.storagePath,
      p_file_name: parsed.data.fileName,
      p_mime_type: parsed.data.mimeType,
      p_size_bytes: parsed.data.sizeBytes,
      p_caption: parsed.data.caption ?? null,
    }),
    { limited: false },
  );
}
