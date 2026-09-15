import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { sendMessage } from "@/lib/email/client";
import { verificationCode } from "@/lib/email/messages";

/**
 * Supabase's Send Email Hook: every auth email leaves through here.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACES AND WHY IT IS WORTH A ROUTE.
 *
 * Supabase renders auth mail itself, from templates in its dashboard, sent from
 * its own address. Two consequences the owner has been looking at: the inbox
 * says "Supabase Auth" rather than Vallo, and the default confirm template
 * carries `{{ .ConfirmationURL }}`, a LINK, while our screen asks for six
 * digits. The screen and the inbox disagreed about what we had sent.
 *
 * With this hook enabled Supabase stops sending anything. It posts the user and
 * the token here instead, and the message is composed and sent by us: our
 * template, our sender, our words, in the same `compose` shell as every other
 * email the platform sends. `verificationCode` already existed and was already
 * right, including its argument for having no button in it; it had no way to be
 * reached from auth until now.
 *
 * ---------------------------------------------------------------------------
 * THE SIGNATURE IS THE WHOLE SECURITY MODEL, so it is checked first and
 * checked properly.
 *
 * This endpoint is public and it sends email to any address in its body. An
 * unverified version is an open relay with our domain's reputation attached.
 * Supabase signs with the Standard Webhooks scheme: HMAC-SHA256 over
 * `id.timestamp.body`, base64, presented in `webhook-signature` as a
 * space-separated list of `v1,<sig>` so a secret can be rotated without a gap.
 *
 * Three details that are easy to get wrong and are all deliberate here:
 *
 *  - THE RAW BODY IS HASHED. `await request.text()` once, verify that string,
 *    and only then parse it. Re-serialising parsed JSON changes bytes and the
 *    signature stops matching for reasons nobody can see.
 *  - THE COMPARISON IS TIMING SAFE, and length is checked before `timingSafeEqual`
 *    because it throws on a length mismatch rather than returning false.
 *  - THE TIMESTAMP IS BOUNDED. A valid signature is valid forever without this,
 *    so a captured request could be replayed to send the same code again later.
 *
 * WITHOUT A SECRET CONFIGURED IT REFUSES EVERYTHING. Not "allow through in
 * development": an endpoint whose protection is optional is an endpoint that
 * ships unprotected the first time an environment variable is forgotten, which
 * is exactly the failure that cost this platform a payment last week.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Supabase's own default. Stated here so the copy and the truth agree. */
const CODE_LIFETIME_MINUTES = 60;

/** How far out of date a signed request may be, in seconds. */
const MAX_SKEW_SECONDS = 5 * 60;

type EmailActionType =
  | "signup"
  | "magiclink"
  | "recovery"
  | "invite"
  | "email_change"
  | "email_change_current"
  | "email_change_new"
  | "reauthentication";

type HookPayload = {
  user?: {
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data?: {
    token?: string;
    email_action_type?: EmailActionType;
  };
};

/**
 * The shared secret, as bytes.
 *
 * Supabase writes it as `v1,whsec_<base64>`; the part after the comma, minus
 * the `whsec_` prefix, is base64 of the key itself. Both shapes are accepted
 * because the dashboard has shown it both ways and a pasted value that differs
 * by a prefix should not be an unexplained 401.
 */
function secretBytes(): Buffer | null {
  const raw = (process.env.SUPABASE_AUTH_HOOK_SECRET ?? "").trim();
  if (raw.length === 0) return null;
  const afterComma = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  const base64 = afterComma.startsWith("whsec_") ? afterComma.slice("whsec_".length) : afterComma;
  try {
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

function signaturesMatch(expected: string, presented: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function verified(request: Request, body: string): boolean {
  const key = secretBytes();
  if (!key) return false;

  const id = request.headers.get("webhook-id") ?? "";
  const timestamp = request.headers.get("webhook-timestamp") ?? "";
  const header = request.headers.get("webhook-signature") ?? "";
  if (id === "" || timestamp === "" || header === "") return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(Date.now() / 1000 - sentAt) > MAX_SKEW_SECONDS) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");

  /* `v1,<sig> v1,<other>` during a rotation, so any one matching is a pass. */
  return header
    .split(" ")
    .map((part) => (part.startsWith("v1,") ? part.slice(3) : ""))
    .some((candidate) => candidate.length > 0 && signaturesMatch(expected, candidate));
}

/** The name to greet by, from whatever sign-up put in the metadata. */
function nameFrom(metadata: Record<string, unknown> | undefined): string | null {
  const first = metadata?.["first_name"];
  if (typeof first === "string" && first.trim().length > 0) return first.trim();
  const full = metadata?.["full_name"];
  if (typeof full === "string" && full.trim().length > 0) return full.trim();
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();

  if (!verified(request, body)) {
    return NextResponse.json({ ok: false, reason: "unauthorised" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(body) as HookPayload;
  } catch {
    return NextResponse.json({ ok: false, reason: "malformed" }, { status: 400 });
  }

  const to = payload.user?.email?.trim() ?? "";
  const token = payload.email_data?.token?.trim() ?? "";
  if (to.length === 0 || token.length === 0) {
    return NextResponse.json({ ok: false, reason: "incomplete" }, { status: 400 });
  }

  /*
   * ONE MESSAGE FOR EVERY ACTION TYPE, and that is a decision rather than a
   * shortcut. Signing up, signing in, resetting a password and confirming a new
   * address all end the same way: six digits typed into a screen the person
   * already has open. Five near-identical templates would drift, and the
   * differences between them would be decoration on the one line that matters.
   *
   * The subject carries the code, which `verificationCode` does deliberately:
   * most people read it off the notification without opening anything, which is
   * faster and strictly safer than opening mail to find it.
   */
  const message = verificationCode({
    name: nameFrom(payload.user?.user_metadata),
    code: token,
    expiresInMinutes: CODE_LIFETIME_MINUTES,
  });

  const result = await sendMessage(to, message);

  /*
   * A NON-2xx WHEN THE SEND FAILED, so Supabase retries and the person is not
   * left waiting for a code that was never posted. This is the one place in the
   * codebase where an email failure must NOT be swallowed: everywhere else the
   * email is a courtesy after the work is done, and here the email IS the work.
   */
  if (!result.sent) {
    /* `unconfigured` is named apart from a delivery failure because the two
       need different actions: one is a missing RESEND_API_KEY and retrying
       will never fix it, the other is worth another attempt. Both are non-2xx,
       because in either case no code reached anybody. */
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
