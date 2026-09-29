"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { phoneGateFor } from "../phone-otp/gate";
import { tenancyReviewRow, tenancyReviewSchema } from "./review";

/**
 * WRITING A TENANCY REVIEW (V-59). One insert under the tenant's own RLS;
 * the policy decides who and when, the fill trigger takes the listing and
 * the lister from the charge and weighs the review against the lister's
 * identity keys (V-58), and the alert trigger tells staff when two tenants
 * of one lister say they paid more at the door. It is a review, so V-50's
 * first-review phone gate applies to it too.
 */

type Untyped = { from(t: string): { insert(row: Record<string, unknown>): Promise<{ error: { code?: string } | null }> } };

export async function submitTenancyReview(input: unknown): Promise<ActionResult<{ recorded: true }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(tenancyReviewSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const phoneGate = await phoneGateFor(session.supabase, session.user.id, "review");
  if (phoneGate) return fail(phoneGate);

  const { error } = await (session.supabase as unknown as Untyped)
    .from("tenancy_reviews")
    .insert(tenancyReviewRow(parsed.data, session.user.id));
  if (error) {
    if (error.code === "23505") return fail("You have already reviewed this tenancy.");
    if (error.code === "42501") {
      return fail("The review opens a month after your move-in date, for the tenant on the rent charge. Come back then to write it.");
    }
    return fail("Your review did not send. Nothing was recorded. Try again.");
  }
  revalidatePath(`/rent/review/${parsed.data.paymentId}`);
  revalidatePath("/bookings");
  return ok({ recorded: true });
}
