"use server";

/**
 * ADMIN REVIEW CALLS: THE SERVER ACTIONS.
 *
 * Staff side (request, reschedule, start, note, complete, cancel) and the
 * subject's side (list, respond). Every permission is decided in the
 * database under the caller's own session: the staff scope the case needs
 * (`kyc_review`, `listing_approval`, `support`), held now and proved with the
 * console's security key for this session (`private.staff_can`). There is no
 * "any staff can call any user": the subject is read from the case, never
 * typed in, and every step is written to `audit_log`.
 *
 * A review call verifies nothing by itself. It is a conversation whose
 * attendance and outcome are recorded; identity, ownership and licensing are
 * still decided by the existing verification workflows the case belongs to.
 *
 * Contract: docs/video-calling/VIDEO-CALLING-ADMIN-REVIEWS.md.
 */

import { after } from "next/server";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { pushDrain } from "../push/drain";
import { getAdminClient } from "../supabase/service";
import { wordsForToken } from "./errors";
import { snapshotFromRow } from "./lifecycle";
import { callProviderConfigured } from "./provider";
import { callRpc } from "./rpc";
import {
  addReviewEntrySchema,
  cancelReviewCallSchema,
  completeReviewCallSchema,
  requestReviewCallSchema,
  rescheduleReviewCallSchema,
  respondReviewCallSchema,
  reviewIdSchema,
} from "./schema";
import { staffReviewFromRow, subjectReviewFromRow } from "./reviews";
import type { CallSnapshot, StaffReview, SubjectReview } from "./types";

async function client() {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { ok: false as const, error: NOT_CONFIGURED_MESSAGE };
  if (session.state === "signed-out") return { ok: false as const, error: SIGNED_OUT_MESSAGE };
  return { ok: true as const, supabase: session.supabase };
}

function pushNow(): void {
  after(async () => {
    const admin = getAdminClient();
    if (!admin) return;
    try {
      await pushDrain(admin);
    } catch {
      /* The scheduled drain is the backstop. */
    }
  });
}

function staffResult(data: unknown): ActionResult<StaffReview> {
  const review = staffReviewFromRow(data);
  return review ? ok(review) : fail(wordsForToken("review:not_found"));
}

