"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { parseNairaToKobo } from "../money/amount";
import { getAdminClient } from "../supabase/service";
import { guardMoney } from "../security/money-limits";

/**
 * THE AGREEMENT, FROM THE PARTIES' SIDE (Track A, 25 September 2026).
 *
 * The doors are service-role functions that take the caller's id as their
 * first argument; the id always comes from the session here, never from the
 * form. Each door checks for itself that the caller is a party, that the
 * inspection gate is met, that the version being confirmed is the version on
 * record, and that a live mandate stands behind an agent's confirmation. This
 * file turns a status into a sentence a person can act on.
 */

const uuid = z.string().uuid("That is not an id we recognise.");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");

const WORDS: Record<string, string> = {
  bad_request: "Something was missing. Check the form and try again.",
  move_in_past: "Choose a move-in date from today onwards.",
  notes_too_long: "Keep the notes under 2,000 characters.",
  not_found: "We could not find that on your account.",
  not_a_rental: "Only a property for rent is drawn up this way.",
  no_lister: "This listing has no lister to agree terms with.",
  inspection_not_submitted: "Submit the inspection report first. The agreement is drawn up from it.",
  inspection_incomplete: "Tick all eight items on the inspection report first.",
  inspection_needs_photos: "Add photos taken at the property to the inspection report first.",
  no_amount: "This listing has no move-in cost set, so there is nothing to agree yet.",
  locked: "This agreement can no longer be changed.",
  stay_terms_follow_the_booking: "A stay's terms are its booking. Change the booking instead.",
  terms_changed: "The terms changed since you opened this page. Read them again and confirm the new version.",
  mandate_not_live:
    "This listing needs a live, approved mandate from the owner before the handover can be confirmed. File or renew it from your listing.",
  payment_in_flight: "A payment is in progress. Wait a few minutes and try again.",
  not_paid: "A claim can be made only on an agreement that was paid through Vallo.",
  outside_window: "The claim window is closed. Claims are made within 72 hours of move-in or check-in.",
  describe_more: "Describe what happened in at least 30 characters.",
  cite_something: "Tick the inspection items this is about, or add new photos.",
  evidence_not_yours: "One of those files is not yours.",
  over_cap: "That is more than can be claimed on this booking.",
  already_open: "You already have a claim waiting on this agreement.",
};

