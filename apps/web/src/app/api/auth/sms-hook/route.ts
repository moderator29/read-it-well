import { NextResponse } from "next/server";
import { otpTransport } from "@/lib/phone-otp/transport";
import { phoneSignInEnabled } from "@/lib/auth/phone-sign-in-flag";
import { readSmsHookPayload, smsCodeMessage, smsHookSecret, smsHookVerified } from "@/lib/auth/sms-hook";

/**
 * A2. SUPABASE AUTH'S SEND SMS HOOK. It fires only for phone codes; email
 * auth mail is the Send Email hook and is not touched by this route.
 *
 * Supabase generates the code and checks it at `verifyOtp`; this only
 * delivers it, through the `OtpTransport` (Termii: WhatsApp first when
 * enabled, then the DND SMS route). Signed with Standard Webhooks against
 * `SEND_SMS_HOOK_SECRET`; without the secret, or with `PHONE_SIGNIN_ENABLED`
 * off, it refuses everything, so GoTrue reports the send as failed rather
 * than a person waiting for a code that never went.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function refusal(status: number, message: string) {
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}

export async function POST(request: Request) {
  if (!phoneSignInEnabled()) return refusal(503, "phone sign-in is off");
  const body = await request.text();
  const ok = smsHookVerified(
    smsHookSecret(),
    {
      id: request.headers.get("webhook-id") ?? "",
      timestamp: request.headers.get("webhook-timestamp") ?? "",
      signature: request.headers.get("webhook-signature") ?? "",
    },
    body,
    Math.floor(Date.now() / 1000),
  );
  if (!ok) return refusal(401, "unauthorised");
  const payload = readSmsHookPayload(body);
  if (!payload) return refusal(400, "incomplete");
  const sent = await otpTransport().send(payload.phone, smsCodeMessage(payload.otp));
  return sent.ok ? NextResponse.json({}) : refusal(502, sent.reason === "unconfigured" ? "no transport configured" : "send failed");
}
