"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getDictionary, type Dictionary } from "@vallo/i18n";
import { z } from "zod";
import { getLocale } from "../locale";
import { readPhone } from "../phone";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { consume, subjectForUser } from "../security/rate-limit";
import { hasServiceRole } from "../security/service-rpc";
import { createAdminClient } from "../supabase/admin";
import { isConfirmOutcome, type ConfirmOutcome } from "./core";
import { phoneConfirmationOn } from "./flag";
import { runSendCode, type SendOutcome } from "./send";
import { otpTransport } from "./transport";

/**
 * SEND A CODE, AND CONFIRM IT (V-50).
 *
 * Both are closed while `phone_confirmation` is off, with a sentence rather
 * than an error, because the only way to reach them with the flag off is a
 * stale page. Sending needs the service role (the code's hash is written by a
 * function a member cannot call); confirming runs as the member.
 *
 * ALLOWANCES, FAILING CLOSED, because a code is an SMS the founder pays for
 * and an open door here sends strangers texts at Vallo's expense:
 *
 *   five codes an hour per account;
 *   three an hour per number FOR THIS ACCOUNT, so a stranger typing somebody
 *   else's number spends their own allowance and never the owner's;
 *   twenty a day per number across every account, the cost ceiling on one
 *   handset. A stranger would need several accounts to reach it, and the
 *   owner can still confirm the next day.
 *
 * The words come from the dictionary, in the reader's locale.
 */

type PhoneCopy = Dictionary["trustVisible"]["phone"];

function sendMessages(copy: PhoneCopy): Record<Exclude<SendOutcome, { ok: true }>["reason"], string> {
  return {
    limited: copy.sendLimited,
    taken: copy.sendTaken,
    already: copy.sendAlready,
    invalid: copy.sendInvalid,
    unconfigured: copy.sendUnconfigured,
    failed: copy.sendFailed,
  };
}

function confirmMessages(copy: PhoneCopy): Record<Exclude<ConfirmOutcome, "confirmed">, string> {
  return {
    wrong: copy.confirmWrong,
    expired: copy.confirmExpired,
    locked: copy.confirmLocked,
    no_code: copy.confirmNoCode,
    taken: copy.confirmTaken,
    signed_out: SIGNED_OUT_MESSAGE,
  };
}

async function phoneCopy(): Promise<PhoneCopy> {
  return getDictionary(await getLocale()).trustVisible.phone;
}

type RpcCaller = {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
};

async function allowed(bucket: string, subject: string, limit: number, windowSeconds = 3_600): Promise<boolean> {
  const verdict = await consume({ bucket, subject, limit, windowSeconds });
  return verdict.allowed && !verdict.degraded;
}

export async function sendPhoneCode(input: unknown): Promise<ActionResult<{ sentTo: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const copy = await phoneCopy();
  const messages = sendMessages(copy);
  if (!(await phoneConfirmationOn())) return fail(copy.closed);

  const parsed = validate(z.object({ phone: z.string().trim().min(1, copy.numberEmpty) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const reading = readPhone(parsed.data.phone);
  if (reading.state !== "valid") {
    return fail(reading.state === "invalid" ? reading.reason : messages.invalid, {
      phone: reading.state === "invalid" ? reading.reason : messages.invalid,
    });
  }
  if (!hasServiceRole()) return fail(messages.unconfigured);

  const admin = createAdminClient() as unknown as RpcCaller;
  const result = await runSendCode(
    {
      randomInt: (max) => randomInt(max),
      issue: async (userId, phone, code) => {
        const { data, error } = await admin.rpc("phone_otp_issue", { p_user: userId, p_phone: phone, p_code: code });
        if (error) throw new Error("issue failed");
        return data;
      },
      transport: otpTransport(),
      allow: async (userId, phone) =>
        (await allowed("phone_otp_user", subjectForUser(userId), 5)) &&
        (await allowed("phone_otp_number_account", `phone:${phone}:${subjectForUser(userId)}`, 3)) &&
        (await allowed("phone_otp_number_day", `phone:${phone}`, 20, 86_400)),
    },
    session.user.id,
    reading.e164,
  );
  if (!result.ok) return fail(messages[result.reason]);
  return ok({ sentTo: reading.e164 });
}

export async function confirmPhoneCode(input: unknown): Promise<ActionResult<{ confirmed: true }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const copy = await phoneCopy();
  if (!(await phoneConfirmationOn())) return fail(copy.closed);

  const parsed = validate(z.object({ code: z.string().trim().regex(/^\d{6}$/, copy.codeShape) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data, error } = await (session.supabase as unknown as RpcCaller).rpc("confirm_phone", {
    p_code: parsed.data.code,
  });
  if (error || !isConfirmOutcome(data)) return fail(copy.sendFailed);
  if (data !== "confirmed") return fail(confirmMessages(copy)[data]);
  revalidatePath("/settings/phone");
  return ok({ confirmed: true });
}