async function door(
  fn: string,
  args: (userId: string) => Record<string, unknown>,
  paths: string[],
  alsoOk: string[] = [],
) {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail<Record<string, unknown>>(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail<Record<string, unknown>>(SIGNED_OUT_MESSAGE);
  const admin = getAdminClient();
  if (!admin) return fail<Record<string, unknown>>(NOT_CONFIGURED_MESSAGE);
  const { data, error } = await admin.rpc(fn as never, args(session.user.id) as never);
  if (error) return fail<Record<string, unknown>>("That did not go through. Nothing changed. Try again in a moment.");
  const answer = (data ?? {}) as Record<string, unknown>;
  const status = String(answer.status ?? "");
  if (status !== "ok" && !alsoOk.includes(status)) {
    return fail<Record<string, unknown>>(WORDS[status] ?? "That did not go through.");
  }
  for (const path of paths) revalidatePath(path);
  return ok(answer);
}

export async function openRentAgreement(input: {
  inspectionId: string;
  moveIn: string;
  handoverOn?: string;
  notes?: string;
}): Promise<ActionResult<{ agreementId: string }>> {
  const parsed = validate(
    z.object({
      inspectionId: uuid,
      moveIn: isoDate,
      handoverOn: isoDate.optional().or(z.literal("")),
      notes: z.string().trim().max(2000, "Keep the notes under 2,000 characters.").optional(),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const result = await door(
    "agreement_open_rent_as",
    (userId) => ({
      p_actor: userId,
      p_inspection: parsed.data.inspectionId,
      p_move_in: parsed.data.moveIn,
      p_handover: parsed.data.handoverOn ? parsed.data.handoverOn : null,
      p_notes: parsed.data.notes ?? null,
    }),
    ["/agreements"],
    /* `exists` is answered only to a party to that agreement (anybody else
       gets `not_found`), so it is the way to the agreement already drawn
       up, not a refusal: the other party (or another tab) got there first.
       A cancelled agreement is not answered as `exists`: the door releases
       its inspection and draws up a new one. */
    ["exists"],
  );
  if (!result.ok) return result;
  return ok({ agreementId: String(result.data.agreement_id) });
}

export async function confirmAgreement(input: { agreementId: string; version: number }): Promise<ActionResult<{ status: string }>> {
  const parsed = validate(z.object({ agreementId: uuid, version: z.number().int().min(1) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const result = await door(
    "agreement_confirm_as",
    (userId) => ({ p_actor: userId, p_agreement: parsed.data.agreementId, p_version: parsed.data.version }),
    ["/agreements", `/agreements/${parsed.data.agreementId}`],
  );
  if (!result.ok) return result;
  return ok({ status: String(result.data.agreement_status ?? "") });
}

export async function amendAgreement(input: {
  agreementId: string;
  moveIn: string;
  handoverOn?: string;
  notes?: string;
}): Promise<ActionResult<{ version: number }>> {
  const parsed = validate(
    z.object({
      agreementId: uuid,
      moveIn: isoDate,
      handoverOn: isoDate.optional().or(z.literal("")),
      notes: z.string().trim().max(2000).optional(),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const result = await door(
    "agreement_amend_as",
    (userId) => ({
      p_actor: userId,
      p_agreement: parsed.data.agreementId,
      p_move_in: parsed.data.moveIn,
      p_handover: parsed.data.handoverOn ? parsed.data.handoverOn : null,
      p_notes: parsed.data.notes ?? null,
    }),
    [`/agreements/${parsed.data.agreementId}`],
  );
  if (!result.ok) return result;
  return ok({ version: Number(result.data.terms_version) });
}

export async function cancelAgreement(input: { agreementId: string; note?: string }): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ agreementId: uuid, note: z.string().trim().max(1000).optional() }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const result = await door(
    "agreement_cancel_as",
    (userId) => ({ p_actor: userId, p_agreement: parsed.data.agreementId, p_note: parsed.data.note ?? null }),
    ["/agreements", `/agreements/${parsed.data.agreementId}`],
  );
  return result.ok ? ok(null) : result;
}

const ROOM_ITEMS = ["exterior", "interior", "kitchen", "bathrooms", "utilities", "appliances", "safety", "overall"] as const;

export async function fileGuaranteeClaim(input: {
  agreementId: string;
  items: string[];
  description: string;
  evidencePaths: string[];
  amountNaira: string;
}): Promise<ActionResult<{ claimId: string }>> {
  const parsed = validate(
    z.object({
      agreementId: uuid,
      items: z.array(z.enum(ROOM_ITEMS)).max(8),
      description: z.string().trim().min(30, "Describe what happened in at least 30 characters.").max(4000),
      evidencePaths: z.array(z.string().max(300)).max(12),
      amountNaira: z.string().trim().max(30),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const amount = parseNairaToKobo(parsed.data.amountNaira);
  if (amount === null || amount <= 0) {
    return fail("Enter the amount you are claiming.", { amountNaira: "Enter the amount you are claiming." });
  }
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const guard = await guardMoney("fileGuaranteeClaim", session.user.id);
  if (!guard.allowed) return fail(guard.message);
  const result = await door(
    "guarantee_claim_file_as",
    (userId) => ({
      p_actor: userId,
      p_agreement: parsed.data.agreementId,
      p_items: parsed.data.items,
      p_description: parsed.data.description,
      p_evidence_paths: parsed.data.evidencePaths,
      p_requested_minor: amount,
    }),
    [`/agreements/${parsed.data.agreementId}`],
  );
  if (!result.ok) return result;
  return ok({ claimId: String(result.data.claim_id) });
}

/**
 * A signed upload for one claim photo, into the claimant's own folder of the
 * private `guarantee-evidence` bucket. The storage policy refuses any other
 * folder, so the path cannot be pointed at somebody else's.
 */
export async function createClaimEvidenceUpload(input: {
  agreementId: string;
  fileName: string;
}): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = validate(
    z.object({ agreementId: uuid, fileName: z.string().trim().min(1).max(120) }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);
  const safe = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${session.user.id}/${parsed.data.agreementId}/${Date.now()}-${safe}`;
  const { data, error } = await session.supabase.storage.from("guarantee-evidence").createSignedUploadUrl(path);
  if (error || !data) return fail("The upload could not be prepared. Try again.");
  return ok({ path, token: data.token });
}
