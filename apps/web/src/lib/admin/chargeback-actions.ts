"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { getLocale } from "../locale";
import { createAdminClient } from "../supabase/admin";
import { writeInAppNotices } from "../notify/in-app";
import { adminRefusal, requireAdmin } from "./guard";
import {
  CHARGEBACK_PROVIDERS,
  MOVE_KEYS,
  REASON_MAX,
  REASON_MIN,
  baseFromRpc,
  field,
  isChargebackState,
  isRecoveryState,
  moveArgs,
  moveOffered,
  noticesForMove,
  statusOf,
  type ChargebackBase,
} from "./reads/chargebacks-model";
import { noticeRowsFor } from "./reads/chargebacks-notices";

/**
 * THE CHARGEBACKS DESK'S HANDS. Every write goes through the audited
 * SECURITY DEFINER functions the backend already has, on the CALLER'S OWN
 * session, so the database checks the finance scope exactly as it was
 * written to (`private.chargeback_actor_ok`): staff holding `finance` on a
 * proved session, or an admin. The service role also passes that check, so
 * it is never the client a desk write is made with: a desk move made on the
 * service role would be recorded as the webhook's, with no person on it.
 *
 *   openChargeback   -> public.chargeback_open
 *   moveChargeback   -> public.chargeback_move
 *   addChargebackNote -> public.chargeback_add_note (draft cb01)
 *
 * Each function writes its own chargeback_events row and audit_log row in
 * the same transaction, so nothing here writes the audit log a second time.
 * After a move lands, the lister (and, on the first decision, the payer) is
 * told through `lib/notify/in-app.ts`, which honours their Bookings switch
 * exactly as `private.notify` does. A notice that fails never undoes a move.
 */

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> };

async function words() {
  return getDictionary(await getLocale()).chargebacks;
}

