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
 * That division is not ceremony. A rate change prices every future charge,
 * so the rule about who may do it lives in one place that a second code path
 * cannot route around, and this is not that place.
 */

const SERVICE_DOWN =
  "That could not be recorded just now. Nothing was changed. Please try again.";

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
