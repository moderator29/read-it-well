"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../../actions/envelope";
import { ADMIN_FORBIDDEN_MESSAGE, adminRefusal, requireAdmin } from "../guard";
import { RETENTION_PHRASE, parseDestroyAnswer } from "./retention";

/**
 * DESTROYING THE MONEY RECORDS THAT ARE PAST RETENTION.
 *
 * One door: `public.staff_destroy_expired_money_records(limit, confirm,
 * expected)` (pending migration ac01). It decides on `auth.uid()` (super admin,
 * finance scope), refuses unless the confirmation is exactly the phrase and
 * `expected` equals the number of accounts it is about to touch, runs the
 * existing `destroy_expired_money_records`, and audits with the caller. So this
 * is called on the operator's OWN client and adds no second writer. The phrase
 * is also checked here, so a wrong one never leaves the server.
 */
const schema = z.object({
  confirm: z.literal(RETENTION_PHRASE, { message: `Type ${RETENTION_PHRASE} exactly as written.` }),
  expected: z.number().int().min(1).max(500),
});

export type DestroyOutcome = { redacted: number } | { nothingDue: true };

const FAILED = "The records could not be destroyed just now. Nothing was changed. Please try again.";
const CHANGED = "The list changed while you were reading it. Nothing was destroyed. Review it again.";

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
};

export async function destroyExpiredMoneyRecords(input: unknown): Promise<ActionResult<DestroyOutcome>> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return fail(adminRefusal(access));
  if (!access.isSuperAdmin || access.isStaff) return fail(ADMIN_FORBIDDEN_MESSAGE);
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const { data, error } = await (access.userClient as unknown as Rpc).rpc("staff_destroy_expired_money_records", {
      p_limit: 500,
      p_confirm: parsed.data.confirm,
      p_expected: parsed.data.expected,
    });
    if (error) return fail(FAILED);
    const answer = parseDestroyAnswer(data);
    if (!answer) return fail(FAILED);
    switch (answer.status) {
      case "ok":
        revalidatePath("/admin/retention");
        return ok({ redacted: answer.redacted });
      case "nothing_due":
        revalidatePath("/admin/retention");
        return ok({ nothingDue: true });
      case "changed":
        revalidatePath("/admin/retention");
        return fail(CHANGED);
      case "confirm":
        return fail(`The confirmation did not match. Nothing was changed.`);
      default:
        return fail(ADMIN_FORBIDDEN_MESSAGE);
    }
  } catch {
    return fail(FAILED);
  }
}
