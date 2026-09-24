"use server";

/**
 * SCUML items 20, 15 and 19: an enhanced due diligence review is decided by
 * one member of staff (the source of funds and an outcome) and approved by a
 * second. `decide_edd_review` and `approve_edd_decision` re-check the role,
 * and the approvals table refuses an approver who is the decider, so the two
 * person rule holds whatever calls it.
 */

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { writeAudit } from "../admin/audit";
import { adminRefusal, requireAdmin } from "../admin/guard";
import { createAdminClient } from "../supabase/admin";
import { callRpc } from "./rpc";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function audit(actorId: string, action: string, entityId: string, item: string): Promise<void> {
  try {
    await writeAudit(createAdminClient(), {
      actorId,
      action,
      entityType: "edd_review",
      entityId,
      detail: { scuml_item: item === "15" ? 15 : 20 },
    });
  } catch {
    /* The decision rows are the record; the audit line is best effort. */
  }
}

export async function decideEddReview(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const l = getDictionary("en").compliancePep.lane;
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const reviewId = text(formData, "reviewId");
  const sourceOfFunds = text(formData, "sourceOfFunds");
  const outcome = text(formData, "outcome");
  const note = text(formData, "note");
  if (!UUID_RE.test(reviewId)) return fail(l.failed);
  if (sourceOfFunds.length < 2 || sourceOfFunds.length > 1000) {
    return fail(l.sourceOfFundsHelp, { sourceOfFunds: l.sourceOfFundsHelp });
  }
  if (outcome !== "cleared" && outcome !== "refer") return fail(l.failed, { outcome: l.outcome });
  if (note.length > 1000) return fail(l.failed, { note: l.note });

  const { error } = await callRpc(access.supabase, "decide_edd_review", {
    p_review: reviewId,
    p_source_of_funds: sourceOfFunds,
    p_outcome: outcome,
    p_note: note || null,
  });
  if (error) return fail(l.failed);
  await audit(access.user.id, "compliance.edd.decide", reviewId, text(formData, "item"));
  revalidatePath("/admin/compliance");
  return ok(null);
}

export async function approveEddDecision(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const l = getDictionary("en").compliancePep.lane;
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const decisionId = text(formData, "decisionId");
  if (!UUID_RE.test(decisionId)) return fail(l.failed);
  const { error } = await callRpc(access.supabase, "approve_edd_decision", { p_decision: decisionId });
  if (error) return fail(error.code === "RM175" ? l.ownDecision : l.failed);
  await audit(access.user.id, "compliance.edd.approve", decisionId, text(formData, "item"));
  revalidatePath("/admin/compliance");
  return ok(null);
}
