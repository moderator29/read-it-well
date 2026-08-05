"use server";

/**
 * Reporting a listing.
 *
 * public.reports has had a correct owner policy and an admin queue since the
 * trust migration, and until now exactly one writer: the social layer's
 * report-a-post action. Nothing let anyone report a listing, which is the
 * object money moves against and therefore the one worth faking.
 *
 * Everything the database can enforce, it does: the reporter is the caller
 * (reports_insert_own), the category is a check constraint, one open report per
 * person per target is a partial unique index, and both the reporter's
 * acknowledgement and the admin risk alert for a serious category are trigger
 * fan-out. This file validates the shape, writes through the caller's own
 * RLS-bound client, and turns each refusal into a sentence.
 *
 * Rate limited per person. The unique index already stops the same thing being
 * reported twice, so the abuse left is a run across many targets, which is
 * what the bucket prices.
 */

import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, resolveSession } from "../actions/session";
import { consume, subjectForUser } from "../security/rate-limit";
import { REPORT_CATEGORY_COPY, reportInputSchema } from "./schema";

const ALREADY_MESSAGE =
  "You have already reported this, and it is with our team. We will not make you say it twice.";

const SERVICE_DOWN_MESSAGE =
  "We could not file that just now. Nothing you typed is lost, so please try again in a moment.";

export type ReportReceipt = { targetId: string; category: string };

export async function reportSomething(
  _prev: ActionResult<ReportReceipt> | null,
  formData: FormData,
): Promise<ActionResult<ReportReceipt>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") {
    return fail("Sign in to report this. It takes a moment and it keeps reports accountable.");
  }

  const parsed = validate(reportInputSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { targetType, targetId, category, details } = parsed.data;

  const verdict = await consume({
    bucket: "report",
    subject: subjectForUser(session.user.id),
    limit: 10,
    windowSeconds: 3_600,
  });
  if (!verdict.allowed) {
    return fail(
      `That is a lot of reports in one hour. Try again ${verdict.retryIn}. If something urgent is happening, contact support directly.`,
    );
  }

  // reason is NOT NULL and is what a human reads first in the queue. When
  // somebody picks a category and writes nothing, the label is the honest
  // reason rather than an empty string.
  const reason =
    details && details.length > 0 ? details : REPORT_CATEGORY_COPY[category].label;

  try {
    const { error } = await session.supabase.from("reports").insert({
      reporter_id: session.user.id,
      target_type: targetType,
      target_id: targetId,
      category,
      reason,
    });

    if (error) {
      if (error.code === "23505") return fail(ALREADY_MESSAGE);
      if (error.code === "23514") return fail("Pick one of the reasons listed.");
      return fail(SERVICE_DOWN_MESSAGE);
    }

    return ok({ targetId, category });
  } catch {
    return fail(SERVICE_DOWN_MESSAGE);
  }
}
