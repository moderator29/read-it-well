"use server";

/**
 * V-55. The tenant mints or stops a receipt code for their own tenancy.
 *
 * Both are one call to a definer door on the tenant's own session:
 * `create_receipt_code` refuses anybody but the tenant and an unpaid charge,
 * and hands back the existing live code rather than minting a second;
 * `revoke_receipt_code` stops a code at once, after which it answers exactly
 * as a code that never existed.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";

const FAILED = "That did not go through. Nothing was changed.";

export async function createReceiptCode(input: { tenancyId: string }): Promise<ActionResult<{ code: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const parsed = validate(z.object({ tenancyId: z.uuid() }), input);
  if (!parsed.ok) return fail(parsed.error);
  try {
    const loose = session.supabase as unknown as SupabaseClient;
    const { data, error } = await loose.rpc("create_receipt_code", { p_rent_payment: parsed.data.tenancyId });
    const answer = (data ?? {}) as Record<string, unknown>;
    if (error) return fail(FAILED);
    if (answer.status === "not_paid") return fail("A receipt code can be made once the move-in payment has settled.");
    if (answer.status !== "ok" || typeof answer.code !== "string") return fail(FAILED);
    revalidatePath(`/tenancy/${parsed.data.tenancyId}`);
    return ok({ code: answer.code });
  } catch {
    return fail(FAILED);
  }
}

export async function revokeReceiptCode(input: { tenancyId: string; codeId: string }): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const parsed = validate(z.object({ tenancyId: z.uuid(), codeId: z.uuid() }), input);
  if (!parsed.ok) return fail(parsed.error);
  try {
    const loose = session.supabase as unknown as SupabaseClient;
    const { data, error } = await loose.rpc("revoke_receipt_code", { p_code_id: parsed.data.codeId });
    if (error || (data as Record<string, unknown> | null)?.status !== "ok") return fail(FAILED);
    revalidatePath(`/tenancy/${parsed.data.tenancyId}`);
    return ok(null);
  } catch {
    return fail(FAILED);
  }
}
