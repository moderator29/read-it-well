"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { requireAdmin, ADMIN_FORBIDDEN_MESSAGE } from "./guard";

/**
 * Approve or reject one verification document.
 *
 * THE REASON IS REQUIRED AND THIS IS THE THIRD PLACE IT IS REQUIRED. The
 * database has a check constraint, private.review_kyc_document refuses without
 * one, and the schema below refuses without one. That is not belt and braces
 * for its own sake: a rejection with no reason is the single most common way a
 * verification flow becomes cruel. Somebody is told no, cannot tell what was
 * wrong, uploads the same photograph again, is told no again, and concludes the
 * platform is refusing them personally. Each of the three layers is bypassed by
 * a different kind of mistake, so all three stay.
 *
 * The minimum is 12 characters rather than a token 4, because "blurry" is a
 * complete and useful sentence in this context and "no" is not.
 */

const SERVICE_DOWN =
  "That decision could not be recorded just now. Nothing was changed. Please try again.";

const reviewSchema = z
  .object({
    documentId: z.string().trim().uuid("We could not identify that document."),
    approve: z.boolean(),
    reason: z.string().trim().max(500, "Keep the reason under 500 characters.").optional(),
  })
  .refine((value) => value.approve || (value.reason ?? "").length >= 12, {
    message: "Say what is wrong with it. The person is sent this, word for word.",
    path: ["reason"],
  });

export async function reviewKycDocument(input: {
  documentId: string;
  approve: boolean;
  reason?: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(ADMIN_FORBIDDEN_MESSAGE);

  const parsed = validate(reviewSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const { data, error } = await access.supabase.rpc("review_kyc_document", {
      acting_admin: access.user.id,
      p_document: parsed.data.documentId,
      p_approve: parsed.data.approve,
      /* An approval carries no reason, and the function's argument is not
         nullable in the generated types, so an empty string stands in. The
         database ignores it on the approve branch and the check constraint
         only bites on a rejection. */
      p_reason: parsed.data.reason ?? "",
    });
    if (error) return fail(SERVICE_DOWN);

    const status =
      data && typeof data === "object" && !Array.isArray(data)
        ? String((data as Record<string, unknown>)["status"] ?? "")
        : "";

    if (status === "ok") {
      revalidatePath("/admin/kyc");
      return ok(null);
    }
    if (status === "needs_a_reason") {
      return fail("Say what is wrong with it.", {
        reason: "The person is sent this, word for word.",
      });
    }
    if (status === "not_found") {
      return fail("That document is no longer here. Reload the page.");
    }
    if (status === "forbidden") return fail(ADMIN_FORBIDDEN_MESSAGE);
    return fail(SERVICE_DOWN);
  } catch {
    return fail(SERVICE_DOWN);
  }
}
