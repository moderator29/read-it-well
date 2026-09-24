"use server";

/**
 * THE LOCK ON MONEY, AS THE SCREENS CALL IT. V-81.
 *
 * Codes, not sentences: the client maps them onto `platform.moneyLock`. Every
 * door authorises off the signed-in session and hands the checking to
 * `money-step-up.ts`, which is the only code that writes the three tables.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveSession } from "../actions/session";
import { consume, subjectForUser } from "./rate-limit";
import {
  admin,
  ceremonyOrigin,
  consumeStepUp,
  enrolKey,
  listCredentialIds,
  mintChallenge,
  passwordIsRight,
  proveWithAssertion,
  recordStepUp,
} from "./money-step-up";

export type StepUpStatus = { needed: boolean; credentialIds: string[]; rpId: string };

/** Does this person's money need a proof, and which keys may give it? */
export async function stepUpStatus(): Promise<StepUpStatus> {
  const session = await resolveSession();
  const a = admin();
  const { rpId } = await ceremonyOrigin();
  if (session.state !== "signed-in" || !a) return { needed: false, credentialIds: [], rpId };
  const ids = await listCredentialIds(a, session.user.id);
  return { needed: ids.length > 0, credentialIds: ids, rpId };
}

export async function beginMoneyConfirm(): Promise<{ challenge: string } | { error: "failed" }> {
  const session = await resolveSession();
  const a = admin();
  if (session.state !== "signed-in" || !a) return { error: "failed" };
  const challenge = await mintChallenge(a, session.user.id, "money");
  return challenge ? { challenge } : { error: "failed" };
}

const assertionSchema = z.object({
  challenge: z.string().min(20).max(200),
  credentialId: z.string().min(16).max(1400),
  clientDataJSON: z.string().min(10).max(4000),
  authenticatorData: z.string().min(10).max(4000),
  signature: z.string().min(10).max(2000),
});

export async function finishMoneyConfirm(input: unknown): Promise<{ stepUp: string } | { error: "rejected" | "failed" }> {
  const parsed = assertionSchema.safeParse(input);
  if (!parsed.success) return { error: "rejected" };
  const session = await resolveSession();
  const a = admin();
  if (session.state !== "signed-in" || !a) return { error: "failed" };
  const id = await proveWithAssertion(a, { userId: session.user.id, ...parsed.data });
  return id ? { stepUp: id } : { error: "rejected" };
}

/* A password guess through either door counts against one allowance, so the
   lock is not a way to try passwords faster than sign-in allows. */
async function passwordAttemptAllowed(userId: string): Promise<boolean> {
  const verdict = await consume({ bucket: "money_lock_password", subject: subjectForUser(userId), limit: 5, windowSeconds: 900 });
  return verdict.allowed;
}

/** The fallback: the account password, for a phone whose sensor will not answer. */
export async function confirmWithPassword(password: unknown): Promise<{ stepUp: string } | { error: "rejected" | "failed" }> {
  if (typeof password !== "string" || password.length === 0 || password.length > 200) return { error: "rejected" };
  const session = await resolveSession();
  const a = admin();
  if (session.state !== "signed-in" || !a || !session.user.email) return { error: "failed" };
  if (!(await passwordAttemptAllowed(session.user.id))) return { error: "rejected" };
  if (!(await passwordIsRight(session.user.email, password))) return { error: "rejected" };
  const id = await recordStepUp(a, session.user.id, "password");
  return id ? { stepUp: id } : { error: "failed" };
}

/** Enrolling starts with the password, so a thief with an open session cannot. */
export async function beginEnrol(
  password: unknown,
): Promise<{ challenge: string; userId: string; email: string; rpId: string } | { error: "rejected" | "failed" }> {
  if (typeof password !== "string" || password.length === 0 || password.length > 200) return { error: "rejected" };
  const session = await resolveSession();
  const a = admin();
  if (session.state !== "signed-in" || !a || !session.user.email) return { error: "failed" };
  if (!(await passwordAttemptAllowed(session.user.id))) return { error: "rejected" };
  if (!(await passwordIsRight(session.user.email, password))) return { error: "rejected" };
  const challenge = await mintChallenge(a, session.user.id, "enrol");
  const { rpId } = await ceremonyOrigin();
  return challenge ? { challenge, userId: session.user.id, email: session.user.email, rpId } : { error: "failed" };
}

const enrolSchema = z.object({
  challenge: z.string().min(20).max(200),
  credentialId: z.string().min(16).max(1400),
  clientDataJSON: z.string().min(10).max(4000),
  publicKey: z.string().min(40).max(2000),
  alg: z.number().int(),
  label: z.string().trim().max(60).nullable(),
});

export async function finishEnrol(input: unknown): Promise<{ ok: true } | { error: "rejected" | "failed" }> {
  const parsed = enrolSchema.safeParse(input);
  if (!parsed.success) return { error: "rejected" };
  const session = await resolveSession();
  const a = admin();
  if (session.state !== "signed-in" || !a) return { error: "failed" };
  const result = await enrolKey(a, { userId: session.user.id, ...parsed.data });
  if (result !== "ok") return { error: result };
  revalidatePath("/settings/privacy");
  return { ok: true };
}

/** Removing a key is itself a money-lock change, so it needs a proof too. */
export async function removeMoneyCredential(input: unknown): Promise<{ ok: true } | { error: "rejected" | "failed" }> {
  const parsed = z.object({ id: z.string().uuid(), stepUp: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: "rejected" };
  const session = await resolveSession();
  const a = admin();
  if (session.state !== "signed-in" || !a) return { error: "failed" };
  if (!(await consumeStepUp(a, session.user.id, parsed.data.stepUp))) return { error: "rejected" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (a as any).from("money_credentials").delete().eq("id", parsed.data.id).eq("user_id", session.user.id);
  if (error) return { error: "failed" };
  revalidatePath("/settings/privacy");
  return { ok: true };
}
