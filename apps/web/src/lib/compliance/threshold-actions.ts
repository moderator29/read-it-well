"use server";

/**
 * SCUML items 7 and 19. Recording a threshold report on the register and the
 * second member of staff approving it. Both are one call to a definer function
 * that checks the role and the two-person rule itself; this only collects the
 * form and says the answer in words.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { requireAdmin } from "../admin/guard";
import { getLocale } from "../locale";

type Rpc = { rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };

async function call(fn: string, args: Record<string, unknown>): Promise<ActionResult<null>> {
  const words = getDictionary(await getLocale()).complianceThreshold.words;
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(words.not_staff);
  try {
    const { data, error } = await (access.supabase as unknown as Rpc).rpc(fn, args);
    const status = !error && data && typeof data === "object" ? String((data as { status?: unknown }).status) : null;
    if (status !== "ok") return fail((status && (words as Record<string, string>)[status]) || words.failed);
  } catch {
    return fail(words.failed);
  }
  revalidatePath("/admin/compliance");
  return ok(null);
}

const uuid = z.uuid();

export async function decideThresholdEvent(input: {
  eventId: string;
  decision: "reported" | "not_reportable";
  reference?: string;
  reportedOn?: string;
  note?: string;
}): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({
      eventId: uuid,
      decision: z.enum(["reported", "not_reportable"]),
      reference: z.string().max(120).optional(),
      reportedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      note: z.string().max(1000).optional(),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return call("decide_threshold_event", {
    p_event: parsed.data.eventId,
    p_decision: parsed.data.decision,
    p_reference: parsed.data.reference?.trim() || null,
    p_reported_on: parsed.data.decision === "reported" ? parsed.data.reportedOn || null : null,
    p_note: parsed.data.note?.trim() || null,
  });
}

export async function approveThresholdDecision(input: {
  decisionId: string;
  verdict: "approved" | "rejected";
  note?: string;
}): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({ decisionId: uuid, verdict: z.enum(["approved", "rejected"]), note: z.string().max(1000).optional() }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return call("approve_threshold_decision", {
    p_decision: parsed.data.decisionId,
    p_verdict: parsed.data.verdict,
    p_note: parsed.data.note?.trim() || null,
  });
}
