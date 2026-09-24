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
 *
 * THERE IS ONE WAY TO OPEN AN AGREEMENT AND IT IS THE PROPOSAL, 23 SEPTEMBER.
 * `openHeldPayment` used to sit here: it opened a row and funded it in ONE
 * call, so there was no row to derive a funding reference from and it minted a
 * fresh uuid per attempt. That breaks research 5.3, which is absolute: the
 * idempotency key is derived from the escrow row, never freshly generated,
 * because a client that retries by calling the action again would open a
 * SECOND agreement and hold a second amount. It is gone, its database door is
 * revoked from `service_role`, and nothing in this module can reach it. The
 * surviving path is propose (no money) then fund what exists (reference
 * derived inside the database), which is ADR-E1 section 4 departure 2 closed.
 */

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { guardMoney } from "../security/money-limits";
import { moneyLockRefusalFor } from "../security/money-lock-guard";
import { getAdminClient } from "../wallet/ledger";
import { callMoneyRpc, readMoneyStatus } from "../wallet/rpc";
import {
  ESCROW_FACT_VALUES,
  EVIDENCE_BUCKET,
  EVIDENCE_CAPTION_MAX,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME_TYPES,
  OPEN_PURPOSES,
  PURPOSE_REFUSAL,
  factNeeds,
  type EscrowFact,
  type EvidenceMimeType,
} from "./copy";
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
  not_fundable:
    "That is no longer waiting to be set aside, so nothing was moved. Open it and see where it stands.",
  already_open:
    "There is already an open agreement in this conversation. Settle or withdraw that one first.",
  /*
   * THE EXAMPLE CATALOGUE, SAID PLAINLY. Every conversation on the platform
   * today is about an example property, so this is the sentence the first
   * person to open the composer actually reads. It names the reason rather
   * than apologising, because the property genuinely is not real.
   */
  demo_listing:
    "This property is an example of what the catalogue will hold, so nothing can be arranged against it.",
};

function refusalFor(status: string): string {
  return REFUSALS[status] ?? SERVICE_DOWN;
}

/**
 * The one shape every door shares: session, schema, limit, service client, call.
 *
 * Kept private so no export can reach a database function without walking all
 * five steps. `guardMoney` is applied to the doors that open or fund an
 * agreement, because those are the ones that commit an amount or promise to;
 * the rest change a state a party is already a party to, and they are reached
 * through the same session check.
 */
