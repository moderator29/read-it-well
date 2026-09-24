"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
 * ALLOWANCES. Five codes an hour per account and three per number, failing
 * CLOSED: a code is an SMS the founder pays for, and an open door here is a
 * way to send strangers texts at Vallo's expense.
 */

const CLOSED = "Vallo is not asking for phone numbers at the moment. Nothing is needed from you.";

const SEND_MESSAGES: Record<Exclude<SendOutcome, { ok: true }>["reason"], string> = {
  limited: "That is a lot of codes in a short time. Wait an hour and try again.",
  taken: "That number is already confirmed on another Vallo account. One number can confirm one account.",
  already: "That number is already confirmed on your account.",
  invalid: "That is not a Nigerian mobile number we can send to. Check the digits.",
  unconfigured: "We could not send a code just now. Nothing was changed. Try again later.",
  failed: "We could not send a code just now. Nothing was changed. Try again in a moment.",
};

const CONFIRM_MESSAGES: Record<Exclude<ConfirmOutcome, "confirmed">, string> = {
  wrong: "That code does not match. Check the message and try again.",
  expired: "That code has expired. Ask for a new one.",
  locked: "Too many wrong codes. Ask for a new one.",
  no_code: "There is no code waiting for this account. Ask for one first.",
  taken: "That number was confirmed on another Vallo account in the meantime. One number can confirm one account.",
  signed_out: SIGNED_OUT_MESSAGE,
};

const phoneSchema = z.object({ phone: z.string().trim().min(1, "Enter your mobile number.") });
const codeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "The code is six digits.") });

type RpcCaller = {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
};

async function allowed(bucket: string, subject: string, limit: number): Promise<boolean> {
  const verdict = await consume({ bucket, subject, limit, windowSeconds: 3_600 });
  return verdict.allowed && !verdict.degraded;
}

export async function sendPhoneCode(input: unknown): Promise<ActionResult<{ sentTo: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (!(await phoneConfirmationOn())) return fail(CLOSED);

  const parsed = validate(phoneSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const reading = readPhone(parsed.data.phone);
  if (reading.state !== "valid") {
    return fail(reading.state === "invalid" ? reading.reason : SEND_MESSAGES.invalid, {
      phone: reading.state === "invalid" ? reading.reason : SEND_MESSAGES.invalid,
    });
  }
  if (!hasServiceRole()) return fail(SEND_MESSAGES.unconfigured);

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
        (await allowed("phone_otp_number", `phone:${phone}`, 3)),
    },
    session.user.id,
    reading.e164,
  );
  if (!result.ok) return fail(SEND_MESSAGES[result.reason]);
  return ok({ sentTo: reading.e164 });
}

export async function confirmPhoneCode(input: unknown): Promise<ActionResult<{ confirmed: true }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (!(await phoneConfirmationOn())) return fail(CLOSED);

  const parsed = validate(codeSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data, error } = await (session.supabase as unknown as RpcCaller).rpc("confirm_phone", {
    p_code: parsed.data.code,
  });
  if (error || !isConfirmOutcome(data)) return fail(SEND_MESSAGES.failed);
  if (data !== "confirmed") return fail(CONFIRM_MESSAGES[data]);
  revalidatePath("/settings/phone");
  return ok({ confirmed: true });
}
