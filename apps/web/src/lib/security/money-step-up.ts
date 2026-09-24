import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { authOrigin } from "../site";
import { getAdminClient } from "../wallet/ledger";
import { b64urlToBuffer, bufferToB64url, checkClientData, readEnrolKey, verifyAssertion, type Alg } from "./webauthn";
import { intentLine, type MoneyIntent } from "./money-intent";

/**
 * THE LOCK ON MONEY, SERVER SIDE. V-81.
 *
 * Every write here goes through the service role, because the three tables
 * (`20260924160300_v81_...sql`) grant nothing to a signed-in browser: a
 * challenge is minted, a key is enrolled and a step-up is recorded only after
 * this code has checked the proof. The proof is WebAuthn from the phone's
 * platform authenticator, verified by `webauthn.ts`, or the account password
 * (A2-013's fallback) or an email code for an account with no password,
 * checked by `lib/account-deletion/reauthenticate.ts`, the one re-auth door.
 *
 * The origin and RP id are this request's own, the same rule `authOrigin`
 * applies to auth links, so a credential made on www.vallospaces.com is asked
 * for on www.vallospaces.com and nowhere else.
 */

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (admin: Admin) => admin as any;

export async function ceremonyOrigin(): Promise<{ origin: string; rpId: string }> {
  const origin = await authOrigin();
  return { origin, rpId: new URL(origin).hostname };
}

export function admin(): Admin | null {
  return getAdminClient();
}

/** The digest a proof is bound to. */
export function intentDigest(intent: MoneyIntent): string {
  return createHash("sha256").update(intentLine(intent)).digest("hex");
}

/**
 * Has this person locked money with a phone? FAILS CLOSED: an unreadable
 * answer is "yes", so a read error asks for a proof rather than waving money
 * through. The one exception is a missing table (42P01), which means the
 * lock is not deployed at all and nobody can have enrolled.
 */
export async function hasMoneyCredential(a: Admin, userId: string): Promise<boolean> {
  try {
    const { data, error } = await loose(a).from("money_credentials").select("id").eq("user_id", userId).limit(1);
    if (error) return (error as { code?: string }).code !== "42P01";
    return Array.isArray(data) && data.length > 0;
  } catch {
    return true;
  }
}

/**
 * Did the password change in the last day? Read from the password-changed
 * email the database queues on every change (kept at least seven days after
 * it is sent). While it is fresh, the password is not accepted as a money
 * proof or as the key to enrol: `updatePassword` accepts any signed-in
 * session, so a fresh password proves nothing about who is holding the phone.
 * Unreadable counts as "changed", closed.
 */
export async function passwordChangedRecently(a: Admin, userId: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await loose(a)
      .from("email_outbox")
      .select("id")
      .eq("user_id", userId)
      .eq("template", "security.password_changed")
      .gte("created_at", since)
      .limit(1);
    if (error) return true;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return true;
  }
}

/** Null when the list cannot be read, which the phone treats as "let the server decide". */
export async function listCredentialIds(a: Admin, userId: string): Promise<string[] | null> {
  try {
    const { data, error } = await loose(a).from("money_credentials").select("credential_id").eq("user_id", userId);
    if (error) return (error as { code?: string }).code === "42P01" ? [] : null;
    return Array.isArray(data) ? (data as { credential_id: string }[]).map((r) => r.credential_id) : null;
  } catch {
    return null;
  }
}

export async function mintChallenge(a: Admin, userId: string, purpose: "enrol" | "money", digest: string | null = null): Promise<string | null> {
  const challenge = bufferToB64url(randomBytes(32));
  const { error } = await loose(a).from("money_challenges").insert({ user_id: userId, challenge, purpose, digest });
  return error ? null : challenge;
}

/**
 * Take a challenge once: it must be ours, unused, unexpired and of this
 * purpose. Answers the digest it was minted for ("" for an enrolment), or
 * null when it cannot be taken.
 */
export async function takeChallenge(a: Admin, userId: string, challenge: string, purpose: "enrol" | "money"): Promise<string | null> {
  const { data, error } = await loose(a)
    .from("money_challenges")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("challenge", challenge)
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, digest");
  if (error || !Array.isArray(data) || data.length !== 1) return null;
  return (data[0] as { digest: string | null }).digest ?? "";
}

