"use server";

/**
 * THE SECOND FACTOR FOR THE CONSOLE (29 September 2026).
 *
 * Every admin, super admin and staff member proves possession of a security
 * key (the same platform passkey the lock on money uses, enrolled at
 * /settings/privacy) before any desk opens, once per sign-in session and
 * again after twelve hours. A stolen password alone no longer opens anything.
 *
 * THE DATABASE ENFORCES IT, not this file. The proof is recorded in
 * public.console_step_ups against the session id in the caller's JWT, and
 * `private.has_role` / `private.staff_can` treat an admin role or a staff scope
 * as held by the caller only while that session has a live proof. So calling
 * PostgREST directly with a stolen password and the public key gets nothing
 * a member would not get. This file only runs the ceremony: a challenge bound
 * to this session, checked with the enrolled key (`money-step-up.ts`).
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import { resolveSession } from "../actions/session";
import { consume, subjectForUser } from "./rate-limit";
import { admin, ceremonyOrigin, listCredentialIds, mintChallenge, takeChallenge } from "./money-step-up";
import { b64urlToBuffer, verifyAssertion, type Alg } from "./webauthn";

/** How long one proof opens the console for, on this session. */
const STEP_UP_HOURS = 12;

/** The session id in a Supabase access token, read to bind the proof (the database verifies the token). */
function sessionIdOf(accessToken: string | undefined): string | null {
  const part = accessToken?.split(".")[1];
  if (!part) return null;
  try {
    const claims = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { session_id?: unknown };
    return typeof claims.session_id === "string" && /^[0-9a-f-]{36}$/i.test(claims.session_id) ? claims.session_id : null;
  } catch {
    return null;
  }
}

function digestFor(sessionId: string): string {
  return createHash("sha256").update(`console:${sessionId}`).digest("hex");
}

async function current() {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const { data } = await session.supabase.auth.getSession();
  const sessionId = sessionIdOf(data.session?.access_token);
  return sessionId ? { session, sessionId } : null;
}

export type ConsoleStepUpStart =
  | { state: "ready"; challenge: string; credentialIds: string[]; rpId: string }
  | { state: "enrol" }
  | { state: "failed" };

export async function beginConsoleStepUp(): Promise<ConsoleStepUpStart> {
  const now = await current();
  const a = admin();
  if (!now || !a) return { state: "failed" };
  const ids = await listCredentialIds(a, now.session.user.id);
  if (ids === null) return { state: "failed" };
  if (ids.length === 0) return { state: "enrol" };
  const challenge = await mintChallenge(a, now.session.user.id, "money", digestFor(now.sessionId));
  const { rpId } = await ceremonyOrigin();
  return challenge ? { state: "ready", challenge, credentialIds: ids, rpId } : { state: "failed" };
}

const assertionSchema = z.object({
  challenge: z.string().min(20).max(200),
  credentialId: z.string().min(16).max(1400),
  clientDataJSON: z.string().min(10).max(4000),
  authenticatorData: z.string().min(10).max(4000),
  signature: z.string().min(10).max(2000),
});

export async function finishConsoleStepUp(input: unknown): Promise<{ ok: true } | { error: "rejected" | "failed" }> {
  const parsed = assertionSchema.safeParse(input);
  if (!parsed.success) return { error: "rejected" };
  const now = await current();
  const a = admin();
  if (!now || !a) return { error: "failed" };
  const userId = now.session.user.id;
  const paced = await consume({ bucket: "console_step_up", subject: subjectForUser(userId), limit: 10, windowSeconds: 900 });
  if (!paced.allowed) return { error: "rejected" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loose = a as any;
  const { data: key } = await loose
    .from("money_credentials")
    .select("id, public_key_spki, alg, sign_count")
    .eq("user_id", userId)
    .eq("credential_id", parsed.data.credentialId)
    .maybeSingle();
  if (!key) return { error: "rejected" };
  const row = key as { id: string; public_key_spki: string; alg: Alg; sign_count: number };
  const { origin, rpId } = await ceremonyOrigin();
  const verdict = verifyAssertion({
    clientDataJSON: b64urlToBuffer(parsed.data.clientDataJSON),
    authenticatorData: b64urlToBuffer(parsed.data.authenticatorData),
    signature: b64urlToBuffer(parsed.data.signature),
    publicKeySpki: b64urlToBuffer(row.public_key_spki),
    alg: row.alg,
    storedSignCount: Number(row.sign_count),
    challenge: parsed.data.challenge,
    origins: [origin],
    rpId,
  });
  if (!verdict.ok) return { error: "rejected" };
  /* The challenge was minted for THIS session; a proof made on another
     session (or for money) is refused here. */
  const digest = await takeChallenge(a, userId, parsed.data.challenge, "money");
  if (digest !== digestFor(now.sessionId)) return { error: "rejected" };

  await loose
    .from("money_credentials")
    .update({ sign_count: verdict.signCount, last_used_at: new Date().toISOString() })
    .eq("id", row.id);
  const expires = new Date(Date.now() + STEP_UP_HOURS * 3_600_000).toISOString();
  /* This person's lapsed proofs go as the new one is written. */
  await loose.from("console_step_ups").delete().eq("user_id", userId).lt("expires_at", new Date().toISOString());
  const { error } = await loose.from("console_step_ups").upsert(
    { user_id: userId, session_id: now.sessionId, credential_id: parsed.data.credentialId, verified_at: new Date().toISOString(), expires_at: expires },
    { onConflict: "user_id,session_id" },
  );
  if (error) return { error: "failed" };
  await loose.from("audit_log").insert({
    actor_id: userId,
    action: "console.step_up",
    entity_type: "user",
    entity_id: userId,
    metadata: { expires_at: expires },
  });
  return { ok: true };
}
