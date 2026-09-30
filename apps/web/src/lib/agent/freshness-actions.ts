"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { isNotInstalled } from "../admin/support-queue";

/**
 * C5: "Still available", for one listing or many, in one call. The database
 * function (`lister_confirm_available`) confirms only the caller's OWN live
 * listings and ignores anything else in the list, so a stray id cannot touch
 * somebody else's listing. It writes the lister's confirmation, never the
 * owner's.
 */
export async function confirmListingsAvailable(input: { listingIds: string[] }): Promise<ActionResult<{ confirmed: number }>> {
  const parsed = validate(z.object({ listingIds: z.array(z.string().uuid()).min(1).max(200) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const { data, error } = await session.supabase.rpc("lister_confirm_available" as never, {
    p_listings: parsed.data.listingIds,
  } as never);
  if (error) {
    return fail(
      isNotInstalled(error)
        ? "Confirming availability is not switched on yet. Nothing changed."
        : "That did not go through. Nothing changed. Try again.",
    );
  }
  revalidatePath("/agent/listings");
  revalidatePath("/agent/dashboard");
  return ok({ confirmed: Number(data) || 0 });
}
