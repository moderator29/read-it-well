"use server";

/**
 * V-24. Support declines a guest's refund request from the money desk.
 *
 * One call to `decide_refund_request` on the operator's own session: the
 * function checks the admin role, needs a reason the guest will read, records
 * one decision per request (append-only) and tells the guest. A decided
 * request leaves the refund clock and is never alerted on. A refund itself is
 * still made through the existing desk, which already answers the clock.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { requireAdmin } from "../admin/guard";

const WORDS: Record<string, string> = {
  not_allowed: "Only the money desk can decide a refund request.",
  not_found: "That request is no longer there.",
  needs_reason: "Write the reason. The guest reads it.",
  already_decided: "That request has already been decided.",
};

export async function declineRefundRequest(input: {
  requestId: string;
  reason: string;
}): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({
      requestId: z.uuid("That request could not be identified."),
      reason: z.string().trim().min(3, "Write the reason. The guest reads it.").max(1000, "Keep it under 1,000 characters."),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(WORDS.not_allowed as string);
  try {
    const loose = access.supabase as unknown as SupabaseClient;
    const { data, error } = await loose.rpc("decide_refund_request", {
      p_request: parsed.data.requestId,
      p_decision: "declined",
      p_note: parsed.data.reason,
    });
    const status = !error && data && typeof data === "object" ? String((data as Record<string, unknown>).status) : null;
    if (status !== "ok") return fail(WORDS[status ?? ""] ?? "That did not go through. Nothing was changed.");
    revalidatePath("/admin/money");
    return ok(null);
  } catch {
    return fail("That did not go through. Nothing was changed.");
  }
}