async function callGuarded(
  fn:
    | "escrow_confirm_as"
    | "escrow_request_release_as"
    | "escrow_raise_dispute_as"
    | "escrow_cancel_as"
    | "escrow_file_evidence_as"
    | "escrow_propose_as"
    | "escrow_fund_proposal_as",
  args: (actorId: string) => Record<string, unknown>,
  /*
   * NO `reference` OPTION, DELIBERATELY. It existed for one caller,
   * `openHeldPayment`, which minted a fresh uuid per attempt because there was
   * no row to derive one from. Every surviving door either moves nothing or
   * funds a row that already exists, and the surviving funding door derives
   * `rm-esc-<escrow uuid>-hold` INSIDE the database. Leaving the option here
   * would leave the shape that lets a caller-chosen key back in.
   */
  options: { limited: boolean; amountMinor?: number },
): Promise<ActionResult<HeldPaymentOutcome>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (options.limited) {
    const limit = await guardMoney("holdMoney", session.user.id);
    if (!limit.allowed) return fail(limit.message);
  }

  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  const call = await callMoneyRpc(admin, "escrow", fn, args(session.user.id), {
    reference: null,
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

/** Say, as one of the two parties, that this is settled. */
export async function confirmHeldPayment(input: {
  id: string;
  /** V-81: a fresh proof for exactly this, when the person locked money with a phone. */
  stepUp?: string;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(idSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  /* V-81: confirming releases held money, so an enrolled phone lock asks first. */
  const lockSession = await resolveSession();
  if (lockSession.state === "signed-in") {
    const lock = await moneyLockRefusalFor(lockSession.user.id, input.stepUp, { kind: "escrow_confirm", target: parsed.data.id });
    if (lock) return fail(lock);
  }
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

/*
 * THE THIRTEEN FACTS COME FROM `copy.ts` AND ARE NOT RETYPED HERE.
 *
 * They used to be a second copy of the list, which meant the enum in the
 * database, the array in this file and the sentence map in `EvidenceList.tsx`
 * were three statements of one closed set that nothing kept in step. The list
 * and the shape rule now live once, beside the sentences they produce.
 */
const FACTS = ESCROW_FACT_VALUES as readonly [EscrowFact, ...EscrowFact[]];

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
  fact: EscrowFact;
  happenedOn?: string | null;
  amountMinor?: number | null;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(factSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const needs = factNeeds(parsed.data.fact);
  if (needs === "date" && !parsed.data.happenedOn) {
    return fail("Say which day that was.", { happenedOn: "Say which day that was." });
  }
  if (needs === "amount" && !parsed.data.amountMinor) {
    return fail("Say how much was agreed.", { amountMinor: "Say how much was agreed." });
  }

  return callGuarded(
    "escrow_file_evidence_as",
    (actorId) => ({
      p_actor: actorId,
      p_escrow: parsed.data.id,
      p_kind: "fact",
      p_fact: parsed.data.fact,
      p_happened_on: needs === "date" ? parsed.data.happenedOn : null,
      p_amount_minor: needs === "amount" ? parsed.data.amountMinor : null,
    }),
    { limited: false },
  );
}

const fileSchema = idSchema.extend({
  storagePath: z.string().trim().min(1, "That file did not finish uploading."),
  fileName: z.string().trim().min(1, "That file has no name.").max(200, "That name is too long."),
  mimeType: z.enum(EVIDENCE_MIME_TYPES, { message: "Attach a photograph or a PDF." }),
  sizeBytes: z
    .number()
    .int()
    .positive("That file is empty.")
    .max(EVIDENCE_MAX_BYTES, "Keep it under 10MB."),
  /*
   * WHAT THE FILE SHOWS. Two hundred characters, and the label in the product
   * asks what it SHOWS rather than what the person thinks. That cap is where
   * an opinion would otherwise go, and the database carries the same one.
   */
  caption: z
    .string()
    .trim()
    .max(EVIDENCE_CAPTION_MAX, "Keep it under 200 characters.")
    .optional(),
});

/**
 * File one document or photograph against a held payment.
 *
 * THE PATH IS CHECKED HERE AS WELL AS IN THE STORAGE POLICY, and the two
 * checks are not the same check. The policy decides whether the BYTES may be
 * written; this decides whether the ROW may point at them. Without it a party
 * could upload one file legitimately and then file a row naming the other
 * party's object, or an object under a different agreement entirely, and the
 * evidence list would render somebody else's photograph as theirs. The path is
 * built by `evidenceObjectPath` in exactly one place and re-derived here in
 * prefix form rather than trusted.
 *
 * A REFUSED ROW TAKES ITS BYTES WITH IT. The upload happens first, because
 * there is no row to point at until there is a file; so a refusal leaves an
 * object in a private bucket that nothing will ever read. It is removed here,
 * as the service role, and only when it is this caller's own folder on this
 * agreement AND no evidence row anywhere points at it. Both conditions matter:
 * the first means a party can never reach the other party's uploads, the
 * second means an object that was accepted by an earlier call cannot be
 * deleted by a later one that failed.
 */
export async function fileHeldPaymentDocument(input: {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: EvidenceMimeType;
  sizeBytes: number;
  caption?: string;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(fileSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const prefix = `${parsed.data.id}/${session.user.id}/`;
  if (!parsed.data.storagePath.startsWith(prefix)) {
    return fail("That file was not one you uploaded, so nothing was filed.");
  }

  const outcome = await callGuarded(
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

  if (!outcome.ok) await sweepUnfiledObject(parsed.data.storagePath);
  return outcome;
}

/**
 * Remove an uploaded object that no evidence row points at.
 *
 * Failing quietly is correct here and is not the usual excuse for it. The
 * person has already been told their file was not filed, which is the fact
 * they need; a second sentence about a bucket they have never heard of would
 * be noise, and a tidy-up that fails leaves one unreferenced object rather
 * than anything a reader can see.
 */
async function sweepUnfiledObject(storagePath: string): Promise<void> {
  try {
    const admin = getAdminClient();
    if (!admin) return;
    /*
     * `escrow_evidence` is not in the generated database types yet, and
     * regenerating them is another session's file today. One narrow shim,
     * typed to exactly the call it makes, the same way `queries.ts` does it,
     * and deliberately ugly so it is removed rather than copied.
     */
    const rows = admin as unknown as {
      from(table: string): {
        select(columns: string): {
          eq(
            column: string,
            value: string,
          ): {
            limit(n: number): PromiseLike<{ data: unknown[] | null; error: unknown }>;
          };
        };
      };
    };
    const { data, error } = await rows
      .from("escrow_evidence")
      .select("id")
      .eq("storage_path", storagePath)
      .limit(1);
    if (error || (data ?? []).length > 0) return;
    await admin.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
  } catch {
    /* One unreferenced object is a smaller problem than a thrown action. */
  }
}

const proposeSchema = z.object({
  conversationId: z.uuid("That conversation is not one we can act on."),
  counterpartyId: z.uuid("That is not somebody we can act on."),
  purpose: z.enum(["agency_fee"], { message: "Say what this payment is for." }),
  amountMinor: z
    .number()
    .int("Amounts are whole kobo.")
    .positive("That amount is not one we can move."),
  /** True when the person proposing is the one who would pay. */
  iPay: z.boolean(),
});

/**
 * PROPOSE A HELD PAYMENT INSIDE THE THREAD THE TWO PEOPLE ARE ALREADY IN.
 *
 * THIS IS THE ENTRY POINT AND IT MOVES NO MONEY. It writes one row in
 * INITIATED. Nothing leaves anybody's balance, and the sentence the other
 * person reads says so before it says anything else. The funding is a separate
 * deliberate act by the payer, through `fundHeldPaymentProposal` below, which
 * is the shape 4.3 of the research file asks for: propose, accept, then pay.
 *
 * WHY THE CONVERSATION IS AN ARGUMENT AND THE LISTING IS NOT. The database
 * reads the listing off the conversation row. A caller who could name a
 * listing could print a property they have no relationship with onto an
 * agreement, and the person reading it would have no way to tell.
 *
 * THE KILL SWITCH GUARDS IT, even though no naira moves. A proposal is a
 * promise about what this platform will do next, and a platform that cannot
 * currently hold money should not be making it. It fails closed, on a missing
 * row as on a failed read.
 *
 * RATE LIMITED AS A MONEY PATH. Proposals are the pressure surface: fifty of
 * them is harassment rather than negotiation. The database refuses a second
 * open agreement per thread and the limiter refuses a burst across threads.
 */
export async function proposeHeldPayment(input: {
  conversationId: string;
  counterpartyId: string;
  purpose: "agency_fee";
  amountMinor: number;
  iPay: boolean;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(proposeSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  if (!(await heldPaymentsAreOpen())) return fail(HELD_PAYMENTS_CLOSED_MESSAGE);

  if (!OPEN_PURPOSES.includes(parsed.data.purpose)) {
    return fail(
      PURPOSE_REFUSAL[parsed.data.purpose as keyof typeof PURPOSE_REFUSAL] ??
        "That is not something we can set aside.",
    );
  }

  return callGuarded(
    "escrow_propose_as",
    (actorId) => ({
      p_actor: actorId,
      p_conversation: parsed.data.conversationId,
      p_counterparty: parsed.data.counterpartyId,
      p_purpose: parsed.data.purpose,
      p_amount_minor: parsed.data.amountMinor,
      p_actor_pays: parsed.data.iPay,
    }),
    { limited: true, amountMinor: parsed.data.amountMinor },
  );
}

/**
 * Accept a proposal by funding it. Only the payer can, and the database says so.
 *
 * NO REFERENCE IS PASSED, AND THAT IS THE POINT. The agreement already exists,
 * so `references.ts` applies exactly: the key is `rm-esc-<escrow uuid>-hold`,
 * derived inside the database from the row itself. A retry after a dropped
 * connection computes the identical string, collides with the unique index on
 * `wallet_entries.reference`, and moves nothing. There is nothing for a caller
 * to choose and therefore nothing for a caller to get wrong.
 *
 * THE HOLD WINDOW IS CLAMPED HERE AND CLAMPED AGAIN IN THE DATABASE, to the
 * same floor and the same ceiling, so a value this accepts is never silently
 * changed and a value it refuses never arrives.
 */
export async function fundHeldPaymentProposal(input: {
  id: string;
  holdDays?: number;
  /** V-81: a fresh proof for exactly this, when the person locked money with a phone. */
  stepUp?: string;
}): Promise<ActionResult<HeldPaymentOutcome>> {
  const parsed = validate(idSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  /* V-81: funding moves money out of the wallet, so an enrolled phone lock asks first. */
  const lockSession = await resolveSession();
  if (lockSession.state === "signed-in") {
    const lock = await moneyLockRefusalFor(lockSession.user.id, input.stepUp, { kind: "escrow_fund", target: parsed.data.id });
    if (lock) return fail(lock);
  }

  if (!(await heldPaymentsAreOpen())) return fail(HELD_PAYMENTS_CLOSED_MESSAGE);

  return callGuarded(
    "escrow_fund_proposal_as",
    (actorId) => ({
      p_actor: actorId,
      p_escrow: parsed.data.id,
      p_hold_days: clampHoldDays(input.holdDays),
    }),
    { limited: true },
  );
}
