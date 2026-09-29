"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { parseNairaToKobo } from "../money/amount";
import { adminRefusal, requireAdmin } from "./guard";

/**
 * THE CAUTION RULINGS. V-36.
 *
 * A person at Vallo rules on the RECORD, never on money Vallo holds: how much
 * of a disputed deduction stands, and whether a contested return arrived.
 * Both run as the reviewer through their own client, so the database checks
 * `staff_can(uid, 'guarantee')`, refuses a reviewer who is a party, writes the
 * audit line and tells both parties. A ruling is final and written once.
 */

const uuid = z.string().uuid("That is not an id we recognise.");

const RULING_WORDS: Record<string, string> = {
  forbidden: "Your account cannot rule on cautions.",
  not_found: "That record no longer exists. Refresh the desk.",
  own_tenancy: "You are a party to this tenancy, so somebody else has to rule on it.",
  not_disputed: "That deduction is not disputed any more. Refresh the desk.",
  not_contested: "That return is not contested any more. Refresh the desk.",
  bad_outcome: "Choose received or not received.",
  reason_required: "Say why in at least ten characters. Both parties read it.",
  already_ruled: "Somebody has already ruled on this. Refresh the desk.",
};

export async function ruleCautionDispute(input: {
  deductionId: string;
  allowedNaira: string;
  reason: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin("guarantee");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(
    z.object({ deductionId: uuid, allowedNaira: z.string().trim().max(30), reason: z.string().trim().min(10).max(1000) }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const allowed = parsed.data.allowedNaira === "0" ? 0 : parseNairaToKobo(parsed.data.allowedNaira);
  if (allowed === null || allowed < 0) return fail("Enter the amount that stands, in naira. Zero is allowed.");
  const { data, error } = await access.userClient.rpc("admin_rule_caution_dispute" as never, {
    p_deduction: parsed.data.deductionId,
    p_allowed_minor: allowed,
    p_reason: parsed.data.reason,
  } as never);
  if (error) return fail("That ruling could not be recorded. Nothing changed. Try again.");
  const answer = (data ?? {}) as Record<string, unknown>;
  const status = String(answer.status ?? "");
  if (status === "bad_amount") {
    return fail(`At most ₦${(Number(answer.max_minor ?? 0) / 100).toLocaleString("en-NG")} can stand: what the lister proposed.`);
  }
  if (status !== "ok") return fail(RULING_WORDS[status] ?? "That ruling could not be recorded.");
  revalidatePath("/admin/money");
  return ok(null);
}

export async function ruleCautionReturn(input: {
  returnId: string;
  outcome: "received" | "not_received";
  reason: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin("guarantee");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(
    z.object({ returnId: uuid, outcome: z.enum(["received", "not_received"]), reason: z.string().trim().min(10).max(1000) }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { data, error } = await access.userClient.rpc("admin_rule_caution_return" as never, {
    p_return: parsed.data.returnId,
    p_outcome: parsed.data.outcome,
    p_reason: parsed.data.reason,
  } as never);
  if (error) return fail("That ruling could not be recorded. Nothing changed. Try again.");
  const status = String((data as Record<string, unknown> | null)?.status ?? "");
  if (status !== "ok") return fail(RULING_WORDS[status] ?? "That ruling could not be recorded.");
  revalidatePath("/admin/money");
  return ok(null);
}
