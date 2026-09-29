"use server";

/**
 * THE TENANCY FILE'S WRITES. V-36 and V-54.
 *
 * Every write here is one call to a security-definer door that checks who is
 * calling and what may change (`propose_caution_deduction`,
 * `answer_caution_deduction`, `save_tenancy_report`,
 * `add_tenancy_report_photo`, `countersign_tenancy_report`), made on the
 * caller's own session client so `auth.uid()` is the person.
 *
 * NOTHING HERE MOVES MONEY. The caution was paid to the lister in the
 * move-in split and is theirs to hold under the tenancy (Vallo never holds
 * it). A return is paid directly between the two people and RECORDED here
 * (`record_caution_return`, by either party), the tenant can say a recorded
 * return never arrived (`contest_caution_return`), and an unreturned caution
 * past its due date goes to the Vallo Guarantee
 * (`escalate_caution_to_guarantee`), which staff decide.
 *
 * Each door answers a status word; this file turns it into the sentence the
 * person reads. An unknown word is a service fault, said as one.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { ROOM_ITEMS } from "../inspections/report";
import { parseNairaToKobo } from "../agent/listings-schema";

const SERVICE_DOWN = "That did not go through. Nothing was changed. Try again in a moment.";

const STATUS_WORDS: Record<string, string> = {
  not_found: "We could not find that on your tenancy.",
  bad_item: "Choose one of the eight rooms.",
  bad_amount: "Enter an amount above zero.",
  needs_move_out_photo: "Choose a photograph from your move-out report, submitted after the tenancy ended. A deduction needs one.",
  exceeds_caution: "That is more than is left of the caution.",
  bad_answer: "Choose accept or dispute.",
  already_answered: "You have already answered that line.",
  void: "This tenancy was cancelled or refunded, so no caution is owed on it.",
  not_ended: "Deductions open once the tenancy has ended.",
  already_recorded: "That return is already on the record below.",
  bad_date: "Enter the day it was paid: not in the future, and not before the tenancy file opened.",
  bad_method: "Choose how it was paid.",
  own_record: "You recorded that return yourself.",
  note_required: "Say what happened, in a few words.",
  already_contested: "You have already told Vallo about that return.",
  not_due: "The caution is not due back yet.",
  already_open: "A Vallo Guarantee claim on this caution is already with Vallo staff.",
  nothing_claimable: "Nothing is owed on the caution that is not already recorded, deducted or in question.",
  no_paid_agreement: "This tenancy was not paid through an approved Vallo agreement, so the Guarantee does not cover it.",
  no_such_file: "That photo did not finish uploading. Upload it again.",
  bad_stage: "That report does not exist.",
  not_paid: "The tenancy file opens when the move-in payment has settled.",
  not_open_yet: "This report is not open yet.",
  submitted: "This report has been submitted and is now fixed.",
  needs_all_eight: "Tick all eight rooms before you submit.",
  bad_path: "That photo could not be attached. Upload it again.",
  own_report: "You wrote this report, so the other party countersigns it.",
  not_submitted: "It can be countersigned once it is submitted.",
  already_countersigned: "It is already countersigned.",
  too_early: "This opens later in the tenancy.",
  tenant_renewing: "Your tenant has said they are renewing, so the flat is not relisted.",
  caution_not_settled: "Your account of the flat opens once your caution is settled.",
};

async function door(
  fn: string,
  args: Record<string, unknown>,
  path: string,
): Promise<ActionResult<Record<string, unknown>>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const loose = session.supabase as unknown as SupabaseClient;
    const { data, error } = await loose.rpc(fn, args);
    if (error || typeof data !== "object" || data === null) return fail(SERVICE_DOWN);
    const answer = data as Record<string, unknown>;
    if (answer.status !== "ok") {
      return fail(STATUS_WORDS[String(answer.status)] ?? SERVICE_DOWN);
    }
    revalidatePath(path);
    return ok(answer);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

const uuid = z.uuid("That could not be identified.");

export async function proposeCautionDeduction(input: {
  tenancyId: string;
  obligationId: string;
  item: string;
  amountNaira: string;
  photoId: string;
  note?: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({
      tenancyId: uuid,
      obligationId: uuid,
      item: z.enum(ROOM_ITEMS, { message: "Choose one of the eight rooms." }),
      amountNaira: z.string(),
      photoId: z.uuid("Choose a move-out photograph."),
      note: z.string().trim().max(500, "Keep the note under 500 characters.").optional(),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const amount = parseNairaToKobo(parsed.data.amountNaira);
  if (amount === null || amount <= 0) return fail("Enter an amount above zero.", { amountNaira: "Enter an amount above zero." });
  return door(
    "propose_caution_deduction",
    {
      p_obligation: parsed.data.obligationId,
      p_item: parsed.data.item,
      p_amount: amount,
      p_photo: parsed.data.photoId,
      p_note: parsed.data.note ?? null,
    },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

export async function answerCautionDeduction(input: {
  tenancyId: string;
  deductionId: string;
  answer: "accepted" | "disputed";
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({ tenancyId: uuid, deductionId: uuid, answer: z.enum(["accepted", "disputed"]) }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return door(
    "answer_caution_deduction",
    { p_deduction: parsed.data.deductionId, p_answer: parsed.data.answer },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

/**
 * Record a caution return. The lister records what they paid back; the
 * tenant confirms what they received. The money went directly between the
 * two of them. The key is minted when the form is drawn, so a double tap
 * records once.
 */
