"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { adminRefusal, requireAdmin } from "../admin/guard";
import { CONSENT_SENTENCE } from "./consent";
import { callLandlordRpc } from "./rpc";
import { MANDATE_NEEDED_MESSAGE, isMandateRefusal } from "../compliance/beneficial-ownership";

/**
 * THE REVIEWER'S THREE DECISIONS: CONSENT, SAME PROPERTY, AND NOT THE SAME.
 *
 * Every write goes through the admin's own RLS-bound client into a definer
 * function that checks staff itself (`private.is_staff`) and writes its own
 * `audit_log` row in the same transaction, so the decision and its record
 * cannot come apart the way a best-effort `writeAudit` after the fact can.
 *
 * CONSENT IS ON TODAY, deliberately, while everything that SENDS is behind the
 * fail-closed `landlord_line` flag. Recording consent sends nothing; it is the
 * one part of the landlord line that is worth doing on every mandate call from
 * now, so that the day the line opens there are principals who said yes.
 *
 * The sentence recorded is `CONSENT_SENTENCE`, from the server, never from the
 * form: what is stored against the number is exactly what the console showed
 * the reviewer to read, and a tampered form cannot record a different consent.
 */

const ID = z.string().uuid();
const FAILED_CONSENT = "Consent was not recorded. Nothing has changed. Try again.";
const FAILED_DECISION = "That decision was not recorded. Nothing has changed.";

export async function recordPrincipalConsent(input: {
  mandateId: string;
  answer: "given" | "withdrawn";
  /** Required by the database when this number has asked us to stop before. */
  note?: string | null;
}): Promise<ActionResult<{ consentedAt: string | null; withdrawnAt: string | null }>> {
  const access = await requireAdmin("listing_approval");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const id = ID.safeParse(input.mandateId);
  if (!id.success || (input.answer !== "given" && input.answer !== "withdrawn")) return fail(FAILED_CONSENT);

  const { data, error } = await callLandlordRpc(access.userClient, "record_principal_consent", {
    p_mandate: id.data,
    p_answer: input.answer,
    p_sentence: input.answer === "given" ? CONSENT_SENTENCE : null,
    p_note: input.note?.trim() ? input.note.trim().slice(0, 400) : null,
  });
  if (error) {
    if ((error.message ?? "").includes("asked us to stop")) {
      return fail("This number asked us to stop before. Record what the principal said on this call.");
    }
    if ((error.message ?? "").includes("no number")) {
      return fail("This mandate has no number for the principal, so there is nobody to ask. Ask the lister to add the principal's number to the mandate.");
    }
    return fail(FAILED_CONSENT);
  }
  revalidatePath("/admin/listings");
  const row = (data ?? {}) as { consented_at?: unknown; withdrawn_at?: unknown };
  return ok({
    consentedAt: typeof row.consented_at === "string" ? row.consented_at : null,
    withdrawnAt: typeof row.withdrawn_at === "string" ? row.withdrawn_at : null,
  });
}

export async function decidePropertyMatch(input: {
  listingId: string;
  otherId: string;
  decision: "join" | "apart";
}): Promise<ActionResult<null>> {
  const access = await requireAdmin("listing_approval");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const a = ID.safeParse(input.listingId);
  const b = ID.safeParse(input.otherId);
  if (!a.success || !b.success || a.data === b.data) return fail(FAILED_DECISION);

  const { error } =
    input.decision === "join"
      ? await callLandlordRpc(access.userClient, "property_join", { p_listing: a.data, p_other: b.data })
      : await callLandlordRpc(access.userClient, "property_keep_apart", { p_listing: a.data, p_other: b.data });
  if (error) return fail(FAILED_DECISION);
  revalidatePath(`/admin/listings/${a.data}`);
  return ok(null);
}

export async function splitFromProperty(input: { listingId: string }): Promise<ActionResult<null>> {
  const access = await requireAdmin("listing_approval");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const a = ID.safeParse(input.listingId);
  if (!a.success) return fail(FAILED_DECISION);
  const { error } = await callLandlordRpc(access.userClient, "property_split", { p_listing: a.data });
  if (error) return fail(FAILED_DECISION);
  revalidatePath(`/admin/listings/${a.data}`);
  return ok(null);
}

/** V-48: staff reopen a closed listing, with a reason the database audits. */
export async function reopenClosedListing(input: { listingId: string; note: string }): Promise<ActionResult<null>> {
  const access = await requireAdmin("listing_approval");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const id = ID.safeParse(input.listingId);
  const note = input.note.trim();
  if (!id.success || note.length < 8) return fail("Say why the listing is being reopened, in a sentence.");
  const { error } = await callLandlordRpc(access.userClient, "reopen_listing", { p_listing: id.data, p_note: note });
  /* SCUML item 17: reopening puts it live, and the publish gate asks for a mandate first. */
  if (isMandateRefusal(error)) return fail(MANDATE_NEEDED_MESSAGE);
  if (error) return fail(FAILED_DECISION);
  revalidatePath(`/admin/listings/${id.data}`);
  return ok(null);
}
