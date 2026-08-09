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
 * The admin override on a disputed escrow.
 *
 * public.escrow_admin_resolve refuses anything that is not DISPUTED, refuses a
 * caller who is not staff, requires the reason again at its own boundary, and
 * writes the transition to audit_log through the table's trigger. Everything
 * this function adds is wording.
 */
export async function resolveEscrow(input: {
  escrowId: string;
  direction: "release" | "refund";
  note: string;
}): Promise<ActionResult<null>> {
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
      return ok(null);
    }
    if (status === "not_disputed") {
      return fail(
        "This escrow is not in dispute any more. Reload the page to see where it stands.",
      );
    }
    if (status === "already_settled") {
      return fail("This escrow has already been settled. Reload the page to see what happened.");
    }
    if (status === "not_found") {
      return fail("That escrow is no longer here. Reload the page.");
    }
    if (status === "forbidden") return fail(ADMIN_FORBIDDEN_MESSAGE);
    return fail(SERVICE_DOWN);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

/* --------------------------------------------------------------- fee rates */

const setFeeRateSchema = z.object({
  kind: z.enum(["commission", "listing_fee"]),
  /*
   * Basis points, typed as a percentage by the operator and converted at the
   * edge of the form rather than here. 10000 is a hundred percent and is
   * allowed by the constraint, because a platform taking the whole of
   * something is a coherent thing to express even if nobody should.
   */
  basisPoints: z
    .number()
    .int("Enter the rate in basis points, a whole number.")
    .min(0, "A rate cannot be negative.")
    .max(10000, "A rate cannot be more than 100 percent."),
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
    const { data, error } = await access.supabase.rpc("set_fee_rate", {
      acting_admin: access.user.id,
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