/** Staff: ask the person a case is about for a call, now or at a time. */
export async function requestReviewCall(input: {
  caseKind: string;
  caseId: string;
  purpose: string;
  kind?: "AUDIO" | "VIDEO";
  scheduledFor?: string;
}): Promise<ActionResult<StaffReview>> {
  const c = await client();
  if (!c.ok) return fail(c.error);
  const parsed = validate(requestReviewCallSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const answer = await callRpc(c.supabase, "call_review_request", {
    p_case_kind: parsed.data.caseKind,
    p_case_id: parsed.data.caseId,
    p_purpose: parsed.data.purpose,
    p_kind: parsed.data.kind,
    p_scheduled_for: parsed.data.scheduledFor ?? null,
  });
  if (!answer.ok) return fail(answer.words);
  pushNow();
  return staffResult(answer.data);
}

/** Staff: move a review call to a new time, with the reason. */
export async function rescheduleReviewCall(input: {
  reviewId: string;
  scheduledFor: string;
  reason: string;
}): Promise<ActionResult<StaffReview>> {
  const c = await client();
  if (!c.ok) return fail(c.error);
  const parsed = validate(rescheduleReviewCallSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const answer = await callRpc(c.supabase, "call_review_reschedule", {
    p_review: parsed.data.reviewId,
    p_scheduled_for: parsed.data.scheduledFor,
    p_reason: parsed.data.reason,
  });
  if (!answer.ok) return fail(answer.words);
  pushNow();
  return staffResult(answer.data);
}

/** Staff: ring the subject now (accepted, or inside a scheduled window). Then join with `getJoinCredentials`. */
export async function startReviewCall(input: { reviewId: string }): Promise<ActionResult<CallSnapshot>> {
  const c = await client();
  if (!c.ok) return fail(c.error);
  const parsed = validate(reviewIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  if (!callProviderConfigured()) return fail(wordsForToken("call:provider_unavailable"));
  const answer = await callRpc(c.supabase, "call_review_start", { p_review: parsed.data.reviewId });
  if (!answer.ok) return fail(answer.words);
  const snapshot = snapshotFromRow(answer.data);
  if (!snapshot) return fail(wordsForToken("review:not_found"));
  if (snapshot.state === "RINGING") pushNow();
  return ok(snapshot);
}

/** Staff: a note, an evidence reference or a correction. Append-only. */
export async function addReviewEntry(input: {
  reviewId: string;
  kind: "NOTE" | "EVIDENCE" | "CORRECTION";
  body: string;
  evidenceRef?: string;
  correctsId?: string;
}): Promise<ActionResult<{ id: string }>> {
  const c = await client();
  if (!c.ok) return fail(c.error);
  const parsed = validate(addReviewEntrySchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const answer = await callRpc(c.supabase, "call_review_add_entry", {
    p_review: parsed.data.reviewId,
    p_kind: parsed.data.kind,
    p_body: parsed.data.body,
    p_evidence_ref: parsed.data.evidenceRef ?? null,
    p_corrects: parsed.data.correctsId ?? null,
  });
  if (!answer.ok) return fail(answer.words);
  const id = (answer.data as { id?: unknown } | null)?.id;
  return typeof id === "string" ? ok({ id }) : fail(wordsForToken("review:invalid_entry"));
}

/** Staff: record the outcome. ESCALATED, FOLLOW_UP_REQUIRED (with a due date) and the rest. */
export async function completeReviewCall(input: {
  reviewId: string;
  outcome: "REVIEW_COMPLETED" | "MORE_INFORMATION_REQUIRED" | "FOLLOW_UP_REQUIRED" | "ESCALATED" | "NO_SHOW";
  summary: string;
  followUpDueAt?: string;
}): Promise<ActionResult<StaffReview>> {
  const c = await client();
  if (!c.ok) return fail(c.error);
  const parsed = validate(completeReviewCallSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const answer = await callRpc(c.supabase, "call_review_complete", {
    p_review: parsed.data.reviewId,
    p_outcome: parsed.data.outcome,
    p_summary: parsed.data.summary,
    p_follow_up_due_at: parsed.data.followUpDueAt ?? null,
  });
  if (!answer.ok) return fail(answer.words);
  return staffResult(answer.data);
}

/** Staff: cancel, with the reason (outcome CANCELLED). */
export async function cancelReviewCall(input: { reviewId: string; reason: string }): Promise<ActionResult<StaffReview>> {
  const c = await client();
  if (!c.ok) return fail(c.error);
  const parsed = validate(cancelReviewCallSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const answer = await callRpc(c.supabase, "call_review_cancel", {
    p_review: parsed.data.reviewId,
    p_reason: parsed.data.reason,
  });
  if (!answer.ok) return fail(answer.words);
  pushNow();
  return staffResult(answer.data);
}

/** The subject: review calls about me (last 180 days), without anything staff-only. */
export async function myReviewCalls(): Promise<ActionResult<SubjectReview[]>> {
  const c = await client();
  if (!c.ok) return fail(c.error);
  const answer = await callRpc(c.supabase, "my_call_reviews", {});
  if (!answer.ok) return fail(answer.words);
  const rows = Array.isArray(answer.data) ? answer.data : [];
  return ok(rows.map(subjectReviewFromRow).filter((r): r is SubjectReview => r !== null));
}

/** The subject: accept, decline, or propose another time. */
export async function respondToReviewCall(input: {
  reviewId: string;
  response: "ACCEPT" | "DECLINE" | "PROPOSE";
  proposedFor?: string;
}): Promise<ActionResult<SubjectReview>> {
  const c = await client();
  if (!c.ok) return fail(c.error);
  const parsed = validate(respondReviewCallSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const answer = await callRpc(c.supabase, "call_review_respond", {
    p_review: parsed.data.reviewId,
    p_response: parsed.data.response,
    p_proposed_for: parsed.data.proposedFor ?? null,
  });
  if (!answer.ok) return fail(answer.words);
  const review = subjectReviewFromRow(answer.data);
  return review ? ok(review) : fail(wordsForToken("review:not_found"));
}
