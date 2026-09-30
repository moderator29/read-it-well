"use server";

import { fail, ok, type ActionResult } from "@/lib/actions/envelope";
import { writeEmailPreferences } from "./preferences";
import { EMAIL_CHANNELS, readUnsubscribe, unsubscribeKey } from "./unsubscribe-token";
import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";
import { headers } from "next/headers";

/**
 * A12. Save the switches from the sign-in-free preferences page. The token
 * in the form is the authority, read again here; nothing the form says about
 * WHOSE switches these are is believed.
 */
export async function saveEmailPreferences(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const key = unsubscribeKey();
  const token = String(formData.get("token") ?? "");
  const claims = key ? readUnsubscribe(key, token, Math.floor(Date.now() / 1000)) : null;
  if (!claims) return fail("invalid-token");
  const verdict = await consume({
    bucket: "email_prefs",
    subject: subjectForIp(ipFromHeaders(await headers())),
    limit: 30,
    windowSeconds: 600,
  });
  if (!verdict.allowed) return fail("limited");
  const patch = Object.fromEntries(EMAIL_CHANNELS.map((channel) => [channel, formData.get(channel) === "on"]));
  return (await writeEmailPreferences(claims.userId, patch)) ? ok(null) : fail("failed");
}
