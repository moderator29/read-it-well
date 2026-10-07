"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { parseNairaToKobo } from "../money/amount";
import { adminRefusal, requireAdmin } from "./guard";

/**
 * THE ADMIN GATE BETWEEN AGREEMENT AND PAYMENT, AND THE GUARANTEE DECISIONS.
 *
 * Every call runs as the signed-in reviewer through their own client, so the
 * database functions see `auth.uid()` and decide for themselves whether this
 * person may act (`private.staff_can`), refuse a reviewer who is a party to
 * the agreement, write the decision to `deal_agreement_events` and
 * `audit_log`, and tell both parties by notification and email. Nothing here
 * is the only check; it is the first one, so a person gets a sentence rather
 * than a status code.
 */

const uuid = z.string().uuid("That is not an id we recognise.");

const AGREEMENT_WORDS: Record<string, string> = {
  forbidden: "Your account cannot review agreements.",
  bad_decision: "Choose approve or reject.",
  reason_required: "Say why in at least ten characters. Both parties read it.",
  reason_too_long: "Keep the reason under 1,000 characters.",
  not_found: "That agreement no longer exists.",
  not_in_review: "That agreement is no longer waiting for review. Refresh the queue.",
  own_agreement: "You are a party to this agreement, so somebody else has to review it.",
};

export async function decideAgreement(input: {
  agreementId: string;
  decision: "approve" | "reject";
  reason?: string;
}): Promise<ActionResult<{ status: string }>> {
  const access = await requireAdmin("agreements");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(
    z.object({
      agreementId: uuid,
      decision: z.enum(["approve", "reject"]),
      reason: z.string().trim().max(1000, "Keep the reason under 1,000 characters.").optional(),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { data, error } = await access.userClient.rpc("admin_decide_agreement" as never, {
    p_agreement: parsed.data.agreementId,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason ?? null,
  } as never);
  if (error) return fail("That decision could not be recorded. Nothing changed. Try again.");
  const status = String((data as Record<string, unknown> | null)?.status ?? "");
  if (status !== "ok") return fail(AGREEMENT_WORDS[status] ?? "That decision could not be recorded.");
  revalidatePath("/admin/agreements");
  return ok({ status: String((data as Record<string, unknown>).agreement_status ?? "") });
}

/* D68d: Vallo reviews during the hold and can pause a release while it looks. */
const PAUSE_WORDS: Record<string, string> = {
  forbidden: "Your account cannot pause releases.",
  reason_required: "Say why in at least ten characters.",
  not_found: "That payment no longer exists.",
  final: "That payment is already settled; there is nothing to pause.",
};

export async function pauseRelease(input: { arrangementId: string; reason: string }): Promise<ActionResult<null>> {
  const access = await requireAdmin("agreements");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(z.object({ arrangementId: uuid, reason: z.string().trim().min(10, PAUSE_WORDS.reason_required!).max(1000) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { data, error } = await access.userClient.rpc("admin_pause_release" as never, {
    p_arrangement: parsed.data.arrangementId,
    p_reason: parsed.data.reason,
  } as never);
  if (error) return fail("The pause could not be recorded. Nothing changed. Try again.");
  const status = String((data as Record<string, unknown> | null)?.status ?? "");
  if (status !== "ok") return fail(PAUSE_WORDS[status] ?? "The pause could not be recorded.");
  revalidatePath("/admin/agreements");
  return ok(null);
}

export async function resumeRelease(input: { arrangementId: string }): Promise<ActionResult<null>> {
  const access = await requireAdmin("agreements");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(z.object({ arrangementId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { data, error } = await access.userClient.rpc("admin_resume_release" as never, {
    p_arrangement: parsed.data.arrangementId,
  } as never);
  if (error) return fail("The release could not be resumed. Nothing changed. Try again.");
  const status = String((data as Record<string, unknown> | null)?.status ?? "");
  if (status !== "ok") return fail(PAUSE_WORDS[status] ?? "The release could not be resumed.");
  revalidatePath("/admin/agreements");
  return ok(null);
}

const CLAIM_WORDS: Record<string, string> = {
  forbidden: "Your account cannot decide Guarantee claims.",
  reason_required: "Say why in at least ten characters. The claimant reads it.",
  not_found: "That claim no longer exists.",
  already_decided: "That claim was already decided. Refresh.",
  own_claim: "You are a party to this agreement, so somebody else has to decide the claim.",
  bad_amount: "Enter the amount to pay from the Guarantee.",
  reference_required: "Enter the bank transfer reference for this payout.",
  not_approved: "Only an approved claim can be marked paid.",
};

export async function decideClaim(input: {
  claimId: string;
  decision: "approve" | "reject";
  amountNaira?: string;
  reason?: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin("guarantee");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(
    z.object({
      claimId: uuid,
      decision: z.enum(["approve", "reject"]),
      amountNaira: z.string().trim().max(30).optional(),
      reason: z.string().trim().max(1000).optional(),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  let amount: number | null = null;
  if (parsed.data.decision === "approve") {
    amount = parseNairaToKobo(parsed.data.amountNaira ?? "");
    if (amount === null || amount <= 0) return fail(CLAIM_WORDS.bad_amount!, { amountNaira: CLAIM_WORDS.bad_amount! });
  }
  const { data, error } = await access.userClient.rpc("admin_decide_guarantee_claim" as never, {
    p_claim: parsed.data.claimId,
    p_decision: parsed.data.decision,
    p_amount_minor: amount,
    p_reason: parsed.data.reason ?? null,
  } as never);
  if (error) return fail("That decision could not be recorded. Nothing changed. Try again.");
  const answer = (data ?? {}) as Record<string, unknown>;
  const status = String(answer.status ?? "");
  if (status === "over_cap") {
    const naira = (minor: unknown) => `₦${(Number(minor ?? 0) / 100).toLocaleString("en-NG")}`;
    return fail(
      `At most ${naira(answer.cap_minor)} can be paid on this claim: the claim asked ${naira(answer.requested_minor)}, the booking has ${naira(answer.booking_left_minor)} left to claim against, and the Guarantee reserve holds ${naira(answer.reserve_minor)}.`,
    );
  }
  if (status !== "ok") return fail(CLAIM_WORDS[status] ?? "That decision could not be recorded.");
  revalidatePath("/admin/money");
  return ok(null);
}

export async function markClaimPaid(input: { claimId: string; reference: string }): Promise<ActionResult<null>> {
  const access = await requireAdmin("guarantee");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(z.object({ claimId: uuid, reference: z.string().trim().min(4).max(100) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { data, error } = await access.userClient.rpc("admin_mark_guarantee_claim_paid" as never, {
    p_claim: parsed.data.claimId,
    p_bank_reference: parsed.data.reference,
  } as never);
  if (error) return fail("That could not be recorded. Nothing changed. Try again.");
  const status = String((data as Record<string, unknown> | null)?.status ?? "");
  if (status !== "ok") return fail(CLAIM_WORDS[status] ?? "That could not be recorded.");
  revalidatePath("/admin/money");
  return ok(null);
}
