"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { requireAdmin, ADMIN_FORBIDDEN_MESSAGE } from "./guard";

/**
 * The three decisions the money console can take.
 *
 * All three are RPC calls into functions that do their own authorisation from
 * auth.uid(), which means this file cannot grant anybody anything. It resolves
 * the session, shapes the input, translates a machine status into a sentence a
 * person can act on, and refreshes the page. The database decides.
 *
 * That division is not ceremony. Resolving an escrow moves real money and sets
 * a state that can never be reversed, so the rule about who may do it lives in
 * one place that a second code path cannot route around, and this is not that
 * place.
 */

const SERVICE_DOWN =
  "That could not be recorded just now. Nothing was changed. Please try again.";

/* ------------------------------------------------------------ escrow ruling */

const resolveEscrowSchema = z.object({
  escrowId: z.string().trim().uuid("We could not identify that escrow."),
  direction: z.enum(["release", "refund"]),
  /*
   * The reason, and it is long on purpose.
   *
   * Eight characters would let "ok" through with padding. Twenty forces a
   * sentence, and a sentence is what the two parties are sent verbatim as a
   * notification. Somebody's deposit has just been given to the other side and
   * "resolved" is not an explanation anybody can accept.
   */
  note: z
    .string()
    .trim()
    .min(20, "Say what you decided and why. Both people are sent this, word for word.")
    .max(1000, "Keep the ruling under 1000 characters."),
});

/**
 * The ruling on a disputed escrow.
 *
 * public.escrow_admin_resolve refuses anything that is not DISPUTED, refuses a
 * caller who is not a super admin (ESC-07) and a super admin who is a party
 * to the escrow, requires the reason again at its own boundary, and records
 * every ruling in public.escrow_rulings, audited. At or above N500,000 the
 * first super admin's ruling is a proposal; a second super admin applies it
 * by ruling the same way. Everything this function adds is wording.
 */
export type EscrowRulingOutcome = {
  outcome: "applied" | "awaiting_second_approval";
  message: string;
};

const AWAITING_SECOND_APPROVAL =
  "Recorded as a proposal. At this amount a second super admin has to rule the same way before any money moves.";

export async function resolveEscrow(input: {
  escrowId: string;
  direction: "release" | "refund";
  note: string;
}): Promise<ActionResult<EscrowRulingOutcome>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(ADMIN_FORBIDDEN_MESSAGE);

  const parsed = validate(resolveEscrowSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const { data, error } = await access.supabase.rpc("escrow_admin_resolve", {
      p_escrow: parsed.data.escrowId,
      p_direction: parsed.data.direction,
      p_note: parsed.data.note,
    });
    if (error) return fail(SERVICE_DOWN);

    const status = readStatus(data);
    if (status === "ok") {
      revalidatePath("/admin/escrow");
      return ok({ outcome: "applied", message: "The ruling is applied and both people have been told." });
    }
    if (status === "awaiting_second_approval") {
      revalidatePath("/admin/escrow");
      return ok({ outcome: "awaiting_second_approval", message: AWAITING_SECOND_APPROVAL });
    }
    return fail(rulingRefusal(status));
  } catch {
    return fail(SERVICE_DOWN);
  }
}

/** The sentence for each way the database refuses a ruling or a reversal. */
function rulingRefusal(status: string): string {
  switch (status) {
    case "forbidden":
      return "Only a super admin can rule on a held payment, or reverse a ruling.";
    case "conflicted":
      return "You are one of the two people in this escrow, so you cannot rule on it. Ask another super admin.";
    case "conflicting_proposal":
      return "Another super admin has proposed the opposite ruling. Talk it through; nothing moves until two of you agree.";
    case "needs_a_different_super_admin":
      return "A ruling is reversed by a super admin who neither proposed nor approved it.";
    case "shortfall":
      return "The person this ruling paid no longer has that much in their balance, so it cannot be reversed yet. Nothing was changed.";
    case "not_disputed":
      return "This escrow is not in dispute any more. Reload the page to see where it stands.";
    case "not_resolved":
    case "not_applied":
      return "That ruling is no longer in force. Reload the page to see where it stands.";
    case "already_settled":
      return "This escrow has already been settled. Reload the page to see what happened.";
    case "not_found":
      return "That escrow is no longer here. Reload the page.";
    /* ESC-01. The database refuses to rule on an agreement whose money was
       never taken, and refuses a release (a refund to the payer still goes
       through) while the float is short. */
    case "never_funded":
      return "No money was ever taken for this agreement, so there is nothing to release or refund. Nothing was changed.";
    case "float_out_of_balance":
      return "Held money does not reconcile right now: the ledger holds less than the open agreements promise. A release waits until reconciliation has been checked; a refund to the payer can still be made. Nothing was changed.";
    default:
      return SERVICE_DOWN;
  }
}