function revalidateDesk(id?: string, bookingId?: string | null) {
  revalidatePath("/admin/chargebacks");
  if (id) revalidatePath(`/admin/chargebacks/${id}`);
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`);
}

const reason = z
  .string()
  .trim()
  .min(REASON_MIN, `Give a reason of at least ${REASON_MIN} characters.`)
  .max(REASON_MAX, "Keep it under 2,000 characters.");

/** Whole naira with up to two decimals, as a string from a form, to kobo. */
const nairaToKobo = z
  .string()
  .trim()
  .transform((v) => v.replace(/[,\s]/g, ""))
  .refine((v) => /^\d{1,12}(\.\d{1,2})?$/.test(v), "Enter an amount in naira, like 25000 or 25000.50.")
  .transform((v) => Math.round(Number(v) * 100))
  .refine((v) => v > 0, "The amount must be more than zero.");

const isoInstant = z
  .string()
  .trim()
  .refine((v) => v === "" || Number.isFinite(Date.parse(v)), "Pick a real date.")
  .transform((v) => (v === "" ? undefined : new Date(v).toISOString()));

/* ------------------------------------------------------------------ open */

const openSchema = z.object({
  reference: z.string().trim().min(3, "Enter the payment reference.").max(200),
  provider: z.enum(CHARGEBACK_PROVIDERS),
  disputeId: z.string().trim().min(1, "Enter the partner's dispute id.").max(200),
  amount: nairaToKobo,
  evidenceDueAt: isoInstant.optional(),
  providerStatus: z.string().trim().max(120).optional(),
  note: reason,
});

export type OpenOutcome = { chargebackId: string; duplicate: boolean };

export async function openChargeback(input: z.input<typeof openSchema>): Promise<ActionResult<OpenOutcome>> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const c = (await words()).desk;
  const parsed = validate(openSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const v = parsed.data;

  let data: unknown;
  try {
    const answer = await (access.userClient as unknown as Rpc).rpc("chargeback_open", {
      p_reference: v.reference,
      p_provider: v.provider,
      p_provider_dispute_id: v.disputeId,
      p_amount_minor: v.amount,
      p_evidence_due_at: v.evidenceDueAt ?? null,
      p_provider_status: v.providerStatus ? v.providerStatus : null,
      p_note: v.note,
    });
    if (answer.error) return fail(c.openResults.failed);
    data = answer.data;
  } catch {
    return fail(c.openResults.failed);
  }

  const status = statusOf(data);
  const id = field(data, "chargeback_id");
  if ((status === "ok" || status === "duplicate") && typeof id === "string") {
    if (status === "ok") {
      await tellAboutOpen(id, access.userClient);
    }
    revalidateDesk(id);
    return ok({ chargebackId: id, duplicate: status === "duplicate" });
  }
  const results = c.openResults as Record<string, string>;
  return fail(results[status] ?? c.openResults.failed);
}

/* ------------------------------------------------------------------ move */

const moveSchema = z.object({
  chargebackId: z.string().uuid("We could not identify that chargeback."),
  move: z.enum(MOVE_KEYS),
  note: reason,
  /** The state and recovery the sheet was opened on, so a stale screen is caught. */
  fromState: z.string(),
  fromRecovery: z.string(),
  /** record_recovery: what came back this time, in naira. */
  recoveredNow: nairaToKobo.optional(),
  alreadyRecovered: z.boolean().optional(),
  evidenceDueAt: isoInstant.optional(),
});

export type MoveOutcome = { state: string; recovery: string };

async function readOne(user: unknown, id: string): Promise<ChargebackBase | null | "unreadable"> {
  const { data, error } = await (user as Rpc).rpc("staff_chargebacks");
  if (error || !Array.isArray(data)) return "unreadable";
  return data.map(baseFromRpc).find((row) => row?.id === id) ?? null;
}

export async function moveChargeback(input: z.input<typeof moveSchema>): Promise<ActionResult<MoveOutcome>> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const c = (await words()).desk;
  const parsed = validate(moveSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const v = parsed.data;

  let before: ChargebackBase | null | "unreadable";
  try {
    before = await readOne(access.userClient, v.chargebackId);
  } catch {
    before = "unreadable";
  }
  if (before === "unreadable") return fail(c.moveResults.failed);
  if (!before) return fail(c.moveResults.gone);
  if (before.state !== v.fromState || before.recoveryState !== v.fromRecovery) return fail(c.moveResults.stale);
  if (!moveOffered(before, v.move)) {
    return fail(v.move === "reverse_to_won" && before.recoveredMinor > 0 ? c.moveResults.money_back_first : c.moveResults.illegal);
  }
  if (v.move === "record_recovery" && !v.recoveredNow) {
    return fail(c.moveResults.recoveredNeeded, { recoveredNow: c.moveResults.recoveredNeeded });
  }

  const args = moveArgs(
    {
      key: v.move,
      ...(v.recoveredNow ? { recoveredTotalMinor: before.recoveredMinor + v.recoveredNow } : {}),
      ...(v.alreadyRecovered ? { alreadyRecovered: true } : {}),
      ...(v.evidenceDueAt ? { evidenceDueAt: v.evidenceDueAt } : {}),
    },
    before.amountMinor,
  );

  let data: unknown;
  try {
    const answer = await (access.userClient as unknown as Rpc).rpc("chargeback_move", {
      p_chargeback: before.id,
      p_note: v.note,
      ...args,
    });
    if (answer.error) return fail(c.moveResults.failed);
    data = answer.data;
  } catch {
    return fail(c.moveResults.failed);
  }

  const status = statusOf(data);
  if (status !== "ok") {
    if (status === "illegal" && typeof field(data, "why") === "string") return fail(c.moveResults.money_back_first);
    const results = c.moveResults as Record<string, string>;
    return fail(results[status] ?? c.moveResults.failed);
  }

  const afterState = field(data, "state");
  const afterRecovery = field(data, "recovery");
  const after = {
    state: isChargebackState(afterState) ? afterState : before.state,
    recoveryState: isRecoveryState(afterRecovery) ? afterRecovery : before.recoveryState,
  };
  const bookingId = await tellAboutMove(before, after);
  revalidateDesk(before.id, bookingId);
  return ok({ state: after.state, recovery: after.recoveryState });
}

/* ------------------------------------------------------------------ note */

const noteSchema = z.object({
  chargebackId: z.string().uuid("We could not identify that chargeback."),
  note: reason,
});

export async function addChargebackNote(input: z.input<typeof noteSchema>): Promise<ActionResult<null>> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const c = (await words()).desk.detail;
  const parsed = validate(noteSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  try {
    const { data, error } = await (access.userClient as unknown as Rpc).rpc("chargeback_add_note", {
      p_chargeback: parsed.data.chargebackId,
      p_note: parsed.data.note,
    });
    if (error) return fail(c.noteResults.failed);
    const status = statusOf(data);
    if (status === "ok") {
      revalidateDesk(parsed.data.chargebackId);
      return ok(null);
    }
    const results = c.noteResults as Record<string, string>;
    return fail(results[status] ?? c.noteResults.failed);
  } catch {
    return fail(c.noteResults.failed);
  }
}

/* -------------------------------------------------------------- override */

const overrideSchema = z.object({
  kind: z.enum(["arrangement", "rewards_payout"]),
  subjectId: z.string().uuid("We could not identify that payment."),
  reason: z.string().trim().min(12, "Give a reason of at least 12 characters.").max(1000, "Keep it under 1,000 characters."),
});

/**
 * THE PAYOUT RULE'S ONE EXCEPTION (draft cbh01): finance lets ONE held escrow
 * payment or ONE Rewards Balance payout go while the lister still owes a lost
 * chargeback. `public.admin_chargeback_hold_override` checks the finance
 * scope on a proved session, refuses the staffer's own hold, records the
 * override and its reason, writes `chargeback.hold_overridden` to the audit
 * log and lifts the pause the rule set. Nothing moves here: the release is
 * asked for again through its own road.
 */
export async function overrideChargebackHold(input: z.input<typeof overrideSchema>): Promise<ActionResult<null>> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const results = (await words()).override.results as Record<string, string>;
  const parsed = validate(overrideSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  try {
    const { data, error } = await (access.userClient as unknown as Rpc).rpc("admin_chargeback_hold_override", {
      p_kind: parsed.data.kind,
      p_subject: parsed.data.subjectId,
      p_reason: parsed.data.reason,
    });
    if (error) return fail(results.failed!);
    const status = statusOf(data);
    if (status === "ok") {
      revalidatePath("/admin/chargebacks");
      revalidatePath("/admin/agreements");
      revalidatePath("/admin/referrals");
      return ok(null);
    }
    return fail(results[status] ?? results.failed!);
  } catch {
    return fail(results.failed!);
  }
}

/* --------------------------------------------------------------- notices */

/** The people around a charge, read on the service client after the function has already answered. */
async function peopleOf(transactionId: string): Promise<{ payerId: string | null; bookingId: string | null }> {
  const service = createAdminClient();
  const { data: tx } = await service
    .from("transactions")
    .select("booking_id, agreement_id, share_payer_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (!tx) return { payerId: null, bookingId: null };
  if (tx.share_payer_id) return { payerId: tx.share_payer_id, bookingId: tx.booking_id };
  if (tx.booking_id) {
    const { data: b } = await service.from("bookings").select("guest_id").eq("id", tx.booking_id).maybeSingle();
    return { payerId: b?.guest_id ?? null, bookingId: tx.booking_id };
  }
  if (tx.agreement_id) {
    const { data: a } = await service.from("deal_agreements").select("renter_id").eq("id", tx.agreement_id).maybeSingle();
    return { payerId: a?.renter_id ?? null, bookingId: null };
  }
  return { payerId: null, bookingId: null };
}

async function tellAboutMove(
  before: ChargebackBase,
  after: { state: ChargebackBase["state"]; recoveryState: ChargebackBase["recoveryState"] },
): Promise<string | null> {
  try {
    const plans = noticesForMove(before, after);
    const people = await peopleOf(before.transactionId);
    if (plans.length > 0) {
      const rows = noticeRowsFor(plans, { listerId: before.listerId, ...people }, before.amountMinor, before.currency);
      await writeInAppNotices(createAdminClient(), rows);
    }
    return people.bookingId;
  } catch {
    /* Best effort: the move is recorded either way. */
    return null;
  }
}

async function tellAboutOpen(id: string, user: unknown): Promise<void> {
  try {
    const row = await readOne(user, id);
    if (!row || row === "unreadable" || !row.listerId) return;
    const rows = noticeRowsFor([{ to: "lister", key: "opened" }], { listerId: row.listerId, payerId: null, bookingId: null }, row.amountMinor, row.currency);
    await writeInAppNotices(createAdminClient(), rows);
  } catch {
    /* Best effort: the chargeback is recorded either way. */
  }
}
