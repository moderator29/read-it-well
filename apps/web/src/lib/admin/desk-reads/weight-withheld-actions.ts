"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../../actions/envelope";
import { ADMIN_FORBIDDEN_MESSAGE, adminRefusal, requireAdmin } from "../guard";

/**
 * V-58: CLEARING ONE WITHHELD-WEIGHT STAMP.
 *
 * `public.clear_weight_withheld(kind, subject, note)` is the only door: it
 * decides on `auth.uid()` (admin or super admin), refuses a note under three
 * characters, deletes the stamp, refreshes the listing's catalogue rating when
 * the stamp was a review's, and writes `weight_withheld.cleared` to the audit
 * log in the same transaction. So it is called on the operator's OWN client,
 * and this file adds no second writer. The console asks for twelve characters,
 * because the next person reads the note.
 */
const clearSchema = z.object({
  kind: z.enum(["review", "report", "truth", "tenancy"]),
  subject: z.string().trim().uuid("We could not identify that record."),
  note: z.string().trim().min(12, "Say why in at least 12 characters, so the next person knows.").max(400),
});

const REFUSALS: Record<string, string> = {
  forbidden: "Only an admin can clear a stamp. Nothing was changed.",
  no_note: "Write the reason first. Nothing was changed.",
  not_found: "That stamp is already gone. Refresh to see the current list.",
  invalid: "That kind of stamp cannot be cleared here. Nothing was changed.",
};
const FAILED = "The stamp could not be cleared just now. Nothing was changed. Please try again.";

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
};

export async function clearWeightWithheld(input: unknown): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin" || access.isStaff) {
    return fail(access.state === "admin" ? ADMIN_FORBIDDEN_MESSAGE : adminRefusal(access));
  }
  const parsed = validate(clearSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const { data, error } = await (access.userClient as unknown as Rpc).rpc("clear_weight_withheld", {
      p_kind: parsed.data.kind,
      p_subject: parsed.data.subject,
      p_note: parsed.data.note,
    });
    if (error) return fail(FAILED);
    if (data === "cleared") {
      revalidatePath("/admin/weight-withheld");
      return ok(null);
    }
    return fail(typeof data === "string" ? (REFUSALS[data] ?? FAILED) : FAILED);
  } catch {
    return fail(FAILED);
  }
}