const reverseRulingSchema = z.object({
  rulingId: z.string().trim().uuid("We could not identify that ruling."),
  note: z
    .string()
    .trim()
    .min(20, "Say why the ruling is being reversed. Both people are sent this, word for word.")
    .max(1000, "Keep the reason under 1000 characters."),
});

/**
 * ESC-07. Reversing an applied ruling: a super admin who neither proposed nor
 * approved it. The database marks the settlement credit reversed (refusing if
 * that would overdraw the person it paid), removes any commission, and puts
 * the escrow back in dispute to be ruled on again.
 */
export async function reverseEscrowRuling(input: {
  rulingId: string;
  note: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(ADMIN_FORBIDDEN_MESSAGE);

  const parsed = validate(reverseRulingSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const { data, error } = await access.supabase.rpc("escrow_reverse_ruling", {
      p_ruling: parsed.data.rulingId,
      p_note: parsed.data.note,
    });
    if (error) return fail(SERVICE_DOWN);
    const status = readStatus(data);
    if (status === "ok") {
      revalidatePath("/admin/escrow");
      return ok(null);
    }
    return fail(rulingRefusal(status));
  } catch {
    return fail(SERVICE_DOWN);
  }
}

/* --------------------------------------------------------------- fee rates */

/** MON-P2-01. The highest rate fee_rates and private.set_fee_rate accept. */
const FEE_RATE_CEILING_BPS = 2000;

const setFeeRateSchema = z.object({
  kind: z.enum(["commission", "listing_fee"]),
  /*
   * Basis points, typed as a percentage by the operator and converted at the
   * edge of the form rather than here. MON-P2-01: the database refuses more
   * than 2000 (20 percent), and so does this.
   */
  basisPoints: z
    .number()
    .int("Enter the rate in basis points, a whole number.")
    .min(0, "A rate cannot be negative.")
    .max(FEE_RATE_CEILING_BPS, "A rate cannot be more than 20 percent."),
  flatMinor: z
    .number()
    .int("Enter the flat amount in kobo, a whole number.")
    .min(0, "A flat amount cannot be negative."),
  /** ISO instant. Now or later; the database refuses the past. */
  effectiveFrom: z.string().trim().min(1, "Say when this starts."),
  note: z
    .string()
    .trim()
    .min(8, "Say why the rate is changing. This goes on the record.")
    .max(500, "Keep the reason under 500 characters."),
});

export async function setFeeRate(input: {
  kind: "commission" | "listing_fee";
  basisPoints: number;
  flatMinor: number;
  effectiveFrom: string;
  note: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(ADMIN_FORBIDDEN_MESSAGE);

  const parsed = validate(setFeeRateSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    /*
     * NO acting_admin ARGUMENT. Same defect and same reason as the one written
     * out in lib/admin/kyc-actions.ts: migration 20260809054243 gave the public
     * wrapper one argument fewer so the actor comes from auth.uid() and cannot
     * be named by the caller, and this call site was never updated. Every call
     * resolved nothing and this action answered "service down".
     */
    const { data, error } = await access.supabase.rpc("set_fee_rate", {
      p_kind: parsed.data.kind,
      p_basis_points: parsed.data.basisPoints,
      p_flat_minor: parsed.data.flatMinor,
      p_effective_from: parsed.data.effectiveFrom,
      p_note: parsed.data.note,
    });
    if (error) return fail(SERVICE_DOWN);

    const status = readStatus(data);
    if (status === "ok") {
      revalidatePath("/admin/fees");
      return ok(null);
    }
    if (status === "cannot_backdate") {
      return fail(
        "A rate cannot start in the past. Everything charged before now was charged at the old rate and has to stay explainable.",
        { effectiveFrom: "Choose now or a date ahead." },
      );
    }
    if (status === "duplicate") {
      return fail("There is already a rate starting at exactly that moment. Move it by a minute.", {
        effectiveFrom: "Another rate already starts here.",
      });
    }
    if (status === "needs_a_reason") {
      return fail("Say why the rate is changing.", { note: "This goes on the record." });
    }
    if (status === "raise_needs_super_admin") {
      return fail(
        "Only a super admin can raise a rate or a flat fee. Lowering one is open to any admin.",
        { basisPoints: "Above the rate in force when this starts." },
      );
    }
    if (status === "bad_rate") {
      return fail("A rate cannot be more than 20 percent.", { basisPoints: "At most 2000 basis points." });
    }
    if (status === "forbidden") return fail(ADMIN_FORBIDDEN_MESSAGE);
    return fail(SERVICE_DOWN);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

/* -------------------------------------------------------------------- shared */

/**
 * The status out of a money function's jsonb envelope.
 *
 * Every one of them answers `{ status: "..." }` and the callers above switch on
 * it. Anything unreadable becomes the empty string, which falls through every
 * branch to the generic refusal rather than being silently treated as success.
 */
function readStatus(data: unknown): string {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const status = (data as Record<string, unknown>)["status"];
    if (typeof status === "string") return status;
  }
  return "";
}
