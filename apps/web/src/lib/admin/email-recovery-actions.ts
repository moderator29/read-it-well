"use server";

/**
 * SEC-15: STAFF-ASSISTED EMAIL RECOVERY, THE ONLY WAY AN ADDRESS EVER MOVES.
 *
 * A person who has lost their mailbox cannot change their address themselves
 * (nothing in the product calls `updateUser` with an email, and the confirm
 * screen refuses `email_change` tokens). A super admin can move it, through
 * the database's own gates (`public.admin_*_email_recovery`, migration
 * `staff_assisted_email_recovery`):
 *
 *   1. OPEN   the NIN the person gives must match the NIN on an APPROVED
 *             identity on file; the old address is told at once.
 *   2. WAIT   72 hours of cooling-off counted from the moment that notice
 *             went out (not from the opening), during which any admin, or
 *             the account's owner from Settings, can cancel. If the notice
 *             failed, the desk sends it again; nothing can complete until one
 *             has gone.
 *   3. MOVE   TWO PEOPLE: a super admin other than the one who opened it
 *             begins (`admin_begin_email_recovery`), the auth row is changed
 *             here with the service role, and the same super admin records
 *             the outcome (`admin_finish_email_recovery`). A successful move
 *             signs the account out everywhere and puts a 7-day hold on money
 *             leaving it (withdrawals, sends, new or changed bank accounts),
 *             enforced by triggers in the database. The OLD address is told
 *             again.
 *
 * The notice goes by email only. A phone notice needs an SMS transport the
 * product does not have yet (recorded as deferred).
 *
 * Every step writes `audit_log` in the database. Nobody can move their own
 * account.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { sendMessage } from "../email/client";
import { emailRecoveryCompleted, emailRecoveryOpened } from "../email/messages";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { adminRefusal, requireAdmin } from "./guard";

const SUPER_ONLY = "Only a super admin can move an account to a new address.";
const SERVICE_DOWN = "That did not go through. Nothing was changed. Try again in a moment.";

/** "n***@example.com": enough for the owner to recognise, not to read. */
export async function maskAddress(address: string): Promise<string> {
  const [local = "", domain = ""] = address.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

function lagosStamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const openSchema = z.object({
  userId: z.string().uuid("Paste the account's id."),
  newEmail: z.string().trim().email("That is not an email address.").max(254),
  nin: z
    .string()
    .trim()
    .regex(/^[\d\s-]{11,15}$/, "A NIN has eleven digits."),
  evidenceRef: z.string().trim().min(8, "Name the support ticket or the evidence (at least 8 characters).").max(200),
});

export type RecoveryOpened = { requestId: string; noticeSent: boolean };

export async function openEmailRecovery(
  _prev: ActionResult<RecoveryOpened> | null,
  formData: FormData,
): Promise<ActionResult<RecoveryOpened>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));
  if (!access.isSuperAdmin) return fail(SUPER_ONLY);

  const parsed = validate(openSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { userId, newEmail, nin, evidenceRef } = parsed.data;

  const { data: requestId, error } = await access.supabase.rpc("admin_open_email_recovery" as never, {
    p_user: userId,
    p_new_email: newEmail,
    p_nin: nin,
    p_evidence_ref: evidenceRef,
  } as never);
  if (error) {
    const message = (error as { message?: string }).message ?? "";
    const code = (error as { code?: string }).code ?? "";
    return fail(code === "RM040" || code === "42501" ? message : SERVICE_DOWN);
  }

  const id = String(requestId);
  const noticeSent = await noticeOldAddress(id, "opened");
  revalidatePath("/admin/account-recovery");
  return ok({ requestId: id, noticeSent });
}

const requestSchema = z.object({ requestId: z.string().uuid() });

export type RecoveryCompleted = { requestId: string; noticeSent: boolean };

export async function completeEmailRecovery(
  _prev: ActionResult<RecoveryCompleted> | null,
  formData: FormData,
): Promise<ActionResult<RecoveryCompleted>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));
  if (!access.isSuperAdmin) return fail(SUPER_ONLY);

  const parsed = validate(requestSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { requestId } = parsed.data;

  const { data: begun, error: beginError } = await access.supabase.rpc("admin_begin_email_recovery" as never, {
    p_request: requestId,
  } as never);
  if (beginError) {
    const code = (beginError as { code?: string }).code ?? "";
    return fail(code === "RM041" || code === "42501" ? ((beginError as { message?: string }).message ?? SERVICE_DOWN) : SERVICE_DOWN);
  }
  const row = (Array.isArray(begun) ? begun[0] : begun) as
    | { user_id: string; old_email: string; new_email: string }
    | undefined;
  if (!row) return fail(SERVICE_DOWN);

  /*
   * THE ONE PLACE A SIGNED-IN PERSON'S ADDRESS IS REWRITTEN, and only here,
   * after the database has checked the super admin, the identity match and
   * the 72 hours. `email_confirm: true` because the address was proven by the
   * identity check and the ticket, and no email_change mail is ever sent
   * (the email hook drops them). `auth.users` → `account_identities` follows
   * through its own trigger.
   */
  const admin = createAdminClient();
  const { error: moveError } = await admin.auth.admin.updateUserById(row.user_id, {
    email: row.new_email,
    email_confirm: true,
  });

  const { error: finishError } = await access.supabase.rpc("admin_finish_email_recovery" as never, {
    p_request: requestId,
    p_ok: !moveError,
    p_error: moveError ? moveError.message : null,
  } as never);

  if (moveError) return fail("The address could not be changed, so nothing was changed. The request is back in its cooling-off state.");
  if (finishError) {
    const code = (finishError as { code?: string }).code ?? "";
    return fail(
      code === "RM041" || code === "42501"
        ? ((finishError as { message?: string }).message ?? SERVICE_DOWN)
        : "The address was changed but the record of it was not written. Tell engineering before doing anything else.",
    );
  }

  const noticeSent = await noticeOldAddress(requestId, "completed");
  revalidatePath("/admin/account-recovery");
  return ok({ requestId, noticeSent });
}

const cancelSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().min(4, "Say why it is being cancelled.").max(500),
});

export async function cancelEmailRecovery(
  _prev: ActionResult<{ requestId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ requestId: string }>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(cancelSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { error } = await access.supabase.rpc("admin_cancel_email_recovery" as never, {
    p_request: parsed.data.requestId,
    p_reason: parsed.data.reason,
  } as never);
  if (error) {
    const code = (error as { code?: string }).code ?? "";
    return fail(code === "RM041" || code === "42501" ? ((error as { message?: string }).message ?? SERVICE_DOWN) : SERVICE_DOWN);
  }
  revalidatePath("/admin/account-recovery");
  return ok({ requestId: parsed.data.requestId });
}

/**
 * The desk's "send the notice again", for a request whose first notice did
 * not go. Only while it is cooling off. The clock is stamped by the first
 * notice that actually went, so sending again never restarts it.
 */
export async function resendRecoveryNotice(
  _prev: ActionResult<RecoveryOpened> | null,
  formData: FormData,
): Promise<ActionResult<RecoveryOpened>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(requestSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { requestId } = parsed.data;

  const { data } = await access.supabase
    .from("email_recovery_requests" as never)
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if ((data as { status?: string } | null)?.status !== "cooling_off") {
    return fail("Only a request still in its cooling-off can be told again.");
  }
  const noticeSent = await noticeOldAddress(requestId, "opened");
  revalidatePath("/admin/account-recovery");
  return noticeSent ? ok({ requestId, noticeSent }) : fail("The notice did not go. Try again in a moment.");
}

/**
 * The owner's own "this was not me", from Settings, Privacy. The database
 * checks the request is on the caller's account and still cooling off.
 */
export async function ownerCancelEmailRecovery(
  _prev: ActionResult<{ requestId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ requestId: string }>> {
  const parsed = validate(requestSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cancel_email_recovery" as never, {
    p_request: parsed.data.requestId,
    p_reason: null,
  } as never);
  if (error) {
    const code = (error as { code?: string }).code ?? "";
    return fail(code === "RM041" || code === "42501" ? ((error as { message?: string }).message ?? SERVICE_DOWN) : SERVICE_DOWN);
  }
  revalidatePath("/settings/privacy");
  return ok({ requestId: parsed.data.requestId });
}

/**
 * Tell the OLD address, read from the request row (never from the auth row,
 * which after a move is the new address), and stamp when it went.
 */
async function noticeOldAddress(requestId: string, moment: "opened" | "completed"): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("email_recovery_requests" as never)
      .select("user_id, old_email, new_email, eligible_at, opened_notice_at")
      .eq("id", requestId)
      .maybeSingle();
    const row = data as {
      user_id: string;
      old_email: string;
      new_email: string;
      eligible_at: string;
      opened_notice_at: string | null;
    } | null;
    if (!row) return false;
    // The 72 hours count from the first notice that went, so a first notice
    // promises 72 hours from now and a repeat promises what the first did.
    const noticeClock = row.opened_notice_at ? new Date(row.opened_notice_at).getTime() : Date.now();
    const earliest = new Date(Math.max(new Date(row.eligible_at).getTime(), noticeClock + 72 * 60 * 60 * 1000));
    const { data: profile } = await admin.from("profiles").select("display_name").eq("id", row.user_id).maybeSingle();
    const content = {
      name: profile?.display_name ?? null,
      newAddressMasked: await maskAddress(row.new_email),
      eligibleAt: lagosStamp(earliest.toISOString()),
    };
    const result = await sendMessage(
      row.old_email,
      moment === "opened" ? emailRecoveryOpened(content) : emailRecoveryCompleted(content),
    );
    if (result.sent) {
      const column = moment === "opened" ? "opened_notice_at" : "completed_notice_at";
      await admin
        .from("email_recovery_requests" as never)
        .update({ [column]: new Date().toISOString() } as never)
        .eq("id", requestId)
        .is(column, null);
    }
    return result.sent;
  } catch {
    return false;
  }
}
