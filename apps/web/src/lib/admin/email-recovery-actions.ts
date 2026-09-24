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
 *   2. WAIT   72 hours of cooling-off, during which any admin can cancel.
 *   3. MOVE   `admin_begin_email_recovery` refuses before the 72 hours; the
 *             auth row is changed here with the service role; the outcome is
 *             recorded by `admin_finish_email_recovery`; the OLD address is
 *             told again.
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

  await access.supabase.rpc("admin_finish_email_recovery" as never, {
    p_request: requestId,
    p_ok: !moveError,
    p_error: moveError ? moveError.message : null,
  } as never);

  if (moveError) return fail("The address could not be changed, so nothing was changed. The request is back in its cooling-off state.");

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
 * Tell the OLD address, read from the request row (never from the auth row,
 * which after a move is the new address), and stamp when it went.
 */
async function noticeOldAddress(requestId: string, moment: "opened" | "completed"): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("email_recovery_requests" as never)
      .select("user_id, old_email, new_email, eligible_at")
      .eq("id", requestId)
      .maybeSingle();
    const row = data as { user_id: string; old_email: string; new_email: string; eligible_at: string } | null;
    if (!row) return false;
    const { data: profile } = await admin.from("profiles").select("display_name").eq("id", row.user_id).maybeSingle();
    const content = {
      name: profile?.display_name ?? null,
      newAddressMasked: await maskAddress(row.new_email),
      eligibleAt: lagosStamp(row.eligible_at),
    };
    const result = await sendMessage(
      row.old_email,
      moment === "opened" ? emailRecoveryOpened(content) : emailRecoveryCompleted(content),
    );
    if (result.sent) {
      await admin
        .from("email_recovery_requests" as never)
        .update({ [moment === "opened" ? "opened_notice_at" : "completed_notice_at"]: new Date().toISOString() } as never)
        .eq("id", requestId);
    }
    return result.sent;
  } catch {
    return false;
  }
}
