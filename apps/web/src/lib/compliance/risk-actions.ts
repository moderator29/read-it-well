"use server";

/**
 * SCUML item 15: staff set a person's class by hand, with a reason. The
 * review date comes from the same clock the rules use (`reviewDueAt`), and
 * `override_risk_class` re-checks the role and keeps the row append-only.
 */

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { writeAudit } from "../admin/audit";
import { adminRefusal, requireAdmin } from "../admin/guard";
import { createAdminClient } from "../supabase/admin";
import { findPerson } from "./person";
import { reviewDueAt, type RiskClass } from "./risk-rules";
import { callRpc } from "./rpc";

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function overrideRiskClass(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const l = getDictionary("en").complianceRisk.lane;
  const access = await requireAdmin("compliance");
  if (access.state !== "admin") return fail(adminRefusal(access));

  const riskClass = text(formData, "riskClass");
  if (riskClass !== "high" && riskClass !== "medium" && riskClass !== "low") return fail(l.failed);
  const reason = text(formData, "reason");
  if (reason.length < 10 || reason.length > 600) return fail(l.reasonHelp, { reason: l.reasonHelp });
  const userId = await findPerson(access.supabase, text(formData, "person"));
  if (!userId) return fail(l.notFound, { person: l.notFound });

  const { data, error } = await callRpc(access.userClient, "override_risk_class", {
    p_user: userId,
    p_class: riskClass,
    p_reason: reason,
    p_review_due_at: reviewDueAt(riskClass as RiskClass, new Date()).toISOString(),
  });
  if (error) return fail(l.failed);

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "compliance.risk.override",
      entityType: "risk_class",
      entityId: typeof data === "string" ? data : null,
      detail: { scuml_item: 15, subject: userId, risk_class: riskClass },
    });
  } catch {
    /* The class row is the record; the audit line is best effort. */
  }
  revalidatePath("/admin/compliance");
  return ok(null);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** SCUML items 15 and 19: the second person approves a class lowered by hand. */
export async function approveRiskOverride(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const l = getDictionary("en").complianceRisk.lane;
  const access = await requireAdmin("compliance");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const rowId = text(formData, "id");
  if (!UUID_RE.test(rowId)) return fail(l.failed);
  const { error } = await callRpc(access.userClient, "approve_risk_override", { p_row: rowId });
  if (error) return fail(error.code === "RM175" ? l.ownProposal : l.failed);
  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "compliance.risk.override_approve",
      entityType: "risk_class",
      entityId: rowId,
      detail: { scuml_item: 15 },
    });
  } catch {
    /* The approval row is the record. */
  }
  revalidatePath("/admin/compliance");
  return ok(null);
}
