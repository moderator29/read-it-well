"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { getLocale } from "../locale";
import { pathsBelongTo, reviewResponseSchema } from "./application-respond-schema";
import { documentToSupersede } from "./supersedes";
import { ACCEPT_PAY_REQUIRED, ACCEPT_TERMS_REQUIRED, withWorkspaceAcceptance } from "../legal/workspace-acceptance";

/**
 * SUP-05: answer a reviewer who sent the application back.
 *
 * "Needs more information" used to be a dead end: the email said "add it and
 * send it back", the status page only showed the note, the update policy
 * allowed edits only while DRAFT, and documents could not be attached. The
 * database now lets the applicant edit while MORE_INFO_REQUIRED and move it
 * only to SUBMITTED; the reviewer's columns stay the reviewer's
 * (agent_applications_00_guard_applicant_write), and a filed document is
 * always pending (agent_documents_00_guard_uploader_write).
 *
 * Everything goes through the caller's own RLS-bound client.
 */
export async function respondToReview(input: unknown): Promise<ActionResult<{ reference: string }>> {
  const copy = getDictionary(await getLocale()).agent.status.respond;

  const parsed = reviewResponseSchema.safeParse(input);
  if (!parsed.success) {
    const empty = parsed.error.issues.some((issue) => issue.message === "empty");
    return fail(empty ? copy.needSomething : (parsed.error.issues[0]?.message ?? copy.failed));
  }
  const value = parsed.data;
  /* Ruling 6: the two ticks, as on a first submission (the form asks first). */
  if (!value.acceptTerms) return fail(ACCEPT_TERMS_REQUIRED);
  if (!value.acceptPayOnVallo) return fail(ACCEPT_PAY_REQUIRED);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const { supabase, user } = session;

  if (!pathsBelongTo(user.id, value.documents)) {
    return fail("Those uploads did not come from your own account, so we did not file them. Upload the documents again from this account.");
  }

  const { data: application, error: readError } = await supabase
    .from("agent_applications")
    .select("id, reference, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return fail(copy.failed);
  if (!application || application.status !== "MORE_INFO_REQUIRED") return fail(copy.notWaiting);
  /* The acceptance already on record (pending migration pov07 adds the
     column; until the types are regenerated it is read untyped). */
  const { data: consentRow } = await (supabase as unknown as SupabaseClient)
    .from("agent_applications")
    .select("consents")
    .eq("id", application.id)
    .maybeSingle();
  const priorConsents = (consentRow as { consents?: unknown } | null)?.consents ?? null;

  if (value.documents.length > 0) {
    /* A document sent in answer to a refusal REPLACES the refused one, and
       says so: without `supersedes_id` the refused row stayed current, and a
       rung that needs every current document approved could never pass. Only
       a refused document is replaced here; anything else adds to the file. */
    const { data: earlier, error: earlierError } = await supabase
      .from("agent_documents")
      .select("id, kind, review_status, supersedes_id")
      .eq("uploader_id", user.id)
      .order("uploaded_at", { ascending: false });
    if (earlierError) return fail(copy.failed);

    const { error: documentError } = await supabase.from("agent_documents").insert(
      value.documents.map((doc) => ({
        application_id: application.id,
        uploader_id: user.id,
        kind: doc.kind,
        storage_path: doc.path,
        supersedes_id: documentToSupersede(earlier ?? [], doc.kind, { fallbackToLatest: false }),
      })),
    );
    if (documentError) return fail(copy.failed);
  }

  /* Guarded on the status it was read in, so a reviewer who decided in the
     meantime is not overwritten. The database stamps submitted_at. */
  const { data: moved, error: updateError } = await supabase
    .from("agent_applications")
    .update({
      status: "SUBMITTED",
      /* The acceptance is appended (the record is a history) with its versions and the moment. */
      consents: withWorkspaceAcceptance(priorConsents, new Date().toISOString()),
      ...(value.answer.length > 0 ? { applicant_response: value.answer } : {}),
    } as never)
    .eq("id", application.id)
    .eq("status", "MORE_INFO_REQUIRED")
    .select("id");
  if (updateError) return fail(copy.failed);
  if ((moved ?? []).length === 0) return fail(copy.notWaiting);

  revalidatePath("/profile/application");
  revalidatePath("/profile");
  return ok({ reference: application.reference });
}
