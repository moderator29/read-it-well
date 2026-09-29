"use server";

/**
 * SCUML item 20: the lister's answer, and staff's own record of a person.
 *
 * The answer is written under the lister's own session through
 * `answer_pep_question`, which refuses anybody without an agents row: a member
 * looking for a home is never asked. Staff writes go through `flag_pep`, which
 * re-checks the role in Postgres, with an audit row beside it.
 */

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE } from "../actions/session";
import { getAgentContext } from "../agent/listings-queries";
import { writeAudit } from "../admin/audit";
import { adminRefusal, requireAdmin } from "../admin/guard";
import { createAdminClient } from "../supabase/admin";
import { deriveRiskSoon } from "./derive-soon";
import { findPerson } from "./person";
import { callRpc } from "./rpc";

const RELATIONS = new Set(["self", "family", "associate"]);

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function answerPepQuestion(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const q = getDictionary("en").compliancePep.question;
  const context = await getAgentContext();
  if (context.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (context.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (context.state !== "agent") return fail(q.failed);

  const answer = text(formData, "isPep");
  if (answer !== "yes" && answer !== "no") return fail(q.chooseOne, { isPep: q.chooseOne });
  const isPep = answer === "yes";
  const relation = text(formData, "relation");
  const role = text(formData, "role");
  if (isPep && !RELATIONS.has(relation)) return fail(q.whoNeeded, { relation: q.whoNeeded });
  if (isPep && (role.length < 2 || role.length > 200)) return fail(q.roleNeeded, { role: q.roleNeeded });
  const askedAt = text(formData, "askedAt") === "payout" ? "payout" : "verification";

  const { error } = await callRpc(context.supabase, "answer_pep_question", {
    p_is_pep: isPep,
    p_relation: isPep ? relation : null,
    p_role: isPep ? role : null,
    p_asked_at: askedAt,
  });
  if (error) return fail(q.failed);

  await deriveRiskSoon(context.user.id);
  revalidatePath("/verification");
  revalidatePath("/agent/earnings");
  revalidatePath("/agent/settings");
  return ok(null);
}

export async function flagPepPerson(
  _prev: ActionResult<"flagged" | "proposed"> | null,
  formData: FormData,
): Promise<ActionResult<"flagged" | "proposed">> {
  const l = getDictionary("en").compliancePep.lane;
  const access = await requireAdmin("compliance");
  if (access.state !== "admin") return fail(adminRefusal(access));

  const userId = await findPerson(access.supabase, text(formData, "person"));
  if (!userId) return fail(l.notFound, { person: l.notFound });
  const flagged = text(formData, "flagged") !== "no";
  const relation = text(formData, "relation");
  const role = text(formData, "role");
  const note = text(formData, "note");
  if (note.length < 2 || note.length > 600) return fail(l.failed, { note: l.flagNote });
  if (flagged && (!RELATIONS.has(relation) || role.length < 2)) {
    return fail(l.failed, { role: getDictionary("en").compliancePep.question.roleNeeded });
  }

  const { data, error } = await callRpc(access.userClient, "flag_pep", {
    p_user: userId,
    p_flagged: flagged,
    p_relation: flagged ? relation : null,
    p_role: flagged ? role : null,
    p_note: note,
  });
  if (error) return fail(l.failed);

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: flagged ? "compliance.pep.flag" : "compliance.pep.clear",
      entityType: "pep_flag",
      entityId: typeof data === "string" ? data : null,
      detail: { scuml_item: 20, subject: userId },
    });
  } catch {
    /* The flag row itself is the record; the audit line is best effort. */
  }
  await deriveRiskSoon(userId);
  revalidatePath("/admin/compliance");
  /* Taking somebody off the record is only a proposal until a second member
     of staff approves it (SCUML item 19). */
  return ok(flagged ? "flagged" : "proposed");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** SCUML items 20 and 19: the second person approves taking somebody off the record. */
export async function approvePepClear(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const l = getDictionary("en").compliancePep.lane;
  const access = await requireAdmin("compliance");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const flagId = text(formData, "id");
  if (!UUID_RE.test(flagId)) return fail(l.failed);
  const { error } = await callRpc(access.userClient, "approve_pep_clear", { p_flag: flagId });
  if (error) return fail(error.code === "RM175" ? l.ownProposal : l.failed);
  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "compliance.pep.clear_approve",
      entityType: "pep_flag",
      entityId: flagId,
      detail: { scuml_item: 20 },
    });
  } catch {
    /* The approval row is the record. */
  }
  revalidatePath("/admin/compliance");
  return ok(null);
}