export async function enrolKey(
  a: Admin,
  input: { userId: string; challenge: string; credentialId: string; clientDataJSON: string; publicKey: string; alg: number; label: string | null },
): Promise<"ok" | "rejected" | "failed"> {
  const { origin } = await ceremonyOrigin();
  const client = checkClientData(b64urlToBuffer(input.clientDataJSON), {
    type: "webauthn.create",
    challenge: input.challenge,
    origins: [origin],
  });
  const key = readEnrolKey(input.publicKey, input.alg);
  if (!client.ok || !key || input.credentialId.length < 16) return "rejected";
  if ((await takeChallenge(a, input.userId, input.challenge, "enrol")) === null) return "rejected";
  const { error } = await loose(a).from("money_credentials").insert({
    user_id: input.userId,
    credential_id: input.credentialId,
    public_key_spki: bufferToB64url(key.spki),
    alg: key.alg,
    label: input.label,
  });
  return error ? "failed" : "ok";
}

export async function proveWithAssertion(
  a: Admin,
  input: { userId: string; challenge: string; credentialId: string; clientDataJSON: string; authenticatorData: string; signature: string },
): Promise<string | null> {
  const { data } = await loose(a)
    .from("money_credentials")
    .select("id, public_key_spki, alg, sign_count")
    .eq("user_id", input.userId)
    .eq("credential_id", input.credentialId)
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; public_key_spki: string; alg: Alg; sign_count: number };
  const { origin, rpId } = await ceremonyOrigin();
  const verdict = verifyAssertion({
    clientDataJSON: b64urlToBuffer(input.clientDataJSON),
    authenticatorData: b64urlToBuffer(input.authenticatorData),
    signature: b64urlToBuffer(input.signature),
    publicKeySpki: b64urlToBuffer(row.public_key_spki),
    alg: row.alg,
    storedSignCount: Number(row.sign_count),
    challenge: input.challenge,
    origins: [origin],
    rpId,
  });
  if (!verdict.ok) return null;
  const digest = await takeChallenge(a, input.userId, input.challenge, "money");
  if (!digest) return null;
  await loose(a)
    .from("money_credentials")
    .update({ sign_count: verdict.signCount, last_used_at: new Date().toISOString() })
    .eq("id", row.id);
  return recordStepUp(a, input.userId, "biometric", digest);
}

export async function recordStepUp(
  a: Admin,
  userId: string,
  method: "biometric" | "password" | "email_code",
  digest: string,
): Promise<string | null> {
  const { data, error } = await loose(a).from("money_step_ups").insert({ user_id: userId, method, digest }).select("id").single();
  return error || !data ? null : (data as { id: string }).id;
}

/** Use a step-up once. True only if it was this person's, for this action, fresh and unused. */
export async function consumeStepUp(a: Admin, userId: string, id: string, digest: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const { data, error } = await loose(a)
    .from("money_step_ups")
    .update({ used_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("digest", digest)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id");
  return !error && Array.isArray(data) && data.length === 1;
}

/**
 * For the money actions: when this person has enrolled a key, the form must
 * carry a fresh step-up, and it is spent here. Null means go ahead; a code
 * means refuse. No key enrolled means nothing new is asked.
 */
export async function moneyStepUpRefusal(userId: string, stepUp: unknown, intent: MoneyIntent): Promise<"needed" | null> {
  const a = getAdminClient();
  if (!a) return null;
  if (!(await hasMoneyCredential(a, userId))) return null;
  if (typeof stepUp !== "string" || !(await consumeStepUp(a, userId, stepUp, intentDigest(intent)))) return "needed";
  return null;
}

export type MoneyCredentialRow = { id: string; label: string | null; createdAt: string; lastUsedAt: string | null };
export type MoneyCredentialList =
  | { state: "signed-out" }
  | { state: "unreadable" }
  | { state: "ok"; rows: MoneyCredentialRow[]; fallback: "password" | "email-code" };

/**
 * The phones that lock this person's money, read AS the person: the column
 * grant in the V-81 migration lets them see the label and dates of their own
 * and never the key, so this read proves the grant as well as using it.
 */
export async function loadMoneyCredentials(): Promise<MoneyCredentialList> {
  const { resolveSession } = await import("../actions/session");
  const { reauthMethodFor } = await import("../account-deletion/reauthenticate");
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (session.supabase as any)
    .from("money_credentials")
    .select("id, label, created_at, last_used_at")
    .order("created_at", { ascending: true });
  if (error || !Array.isArray(data)) return { state: "unreadable" };
  return {
    state: "ok",
    fallback: reauthMethodFor(session.user),
    rows: (data as { id: string; label: string | null; created_at: string; last_used_at: string | null }[]).map((r) => ({
      id: r.id,
      label: r.label,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
    })),
  };
}
