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
 * THE ONE EXCEPTION MOVES MONEY. `returnCaution` sends the lister's own money
 * to the tenant's wallet through `return_caution`, which wraps the ordinary
 * wallet transfer and, like it, is reachable by the service role only: money
 * never moves from a browser. It passes the same gates as the Send page (the
 * wallet flag and the money limits) before it names the signed-in lister to
 * the door.
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
import { isFeatureEnabled } from "../flags";
import { guardMoney } from "../security/money-limits";
import { getAdminClient } from "../wallet/ledger";
import { callMoneyRpc } from "../wallet/rpc";

const WALLET_OFF = "The wallet is switched off for a moment. Nothing was sent. Try again shortly.";
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
  already_returned: "That return has already gone through.",
  insufficient: "There is not enough in your wallet for this amount.",
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

export async function returnCaution(input: {
  tenancyId: string;
  obligationId: string;
  amountNaira: string;
}): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = validate(
    z.object({ tenancyId: uuid, obligationId: uuid, amountNaira: z.string() }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const amount = parseNairaToKobo(parsed.data.amountNaira);
  if (amount === null || amount <= 0) {
    return fail("Enter an amount above zero.", { amountNaira: "Enter an amount above zero." });
  }
  if (!(await isFeatureEnabled("wallet"))) return fail(WALLET_OFF);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const limit = await guardMoney("transferToUser", session.user.id);
  if (!limit.allowed) return fail(limit.message);
  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  const call = await callMoneyRpc(
    admin,
    "transfer",
    "return_caution",
    { p_obligation: parsed.data.obligationId, p_amount: amount, p_lister: session.user.id },
    { amountMinor: amount, userId: session.user.id },
  );
  if (call.outcome !== "ok" || typeof call.data !== "object" || call.data === null) {
    return fail(SERVICE_DOWN);
  }
  const answer = call.data as Record<string, unknown>;
  if (answer.status !== "ok") return fail(STATUS_WORDS[String(answer.status)] ?? SERVICE_DOWN);
  revalidatePath(`/tenancy/${parsed.data.tenancyId}`);
  revalidatePath("/wallet");
  return ok(answer);
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