export async function recordCautionReturn(input: {
  tenancyId: string;
  obligationId: string;
  amountNaira: string;
  returnedOn: string;
  method: "bank_transfer" | "cash" | "other";
  reference?: string;
  idempotencyKey: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({
      tenancyId: uuid,
      obligationId: uuid,
      amountNaira: z.string(),
      returnedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the day it was paid."),
      method: z.enum(["bank_transfer", "cash", "other"], { message: "Choose how it was paid." }),
      reference: z.string().trim().max(100, "Keep the reference under 100 characters.").optional(),
      idempotencyKey: uuid,
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const amount = parseNairaToKobo(parsed.data.amountNaira);
  if (amount === null || amount <= 0) {
    return fail("Enter an amount above zero.", { amountNaira: "Enter an amount above zero." });
  }
  return door(
    "record_caution_return",
    {
      p_obligation: parsed.data.obligationId,
      p_amount: amount,
      p_returned_on: parsed.data.returnedOn,
      p_method: parsed.data.method,
      p_reference: parsed.data.reference && parsed.data.reference.length > 0 ? parsed.data.reference : null,
      p_key: parsed.data.idempotencyKey,
    },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

/** The tenant says a return the lister recorded never arrived. Vallo staff rule on it. */
export async function contestCautionReturn(input: {
  tenancyId: string;
  returnId: string;
  note: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({
      tenancyId: uuid,
      returnId: uuid,
      note: z.string().trim().min(5, "Say what happened, in a few words.").max(1000, "Keep it under 1,000 characters."),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return door(
    "contest_caution_return",
    { p_return: parsed.data.returnId, p_note: parsed.data.note },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

/** Past its due date, the tenant takes an unreturned caution to the Vallo Guarantee. */
export async function escalateCaution(input: {
  tenancyId: string;
  obligationId: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(z.object({ tenancyId: uuid, obligationId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return door(
    "escalate_caution_to_guarantee",
    { p_obligation: parsed.data.obligationId },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

export async function saveTenancyReport(input: {
  tenancyId: string;
  stage: "move_in" | "move_out";
  items: { item: string; checked: boolean }[];
  notes?: string;
  submit?: boolean;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({
      tenancyId: uuid,
      stage: z.enum(["move_in", "move_out"]),
      items: z.array(z.object({ item: z.enum(ROOM_ITEMS), checked: z.boolean() })).max(8),
      notes: z.string().max(4000, "Keep the notes under 4,000 characters.").optional(),
      submit: z.boolean().optional(),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return door(
    "save_tenancy_report",
    {
      p_rent_payment: parsed.data.tenancyId,
      p_stage: parsed.data.stage,
      p_items: parsed.data.items,
      p_notes: parsed.data.notes ?? null,
      p_submit: parsed.data.submit ?? false,
    },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

export async function addTenancyReportPhoto(input: {
  tenancyId: string;
  reportId: string;
  item: string | null;
  path: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({
      tenancyId: uuid,
      reportId: uuid,
      item: z.enum(ROOM_ITEMS).nullable(),
      path: z.string().min(10).max(300),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return door(
    "add_tenancy_report_photo",
    { p_report: parsed.data.reportId, p_item: parsed.data.item, p_path: parsed.data.path },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

export async function countersignTenancyReport(input: {
  tenancyId: string;
  reportId: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(z.object({ tenancyId: uuid, reportId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return door("countersign_tenancy_report", { p_report: parsed.data.reportId }, `/tenancy/${parsed.data.tenancyId}`);
}

/* ------------------------------------------------------------ V-93 and V-38 */

export async function offerRenewal(input: {
  tenancyId: string;
  rentNaira: string;
  serviceNaira?: string;
  feesNaira?: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({ tenancyId: uuid, rentNaira: z.string(), serviceNaira: z.string().optional(), feesNaira: z.string().optional() }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const rent = parseNairaToKobo(parsed.data.rentNaira);
  if (rent === null || rent <= 0) return fail("Enter the renewal rent.", { rentNaira: "Enter the renewal rent." });
  const service = parsed.data.serviceNaira?.trim() ? parseNairaToKobo(parsed.data.serviceNaira) : null;
  const fees = parsed.data.feesNaira?.trim() ? parseNairaToKobo(parsed.data.feesNaira) : 0;
  if ((service !== null && service < 0) || fees === null || fees < 0) return fail("Enter amounts of zero or more.");
  return door(
    "offer_renewal",
    { p_rent_payment: parsed.data.tenancyId, p_rent: rent, p_service: service, p_agency: fees, p_legal: 0, p_agreement: 0 },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

export async function answerRenewal(input: {
  tenancyId: string;
  answer: "renewing" | "leaving";
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(z.object({ tenancyId: uuid, answer: z.enum(["renewing", "leaving"]) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return door("answer_renewal", { p_rent_payment: parsed.data.tenancyId, p_answer: parsed.data.answer }, `/tenancy/${parsed.data.tenancyId}`);
}

export async function relistFromTenancy(input: { tenancyId: string }): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(z.object({ tenancyId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const result = await door("relist_from_tenancy", { p_rent_payment: parsed.data.tenancyId }, `/tenancy/${parsed.data.tenancyId}`);
  revalidatePath("/agent/listings");
  return result;
}

export async function answerExitAccount(input: {
  tenancyId: string;
  light: string;
  water: string;
  flooding: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({
      tenancyId: uuid,
      light: z.enum(["most_of_the_day", "some_of_the_day", "rarely"], { message: "Choose how much light there was." }),
      water: z.enum(["always", "sometimes", "rarely"], { message: "Choose how the water was." }),
      flooding: z.enum(["never", "sometimes", "often"], { message: "Choose whether it flooded." }),
    }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return door(
    "answer_exit_account",
    { p_rent_payment: parsed.data.tenancyId, p_light: parsed.data.light, p_water: parsed.data.water, p_flooding: parsed.data.flooding },
    `/tenancy/${parsed.data.tenancyId}`,
  );
}

/* ------------------------------------------------------------ V-47 pins */

/**
 * Pin a message from the tenant-lister thread to the tenancy as evidence. The
 * insert policy is the rule (a party, as themselves, a message in THE
 * conversation between this tenant and this lister about this listing), and
 * a pin is append-only: kept until tenancy end plus six years.
 */
export async function pinTenancyMessage(input: {
  tenancyId: string;
  messageId: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(z.object({ tenancyId: uuid, messageId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const loose = session.supabase as unknown as SupabaseClient;
    const { error } = await loose
      .from("tenancy_pins")
      .insert({ rent_payment_id: parsed.data.tenancyId, message_id: parsed.data.messageId, pinned_by: session.user.id });
    if (error) {
      if (error.code === "23505") return fail("That message is already pinned.");
      return fail("Only a message from your thread with the other party about this flat can be pinned.");
    }
    revalidatePath(`/tenancy/${parsed.data.tenancyId}`);
    return ok({});
  } catch {
    return fail(SERVICE_DOWN);
  }
}
